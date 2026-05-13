import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

function isJwtExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return true;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(normalized));
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= Number(payload.exp);
  } catch {
    return true;
  }
}

export function hasValidStoredToken(): boolean {
  const token = localStorage.getItem('auth_token');
  return !isJwtExpired(token);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        localStorage.setItem('auth_token', token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'ontime-auth',
      onRehydrateStorage: () => (state) => {
        if (!state?.token || isJwtExpired(state.token)) {
          localStorage.removeItem('auth_token');
          state?.logout();
        } else {
          localStorage.setItem('auth_token', state.token);
        }
      },
    }
  )
);
