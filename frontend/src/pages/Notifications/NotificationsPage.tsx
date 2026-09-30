import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, type NotificationType } from '../../context/NotificationContext';
import {
  Bell,
  Sparkles,
  Camera,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Check,
  Trash2,
  ArrowRight,
  Inbox,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'scan' | 'reminder' | 'insight'>('all');

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'welcome':
        return <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'scan':
        return <Camera className="w-5 h-5 text-[#3B5249] dark:text-emerald-300" />;
      case 'reminder':
        return <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'routine':
        return <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'insight':
      default:
        return <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const getBadgeStyleForType = (type: NotificationType) => {
    switch (type) {
      case 'welcome':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300';
      case 'scan':
        return 'bg-[#E8ECE9] dark:bg-[#252D28] border-[#3B5249]/20 text-[#3B5249] dark:text-emerald-300';
      case 'reminder':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300';
      case 'routine':
        return 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40 text-indigo-800 dark:text-indigo-300';
      case 'insight':
      default:
        return 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40 text-teal-800 dark:text-teal-300';
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'scan') return n.type === 'scan';
    if (activeFilter === 'reminder') return n.type === 'reminder' || n.type === 'routine';
    if (activeFilter === 'insight') return n.type === 'insight' || n.type === 'welcome';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-12 py-8 space-y-8 animate-fade-in">
      
      {/* 1. Header with Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-black/5 dark:border-white/10">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#3B5249] dark:text-emerald-400 font-bold flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Companion Inbox & Alerts
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1A1D1A] dark:text-white mt-1">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-[#717771] dark:text-[#A3B0A9] mt-0.5">
            Real-time reminders for facial scans, barrier check-ins, and formulation updates.
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-2xl bg-white dark:bg-[#1D221E] hover:bg-[#F7F7F4] border border-black/10 dark:border-white/10 text-xs font-semibold text-[#1A1D1A] dark:text-white shadow-soft transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark All Read</span>
              </button>
            )}

            <button
              type="button"
              onClick={clearAll}
              className="p-2 rounded-2xl text-[#717771] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Clear all notifications"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {(
          [
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'scan', label: 'Scan Alerts', count: notifications.filter((n) => n.type === 'scan').length },
            { id: 'reminder', label: 'Reminders & Routine', count: notifications.filter((n) => n.type === 'reminder' || n.type === 'routine').length },
            { id: 'insight', label: 'Insights & Updates', count: notifications.filter((n) => n.type === 'insight' || n.type === 'welcome').length },
          ] as const
        ).map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-[#1A1D1A] dark:bg-white text-white dark:text-[#1A1D1A] shadow-md font-semibold'
                  : 'bg-white dark:bg-[#1D221E] text-[#717771] hover:text-[#1A1D1A] dark:hover:text-white border border-black/5 dark:border-white/10'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-[#1A1D1A]'
                    : 'bg-[#F7F7F4] dark:bg-[#141714] text-[#717771]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Notification Cards List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-12 text-center border border-black/5 dark:border-white/10 shadow-soft space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8ECE9] dark:bg-[#252D28] text-[#3B5249] dark:text-emerald-300 flex items-center justify-center shadow-soft">
            <Inbox className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-2xl text-[#1A1D1A] dark:text-white">
              All Caught Up!
            </h3>
            <p className="text-xs text-[#717771] max-w-sm mx-auto">
              You have no pending alerts under this view. We will notify you when it is time for your next facial scan.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            return (
              <div
                key={notif.id}
                className={`group p-5 sm:p-6 rounded-3xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  notif.read
                    ? 'bg-white dark:bg-[#1D221E] border-black/5 dark:border-white/10 opacity-85 hover:opacity-100'
                    : 'bg-white dark:bg-[#1D221E] border-[#3B5249]/30 dark:border-emerald-500/30 shadow-soft'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Category Icon Badge */}
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-soft ${getBadgeStyleForType(
                      notif.type
                    )}`}
                  >
                    {getIconForType(notif.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      <h4 className="text-sm font-bold text-[#1A1D1A] dark:text-white">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-[#717771] bg-[#F7F7F4] dark:bg-[#141714] px-2 py-0.5 rounded-md">
                        {notif.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-[#717771] dark:text-[#A3B0A9] leading-relaxed max-w-xl">
                      {notif.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {notif.link && (
                    <Link
                      to={notif.link}
                      onClick={() => markAsRead(notif.id)}
                      className="px-4 py-2 rounded-2xl bg-[#3B5249] hover:bg-[#2D4039] text-white text-xs font-semibold shadow-soft transition-all duration-200 flex items-center gap-1.5 active:scale-95"
                    >
                      <span>{notif.actionLabel || 'View Details'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {!notif.read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notif.id)}
                      className="p-2 rounded-2xl bg-[#F7F7F4] dark:bg-[#141714] hover:bg-emerald-50 text-[#717771] hover:text-emerald-700 transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => clearNotification(notif.id)}
                    className="p-2 rounded-2xl text-[#717771] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
