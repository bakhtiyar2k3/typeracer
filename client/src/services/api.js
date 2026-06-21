// Thin fetch wrapper around the REST API. Reads the JWT from the auth store
// (lazy import to avoid a circular dependency at module load).
const BASE = '/api';

function getToken() {
  try {
    // Same precedence as the auth store: per-tab session (guest or login) first,
    // then a shared login in localStorage. A guest in localStorage is ignored.
    const session = sessionStorage.getItem('typeracer-auth');
    if (session) return JSON.parse(session)?.state?.token || null;
    const local = localStorage.getItem('typeracer-auth');
    if (!local) return null;
    const parsed = JSON.parse(local);
    if (parsed?.state?.user?.guest) return null;
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  guest: (username) => request('/auth/guest', { method: 'POST', body: { username } }),
  me: () => request('/auth/me', { auth: true }),

  // Users / profiles / history
  profile: (username) => request(`/users/${encodeURIComponent(username)}`),
  myHistory: () => request('/users/me/history', { auth: true }),

  // Leaderboard
  leaderboard: (page = 1) => request(`/leaderboard?page=${page}`),
};
