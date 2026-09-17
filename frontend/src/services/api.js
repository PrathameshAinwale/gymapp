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
  
  const hosts = [];

  // If running in browser with a specific IP or domain (e.g. 192.168.1.48 or custom domain)
  if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    hosts.push(`http://${currentHost}:8000/api/v1`);
  }

  if (inCapacitor) {
    hosts.push('http://10.0.2.2:8000/api/v1'); // Android Emulator
    hosts.push('http://192.168.1.48:8000/api/v1'); // Current Wi-Fi LAN IP
  }

  // Standard Localhost fallbacks
  hosts.push('http://127.0.0.1:8000/api/v1');
  hosts.push('http://localhost:8000/api/v1');
  hosts.push('http://192.168.1.48:8000/api/v1');

  return Array.from(new Set(hosts));
};

const CANDIDATE_API_HOSTS = getDefaultHosts();

let activeBaseUrl = (function () {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      localStorage.removeItem('pulsefit_api_url');
      return 'http://127.0.0.1:8000/api/v1';
    }
    const custom = localStorage.getItem('pulsefit_api_url');
    if (custom) return custom;
  }
  return import.meta.env.VITE_API_BASE_URL || CANDIDATE_API_HOSTS[0] || 'http://127.0.0.1:8000/api/v1';
})();

export const getActiveApiUrl = () => activeBaseUrl;
export const setActiveApiUrl = (url) => {
  activeBaseUrl = url;
  if (typeof window !== 'undefined') {
    localStorage.setItem('pulsefit_api_url', url);
  }
};

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Fast fetch helper with timeout to avoid browser hangs (10s allowance for queued requests in dev server)
const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
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
    'http://192.168.1.48:8000/api/v1',
    'http://10.0.2.2:8000/api/v1'
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
  const currentHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
  const isLocal = typeof window !== 'undefined' && (currentHost === 'localhost' || currentHost === '127.0.0.1');
  const hostsToTry = isLocal
    ? Array.from(new Set([
        `http://${currentHost}:8000/api/v1`,
        'http://127.0.0.1:8000/api/v1',
        'http://localhost:8000/api/v1'
      ]))
    : Array.from(new Set([
        activeBaseUrl,
        ...CANDIDATE_API_HOSTS,
        'http://127.0.0.1:8000/api/v1',
        'http://localhost:8000/api/v1'
      ])).filter(Boolean);

  let lastError = null;
  const timeoutMs = isLocal ? 6000 : 10000;
  for (const host of hostsToTry) {
    try {
      const fullUrl = `${host}${relativePath}`;
      const res = await fetchWithTimeout(fullUrl, options, timeoutMs);
      if (activeBaseUrl !== host) {
        activeBaseUrl = host;
        if (typeof window !== 'undefined') {
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

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_token') : null;
  const gymId = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_gym_id') : null;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (gymId) {
    headers['X-Gym-ID'] = gymId;
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
  // Auth Endpoints
  auth: {
    login: async (email, password) => {
      const res = await apiFetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
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
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/members${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/members/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (memberData) => {
      const res = await apiFetch(`${API_BASE_URL}/members`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(memberData),
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
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/trainers`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await apiFetch(`${API_BASE_URL}/trainers/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (trainerData) => {
      const res = await apiFetch(`${API_BASE_URL}/trainers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(trainerData),
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
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/plans`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (planData) => {
      const res = await apiFetch(`${API_BASE_URL}/plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(planData),
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
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/attendance${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    checkIn: async (memberId, type = 'member') => {
      const res = await apiFetch(`${API_BASE_URL}/attendance/check-in`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ member_id: memberId, type }),
      });
      return handleResponse(res);
    },
    checkOut: async (attendanceId) => {
      const res = await apiFetch(`${API_BASE_URL}/attendance/check-out`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ attendance_id: attendanceId }),
      });
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
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/invoices`, { headers: getHeaders() });
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
    getAll: async () => {
      const res = await apiFetch(`${API_BASE_URL}/expenses`, { headers: getHeaders() });
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
  },

  // Staff Account Provisioning
  staff: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/staff${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (staffData) => {
      const res = await apiFetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(staffData),
      });
      return handleResponse(res);
    },
    update: async (id, staffData) => {
      const numericId = typeof id === 'string' ? id.replace('usr-', '') : id;
      const res = await apiFetch(`${API_BASE_URL}/staff/${numericId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(staffData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const numericId = typeof id === 'string' ? id.replace('usr-', '') : id;
      const res = await apiFetch(`${API_BASE_URL}/staff/${numericId}`, {
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

  // Reports & Analytics
  reports: {
    getSummary: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/reports/summary${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Gym Business Information
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
    },
  },

  // Dashboard Telemetry
  dashboard: {
    getOwnerStats: async () => {
      const res = await apiFetch(`${API_BASE_URL}/dashboard/owner-stats`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },

  // Dedicated Revenue & Billing (Inflow & Outflow)
  revenueBilling: {
    getInflows: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/revenue-billing/inflow${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getOutflows: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await apiFetch(`${API_BASE_URL}/revenue-billing/outflow${query ? `?${query}` : ''}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getSummary: async () => {
      const res = await apiFetch(`${API_BASE_URL}/revenue-billing/summary`, { headers: getHeaders() });
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
};
