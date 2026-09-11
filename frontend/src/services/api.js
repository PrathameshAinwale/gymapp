// API Service Client for Laravel REST API Backend

const isRunningInCapacitor = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Capacitor !== undefined ||
    window.location.protocol === 'capacitor:' ||
    (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && window.navigator?.userAgent?.includes('Android'))
  );
};

const getDefaultHosts = () => {
  if (typeof window === 'undefined') return ['http://127.0.0.1:8000/api/v1'];
  
  const inCapacitor = isRunningInCapacitor();
  const currentHost = window.location.hostname;
  
  if (inCapacitor) {
    return [
      'http://10.0.2.2:8000/api/v1',
      'http://192.168.1.41:8000/api/v1',
      'http://127.0.0.1:8000/api/v1',
      'http://localhost:8000/api/v1'
    ];
  }
  
  // Standard Web Browser (Desktop / Mobile Chrome / Edge / Firefox)
  const hosts = [
    'http://127.0.0.1:8000/api/v1',
    'http://localhost:8000/api/v1'
  ];
  
  if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    hosts.unshift(`http://${currentHost}:8000/api/v1`);
  }
  
  return hosts;
};

const CANDIDATE_API_HOSTS = getDefaultHosts();

let activeBaseUrl = (function () {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('pulsefit_api_url');
    // If not in Capacitor and custom is 10.0.2.2, clean it up
    if (custom && custom.includes('10.0.2.2') && !isRunningInCapacitor()) {
      localStorage.removeItem('pulsefit_api_url');
    } else if (custom) {
      return custom;
    }
  }
  return import.meta.env.VITE_API_BASE_URL || CANDIDATE_API_HOSTS[0];
})();

export const getActiveApiUrl = () => activeBaseUrl;
export const setActiveApiUrl = (url) => {
  activeBaseUrl = url;
  if (typeof window !== 'undefined') {
    localStorage.setItem('pulsefit_api_url', url);
  }
};

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Fast fetch helper with timeout to avoid browser hangs
const fetchWithTimeout = async (url, options = {}, timeoutMs = 2500) => {
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

// Universal smart fetch wrapper that auto-fails over if the endpoint host is unreachable
const apiFetch = async (urlOrPath, options = {}) => {
  let relativePath = urlOrPath;
  const allKnownHosts = [
    activeBaseUrl,
    ...CANDIDATE_API_HOSTS,
    'http://127.0.0.1:8000/api/v1',
    'http://localhost:8000/api/v1',
    'http://10.0.2.2:8000/api/v1',
    'http://192.168.1.41:8000/api/v1'
  ];

  for (const host of allKnownHosts) {
    if (relativePath.startsWith(host)) {
      relativePath = relativePath.slice(host.length);
      break;
    }
  }
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }

  // Deduplicate candidate hosts starting with activeBaseUrl
  const hostsToTry = Array.from(new Set([
    activeBaseUrl,
    ...CANDIDATE_API_HOSTS,
    'http://127.0.0.1:8000/api/v1',
    'http://localhost:8000/api/v1'
  ])).filter(Boolean);

  let lastError = null;
  for (const host of hostsToTry) {
    try {
      const fullUrl = `${host}${relativePath}`;
      const res = await fetchWithTimeout(fullUrl, options, 2500);
      activeBaseUrl = host;
      return res;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Network error: Unable to connect to backend server');
};

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_token') : null;
  const gymId = typeof window !== 'undefined' ? (localStorage.getItem('pulsefit_gym_id') || '1') : '1';
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (gymId) {
    headers['X-Gym-Id'] = gymId.toString();
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data;
};

export const api = {
  // Auth Endpoints
  auth: {
    login: async (email, password) => {
      const res = await apiFetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await handleResponse(res);
      if (data.token) {
        localStorage.setItem('pulsefit_token', data.token);
      }
      return data;
    },
    register: async (userData) => {
      const res = await apiFetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(userData),
      });
      return handleResponse(res);
    },
    me: async () => {
      const res = await apiFetch(`${API_BASE_URL}/auth/me`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    logout: async () => {
      try {
        await apiFetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: getHeaders(),
        });
      } finally {
        localStorage.removeItem('pulsefit_token');
      }
      return { success: true };
    },
    changePassword: async (currentPassword, newPassword, newPasswordConfirmation) => {
      const res = await apiFetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: newPasswordConfirmation,
        }),
      });
      return handleResponse(res);
    },
  },

  // Gym Info
  gymInfo: {
    get: async () => {
      const res = await apiFetch(`${API_BASE_URL}/gym-info`, { headers: getHeaders() });
      return handleResponse(res);
    },
    update: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/gym-info`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
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
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/members${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/members`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Trainers Endpoints
  trainers: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/trainers`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/trainers/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/trainers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await apiFetch(`${API_BASE_URL}/trainers/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/trainers/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Membership Plans Endpoints
  plans: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/plans`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/plans/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await apiFetch(`${API_BASE_URL}/plans/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/plans/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Classes & Scheduling Endpoints
  classes: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/classes`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/classes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    book: async (classId, userId) => {
      const res = await apiFetch(`${API_BASE_URL}/classes/${classId}/book`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ user_id: userId }),
      });
      return handleResponse(res);
    },
    cancel: async (classId, userId) => {
      const res = await apiFetch(`${API_BASE_URL}/classes/${classId}/cancel`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ user_id: userId }),
      });
      return handleResponse(res);
    }
  },

  // Attendance Endpoints
  attendance: {
    getAll: async (date) => {
      const res = await apiFetch(`${API_BASE_URL}/attendance${date ? `?date=${date}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    checkIn: async (qrCodeOrUserId, gate = 'Main Turnstile A') => {
      const body = qrCodeOrUserId.startsWith('PF-') || qrCodeOrUserId.length > 8
        ? { qr_code: qrCodeOrUserId, gate }
        : { user_id: qrCodeOrUserId, gate };

      const res = await apiFetch(`${API_BASE_URL}/attendance/check-in`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    checkOut: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/attendance/${id}/check-out`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Workouts & Diets
  workouts: {
    getMemberRoutine: async (memberId) => {
      const res = await apiFetch(`${API_BASE_URL}/workouts/member/${memberId}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    updateMemberRoutine: async (memberId, data) => {
      const res = await apiFetch(`${API_BASE_URL}/workouts/member/${memberId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
  },

  diets: {
    getMemberDiet: async (memberId) => {
      const res = await apiFetch(`${API_BASE_URL}/diets/member/${memberId}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    updateMemberDiet: async (memberId, data) => {
      const res = await apiFetch(`${API_BASE_URL}/diets/member/${memberId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
  },

  // Invoices & Financials
  invoices: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/invoices`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/invoices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
  },

  // Operating Expenses & Cash Flow
  expenses: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/expenses${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getSummary: async () => {
      const res = await apiFetch(`${API_BASE_URL}/financials/cashflow-summary`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await apiFetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Enquiries & Leads CRM
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
    addComment: async (id, text, author) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text, author }),
      });
      return handleResponse(res);
    },
    convertToMember: async (id, data = {}) => {
      const res = await apiFetch(`${API_BASE_URL}/enquiries/${id}/convert`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
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
    }
  },

  // Equipment Management
  equipment: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/equipment`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/equipment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await apiFetch(`${API_BASE_URL}/equipment/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/equipment/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Pro Shop Products & Inventory
  products: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/products`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await apiFetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
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
    sell: async (productId, quantity, buyerName) => {
      const res = await apiFetch(`${API_BASE_URL}/products/sell`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productId, quantity, buyerName }),
      });
      return handleResponse(res);
    }
  },

  // Trainer Commissions
  commissions: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/commissions`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/commissions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updateStatus: async (id, status = 'Paid') => {
      const res = await apiFetch(`${API_BASE_URL}/commissions/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      return handleResponse(res);
    }
  },

  // Membership Freezes & Extensions
  freezes: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/freezes`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/freezes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    unfreeze: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/freezes/${id}/unfreeze`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Consent & Medical Waivers
  consentForms: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/consent-forms`, { headers: getHeaders() });
      return handleResponse(res);
    },
    updateStatus: async (id, status = 'Signed') => {
      const res = await apiFetch(`${API_BASE_URL}/consent-forms/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      return handleResponse(res);
    }
  },

  // Employee Payroll
  payroll: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/payroll`, { headers: getHeaders() });
      return handleResponse(res);
    },
    markPaid: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/payroll/${id}/pay`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Biometrics, Devices & Gate Overrides
  biometrics: {
    getDevices: async () => {
      const res = await apiFetch(`${API_BASE_URL}/biometrics/devices`, { headers: getHeaders() });
      return handleResponse(res);
    },
    createDevice: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/biometrics/devices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    triggerPulse: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/biometrics/pulse/${id}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getLogs: async () => {
      const res = await apiFetch(`${API_BASE_URL}/biometrics/logs`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getApprovals: async () => {
      const res = await apiFetch(`${API_BASE_URL}/gate-overrides`, { headers: getHeaders() });
      return handleResponse(res);
    },
    approveGate: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/gate-overrides/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    denyGate: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/gate-overrides/${id}/deny`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // PT & Recovery Packages
  ptPlans: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/pt-plans`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/pt-plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
  },

  recoveryPlans: {
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/recovery-plans`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await apiFetch(`${API_BASE_URL}/recovery-plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
  },

  // Dashboard Metrics & Live Stats
  dashboard: {
    getOwnerStats: async () => {
      const res = await apiFetch(`${API_BASE_URL}/dashboard/owner-stats`, { headers: getHeaders() });
      return handleResponse(res);
    }
  },

  // Superadmin Platform Control
  superadmin: {
    getStats: async () => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/stats`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getGyms: async () => {
      const res = await apiFetch(`${API_BASE_URL}/superadmin/gyms`, { headers: getHeaders() });
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
  }
};
