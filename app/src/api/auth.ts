import * as SecureStore from "expo-secure-store";
import { apiRequest, mockDelay } from "./client";
import { USE_MOCKS } from "./config";

const ACCESS_TOKEN_KEY = "lifesycle_access_token";
const REFRESH_TOKEN_KEY = "lifesycle_refresh_token";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

export async function getStoredTokens(): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, expiresAt: 0 };
}

export async function storeTokens(tokens: TokenPair): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function login(email: string, password: string): Promise<TokenPair> {
  const tokens = USE_MOCKS
    ? await mockDelay<TokenPair>({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresAt: Date.now() + 1000 * 60 * 60,
      })
    : await apiRequest<TokenPair>("/auth/login", { method: "POST", body: { email, password } });

  await storeTokens(tokens);
  return tokens;
}

export async function logout(): Promise<void> {
  await clearTokens();
}
