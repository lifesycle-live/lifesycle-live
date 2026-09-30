import { API_BASE_URL } from "./config";
import { getStoredTokens } from "./auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** Server-supplied per-platform failure reasons, when present. */
    public details?: string[],
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
 * Called when the server rejects a request with 401 so the app can drop back
 * to the login screen instead of leaving every query stuck retrying.
 * Registered by the auth store on startup.
 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

/**
 * Base fetch wrapper: injects the auth header and normalizes errors.
 * All real (non-mock) API calls should go through this — see the per-domain
 * files (broadcasts.ts, leads.ts, ...) for how mock vs. real is switched.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const tokens = await getStoredTokens();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        // Only when something is actually sent: Fastify rejects a body-less
        // POST that still declares JSON with 400 FST_ERR_CTP_EMPTY_JSON_BODY,
        // which silently broke every no-body call (ending a broadcast,
        // stopping the camera relay).
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      `Could not reach the server at ${API_BASE_URL}. Is it running?`,
      0,
    );
  }

  if (response.status === 401 && path !== "/auth/login") {
    onUnauthorized?.();
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  if (!response.ok) {
    let serverError: string | undefined;
    let details: string[] | undefined;
    try {
      const payload = (await response.json()) as { error?: string; details?: string[] };
      serverError = payload.error;
      details = Array.isArray(payload.details) ? payload.details : undefined;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
      serverError ?? `Request to ${path} failed with status ${response.status}`,
      response.status,
      details,
    );
  }

  return (await response.json()) as T;
}

/** Simulates network latency for mock implementations so loading states are exercised. */
export function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
