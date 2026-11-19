/**
 * Cross-Tab Coordination & Event Bus
 * Uses BroadcastChannel to coordinate multi-tab behavior:
 * 1. Leader election: Exactly one tab opens and holds the Server-Sent Events (SSE) stream.
 * 2. Cross-tab updates: When leader receives SSE events, broadcasts to all tabs.
 * 3. Cross-tab mutations: When user reads in one tab, all tabs update instantly without polling.
 */

const CHANNEL_NAME = 'pulsefit_notifications_bus_v1';
const HEARTBEAT_INTERVAL_MS = 4000;
const LEADER_TIMEOUT_MS = 9000;

class NotificationBus {
  constructor() {
    this.tabId = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    this.channel = null;
    this.isLeader = false;
    this.leaderId = null;
    this.lastLeaderHeartbeat = 0;
    this.heartbeatTimer = null;
    this.watchdogTimer = null;
    this.listeners = new Set();
    this.leadershipListeners = new Set();

    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => this.handleMessage(event.data);
      } catch (e) {
        console.warn('[NotificationBus] BroadcastChannel error, falling back to standalone tab:', e);
      }
    }

    if (!this.channel) {
      // Standalone mode if BroadcastChannel is unsupported
      this.isLeader = true;
      return;
    }

    // Ping to discover active leader
    this.postMessage({ type: 'DISCOVER_LEADER', from: this.tabId });

    // Election timeout: if no leader responds in 600ms, claim leadership
    setTimeout(() => {
      if (!this.leaderId) {
        this.claimLeadership();
      }
    }, 600);

    // Watchdog timer to detect leader crash or tab close
    this.watchdogTimer = setInterval(() => {
      if (!this.isLeader && this.leaderId) {
        if (Date.now() - this.lastLeaderHeartbeat > LEADER_TIMEOUT_MS) {
          // Leader died, claim leadership
          this.claimLeadership();
        }
      }
    }, 3000);

    // Resign on window unload
    window.addEventListener('beforeunload', () => {
      if (this.isLeader) {
        this.postMessage({ type: 'LEADER_RESIGN', from: this.tabId });
      }
    });
  }

  handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'DISCOVER_LEADER':
        if (this.isLeader) {
          this.postMessage({ type: 'LEADER_HEARTBEAT', from: this.tabId });
        }
        break;

      case 'LEADER_HEARTBEAT':
        this.leaderId = msg.from;
        this.lastLeaderHeartbeat = Date.now();
        if (this.isLeader && msg.from !== this.tabId) {
          // Conflict resolution: lower tab ID wins
          if (msg.from < this.tabId) {
            this.stepDown();
          }
        }
        break;

      case 'LEADER_CLAIM':
        this.leaderId = msg.from;
        this.lastLeaderHeartbeat = Date.now();
        if (this.isLeader && msg.from !== this.tabId) {
          if (msg.from < this.tabId) {
            this.stepDown();
          }
        }
        break;

      case 'LEADER_RESIGN':
        if (this.leaderId === msg.from) {
          this.leaderId = null;
          // Step up immediately
          this.claimLeadership();
        }
        break;

      case 'BROADCAST_EVENT':
        // SSE event passed down from leader tab to follower tabs
        this.notifyListeners(msg.payload);
        break;

      case 'BROADCAST_MUTATION':
        // User action (mark as read / mark all) executed in peer tab
        this.notifyListeners(msg.payload);
        break;

      default:
        break;
    }
  }

  claimLeadership() {
    this.isLeader = true;
    this.leaderId = this.tabId;
    this.lastLeaderHeartbeat = Date.now();
    this.postMessage({ type: 'LEADER_CLAIM', from: this.tabId });

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.postMessage({ type: 'LEADER_HEARTBEAT', from: this.tabId });
    }, HEARTBEAT_INTERVAL_MS);

    this.notifyLeadershipChange(true);
  }

  stepDown() {
    this.isLeader = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.notifyLeadershipChange(false);
  }

  postMessage(data) {
    if (this.channel) {
      try {
        this.channel.postMessage(data);
      } catch (err) {
        // Channel closed
      }
    }
  }

  /**
   * Broadcast an event to all tabs
   */
  broadcast(payload) {
    this.postMessage({ type: 'BROADCAST_EVENT', from: this.tabId, payload });
  }

  /**
   * Broadcast a user mutation (e.g. read status change) to all tabs
   */
  broadcastMutation(payload) {
    this.postMessage({ type: 'BROADCAST_MUTATION', from: this.tabId, payload });
  }

  /**
   * Subscribe to messages from bus
   */
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notifyListeners(payload) {
    this.listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error('[NotificationBus] Listener error:', e);
      }
    });
  }

  /**
   * Subscribe to leadership status change
   */
  onLeadershipChange(fn) {
    this.leadershipListeners.add(fn);
    fn(this.isLeader);
    return () => this.leadershipListeners.delete(fn);
  }

  notifyLeadershipChange(status) {
    this.leadershipListeners.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.error('[NotificationBus] Leadership callback error:', e);
      }
    });
  }

  destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export const notificationBus = new NotificationBus();
export default notificationBus;

