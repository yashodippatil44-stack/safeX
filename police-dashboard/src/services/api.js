const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('visionx_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: Request failed`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  getMe: () => request('/auth/me'),
  resetDemoDb: () => request('/auth/reset-demo-db', { method: 'POST' }),

  // Location & Telemetry
  getFleet: () => request('/location/fleet'),
  getCurrentLocation: (touristId) => request(`/location/current/${touristId}`),
  getLocationHistory: (touristId, limit = 50) => request(`/location/history/${touristId}?limit=${limit}`),
  updateLocation: (payload) => request('/location/update', { method: 'POST', body: payload }),

  // Geo-Fences
  getGeoFences: () => request('/geofences'),
  createGeoFence: (payload) => request('/geofences', { method: 'POST', body: payload }),
  updateGeoFence: (id, payload) => request(`/geofences/${id}`, { method: 'PUT', body: payload }),
  deleteGeoFence: (id) => request(`/geofences/${id}`, { method: 'DELETE' }),

  // Emergency & SOS
  triggerSOS: (payload) => request('/emergency/sos', { method: 'POST', body: payload }),
  cancelSOS: (id) => request(`/emergency/${id}/cancel`, { method: 'POST' }),
  getMyActiveEmergency: () => request('/emergency/my-active'),
  getEmergencyQueue: (params = '') => request(`/emergency${params ? `?${params}` : ''}`),
  getEmergencyById: (id) => request(`/emergency/${id}`),
  acknowledgeEmergency: (id) => request(`/emergency/${id}/acknowledge`, { method: 'PUT' }),
  assignResponder: (id, officerId, officerName) =>
    request(`/emergency/${id}/assign`, { method: 'PUT', body: { officerId, officerName } }),
  startResponse: (id) => request(`/emergency/${id}/start`, { method: 'PUT' }),
  resolveEmergency: (id, remarks) =>
    request(`/emergency/${id}/resolve`, { method: 'PUT', body: { remarks } }),

  // Incidents
  getIncidents: (params = '') => request(`/incidents${params ? `?${params}` : ''}`),
  getIncidentById: (id) => request(`/incidents/${id}`),
  createIncident: (payload) => request('/incidents', { method: 'POST', body: payload }),
  updateIncidentStatus: (id, status, remarks) =>
    request(`/incidents/${id}/status`, { method: 'PUT', body: { status, remarks } }),

  // Nearby Emergency Services
  getNearbyServices: (latitude, longitude, type) => {
    let q = `latitude=${latitude}&longitude=${longitude}`;
    if (type) q += `&type=${type}`;
    return request(`/emergency-services/nearby?${q}`);
  },

  // Safety & Notifications
  getSafetyStatus: (touristId) => request(`/tourist/safety-status${touristId ? `?touristId=${touristId}` : ''}`),
  getNotifications: (touristId) => request(`/notifications${touristId ? `?touristId=${touristId}` : ''}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),

  // Health
  checkHealth: () => request('/health')
};

export default api;
