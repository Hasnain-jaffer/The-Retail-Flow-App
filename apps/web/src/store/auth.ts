import { create } from "zustand";
import { apiFetch } from "../api/client";

export type Role = "admin" | "manager" | "staff" | "viewer";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Called once on app load to restore a session from the httpOnly cookie. */
  restoreSession: () => Promise<void>;
}

/**
 * SECURITY: the JWT itself is never stored here (or anywhere in JS) —
 * it lives only in the httpOnly cookie the backend sets. This store only
 * ever holds the non-sensitive user object (id/email/name/role), and
 * `status` tracks whether we've figured out if a session cookie is valid
 * yet, so route guards can show a loading state instead of flashing the
 * login page on every refresh.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",

  restoreSession: async () => {
    try {
      const { user } = await apiFetch("/auth/me");
      set({ user, status: "authenticated" });
    } catch {
      set({ user: null, status: "unauthenticated" });
    }
  },

  login: async (email, password) => {
    const { user } = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    set({ user, status: "authenticated" });
    return user;
  },

  register: async (email, password, name) => {
    const { user } = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    set({ user, status: "authenticated" });
    return user;
  },

  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, status: "unauthenticated" });
    }
  },
}));
