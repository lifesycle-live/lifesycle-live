import { apiRequest, mockDelay } from "./client";
import { USE_MOCKS } from "./config";
import { getItem, setItem, deleteItem } from "./storage";

const ACCESS_TOKEN_KEY = "lifesycle_access_token";
const REFRESH_TOKEN_KEY = "lifesycle_refresh_token";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

export async function getStoredTokens(): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, expiresAt: 0 };
}

export async function storeTokens(tokens: TokenPair): Promise<void> {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
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

export async function register(name: string, email: string, password: string, inviteCode: string): Promise<TokenPair> {
  if (USE_MOCKS) throw new Error("Account creation requires a connected server. Demo mode does not create real accounts.");
  const tokens = await apiRequest<TokenPair>("/auth/register", { method: "POST", body: { name, email, password, inviteCode } });
  await storeTokens(tokens);
  return tokens;
}
