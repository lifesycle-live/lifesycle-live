import { API_BASE_URL } from "./config";
import { getStoredTokens } from "./auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

/**
 * Base fetch wrapper: injects the auth header and normalizes errors.
 * All real (non-mock) API calls should go through this — see the per-domain
 * files (broadcasts.ts, leads.ts, ...) for how mock vs. real is switched.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const tokens = await getStoredTokens();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed with status ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

/** Simulates network latency for mock implementations so loading states are exercised. */
export function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
