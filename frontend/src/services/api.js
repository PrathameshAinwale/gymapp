// API Service Client for Laravel REST API Backend

const LIVE_PRODUCTION_API_URL = 'https://archfit.archenterprises.co.in/api/v1';
const CURRENT_LAN_IP = '192.168.1.40';

const isRunningInCapacitor = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Capacitor !== undefined ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && window.navigator?.userAgent?.includes('Android')) ||
    (window.location.protocol === 'http:' && window.location.hostname === 'localhost' && window.navigator?.userAgent?.includes('Android')) ||
    window.navigator?.userAgent?.includes('Capacitor')
  );
};

const isLocalHost = (hostname) => {
  if (!hostname) return true;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)
  );
};

const getOriginApiUrl = () => {
  if (typeof window === 'undefined') return null;
  const { protocol, host } = window.location;
  if (!host) return null;
  return `${protocol}//${host}/api/v1`;
};

const getDefaultHosts = () => {
  const envApiUrl = import.meta.env?.VITE_API_BASE_URL?.trim();
  const originApiUrl = getOriginApiUrl();
  const inCapacitor = isRunningInCapacitor();
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  if (inCapacitor) {
    return Array.from(
      new Set(
        [
          envApiUrl,
          LIVE_PRODUCTION_API_URL,
          `http://${CURRENT_LAN_IP}:8000/api/v1`,
          'http://10.0.2.2:8000/api/v1',
        ].filter(Boolean)
      )
    );
  }

  // Running on a live website (domain is not localhost / not private LAN IP)
  if (currentHost && !isLocalHost(currentHost)) {
    return Array.from(
      new Set(
        [
          envApiUrl,
          originApiUrl,
          LIVE_PRODUCTION_API_URL,
        ].filter(Boolean)
      )
    );
  }

  // Local development machine
  const hosts = [];
  if (envApiUrl) hosts.push(envApiUrl);
  hosts.push('http://127.0.0.1:8000/api/v1');
  hosts.push('http://localhost:8000/api/v1');

  if (currentHost && /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(currentHost)) {
    hosts.push(`http://${currentHost}:8000/api/v1`);
  }
  hosts.push(`http://${CURRENT_LAN_IP}:8000/api/v1`);

  return Array.from(new Set(hosts.filter(Boolean)));
};

const CANDIDATE_API_HOSTS = getDefaultHosts();

let activeBaseUrl = (function () {
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const isLive = currentHost && !isLocalHost(currentHost);

    // If on localhost / LAN development: strictly lock to local Laravel backend
    if (!isLive) {
      localStorage.removeItem('archfit_api_url');
      localStorage.removeItem('pulsefit_api_url');
      return 'http://127.0.0.1:8000/api/v1';
    }

    const inCapacitor = isRunningInCapacitor();
    const originApiUrl = getOriginApiUrl();
    const saved = localStorage.getItem('archfit_api_url') || localStorage.getItem('pulsefit_api_url');

    if (isLive) {
      if (
        saved &&
        (saved.includes('127.0.0.1') ||
          saved.includes('localhost') ||
          saved.includes('192.168.') ||
          saved.includes(':8000'))
      ) {
        localStorage.removeItem('archfit_api_url');
        localStorage.removeItem('pulsefit_api_url');
      } else if (saved && saved.startsWith('https://')) {
        return saved;
      }
      return originApiUrl || LIVE_PRODUCTION_API_URL;
    }

    if (inCapacitor) {
      if (
        saved &&
        !saved.includes('127.0.0.1') &&
        !saved.includes('localhost') &&
        !saved.includes('192.168.1.48')
      ) {
        return saved;
      }
      return LIVE_PRODUCTION_API_URL;
    }
  }
  return 'http://127.0.0.1:8000/api/v1';
})();

export const getActiveApiUrl = () => activeBaseUrl;
export const setActiveApiUrl = (url) => {
  activeBaseUrl = url;
  if (typeof window !== 'undefined') {
    localStorage.setItem('archfit_api_url', url);
    localStorage.setItem('pulsefit_api_url', url);
  }
};

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Fast fetch helper with timeout to avoid browser hangs
const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
};

// High-Performance In-Flight Deduplication & Memory Cache for GET requests
const inflightGetRequests = new Map();
const getResponseCache = new Map();
const CACHE_TTL_MS = 6000; // 6s cache for duplicate GET queries

// Universal smart fetch wrapper that auto-fails over if the endpoint host is unreachable
const apiFetch = async (urlOrPath, options = {}) => {
  let relativePath = urlOrPath;
  const allKnownHosts = [
    activeBaseUrl,
    LIVE_PRODUCTION_API_URL,
    getOriginApiUrl(),
    'http://127.0.0.1:8000/api/v1',
    'http://localhost:8000/api/v1',
    `http://${CURRENT_LAN_IP}:8000/api/v1`,
    ...CANDIDATE_API_HOSTS
  ].filter(Boolean);

  for (const host of allKnownHosts) {
    if (relativePath.startsWith(host)) {
      relativePath = relativePath.slice(host.length);
      break;
    }
  }
  if (relativePath.startsWith('/api/v1')) {
    relativePath = relativePath.slice('/api/v1'.length);
  }
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }

  const method = (options.method || 'GET').toUpperCase();
  const currentGymId = getActiveGymId();
  const token = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_token') : '';
  const tokenSnippet = token ? token.slice(-8) : 'anon';
  const cacheKey = `${method}:${relativePath}:${currentGymId || 'all'}:${tokenSnippet}`;

  // On data mutations, invalidate all GET caches immediately so fresh data is loaded
  if (method !== 'GET') {
    getResponseCache.clear();
  } else if (!options.skipCache) {
    // 1. Check in-memory fresh cache
    const cached = getResponseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.response.clone();
    }

    // 2. Check if identical GET request is already in-flight
    if (inflightGetRequests.has(cacheKey)) {
      try {
        const res = await inflightGetRequests.get(cacheKey);
        return res.clone();
      } catch (err) {
        // Fallback to fetch if in-flight failed
      }
    }
  }

  const executeFetch = async () => {
    const inCapacitor = isRunningInCapacitor();
    const currentHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
    const isLive = typeof window !== 'undefined' && currentHost && !isLocalHost(currentHost);
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

    let rawHosts = [];
    if (inCapacitor) {
      rawHosts = [
        activeBaseUrl,
        LIVE_PRODUCTION_API_URL,
        ...CANDIDATE_API_HOSTS,
        `http://${CURRENT_LAN_IP}:8000/api/v1`,
        'http://10.0.2.2:8000/api/v1',
      ].filter((h) => Boolean(h) && !h.includes('127.0.0.1') && !h.includes('localhost'));
    } else if (isLive) {
      // On live production, strictly use live endpoints (no local LAN IPs or insecure http on https)
      rawHosts = [
        activeBaseUrl,
        getOriginApiUrl(),
        LIVE_PRODUCTION_API_URL,
        ...CANDIDATE_API_HOSTS,
      ].filter((h) => {
        if (!h) return false;
        try {
          const urlObj = new URL(h, window.location.origin);
          return !isLocalHost(urlObj.hostname);
        } catch {
          return true;
        }
      });
    } else {
      // Local development machine - strictly use local backend server only (via Vite proxy or direct port 8000)
      rawHosts = [
        getOriginApiUrl(),
        'http://127.0.0.1:8000/api/v1',
        'http://localhost:8000/api/v1',
        `http://${currentHost}:8000/api/v1`,
        `http://${CURRENT_LAN_IP}:8000/api/v1`,
      ].filter(Boolean);
    }

    if (isHttps) {
      rawHosts = rawHosts.filter((h) => h.startsWith('https://'));
    }

    const hostsToTry = Array.from(new Set(rawHosts));

    let lastError = null;
    const timeoutMs = 8000;
    for (const host of hostsToTry) {
      try {
        const cleanHost = host.replace(/\/+$/, '');
        const cleanPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
        const fullUrl = `${cleanHost}${cleanPath}`;
        const res = await fetchWithTimeout(fullUrl, options, timeoutMs);
        if (activeBaseUrl !== host) {
          activeBaseUrl = host;
          if (typeof window !== 'undefined') {
            localStorage.setItem('archfit_api_url', host);
            localStorage.setItem('pulsefit_api_url', host);
          }
        }
        return res;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Network error: Unable to connect to backend server');
  };

  if (method === 'GET' && !options.skipCache) {
    const promise = executeFetch();
    inflightGetRequests.set(cacheKey, promise);
    try {
      const res = await promise;
      // Store clone in cache for subsequent calls
      getResponseCache.set(cacheKey, { timestamp: Date.now(), response: res.clone() });
      return res;
    } finally {
      inflightGetRequests.delete(cacheKey);
    }
  }

  return await executeFetch();
};

export const getActiveGymId = () => {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem('pulsefit_gym_id');
  return id ? parseInt(id, 10) : null;
};

const withGymParam = (params = {}) => {
  const gymId = params.gym_id || params.gymId || getActiveGymId();
  if (gymId && !params.gym_id) {
    return { ...params, gym_id: gymId };
  }
  return params;
};

const getHeaders = (customHeaders = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_token') : null;
  const gymId = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_gym_id') : null;
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

const handleResponse = async (response) => {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Invalid JSON response: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    const errorMsg = data?.message || (data?.errors ? Object.values(data.errors).flat().join(', ') : 'Request failed');
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  // Clear in-memory cache on auth state changes
  clearCache: () => {
    getResponseCache.clear();
    inflightGetRequests.clear();
  },

  // Auth Endpoints
  auth: {
    login: async (loginOrEmail, password) => {
      const res = await apiFetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          login: loginOrEmail,
          email: loginOrEmail,
          phone: loginOrEmail,
          password
        }),
      });
      return handleResponse(res);
    },
    register: async (userData) => {
      const res = await apiFetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      return handleResponse(res);
    },
    me: async () => {
      const res = await apiFetch(`${API_BASE_URL}/auth/me`, { headers: getHeaders() });
      return handleResponse(res);
    },
    changePassword: async (currentPassword, newPassword) => {
      const res = await apiFetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: newPassword,
        }),
      });
      return handleResponse(res);
    },
    logout: async () => {
      try {
        await apiFetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: getHeaders(),
        });
      } catch (err) {
        console.warn('Backend logout call failed or server unreachable:', err.message);
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pulsefit_token');
        localStorage.removeItem('pulsefit_user');
      }
      return { success: true };
    },
  },

  // Gym Settings & Branding
  gym: {
    getInfo: async () => {
      const res = await apiFetch(`${API_BASE_URL}/gym-info`, { headers: getHeaders() });
      return handleResponse(res);
    },
    updateInfo: async (gymData) => {
      const res = await apiFetch(`${API_BASE_URL}/gym-info`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(gymData),
      });
      return handleResponse(res);
    },
    getGateOverrides: async () => {
      const res = await apiFetch(`${API_BASE_URL}/gate-overrides`, { headers: getHeaders() });
      return handleResponse(res);
    },
    addGateOverride: async (overrideData) => {
      const res = await apiFetch(`${API_BASE_URL}/gate-overrides`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(overrideData),
      });
      return handleResponse(res);
    },
  },

  // Dashboard & Analytics
  dashboard: {
    getOwnerStats: async () => {
      const res = await apiFetch(`${API_BASE_URL}/dashboard/owner-stats`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Members Endpoints
  members: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/members${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (memberData) => {
      const payload = withGymParam(memberData);
      const res = await apiFetch(`${API_BASE_URL}/members`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    update: async (id, memberData) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(memberData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    renewPlan: async (id, planId) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${id}/renew`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ plan_id: planId }),
      });
      return handleResponse(res);
    },
    getTransformations: async (memberId) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${memberId}/transformations`, { headers: getHeaders() });
      return handleResponse(res);
    },
    addTransformation: async (memberId, data) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${memberId}/transformations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },

  // Trainers Endpoints
  trainers: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/trainers${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/trainers/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (trainerData) => {
      const payload = withGymParam(trainerData);
      const res = await apiFetch(`${API_BASE_URL}/trainers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    update: async (id, trainerData) => {
      const res = await apiFetch(`${API_BASE_URL}/trainers/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(trainerData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/trainers/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Plans Endpoints
  plans: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/plans${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (planData) => {
      const payload = withGymParam(planData);
      const res = await apiFetch(`${API_BASE_URL}/plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    update: async (id, planData) => {
      const res = await apiFetch(`${API_BASE_URL}/plans/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/plans/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Offers Endpoints
  offers: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/offers${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (offerData) => {
      const payload = withGymParam(offerData);
      const res = await apiFetch(`${API_BASE_URL}/offers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    update: async (id, offerData) => {
      const res = await apiFetch(`${API_BASE_URL}/offers/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(offerData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/offers/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    toggle: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/offers/${id}/toggle`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Membership Transfers Endpoints
  transfers: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/transfers${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (transferData) => {
      const payload = withGymParam(transferData);
      const res = await apiFetch(`${API_BASE_URL}/transfers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
  },

  // PT Plans Endpoints
  ptPlans: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/pt-plans`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (planData) => {
      const res = await apiFetch(`${API_BASE_URL}/pt-plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      return handleResponse(res);
    },
    update: async (id, planData) => {
      const res = await apiFetch(`${API_BASE_URL}/pt-plans/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/pt-plans/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Recovery Plans Endpoints
  recoveryPlans: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/recovery-plans`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (planData) => {
      const res = await apiFetch(`${API_BASE_URL}/recovery-plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      return handleResponse(res);
    },
    update: async (id, planData) => {
      const res = await apiFetch(`${API_BASE_URL}/recovery-plans/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/recovery-plans/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Classes Endpoints
  classes: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/classes`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (classData) => {
      const res = await apiFetch(`${API_BASE_URL}/classes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(classData),
      });
      return handleResponse(res);
    },
    update: async (id, classData) => {
      const res = await apiFetch(`${API_BASE_URL}/classes/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(classData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/classes/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    book: async (classId, memberId) => {
      const res = await apiFetch(`${API_BASE_URL}/classes/${classId}/book`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ member_id: memberId }),
      });
      return handleResponse(res);
    },
    cancelBooking: async (classId, memberId) => {
      const res = await apiFetch(`${API_BASE_URL}/classes/${classId}/cancel`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ member_id: memberId }),
      });
      return handleResponse(res);
    },
  },

  // Attendance Endpoints
  attendance: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/attendance${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    checkIn: async (memberId, type = 'member') => {
      const res = await apiFetch(`${API_BASE_URL}/attendance/check-in`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(withGymParam({ member_id: memberId, type })),
      });
      return handleResponse(res);
    },
    checkOut: async (attendanceId) => {
      const res = await apiFetch(`${API_BASE_URL}/attendance/check-out`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(withGymParam({ attendance_id: attendanceId })),
      });
      return handleResponse(res);
    },
    biometricPunch: async (pin, sn = 'eSSL-ADMS-DEVICE') => {
      const res = await apiFetch(`${API_BASE_URL}/attendance/biometric-punch`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(withGymParam({ pin, sn })),
      });
      return handleResponse(res);
    },
    getBiometricDevices: async () => {
      const res = await apiFetch(`${API_BASE_URL}/biometrics/devices`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getBiometricLogs: async () => {
      const res = await apiFetch(`${API_BASE_URL}/biometrics/logs`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Workouts Endpoints
  workouts: {
    getForMember: async (memberId) => {
      const res = await apiFetch(`${API_BASE_URL}/workouts/member/${memberId}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    saveForMember: async (memberId, workoutData) => {
      const res = await apiFetch(`${API_BASE_URL}/workouts/member/${memberId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(workoutData),
      });
      return handleResponse(res);
    },
    logProgress: async (memberId, logData) => {
      const res = await apiFetch(`${API_BASE_URL}/workouts/member/${memberId}/log`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(logData),
      });
      return handleResponse(res);
    },
  },

  // Diets Endpoints
  diets: {
    getForMember: async (memberId) => {
      const res = await apiFetch(`${API_BASE_URL}/diets/member/${memberId}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    saveForMember: async (memberId, dietData) => {
      const res = await apiFetch(`${API_BASE_URL}/diets/member/${memberId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dietData),
      });
      return handleResponse(res);
    },
  },

  // Enquiries & Leads CRM Endpoints
  enquiries: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/enquiries${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updatePriority: async (id, priority) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/priority`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ priority }),
      });
      return handleResponse(res);
    },
    updateFollowUp: async (id, followUpDate) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/follow-up`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ follow_up_date: followUpDate }),
      });
      return handleResponse(res);
    },
    addComment: async (id, commentData) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(commentData),
      });
      return handleResponse(res);
    },
    convertToMember: async (id, memberData) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/convert`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(memberData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getStats: async () => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries-stats`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Equipment & Assets Endpoints
  equipment: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/equipment`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (equipmentData) => {
      const res = await apiFetch(`${API_BASE_URL}/equipment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(equipmentData),
      });
      return handleResponse(res);
    },
    update: async (id, equipmentData) => {
      const res = await apiFetch(`${API_BASE_URL}/equipment/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(equipmentData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/equipment/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Invoices & Billing Endpoints
  invoices: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/invoices${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (invoiceData) => {
      const res = await apiFetch(`${API_BASE_URL}/invoices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(invoiceData),
      });
      return handleResponse(res);
    },
    update: async (id, invoiceData) => {
      const res = await apiFetch(`${API_BASE_URL}/invoices/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(invoiceData),
      });
      return handleResponse(res);
    },
  },

  // Expenses Endpoints
  expenses: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/expenses${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (expenseData) => {
      const res = await apiFetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(expenseData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Enquiries & CRM Leads Endpoints
  enquiries: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (enquiryData) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(enquiryData),
      });
      return handleResponse(res);
    },
    update: async (id, enquiryData) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(enquiryData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    convertToMember: async (id, memberData) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/convert`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(memberData),
      });
      return handleResponse(res);
    },
    updatePriority: async (id, priority) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/priority`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ priority }),
      });
      return handleResponse(res);
    },
    updateFollowUp: async (id, followUpDate) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/follow-up`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ followUpDate }),
      });
      return handleResponse(res);
    },
    addComment: async (id, commentData) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(typeof commentData === 'string' ? { text: commentData } : commentData),
      });
      return handleResponse(res);
    },
  },

  // Store Products Endpoints
  products: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/products`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (productData) => {
      const res = await apiFetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(productData),
      });
      return handleResponse(res);
    },
    update: async (id, productData) => {
      const res = await apiFetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(productData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    sell: async (productId, quantity = 1, customerData = {}) => {
      const payload = typeof customerData === 'string'
        ? { productId, quantity, buyerName: customerData }
        : { productId, quantity, ...customerData };
      const res = await apiFetch(`${API_BASE_URL}/products/sell`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
  },

  // Trainer Commissions Endpoints
  commissions: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/commissions`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (commData) => {
      const res = await apiFetch(`${API_BASE_URL}/commissions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(commData),
      });
      return handleResponse(res);
    },
    update: async (id, commData) => {
      const res = await apiFetch(`${API_BASE_URL}/commissions/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(commData),
      });
      return handleResponse(res);
    },
    updateStatus: async (id, status = 'Paid') => {
      const numericId = String(id).replace('com-', '');
      const res = await apiFetch(`${API_BASE_URL}/commissions/${numericId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      return handleResponse(res);
    },
  },

  // Membership Freezes & Extensions Endpoints
  freezes: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/freezes`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (freezeData) => {
      const res = await apiFetch(`${API_BASE_URL}/freezes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(freezeData),
      });
      return handleResponse(res);
    },
    update: async (id, freezeData) => {
      const res = await apiFetch(`${API_BASE_URL}/freezes/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(freezeData),
      });
      return handleResponse(res);
    },
  },

  // Digital Consent & Waivers Endpoints
  consentForms: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/consent-forms`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (formData) => {
      const res = await apiFetch(`${API_BASE_URL}/consent-forms`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(formData),
      });
      return handleResponse(res);
    },
    update: async (id, formData) => {
      const res = await apiFetch(`${API_BASE_URL}/consent-forms/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(formData),
      });
      return handleResponse(res);
    },
  },

  // Employee Payroll Endpoints
  payroll: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/payroll`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (payrollData) => {
      const res = await apiFetch(`${API_BASE_URL}/payroll`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payrollData),
      });
      return handleResponse(res);
    },
    update: async (id, payrollData) => {
      const res = await apiFetch(`${API_BASE_URL}/payroll/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payrollData),
      });
      return handleResponse(res);
    },
    adjust: async (id, data) => {
      const numericId = typeof id === 'string' ? id.replace('pay-', '') : id;
      const res = await apiFetch(`${API_BASE_URL}/payroll/${numericId}/adjust`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    markPaid: async (id) => {
      const numericId = typeof id === 'string' ? id.replace('pay-', '') : id;
      const res = await apiFetch(`${API_BASE_URL}/payroll/${numericId}/pay`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Biometric Devices & Access Logs
  biometrics: {
    getDevices: async () => {
      const res = await apiFetch(`${API_BASE_URL}/biometrics/devices`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getLogs: async () => {
      const res = await apiFetch(`${API_BASE_URL}/biometrics/logs`, { headers: getHeaders() });
      return handleResponse(res);
    },
    syncDevice: async (deviceId) => {
      const res = await apiFetch(`${API_BASE_URL}/biometrics/sync`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ device_id: deviceId }),
      });
      return handleResponse(res);
    },
    getApprovals: async () => {
      const res = await apiFetch(`${API_BASE_URL}/gate-overrides`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Superadmin Platform Control
  superadmin: {
    getStats: async () => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/stats`, { headers: getHeaders(), skipCache: true });
      return handleResponse(res);
    },
    getGyms: async () => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/gyms`, { headers: getHeaders(), skipCache: true });
      return handleResponse(res);
    },
    createGym: async (gymData) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/gyms`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(gymData),
      });
      return handleResponse(res);
    },
    updateGym: async (id, gymData) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/gyms/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(gymData),
      });
      return handleResponse(res);
    },
    deleteGym: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/gyms/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    impersonateGym: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/gyms/${id}/impersonate`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    stopGymAccess: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/gyms/${id}/stop-access`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    restoreGymAccess: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/gyms/${id}/restore-access`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    // Superadmin Profile & Login Credentials
    updatePassword: async (passwordData) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/profile/update-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(passwordData),
      });
      return handleResponse(res);
    },
    updateEmail: async (emailData) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/profile/update-email`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(emailData),
      });
      return handleResponse(res);
    },

    // SaaS Plans
    getPlans: async () => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/plans`, { headers: getHeaders() });
      return handleResponse(res);
    },
    createPlan: async (planData) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      return handleResponse(res);
    },
    updatePlan: async (id, planData) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/plans/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      return handleResponse(res);
    },
    deletePlan: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/plans/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    // Platform Legal & Support Pages
    getPages: async () => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/pages`, { headers: getHeaders() });
      return handleResponse(res);
    },
    updatePage: async (slug, pageData) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/pages/${slug}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(pageData),
      });
      return handleResponse(res);
    },

    // Master Platform WhatsApp Automation & Gateway Control
    getWhatsAppSettings: async () => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/whatsapp-settings`, { headers: getHeaders() });
      return handleResponse(res);
    },
    updateWhatsAppSettings: async (settingsData) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/whatsapp-settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(settingsData),
      });
      return handleResponse(res);
    },
    testWhatsAppMessage: async (phone) => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/whatsapp-test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phone }),
      });
      return handleResponse(res);
    },
  },

  // Platform Public/Client Endpoints (Accessible across all roles)
  platform: {
    getPages: async () => {
      const res = await apiFetch(`${API_BASE_URL}/platform/pages`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getPage: async (slug) => {
      const res = await apiFetch(`${API_BASE_URL}/platform/pages/${slug}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getPlans: async () => {
      const res = await apiFetch(`${API_BASE_URL}/platform/plans`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Staff Account Provisioning
  staff: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/staff${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (staffData) => {
      const payload = withGymParam(staffData);
      const res = await apiFetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    update: async (id, staffData) => {
      const numericId = typeof id === 'string' ? id.replace(/[^0-9]/g, '') : id;
      const payload = withGymParam(staffData);
      const res = await apiFetch(`${API_BASE_URL}/staff/${numericId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const numericId = typeof id === 'string' ? id.replace(/[^0-9]/g, '') : id;
      const res = await apiFetch(`${API_BASE_URL}/staff/${numericId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Staff Shift Management & Multi-Slot Configurations
  shifts: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/shifts${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (shiftData) => {
      const payload = withGymParam(shiftData);
      const res = await apiFetch(`${API_BASE_URL}/shifts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    update: async (id, shiftData) => {
      const numericId = typeof id === 'string' ? id.replace(/[^0-9]/g, '') : id;
      const payload = withGymParam(shiftData);
      const res = await apiFetch(`${API_BASE_URL}/shifts/${numericId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const numericId = typeof id === 'string' ? id.replace(/[^0-9]/g, '') : id;
      const res = await apiFetch(`${API_BASE_URL}/shifts/${numericId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // PT Sessions & OTP Session Logging
  ptSessions: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/pt-sessions${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (sessionData) => {
      const res = await apiFetch(`${API_BASE_URL}/pt-sessions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(sessionData),
      });
      return handleResponse(res);
    },
    logSession: async (id, logData) => {
      const numericId = typeof id === 'string' ? id.replace('pts-', '') : id;
      const res = await apiFetch(`${API_BASE_URL}/pt-sessions/${numericId}/log-session`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(logData),
      });
      return handleResponse(res);
    },
    regenerateOtp: async (id) => {
      const numericId = typeof id === 'string' ? id.replace('pts-', '') : id;
      const res = await apiFetch(`${API_BASE_URL}/pt-sessions/${numericId}/regenerate-otp`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getLogs: async (id) => {
      const numericId = typeof id === 'string' ? id.replace('pts-', '') : id;
      const res = await apiFetch(`${API_BASE_URL}/pt-sessions/${numericId}/logs`, { headers: getHeaders() });
      return handleResponse(res);
    },
    delete: async (id) => {
      const numericId = typeof id === 'string' ? id.replace('pts-', '') : id;
      const res = await apiFetch(`${API_BASE_URL}/pt-sessions/${numericId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Advance Salary Requests
  advanceRequests: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/advance-requests${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/advance-requests`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updateStatus: async (id, status, notes = null) => {
      const numericId = String(id).replace(/[^0-9]/g, '');
      const res = await apiFetch(`${API_BASE_URL}/advance-requests/${numericId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, notes }),
      });
      return handleResponse(res);
    },
  },

  // Trainer Reviews & Star Ratings
  trainerReviews: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/trainer-reviews${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (reviewData) => {
      const res = await apiFetch(`${API_BASE_URL}/trainer-reviews`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(reviewData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const numericId = typeof id === 'string' ? id.replace('rev-', '') : id;
      const res = await apiFetch(`${API_BASE_URL}/trainer-reviews/${numericId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Staff & Trainer Leave Management & Quotas
  leaves: {
    getRequests: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/leaves/requests${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    createRequest: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/leaves/requests`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updateRequestStatus: async (id, status, notes = null, actionBy = null) => {
      const numericId = String(id).replace(/[^0-9]/g, '');
      const res = await apiFetch(`${API_BASE_URL}/leaves/requests/${numericId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, action_notes: notes, action_by: actionBy }),
      });
      return handleResponse(res);
    },
    getBalances: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/leaves/balances${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getUserBalance: async (userId, params = {}) => {
      const numericId = String(userId).replace(/[^0-9]/g, '');
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/leaves/balances/${numericId}${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    allocateLeaves: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/leaves/balances/allocate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    getSummary: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/leaves/summary${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Reports & Analytics
  reports: {
    getSummary: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/reports/summary${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Gym Business Information
  gymInfo: {
    get: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/gym-info${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    update: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/gym-info`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    getBranches: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/owner/branches${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    createBranch: async (branchData) => {
      const res = await apiFetch(`${API_BASE_URL}/owner/branches`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(branchData),
      });
      return handleResponse(res);
    },
    switchBranch: async (gymId) => {
      const res = await apiFetch(`${API_BASE_URL}/owner/switch-branch`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ gym_id: gymId }),
      });
      return handleResponse(res);
    },
  },

  // Dashboard Telemetry
  dashboard: {
    getOwnerStats: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/dashboard/owner-stats${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Dedicated Revenue & Billing (Inflow & Outflow)
  revenueBilling: {
    getInflows: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/revenue-billing/inflow${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getOutflows: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/revenue-billing/outflow${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getSummary: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/revenue-billing/summary${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    addInflow: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/revenue-billing/inflow`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    addOutflow: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/revenue-billing/outflow`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deleteRecord: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/revenue-billing/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // WhatsApp Message Templates & Automation Triggers
  whatsapp: {
    getTemplates: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/templates${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    createTemplate: async (data) => {
      const payload = withGymParam(data);
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/templates`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    updateTemplate: async (id, data) => {
      const payload = withGymParam(data);
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/templates/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    deleteTemplate: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/templates/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    toggleTemplate: async (id, field = 'is_active') => {
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/templates/${id}/toggle`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ field }),
      });
      return handleResponse(res);
    },
    scanTriggers: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/triggers/scan${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    logMessage: async (data) => {
      const payload = withGymParam(data);
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/logs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    getLogs: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/logs${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    broadcastTemplate: async (id, data = {}) => {
      const payload = withGymParam(data);
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/templates/${id}/broadcast`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    broadcastDirect: async (data) => {
      const payload = withGymParam(data);
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/broadcast`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    processAutoSend: async (params = {}) => {
      const payload = withGymParam(params);
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/triggers/process-auto-send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    getRecipientsPreview: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/recipients-preview${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getStats: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/stats${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getSettings: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/settings${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    updateSettings: async (data) => {
      const payload = withGymParam(data);
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    testMessage: async (phone) => {
      const payload = withGymParam({ phone });
      const res = await apiFetch(`${API_BASE_URL}/whatsapp/test-message`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
  },

  // Reports & Analytics
  reports: {
    getSummary: async (params = {}) => {
      const query = new URLSearchParams(withGymParam(params)).toString();
      const res = await apiFetch(`${API_BASE_URL}/reports/summary${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },
};

export default api;
