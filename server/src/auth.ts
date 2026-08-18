import jwt from "jsonwebtoken";
import { env } from "./env.js";

export interface AccessTokenClaims {
  agentId: string;
}

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1h
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30d

export function signAccessToken(agentId: string): string {
  return jwt.sign({ agentId } satisfies AccessTokenClaims, env.jwtSecret, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function signRefreshToken(agentId: string): string {
  return jwt.sign({ agentId, type: "refresh" }, env.jwtSecret, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, env.jwtSecret) as AccessTokenClaims;
}
