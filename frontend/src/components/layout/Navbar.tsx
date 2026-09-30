import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications, type NotificationType } from '../../context/NotificationContext';
import {
  Leaf,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Bell,
  Check,
  ArrowRight,
  Sparkles,
  Camera,
  Calendar,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };

    if (notifDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [notifDropdownOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/upload', label: 'AI Scan & Analysis' },
    { path: '/progress', label: 'Progress' },
    { path: '/profile', label: 'Skin Profile' },
  ];

  const displayName = user?.name || 'Anne Miller';
  const firstName = displayName.split(' ')[0];

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'welcome':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'scan':
        return <Camera className="w-3.5 h-3.5 text-[#3B5249] dark:text-emerald-300" />;
      case 'reminder':
        return <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'routine':
        return <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'insight':
      default:
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#EFEFEA]/90 dark:bg-[#141714]/90 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-4 lg:px-12 py-3.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-[#3B5249] flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform duration-200">
            <Leaf className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <span className="font-serif text-2xl tracking-tight block leading-none text-[#1A1D1A] dark:text-[#EFEFEA]">
              DermaSense<span className="font-sans text-xs font-semibold uppercase tracking-widest ml-1 text-[#3B5249] dark:text-emerald-400">AI</span>
            </span>
            <span className="text-[10px] text-[#717771] tracking-wider uppercase font-medium">
              Clinical Skin Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center bg-[#F7F7F4]/90 dark:bg-[#1D221E] p-1.5 rounded-full border border-black/5 dark:border-white/10 shadow-inner">
            {navLinks.map((link) => {
              const isActive =
                link.path === '/'
                  ? location.pathname === '/' || location.pathname === '/dashboard'
                  : location.pathname === link.path;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-[#1A1D1A] dark:bg-white text-white dark:text-[#1A1D1A] shadow-md'
                      : 'text-[#717771] hover:text-[#1A1D1A] dark:hover:text-[#EFEFEA]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          
          {/* Notification Button & Interactive Popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              title="Notifications & Alerts"
              className={`relative p-2.5 rounded-2xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                notifDropdownOpen
                  ? 'bg-[#3B5249] text-white border-[#3B5249]'
                  : 'bg-white dark:bg-[#1D221E] hover:bg-gray-50 border-black/5 dark:border-white/10 text-[#1A1D1A] dark:text-[#EFEFEA] shadow-soft'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white dark:ring-[#1D221E]" />
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {notifDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#1D221E] rounded-3xl shadow-soft-lg border border-black/10 dark:border-white/10 overflow-hidden z-50 animate-scale-in">
                
                {/* Popover Header */}
                <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg text-[#1A1D1A] dark:text-white">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-[#3B5249] dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Notification Items List */}
                <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-black/5 dark:divide-white/5">
                  {notifications.slice(0, 4).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.link) {
                          setNotifDropdownOpen(false);
                          navigate(notif.link);
                        }
                      }}
                      className={`p-3.5 hover:bg-[#F7F7F4] dark:hover:bg-[#141714] transition-colors cursor-pointer flex items-start gap-3 ${
                        !notif.read ? 'bg-[#F7F7F4]/60 dark:bg-[#181D19]/40' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#E8ECE9] dark:bg-[#252D28] flex items-center justify-center shrink-0 mt-0.5">
                        {getNotifIcon(notif.type)}
                      </div>

                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-[#1A1D1A] dark:text-white leading-tight">
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#717771] dark:text-[#A3B0A9] line-clamp-2 leading-snug">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-[#717771] block pt-0.5">
                          {notif.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Popover Footer with View All link */}
                <div className="p-3 bg-[#F7F7F4]/80 dark:bg-[#141714] border-t border-black/5 dark:border-white/10 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setNotifDropdownOpen(false)}
                    className="text-xs font-semibold text-[#3B5249] dark:text-emerald-400 hover:text-[#1A1D1A] dark:hover:text-white flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>View All Notifications</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2.5 rounded-2xl bg-white dark:bg-[#1D221E] hover:bg-gray-50 border border-black/5 dark:border-white/10 text-[#1A1D1A] dark:text-[#EFEFEA] shadow-soft transition-transform active:scale-95 cursor-pointer"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-[#1A1D1A]" />
            ) : (
              <Sun className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-2 border-l border-black/10 dark:border-white/10">
              <Link to="/profile" className="hidden sm:flex items-center gap-3 text-left group">
                <div className="w-10 h-10 rounded-2xl bg-[#3B5249] text-white flex items-center justify-center font-serif text-base font-bold shadow-soft ring-2 ring-white dark:ring-[#1D221E] group-hover:scale-105 transition-transform">
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <h4 className="text-xs font-bold text-[#1A1D1A] dark:text-[#EFEFEA] group-hover:text-[#3B5249] transition-colors">
                    {displayName}
                  </h4>
                  <span className="text-[11px] text-[#717771]">Skin Profile</span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 rounded-2xl text-[#717771] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-full text-xs font-medium text-[#1A1D1A] dark:text-[#EFEFEA] hover:bg-black/5"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 rounded-full text-xs font-semibold btn-sage shadow-soft"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          {isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-2xl bg-white dark:bg-[#1D221E] border border-black/5 dark:border-white/10 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden pt-4 pb-2 px-2 flex flex-col gap-2 border-t border-black/5 dark:border-white/10 mt-3 animate-fade-in">
          {navLinks.map((link) => {
            const isActive =
              link.path === '/'
                ? location.pathname === '/' || location.pathname === '/dashboard'
                : location.pathname === link.path;

            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full text-left px-4 py-2.5 rounded-xl font-medium text-xs transition-colors ${
                  isActive
                    ? 'bg-[#1A1D1A] dark:bg-white text-white dark:text-[#1A1D1A]'
                    : 'text-[#1A1D1A] dark:text-[#EFEFEA] hover:bg-[#F7F7F4] dark:hover:bg-[#1D221E]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            to="/notifications"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-left px-4 py-2.5 rounded-xl font-medium text-xs text-[#1A1D1A] dark:text-[#EFEFEA] hover:bg-[#F7F7F4] dark:hover:bg-[#1D221E] flex items-center justify-between"
          >
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>
      )}
    </header>
  );
};
