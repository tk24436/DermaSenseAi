import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { getHistoricalProgressApi, getLatestAnalysisApi, getUserProfileApi } from '../api/client';
import type { HistoricalProgressEntry, SkinAnalysis, UserProfile } from '../types';

export type NotificationType = 'welcome' | 'scan' | 'reminder' | 'routine' | 'insight';

export interface SkinNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  actionLabel?: string;
  createdAt: number; // epoch ms for sorting & diffing
}

interface NotificationContextType {
  notifications: SkinNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<SkinNotification, 'id' | 'timestamp' | 'read' | 'createdAt'>) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || 'guest_user';

  // Read status tracking per user
  const readStorageKey = `dermasense_read_notifs_${userId}`;
  const customStorageKey = `dermasense_custom_notifs_${userId}`;

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(readStorageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const [customNotifications, setCustomNotifications] = useState<SkinNotification[]>(() => {
    try {
      const saved = localStorage.getItem(customStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Real data state
  const [history, setHistory] = useState<HistoricalProgressEntry[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<SkinAnalysis | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Load real data from storage/backend
  const fetchRealData = useCallback(async () => {
    try {
      const [hist, analysisData, prof] = await Promise.all([
        getHistoricalProgressApi(),
        getLatestAnalysisApi(),
        getUserProfileApi(),
      ]);
      setHistory(hist || []);
      setLatestAnalysis(analysisData.analysis);
      setProfile(prof);
    } catch (e) {
      console.warn('Notification engine failed to fetch real data:', e);
    }
  }, []);

  useEffect(() => {
    fetchRealData();
  }, [fetchRealData, user]);

  // Persist read status
  useEffect(() => {
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(Array.from(readIds)));
    } catch (e) {
      console.warn('Failed to persist read notification IDs', e);
    }
  }, [readIds, readStorageKey]);

  // Persist custom user notifications
  useEffect(() => {
    try {
      localStorage.setItem(customStorageKey, JSON.stringify(customNotifications));
    } catch (e) {
      console.warn('Failed to persist custom notifications', e);
    }
  }, [customNotifications, customStorageKey]);

  // =========================================================================
  // REAL COMPUTED NOTIFICATIONS ENGINE
  // =========================================================================
  const generatedNotifications = useMemo<SkinNotification[]>(() => {
    const list: SkinNotification[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const userName = user?.name ? user.name.split(' ')[0] : 'there';

    // 1. Personalized Real User Welcome
    list.push({
      id: `welcome-${userId}`,
      type: 'welcome',
      title: `Welcome, ${userName}!`,
      message: `Your clinical skin intelligence companion is active. Tailored routines and barrier analysis are calibrated for your account.`,
      timestamp: 'Active Account',
      read: readIds.has(`welcome-${userId}`),
      link: '/profile',
      actionLabel: 'View Profile',
      createdAt: now.getTime() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
    });

    // 2. Real Facial Scan Status Logic
    if (history.length === 0) {
      // User has NOT taken any scans yet -> Actionable baseline scan alert
      list.push({
        id: `scan-baseline-${userId}`,
        type: 'scan',
        title: 'Action Needed: Take Your Baseline Face Scan',
        message: 'No facial scan records found. Capture your first photo in natural lighting to establish your baseline health index and acne risk.',
        timestamp: 'Action Needed',
        read: readIds.has(`scan-baseline-${userId}`),
        link: '/upload',
        actionLabel: 'Start Baseline Scan',
        createdAt: now.getTime() - 1000 * 60 * 60 * 2, // 2 hours ago
      });
    } else {
      // User HAS scans! Calculate actual days & hours since last check-in
      const latestScan = history[history.length - 1];
      const scanDate = new Date(latestScan.date);
      const diffMs = now.getTime() - scanDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffHours < 12) {
        // Scan was taken recently today
        list.push({
          id: `scan-today-${latestScan.date}`,
          type: 'scan',
          title: `Today's Scan Complete: ${latestScan.skinScore}% Health Score`,
          message: `Dermis evaluation recorded with ${latestScan.subscores?.texture ?? 75}% moisture retention. Your daily schedule has been synchronized.`,
          timestamp: diffHours <= 1 ? 'Just now' : `${diffHours}h ago`,
          read: readIds.has(`scan-today-${latestScan.date}`),
          link: '/dashboard',
          actionLabel: 'View Health Report',
          createdAt: scanDate.getTime(),
        });
      } else {
        // Scan was taken more than 12-24 hours ago -> Prompt next check-in
        const timeAgoText = diffDays >= 1 ? `${diffDays}d ago` : `${diffHours}h ago`;
        list.push({
          id: `scan-reminder-${latestScan.date}`,
          type: 'reminder',
          title: 'Daily Follow-up Check-in Due',
          message: `It has been ${diffDays >= 1 ? `${diffDays} day${diffDays > 1 ? 's' : ''}` : `${diffHours} hours`} since your last check-in. Take a follow-up scan to compare barrier recovery trajectory.`,
          timestamp: timeAgoText,
          read: readIds.has(`scan-reminder-${latestScan.date}`),
          link: '/upload',
          actionLabel: 'Take Follow-up Scan',
          createdAt: now.getTime() - 1000 * 60 * 30, // 30 mins ago
        });
      }

      // 3. Real Longitudinal Trajectory Insights (Compare latest with baseline)
      if (history.length >= 2) {
        const firstScan = history[0];
        const scoreDiff = latestScan.skinScore - firstScan.skinScore;

        if (scoreDiff >= 0) {
          list.push({
            id: `insight-growth-${latestScan.date}`,
            type: 'insight',
            title: `Barrier Resilience: +${scoreDiff}% Growth`,
            message: `Your longitudinal skin score increased from ${firstScan.skinScore}% to ${latestScan.skinScore}% across ${history.length} check-ins. Barrier condition is stabilizing.`,
            timestamp: 'This Week',
            read: readIds.has(`insight-growth-${latestScan.date}`),
            link: '/progress',
            actionLabel: 'View Trajectory',
            createdAt: now.getTime() - 1000 * 60 * 60 * 5,
          });
        } else {
          list.push({
            id: `insight-dip-${latestScan.date}`,
            type: 'insight',
            title: `Barrier Support Recommended (-${Math.abs(scoreDiff)}%)`,
            message: `Your latest score dipped compared to baseline. Prioritize lipid-rich ceramide night cream to accelerate stratum corneum repair.`,
            timestamp: 'Recent Change',
            read: readIds.has(`insight-dip-${latestScan.date}`),
            link: '/progress',
            actionLabel: 'View Progress',
            createdAt: now.getTime() - 1000 * 60 * 60 * 5,
          });
        }
      }
    }

    // 4. Real Time-of-Day Routine Reminders
    if (currentHour >= 6 && currentHour < 12) {
      // Morning
      list.push({
        id: `routine-am-${now.toDateString()}`,
        type: 'routine',
        title: 'Morning AM Routine Active',
        message: 'Begin with gentle cleansing, hyaluronic serum on damp skin, and SPF 50+ UV barrier defense.',
        timestamp: 'Morning Regimen',
        read: readIds.has(`routine-am-${now.toDateString()}`),
        link: '/dashboard',
        actionLabel: 'Open Morning Steps',
        createdAt: now.getTime() - 1000 * 60 * 15,
      });
    } else if (currentHour >= 18 || currentHour < 4) {
      // Evening / Night
      list.push({
        id: `routine-pm-${now.toDateString()}`,
        type: 'routine',
        title: 'Evening PM Treatment Reminder',
        message: 'Apply orbital peptide eye cream and your rich ceramide night mask for overnight stratum corneum recovery.',
        timestamp: 'Evening Regimen',
        read: readIds.has(`routine-pm-${now.toDateString()}`),
        link: '/dashboard',
        actionLabel: 'Complete PM Steps',
        createdAt: now.getTime() - 1000 * 60 * 20,
      });
    }

    // 5. Real Profile & Allergy Compatibility Notifications
    if (profile?.allergies && profile.allergies.length > 0) {
      list.push({
        id: `allergy-active-${userId}`,
        type: 'insight',
        title: `Allergen Filter Active: ${profile.allergies.length} Excluded`,
        message: `Formulas containing ${profile.allergies.join(', ')} are strictly excluded from your product recommendations.`,
        timestamp: 'Safety Protocol',
        read: readIds.has(`allergy-active-${userId}`),
        link: '/profile',
        actionLabel: 'Review Exclusions',
        createdAt: now.getTime() - 1000 * 60 * 60 * 24 * 3,
      });
    }

    if (profile?.goals && profile.goals.length > 0) {
      list.push({
        id: `goal-focus-${userId}`,
        type: 'insight',
        title: `Target Objective: ${profile.goals[0]}`,
        message: `Your daily routine products are prioritized to target ${profile.goals.join(' and ')}.`,
        timestamp: 'Routine Goal',
        read: readIds.has(`goal-focus-${userId}`),
        link: '/profile',
        actionLabel: 'Edit Goals',
        createdAt: now.getTime() - 1000 * 60 * 60 * 24 * 2,
      });
    }

    if (latestAnalysis?.detectedIssues && latestAnalysis.detectedIssues.length > 0) {
      list.push({
        id: `issues-${userId}`,
        type: 'insight',
        title: `Concern Zone: ${latestAnalysis.detectedIssues[0]}`,
        message: `Your clinical scan flagged ${latestAnalysis.detectedIssues.join(' and ')}. Your regimen includes targeted actives for these areas.`,
        timestamp: 'Dermis Diagnostics',
        read: readIds.has(`issues-${userId}`),
        link: '/dashboard',
        actionLabel: 'View Analysis',
        createdAt: now.getTime() - 1000 * 60 * 60 * 3,
      });
    }

    // Combine generated alerts with custom event alerts, sorted newest first
    const all = [...customNotifications, ...list];
    all.sort((a, b) => b.createdAt - a.createdAt);

    // Filter duplicates by id
    const seen = new Set<string>();
    return all.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [user, userId, history, profile, latestAnalysis, readIds, customNotifications]);

  const unreadCount = generatedNotifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    setCustomNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    const allIds = new Set(readIds);
    generatedNotifications.forEach((n) => allIds.add(n.id));
    setReadIds(allIds);
    setCustomNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    setCustomNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    const allIds = new Set(readIds);
    generatedNotifications.forEach((n) => allIds.add(n.id));
    setReadIds(allIds);
    setCustomNotifications([]);
  };

  const addNotification = (notif: Omit<SkinNotification, 'id' | 'timestamp' | 'read' | 'createdAt'>) => {
    const newNotif: SkinNotification = {
      ...notif,
      id: `custom-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
      createdAt: Date.now(),
    };
    setCustomNotifications((prev) => [newNotif, ...prev]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications: generatedNotifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        addNotification,
        refreshNotifications: fetchRealData,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
