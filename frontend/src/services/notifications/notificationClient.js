/**
 * Notification Dedicated API Client
 * Features:
 * - AbortController cancellation
 * - In-flight duplicate request coalescing
 * - ETag conditional requests (If-None-Match -> 304 handling)
 * - Safe base URL resolution matching project conventions
 * - Centralized auth & error handling
 */

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('pulsefit_api_url') || localStorage.getItem('archfit_api_url');
    if (saved) return saved.replace(/\/+$/, '');
  }
  const isProd = Boolean(typeof import.meta !== 'undefined' && import.meta?.env?.PROD);
  const viteUrl = typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL;
  return isProd
    ? (viteUrl || 'https://archfit.archenterprises.co.in/api/v1').replace(/\/+$/, '')
    : 'http://127.0.0.1:8000/api/v1';
};

const getActiveGymId = () => {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem('pulsefit_gym_id');
  return id ? parseInt(id, 10) : null;
};

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pulsefit_token');
};

const getHeaders = (customHeaders = {}) => {
  const token = getAuthToken();
  const gymId = getActiveGymId();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...customHeaders,
  };
  if (gymId) {
    headers['X-Gym-Id'] = String(gymId);
    headers['X-Gym-ID'] = String(gymId);
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// In-flight request deduplication map
const inflightRequests = new Map();
// Cache of ETags per endpoint
const etagStore = new Map();

/**
 * Execute an API call with timeout, dedup, and ETag handling
 */
const request = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const gymId = getActiveGymId() || 'all';
  const token = getAuthToken() ? getAuthToken().slice(-8) : 'anon';
  const dedupeKey = `${method}:${endpoint}:${gymId}:${token}`;

  // Deduplicate concurrent in-flight GET requests
  if (method === 'GET' && inflightRequests.has(dedupeKey)) {
    return inflightRequests.get(dedupeKey);
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  const signal = options.signal || controller.signal;
  const timeoutMs = options.timeoutMs || 10000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = getHeaders(options.headers);

  // Send If-None-Match if we have a saved ETag for this GET endpoint
  if (method === 'GET' && etagStore.has(dedupeKey)) {
    headers['If-None-Match'] = etagStore.get(dedupeKey);
  }

  const execute = async () => {
    try {
      const res = await fetch(url, {
        ...options,
        method,
        headers,
        signal,
      });

      clearTimeout(timer);

      // Handle 304 Not Modified
      if (res.status === 304) {
        return { notModified: true };
      }

      // Store ETag if present in response
      const etag = res.headers.get('ETag');
      if (etag && method === 'GET') {
        etagStore.set(dedupeKey, etag);
      }

      if (!res.ok) {
        let errorData = null;
        try {
          errorData = await res.json();
        } catch {}
        const error = new Error(errorData?.message || `HTTP error ${res.status}`);
        error.status = res.status;
        error.data = errorData;
        throw error;
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const abortErr = new Error('Request was aborted or timed out');
        abortErr.isAborted = true;
        throw abortErr;
      }
      throw err;
    } finally {
      if (method === 'GET') {
        inflightRequests.delete(dedupeKey);
      }
    }
  };

  const promise = execute();
  if (method === 'GET') {
    inflightRequests.set(dedupeKey, promise);
  }
  return promise;
};

export const notificationClient = {
  getApiBaseUrl,
  getAuthToken,
  getActiveGymId,

  /**
   * Fetch notification summary and paginated items
   */
  async fetchNotifications(params = {}, options = {}) {
    const gymId = getActiveGymId();
    const query = new URLSearchParams({
      ...(gymId ? { gym_id: gymId } : {}),
      ...params,
    }).toString();

    return request(`/notifications${query ? `?${query}` : ''}`, {
      ...options,
      method: 'GET',
    });
  },

  /**
   * Fetch cheap cached unread count
   */
  async fetchUnreadCount(options = {}) {
    const gymId = getActiveGymId();
    const query = new URLSearchParams(gymId ? { gym_id: gymId } : {}).toString();

    return request(`/notifications/unread-count${query ? `?${query}` : ''}`, {
      ...options,
      method: 'GET',
    });
  },

  /**
   * Mark single item as read (idempotent)
   */
  async markAsRead(payload = {}, options = {}) {
    const gymId = getActiveGymId();
    const body = {
      ...(gymId ? { gym_id: gymId } : {}),
      ...payload,
    };

    return request('/notifications/read', {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Mark all active notifications as read today
   */
  async markAllAsRead(options = {}) {
    const gymId = getActiveGymId();
    const body = gymId ? { gym_id: gymId } : {};

    return request('/notifications/mark-all-read', {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id, options = {}) {
    const gymId = getActiveGymId();
    const query = new URLSearchParams(gymId ? { gym_id: gymId } : {}).toString();

    return request(`/notifications/${id}${query ? `?${query}` : ''}`, {
      ...options,
      method: 'DELETE',
    });
  },

  /**
   * Get member IDs for directory filter
   */
  async getMemberIds(type = 'payment_due', options = {}) {
    const gymId = getActiveGymId();
    const query = new URLSearchParams({
      type,
      ...(gymId ? { gym_id: gymId } : {}),
    }).toString();

    return request(`/notifications/member-ids${query ? `?${query}` : ''}`, {
      ...options,
      method: 'GET',
    });
  },

  /**
   * Clear all stored ETags
   */
  clearETagCache() {
    etagStore.clear();
  },
};

export default notificationClient;
