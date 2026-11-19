/**
 * Real-time Server-Sent Events (SSE) Connection Manager
 * Features:
 * - Native EventSource connection with token authentication
 * - Exponential backoff with jitter on disconnect
 * - Catch-up on reconnect via 'since' parameter
 * - Clean disconnect handling
 */

import { notificationClient } from './notificationClient.js';

const INITIAL_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 60000;
const JITTER_FACTOR = 0.2; // +/- 20%

class NotificationRealtimeManager {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.retryTimer = null;
    this.lastEventTimestamp = 0;
    this.onMessageCallback = null;
    this.onStatusCallback = null;
    this.shouldStayConnected = false;
  }

  /**
   * Connect to SSE stream
   */
  connect(callbacks = {}) {
    if (typeof window === 'undefined') return;

    this.onMessageCallback = callbacks.onMessage || null;
    this.onStatusCallback = callbacks.onStatus || null;
    this.shouldStayConnected = true;

    this.openStream();
  }

  openStream() {
    this.closeStream();

    const token = notificationClient.getAuthToken();
    if (!token || !this.shouldStayConnected) {
      this.updateStatus('disconnected');
      return;
    }

    const baseUrl = notificationClient.getApiBaseUrl();
    const gymId = notificationClient.getActiveGymId();

    const queryParams = new URLSearchParams({
      token,
      ...(gymId ? { gym_id: gymId } : {}),
      ...(this.lastEventTimestamp > 0 ? { since: this.lastEventTimestamp } : {}),
    });

    const streamUrl = `${baseUrl}/notifications/stream?${queryParams.toString()}`;

    try {
      this.updateStatus('connecting');
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.retryAttempts = 0;
        this.updateStatus('connected');
      };

      // General notifications
      this.eventSource.addEventListener('notification', (e) => {
        try {
          const payload = JSON.parse(e.data);
          this.lastEventTimestamp = Math.floor(Date.now() / 1000);
          if (this.onMessageCallback) {
            this.onMessageCallback({ type: 'notification', payload });
          }
        } catch (err) {
          console.warn('[SSE] Error parsing notification:', err);
        }
      });

      // Mark read events
      this.eventSource.addEventListener('read', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (this.onMessageCallback) {
            this.onMessageCallback({ type: 'read', payload });
          }
        } catch (err) {
          console.warn('[SSE] Error parsing read event:', err);
        }
      });

      // Mark all read events
      this.eventSource.addEventListener('all_read', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (this.onMessageCallback) {
            this.onMessageCallback({ type: 'all_read', payload });
          }
        } catch (err) {
          console.warn('[SSE] Error parsing all_read event:', err);
        }
      });

      // Server-initiated graceful cycle
      this.eventSource.addEventListener('reconnect', () => {
        // Server gracefully ending slice to cycle workers; reconnect immediately without delay
        this.openStream();
      });

      this.eventSource.onerror = (err) => {
        this.closeStream();
        this.scheduleReconnect();
      };
    } catch (e) {
      console.warn('[SSE] Failed to initialize EventSource:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!this.shouldStayConnected) return;

    this.updateStatus('reconnecting');
    this.retryAttempts += 1;

    // Exponential backoff: base * 2^(attempts-1) up to MAX_RETRY_DELAY_MS
    let delay = Math.min(
      INITIAL_RETRY_DELAY_MS * Math.pow(2, this.retryAttempts - 1),
      MAX_RETRY_DELAY_MS
    );

    // Apply jitter (+/- 20%)
    const jitter = delay * JITTER_FACTOR * (Math.random() * 2 - 1);
    delay = Math.max(1000, Math.round(delay + jitter));

    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (this.shouldStayConnected) {
        this.openStream();
      }
    }, delay);
  }

  updateStatus(status) {
    if (this.onStatusCallback) {
      try {
        this.onStatusCallback(status);
      } catch (e) {}
    }
  }

  closeStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }

  disconnect() {
    this.shouldStayConnected = false;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.closeStream();
    this.updateStatus('disconnected');
  }
}

export const notificationRealtime = new NotificationRealtimeManager();
export default notificationRealtime;
