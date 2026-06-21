import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../services/api.js';

const STORAGE_KEY = 'typeracer-auth';

const isGuestBlob = (raw) => {
  try {
    return Boolean(JSON.parse(raw)?.state?.user?.guest);
  } catch {
    return false;
  }
};

// On load, clear any stale GUEST saved in localStorage. localStorage is shared
// across tabs, so a guest left there makes every tab share one identity — which
// the matchmaker then pairs against itself (no opponent). Guests must live in
// per-tab sessionStorage only.
if (typeof window !== 'undefined') {
  const stale = window.localStorage.getItem(STORAGE_KEY);
  if (stale && isGuestBlob(stale)) window.localStorage.removeItem(STORAGE_KEY);
}

// Guests are persisted to sessionStorage (per-tab) so two tabs in the same
// browser get DISTINCT guest identities and can actually race each other.
// Registered logins use localStorage so they persist and are shared across tabs.
// A guest is NEVER read from (or left in) localStorage. (services/api.js mirrors
// this precedence for the bearer token.)
const perTabAwareStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    const fromSession = window.sessionStorage.getItem(name);
    if (fromSession) return fromSession;
    const fromLocal = window.localStorage.getItem(name);
    // Ignore a guest sitting in shared localStorage so tabs never collide.
    if (!fromLocal || isGuestBlob(fromLocal)) return null;
    return fromLocal;
  },
  setItem: (name, value) => {
    if (isGuestBlob(value)) {
      window.sessionStorage.setItem(name, value);
      window.localStorage.removeItem(name); // never let a guest linger in shared storage
    } else {
      window.localStorage.setItem(name, value);
      window.sessionStorage.removeItem(name);
    }
  },
  removeItem: (name) => {
    window.sessionStorage.removeItem(name);
    window.localStorage.removeItem(name);
  },
};

// Auth state persisted to localStorage so a refresh keeps the session.
// `typeracer-auth` is also read by services/api.js for the bearer token.
export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      status: 'idle', // idle | loading | authed | error
      error: null,

      isAuthed: () => Boolean(get().token),
      isGuest: () => Boolean(get().user?.guest),

      async register(payload) {
        set({ status: 'loading', error: null });
        try {
          const { token, user } = await api.register(payload);
          set({ token, user, status: 'authed' });
          return user;
        } catch (err) {
          set({ status: 'error', error: err.message });
          throw err;
        }
      },

      async login(payload) {
        set({ status: 'loading', error: null });
        try {
          const { token, user } = await api.login(payload);
          set({ token, user, status: 'authed' });
          return user;
        } catch (err) {
          set({ status: 'error', error: err.message });
          throw err;
        }
      },

      // Guest identity is required before connecting the socket if not logged in.
      async ensureGuest(username) {
        if (get().token) return get().user;
        const { token, user } = await api.guest(username);
        set({ token, user, status: 'authed' });
        return user;
      },

      // Refresh the persisted profile (e.g. after a ranked race).
      async refresh() {
        if (!get().token || get().user?.guest) return;
        try {
          const { user } = await api.me();
          set({ user });
        } catch {
          /* token expired — fall through to logout on next protected call */
        }
      },

      logout() {
        set({ token: null, user: null, status: 'idle', error: null });
      },
    }),
    {
      name: 'typeracer-auth',
      storage: createJSONStorage(() => perTabAwareStorage),
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);
