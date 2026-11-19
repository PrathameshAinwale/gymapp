/**
 * Notification Central Store
 * Single source of truth for all notifications across the frontend.
 *
 * Implements:
 * - One shared cache / query key
 * - Initial load once per authenticated session
 * - Real-time SSE integration with zero-REST event updates
 * - Leader-tab cross-tab synchronization with BroadcastChannel
 * - Slow conditional polling fallback (>= 60s) strictly paused on tab hidden/offline/logout
 * - Deliberate event triggers (dropdown open, tab focus after > 5min threshold, reconnect)
 * - Optimistic updates with rollback and request batching
 * - Cursor-based pagination (infinite scroll / load more)
 */

import { notificationClient } from './notificationClient.js';
import { notificationBus } from './notificationBus.js';
import { notificationRealtime } from './notificationRealtime.js';

const FOCUS_REFETCH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const FALLBACK_POLL_INTERVAL_MS = 60 * 1000; // 60 seconds (strictly no faster)
const BATCH_DEBOUNCE_MS = 300; // 300ms debounce for rapid mark-as-read clicks

const initialState = {
  unreadCount: 0,
  summary: {
    payment_due_count: 0,
    payment_due_unread: 0,
    payment_due_line: 'No payments due',
    plan_expiring_count: 0,
    plan_expiring_unread: 0,
    plan_expiring_line: 'No plans expiring soon',
  },
  paymentDue: { total: 0, unread: 0, items: [] },
  planExpiring: { total: 0, unread: 0, items: [] },
  items: [],
  nextCursor: null,
  hasMore: false,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  connectionState: 'disconnected', // 'connected' | 'connecting' | 'disconnected' | 'fallback_polling'
  lastFetchedAt: null,
};

class NotificationStore {
  constructor() {
    this.state = { ...initialState };
    this.listeners = new Set();
    this.hasInitialLoaded = false;
    this.hiddenSinceTimestamp = 0;
    this.fallbackPollTimer = null;
    this.isLeader = false;
    this.markReadQueue = new Set();
    this.markReadTimer = null;
    this.isInitialized = false;

    this.setupListeners();
  }

  setupListeners() {
    if (typeof window === 'undefined') return;

    // 1. Cross-tab bus subscription for events & mutations from peer tabs
    notificationBus.subscribe((message) => {
      if (!message) return;
      if (message.type === 'notification') {
        this.applyIncomingNotification(message.payload);
      } else if (message.type === 'read') {
        this.applyOptimisticRead(message.payload?.reference_id || message.payload?.id, false);
      } else if (message.type === 'all_read') {
        this.applyOptimisticAllRead(false);
      }
    });

    // 2. Cross-tab leadership changes: only leader connects to SSE stream
    notificationBus.onLeadershipChange((isLeader) => {
      this.isLeader = isLeader;
      if (isLeader) {
        if (notificationClient.getAuthToken()) {
          this.connectRealtime();
        }
      } else {
        // Stop SSE if this tab lost leadership
        notificationRealtime.disconnect();
        this.stopFallbackPolling();
      }
    });

    // 3. Tab visibility listener for threshold-based refetch and pausing polling
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.hiddenSinceTimestamp = Date.now();
        this.stopFallbackPolling();
      } else if (document.visibilityState === 'visible') {
        const hiddenDuration = Date.now() - (this.hiddenSinceTimestamp || Date.now());
        this.hiddenSinceTimestamp = 0;

        // Trigger refetch ONLY if tab was hidden longer than 5 minutes threshold
        if (hiddenDuration >= FOCUS_REFETCH_THRESHOLD_MS && notificationClient.getAuthToken()) {
          this.refresh({ silent: true });
        }

        // Resume fallback polling if active
        if (this.state.connectionState === 'fallback_polling') {
          this.startFallbackPolling();
        }
      }
    });

    // 4. Online/Offline events
    window.addEventListener('online', () => {
      if (notificationClient.getAuthToken()) {
        if (this.isLeader) {
          this.connectRealtime();
        } else {
          this.refresh({ silent: true });
        }
      }
    });

    window.addEventListener('offline', () => {
      notificationRealtime.disconnect();
      this.stopFallbackPolling();
    });
  }

  /**
   * Subscribe React components to store changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState() {
    return this.state;
  }

  setState(partial) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (e) {
        console.error('[NotificationStore] Listener error:', e);
      }
    });
  }

  /**
   * Initialize notifications once per authenticated session
   */
  async initOnce() {
    const token = notificationClient.getAuthToken();
    if (!token) return;

    if (this.hasInitialLoaded) return;

    const sessionKey = `pulsefit_notifs_loaded_${token.slice(-8)}`;
    const alreadyLoaded = sessionStorage.getItem(sessionKey);

    if (alreadyLoaded) {
      this.hasInitialLoaded = true;
      // Start real-time connection if leader
      if (this.isLeader) {
        this.connectRealtime();
      }
      return;
    }

    this.hasInitialLoaded = true;
    sessionStorage.setItem(sessionKey, '1');

    await this.fetchInitialData();

    if (this.isLeader) {
      this.connectRealtime();
    }
  }

  /**
   * Initial data load: unread count and first page
   */
  async fetchInitialData() {
    this.setState({ isLoading: true });
    try {
      const res = await notificationClient.fetchNotifications({ limit: 20 });
      if (res && !res.notModified) {
        this.applyFullResponse(res);
      }
    } catch (err) {
      console.warn('[NotificationStore] Initial fetch error:', err.message);
    } finally {
      this.setState({ isLoading: false, lastFetchedAt: Date.now() });
    }
  }

  /**
   * Connect real-time SSE stream with automatic fallback handling
   */
  connectRealtime() {
    if (!this.isLeader) return;

    notificationRealtime.connect({
      onMessage: (msg) => {
        if (msg.type === 'notification') {
          this.applyIncomingNotification(msg.payload);
          // Broadcast to other open tabs
          notificationBus.broadcast({ type: 'notification', payload: msg.payload });
        } else if (msg.type === 'read') {
          this.applyOptimisticRead(msg.payload?.reference_id || msg.payload?.id, false);
          notificationBus.broadcast({ type: 'read', payload: msg.payload });
        } else if (msg.type === 'all_read') {
          this.applyOptimisticAllRead(false);
          notificationBus.broadcast({ type: 'all_read', payload: msg.payload });
        }
      },
      onStatus: (status) => {
        this.setState({ connectionState: status });

        // If disconnected after retries, activate slow fallback polling
        if (status === 'disconnected') {
          this.startFallbackPolling();
        } else if (status === 'connected') {
          this.stopFallbackPolling();
        }
      },
    });
  }

  /**
   * Fallback slow conditional polling (no faster than 60s, paused when hidden/offline)
   */
  startFallbackPolling() {
    this.stopFallbackPolling();
    this.setState({ connectionState: 'fallback_polling' });

    this.fallbackPollTimer = setInterval(async () => {
      // Guard: strictly pause if tab is hidden, user is offline, or not logged out
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (!notificationClient.getAuthToken()) return;

      try {
        const res = await notificationClient.fetchNotifications({ limit: 20 });
        if (res && !res.notModified) {
          this.applyFullResponse(res);
        }
      } catch (e) {
        // Network error during slow poll, ignore silently
      }
    }, FALLBACK_POLL_INTERVAL_MS);
  }

  stopFallbackPolling() {
    if (this.fallbackPollTimer) {
      clearInterval(this.fallbackPollTimer);
      this.fallbackPollTimer = null;
    }
  }

  /**
   * Apply an incoming real-time notification directly to state without REST fetch
   */
  applyIncomingNotification(rawPayload) {
    const notif = rawPayload?.data || rawPayload;
    if (!notif) return;

    const existingIndex = this.state.items.findIndex(
      (it) => it.id === notif.id || (notif.reference_id && it.reference_id === notif.reference_id)
    );

    let updatedItems = [...this.state.items];
    let countIncrement = 0;

    if (existingIndex >= 0) {
      // Update existing item
      const oldItem = updatedItems[existingIndex];
      updatedItems[existingIndex] = { ...oldItem, ...notif };
      if (oldItem.is_read && !notif.is_read) {
        countIncrement = 1;
      }
    } else {
      // Prepend new item
      updatedItems = [notif, ...updatedItems];
      if (!notif.is_read) {
        countIncrement = 1;
      }
    }

    // Reconstruct groups if type matches
    const paymentDueItems = updatedItems.filter((i) => i.type === 'payment_due');
    const planExpiringItems = updatedItems.filter((i) => i.type === 'plan_expiring');
    const unreadDue = paymentDueItems.filter((i) => !i.is_read).length;
    const unreadExp = planExpiringItems.filter((i) => !i.is_read).length;

    this.setState({
      items: updatedItems,
      unreadCount: Math.max(0, this.state.unreadCount + countIncrement),
      paymentDue: {
        total: paymentDueItems.length,
        unread: unreadDue,
        items: paymentDueItems,
      },
      planExpiring: {
        total: planExpiringItems.length,
        unread: unreadExp,
        items: planExpiringItems,
      },
      summary: {
        ...this.state.summary,
        payment_due_count: paymentDueItems.length,
        payment_due_unread: unreadDue,
        plan_expiring_count: planExpiringItems.length,
        plan_expiring_unread: unreadExp,
      },
    });
  }

  /**
   * Deliberate refresh (e.g. user opening dropdown or clicking refresh)
   */
  async refresh({ silent = false } = {}) {
    if (!notificationClient.getAuthToken()) return;

    if (!silent) this.setState({ isRefreshing: true });

    try {
      const res = await notificationClient.fetchNotifications({ limit: 20 });
      if (res && !res.notModified) {
        this.applyFullResponse(res);
      }
    } catch (err) {
      console.warn('[NotificationStore] Refresh error:', err.message);
    } finally {
      this.setState({ isRefreshing: false, lastFetchedAt: Date.now() });
    }
  }

  /**
   * Fetch older notifications for infinite scroll / load more
   */
  async fetchMore() {
    if (this.state.isLoadingMore || !this.state.hasMore || !this.state.nextCursor) {
      return;
    }

    this.setState({ isLoadingMore: true });
    try {
      const res = await notificationClient.fetchNotifications({
        limit: 20,
        cursor: this.state.nextCursor,
      });

      if (res && Array.isArray(res.items)) {
        // Filter out duplicate IDs
        const existingIds = new Set(this.state.items.map((i) => String(i.id)));
        const newItems = res.items.filter((i) => !existingIds.has(String(i.id)));

        this.setState({
          items: [...this.state.items, ...newItems],
          nextCursor: res.next_cursor || null,
          hasMore: Boolean(res.has_more),
        });
      }
    } catch (err) {
      console.warn('[NotificationStore] Fetch more error:', err.message);
    } finally {
      this.setState({ isLoadingMore: false });
    }
  }

  /**
   * Mark item as read with optimistic updates and batched API request
   */
  async markAsRead(itemOrReferenceId, itemType = 'general', itemId = null) {
    const referenceId = typeof itemOrReferenceId === 'string'
      ? itemOrReferenceId
      : (itemOrReferenceId?.reference_id || itemOrReferenceId?.id);
    const type = typeof itemOrReferenceId === 'object' ? (itemOrReferenceId?.type || itemType) : itemType;
    const id = itemId || (typeof itemOrReferenceId === 'object' ? itemOrReferenceId?.id : null);

    if (!referenceId && !id) return;

    // Snapshot for rollback on failure
    const snapshot = {
      items: this.state.items,
      unreadCount: this.state.unreadCount,
      paymentDue: this.state.paymentDue,
      planExpiring: this.state.planExpiring,
    };

    // 1. Optimistic local update
    this.applyOptimisticRead(referenceId || id, true);

    // 2. Queue for batched execution
    this.markReadQueue.add(JSON.stringify({ type, reference_id: referenceId, id }));

    if (this.markReadTimer) clearTimeout(this.markReadTimer);
    this.markReadTimer = setTimeout(async () => {
      const queueItems = Array.from(this.markReadQueue).map((str) => JSON.parse(str));
      this.markReadQueue.clear();

      for (const payload of queueItems) {
        try {
          await notificationClient.markAsRead(payload);
        } catch (err) {
          console.error('[NotificationStore] Mark read failed, rolling back:', err);
          // Rollback to snapshot
          this.setState(snapshot);
          break;
        }
      }
    }, BATCH_DEBOUNCE_MS);
  }

  applyOptimisticRead(targetRef, shouldBroadcast = false) {
    const targetStr = String(targetRef);

    const updatedItems = this.state.items.map((it) => {
      if (String(it.id) === targetStr || String(it.reference_id) === targetStr) {
        return { ...it, is_read: true };
      }
      return it;
    });

    const updateGroup = (group) => {
      const items = (group?.items || []).map((it) => {
        if (String(it.id) === targetStr || String(it.reference_id) === targetStr) {
          return { ...it, is_read: true };
        }
        return it;
      });
      return {
        ...group,
        items,
        unread: items.filter((i) => !i.is_read).length,
      };
    };

    const newPaymentDue = updateGroup(this.state.paymentDue);
    const newPlanExpiring = updateGroup(this.state.planExpiring);
    const newUnreadCount = Math.max(0, this.state.unreadCount - 1);

    this.setState({
      items: updatedItems,
      unreadCount: newUnreadCount,
      paymentDue: newPaymentDue,
      planExpiring: newPlanExpiring,
      summary: {
        ...this.state.summary,
        payment_due_unread: newPaymentDue.unread,
        plan_expiring_unread: newPlanExpiring.unread,
      },
    });

    if (shouldBroadcast) {
      notificationBus.broadcastMutation({ type: 'read', payload: { reference_id: targetRef } });
    }
  }

  /**
   * Mark all notifications read with optimistic update and rollback
   */
  async markAllAsRead() {
    if (this.state.unreadCount === 0) return;

    const snapshot = {
      items: this.state.items,
      unreadCount: this.state.unreadCount,
      paymentDue: this.state.paymentDue,
      planExpiring: this.state.planExpiring,
    };

    // 1. Optimistic update
    this.applyOptimisticAllRead(true);

    // 2. Server API call
    try {
      await notificationClient.markAllAsRead();
    } catch (err) {
      console.error('[NotificationStore] Mark all read failed, rolling back:', err);
      this.setState(snapshot);
    }
  }

  applyOptimisticAllRead(shouldBroadcast = false) {
    const updatedItems = this.state.items.map((it) => ({ ...it, is_read: true }));

    const markGroupRead = (group) => ({
      ...group,
      unread: 0,
      items: (group?.items || []).map((it) => ({ ...it, is_read: true })),
    });

    this.setState({
      items: updatedItems,
      unreadCount: 0,
      paymentDue: markGroupRead(this.state.paymentDue),
      planExpiring: markGroupRead(this.state.planExpiring),
      summary: {
        ...this.state.summary,
        payment_due_unread: 0,
        plan_expiring_unread: 0,
      },
    });

    if (shouldBroadcast) {
      notificationBus.broadcastMutation({ type: 'all_read', payload: {} });
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id) {
    const snapshot = { items: this.state.items, unreadCount: this.state.unreadCount };

    const targetItem = this.state.items.find((i) => i.id === id);
    const unreadReduction = targetItem && !targetItem.is_read ? 1 : 0;

    this.setState({
      items: this.state.items.filter((i) => i.id !== id),
      unreadCount: Math.max(0, this.state.unreadCount - unreadReduction),
    });

    try {
      await notificationClient.deleteNotification(id);
    } catch (err) {
      console.error('[NotificationStore] Delete failed, rolling back:', err);
      this.setState(snapshot);
    }
  }

  /**
   * Apply full response payload from server
   */
  applyFullResponse(res) {
    if (!res) return;

    const dueItems = res.payment_due?.items || [];
    const expItems = res.plan_expiring?.items || [];
    const backendItems = res.items || [...dueItems, ...expItems];

    this.setState({
      unreadCount: Number(res.unread_count ?? 0),
      summary: res.summary || this.state.summary,
      paymentDue: res.payment_due || { total: dueItems.length, unread: 0, items: dueItems },
      planExpiring: res.plan_expiring || { total: expItems.length, unread: 0, items: expItems },
      items: backendItems,
      nextCursor: res.next_cursor || null,
      hasMore: Boolean(res.has_more),
    });
  }

  /**
   * Reset store on user logout
   */
  resetOnLogout() {
    this.hasInitialLoaded = false;
    this.stopFallbackPolling();
    notificationRealtime.disconnect();
    notificationClient.clearETagCache();
    this.setState({ ...initialState });
  }
}

export const notificationStore = new NotificationStore();
export default notificationStore;
