import { create } from "zustand";
import { getStoredTokens, login as apiLogin, logout as apiLogout, register } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";
import { queryClient } from "./queryClient";
import { USE_MOCKS } from "../api/config";

type AuthStatus = "loading" | "signedIn" | "signedOut";

interface AuthState {
  status: AuthStatus;
  /** Reads any persisted token and wires up the 401 handler. Call once on boot. */
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string, inviteCode: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  signUp: async (name, email, password, inviteCode) => {
    await register(name, email, password, inviteCode);
    queryClient.clear();
    set({ status: "signedIn" });
  },

  hydrate: async () => {
    setUnauthorizedHandler(() => {
      apiLogout().finally(() => {
        queryClient.clear();
        set({ status: "signedOut" });
      });
    });

    // Mock mode needs no credentials — the API layer never calls the server.
    if (USE_MOCKS) {
      set({ status: "signedIn" });
      return;
    }

    const tokens = await getStoredTokens();
    set({ status: tokens ? "signedIn" : "signedOut" });
  },

  signIn: async (email, password) => {
    await apiLogin(email, password);
    queryClient.clear();
    set({ status: "signedIn" });
  },

  signOut: async () => {
    await apiLogout();
    queryClient.clear();
    set({ status: "signedOut" });
  },
}));
