import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  CreditCard,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
  X,
  Sparkles,
  Loader2,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';

export const NotificationBell = ({ onNavigateToMembersWithFilter }) => {
  const { currentRole } = useAuth();
  const { gymInfo } = useGymData();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'due' | 'expiring'
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [notificationData, setNotificationData] = useState({
    unread_count: 0,
    summary: {
      payment_due_count: 0,
      payment_due_unread: 0,
      payment_due_line: 'No payments due',
      plan_expiring_count: 0,
      plan_expiring_unread: 0,
      plan_expiring_line: 'No plans expiring soon',
    },
    payment_due: { total: 0, unread: 0, items: [] },
    plan_expiring: { total: 0, unread: 0, items: [] },
  });

  const dropdownRef = useRef(null);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await api.notifications.getSummary();
      if (res && res.success !== false) {
        setNotificationData(res);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Poll on mount, window focus, and every 5 minutes
  useEffect(() => {
    fetchNotifications(true);

    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 300000); // 5 minutes

    const handleFocus = () => {
      fetchNotifications(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchNotifications]);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // When opening dropdown, refresh notifications
  const handleToggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications(false);
    }
    setIsOpen((prev) => !prev);
  };

  // Mark single item read
  const handleMarkItemRead = async (e, item) => {
    e.stopPropagation();
    try {
      // Optimistic update
      setNotificationData((prev) => {
        const updateItems = (list) =>
          list.map((it) => (it.reference_id === item.reference_id ? { ...it, is_read: true } : it));

        const updatedDue = updateItems(prev.payment_due?.items || []);
        const updatedExp = updateItems(prev.plan_expiring?.items || []);
        const unreadDue = updatedDue.filter((i) => !i.is_read).length;
        const unreadExp = updatedExp.filter((i) => !i.is_read).length;

        return {
          ...prev,
          unread_count: unreadDue + unreadExp,
          payment_due: { ...prev.payment_due, unread: unreadDue, items: updatedDue },
          plan_expiring: { ...prev.plan_expiring, unread: unreadExp, items: updatedExp },
        };
      });

      await api.notifications.markRead(item.type, item.reference_id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
      fetchNotifications(false);
    }
  };

  // Mark all active notifications read
  const handleMarkAllRead = async () => {
    if (isMarkingAll || notificationData.unread_count === 0) return;
    setIsMarkingAll(true);
    try {
      // Optimistic update
      setNotificationData((prev) => ({
        ...prev,
        unread_count: 0,
        payment_due: {
          ...prev.payment_due,
          unread: 0,
          items: (prev.payment_due?.items || []).map((i) => ({ ...i, is_read: true })),
        },
        plan_expiring: {
          ...prev.plan_expiring,
          unread: 0,
          items: (prev.plan_expiring?.items || []).map((i) => ({ ...i, is_read: true })),
        },
      }));

      await api.notifications.markAllRead();
    } catch (err) {
      console.error('Failed to mark all read:', err);
      fetchNotifications(false);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Navigate to Member Directory with filter
  const handleNavigateWithFilter = (filterType, item = null) => {
    setIsOpen(false);
    if (item && !item.is_read) {
      api.notifications.markRead(item.type, item.reference_id).catch(() => {});
    }

    if (onNavigateToMembersWithFilter) {
      onNavigateToMembersWithFilter(filterType, item);
    }
  };

  // Visible only to staff and owner roles (never athletes/members)
  if (currentRole === 'member') {
    return null;
  }

  const unreadCount = notificationData.unread_count || 0;
  const dueItems = notificationData.payment_due?.items || [];
  const expiringItems = notificationData.plan_expiring?.items || [];

  const displayedItems =
    activeTab === 'due'
      ? dueItems
      : activeTab === 'expiring'
      ? expiringItems
      : [...dueItems, ...expiringItems];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        title="Notifications & Action Alerts"
        aria-label="View Notifications"
        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
          isOpen
            ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-sm'
            : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
        }`}
      >
        <Bell className={`w-[18px] h-[18px] ${unreadCount > 0 ? 'text-slate-900' : 'text-slate-500'}`} />

        {/* Red Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown Container */}
      {isOpen && (
        <div
          className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-[390px] md:w-[420px] max-h-[82vh] sm:max-h-[540px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col z-50 overflow-hidden animate-in fade-in zoom-in-95"
          style={{ transformOrigin: 'top right' }}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  Action Notifications
                </h3>
                <span className="text-[10px] text-slate-400 font-medium block">
                  {unreadCount > 0 ? `${unreadCount} unread action items` : 'All caught up'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden xs:inline">Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({dueItems.length + expiringItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('due')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'due'
                  ? 'bg-rose-50 text-rose-800 shadow-2xs border border-rose-200'
                  : 'text-slate-500 hover:text-rose-700'
              }`}
            >
              <CreditCard className="w-3 h-3 text-rose-600" />
              <span>Payments Due ({dueItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expiring')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'expiring'
                  ? 'bg-amber-50 text-amber-800 shadow-2xs border border-amber-200'
                  : 'text-slate-500 hover:text-amber-700'
              }`}
            >
              <Calendar className="w-3 h-3 text-amber-600" />
              <span>Expiring Soon ({expiringItems.length})</span>
            </button>
          </div>

          {/* Notification Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-xs">Loading alerts...</span>
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">You're all caught up!</h4>
                <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                  No upcoming payments due or expiring membership plans within the notification window.
                </p>
              </div>
            ) : (
              <>
                {/* Section Header: Payments Due */}
                {(activeTab === 'all' || activeTab === 'due') && dueItems.length > 0 && (
                  <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                      <CreditCard className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{notificationData.summary?.payment_due_line || `${dueItems.length} members due`}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNavigateWithFilter('payment_due')}
                      className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-0.5 cursor-pointer hover:underline"
                    >
                      <span>View all</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Due Items */}
                {(activeTab === 'all' || activeTab === 'due') &&
                  dueItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNavigateWithFilter('payment_due', item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 hover:shadow-xs ${
                        item.is_read
                          ? 'bg-white border-slate-200/80 hover:bg-slate-50/80 text-slate-600'
                          : 'bg-rose-50/30 border-rose-200/90 hover:bg-rose-50/60 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          {!item.is_read && (
                            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" title="Unread" />
                          )}
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {item.member_name}
                          </span>
                          {item.is_overdue ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[9px] uppercase border border-rose-200 shrink-0">
                              Overdue
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold text-[9px] uppercase border border-amber-200 shrink-0">
                              Due Soon
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                          <span className="font-mono font-bold text-slate-900">
                            ₹{Number(item.pending_amount).toLocaleString('en-IN')}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{item.message}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {!item.is_read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkItemRead(e, item)}
                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </div>
                  ))}

                {/* Section Header: Plans Expiring */}
                {(activeTab === 'all' || activeTab === 'expiring') && expiringItems.length > 0 && (
                  <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{notificationData.summary?.plan_expiring_line || `${expiringItems.length} plans expiring`}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNavigateWithFilter('plan_expiring')}
                      className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 cursor-pointer hover:underline"
                    >
                      <span>View all</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Expiring Items */}
                {(activeTab === 'all' || activeTab === 'expiring') &&
                  expiringItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNavigateWithFilter('plan_expiring', item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 hover:shadow-xs ${
                        item.is_read
                          ? 'bg-white border-slate-200/80 hover:bg-slate-50/80 text-slate-600'
                          : 'bg-amber-50/30 border-amber-200/90 hover:bg-amber-50/60 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          {!item.is_read && (
                            <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" title="Unread" />
                          )}
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {item.member_name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase border border-amber-200 shrink-0">
                            {item.days_left === 0 ? 'Today' : `${item.days_left}d Left`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                            {item.plan_name}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{item.message}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {!item.is_read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkItemRead(e, item)}
                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span>Scoped to {gymInfo?.name || 'Current Facility'}</span>
            <span className="text-[10px] text-slate-400">Updates live (IST)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
