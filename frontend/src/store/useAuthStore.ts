import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginWithEmail, registerWithEmail, fetchMe } from "@/lib/api";
import type { AuthUser } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoggedIn: boolean;
  hasSkipped: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  skipAuth: () => void;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      hasSkipped: false,
      loading: false,
      error: null,

      login: async (email, password) => {
        try {
          const payload = await loginWithEmail({ email, password });
          localStorage.setItem(
            "scriptforge-auth",
            JSON.stringify({ user: payload.user, token: payload.token }),
          );
          set({
            user: payload.user,
            token: payload.token,
            isLoggedIn: true,
            hasSkipped: false,
            loading: false,
          });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : "登录失败",
          });
          throw err;
        }
      },

      register: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const payload = await registerWithEmail({ email, password });
          localStorage.setItem(
            "scriptforge-auth",
            JSON.stringify({ user: payload.user, token: payload.token }),
          );
          set({
            user: payload.user,
            token: payload.token,
            isLoggedIn: true,
            hasSkipped: false,
            loading: false,
          });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : "注册失败",
          });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem("scriptforge-auth");
        set({ user: null, token: null, isLoggedIn: false });
      },

      skipAuth: () => {
        set({ hasSkipped: true });
      },

      restoreSession: async () => {
        const auth = localStorage.getItem("scriptforge-auth");
        if (!auth) return;

        try {
          const parsed = JSON.parse(auth) as {
            user?: AuthUser;
            token?: string;
          };
          if (parsed.token) {
            set({ token: parsed.token });
            // Try to verify the session with server
            const user = await fetchMe();
            set({ user, isLoggedIn: true });
          } else if (parsed.user) {
            set({ user: parsed.user as AuthUser });
          }
        } catch {
          // Token invalid, clear it
          localStorage.removeItem("scriptforge-auth");
          set({ user: null, token: null, isLoggedIn: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
        hasSkipped: state.hasSkipped,
      }),
    },
  ),
);
