import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  loginWithEmail,
  registerWithEmail,
  fetchMe,
  fetchCredits,
  redeemCredits,
} from "@/lib/api";
import type { AuthUser } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoggedIn: boolean;
  hasSkipped: boolean;
  loading: boolean;
  error: string | null;
  credits: number;
  creditsUsed: number;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  skipAuth: () => void;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  refreshCredits: () => Promise<void>;
  redeemCode: (code: string) => Promise<string>;
  useCredit: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      hasSkipped: false,
      loading: false,
      error: null,
      credits: 0,
      creditsUsed: 0,

      login: async (email, password) => {
        set({ loading: true, error: null });
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
            credits: payload.user.credits ?? 0,
            creditsUsed: payload.user.credits_used ?? 0,
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
            credits: payload.user.credits ?? 0,
            creditsUsed: payload.user.credits_used ?? 0,
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
        set({
          user: null,
          token: null,
          isLoggedIn: false,
          credits: 0,
          creditsUsed: 0,
        });
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
            const user = await fetchMe();
            set({
              user,
              isLoggedIn: true,
              credits: user.credits ?? 0,
              creditsUsed: user.credits_used ?? 0,
            });
          } else if (parsed.user) {
            set({ user: parsed.user as AuthUser });
          }
        } catch {
          localStorage.removeItem("scriptforge-auth");
          set({
            user: null,
            token: null,
            isLoggedIn: false,
            credits: 0,
            creditsUsed: 0,
          });
        }
      },

      clearError: () => set({ error: null }),

      refreshCredits: async () => {
        try {
          const data = await fetchCredits();
          set({ credits: data.credits, creditsUsed: data.credits_used });
        } catch {
          // silently fail
        }
      },

      redeemCode: async (code: string) => {
        const data = await redeemCredits(code);
        await get().refreshCredits?.();
        return data.message;
      },

      useCredit: () => {
        const state = get();
        if (state.credits > 0) {
          set({
            credits: state.credits - 1,
            creditsUsed: state.creditsUsed + 1,
          });
          return true;
        }
        return false;
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
        hasSkipped: state.hasSkipped,
        credits: state.credits,
        creditsUsed: state.creditsUsed,
      }),
    },
  ),
);
