import { AppDataSource } from "../data-source.js";
import { PlatformConnection } from "../entities/PlatformConnection.js";
import { getOAuthProvider } from "./registry.js";

// Refresh a bit before actual expiry so a token doesn't die mid-broadcast
// between two ingestion polls.
const EXPIRY_SAFETY_MARGIN_MS = 5 * 60 * 1000;

/**
 * A valid access token for this connection, refreshing (and persisting the
 * rotation) first if the stored token is expired or close to it. Connections
 * whose provider has no `refresh()` (Facebook Page tokens) or no
 * `expiresAt` never need this — the stored `accessToken` is returned as-is.
 */
export async function getValidAccessToken(connection: PlatformConnection): Promise<string> {
  const needsRefresh = connection.expiresAt && connection.expiresAt.getTime() - Date.now() < EXPIRY_SAFETY_MARGIN_MS;

  if (!needsRefresh) return connection.accessToken;

  const provider = getOAuthProvider(connection.platform);
  if (!provider?.refresh) {
    throw new Error(
      `${connection.platform} connection for agent ${connection.agentId} has expired and this provider has no ` +
        `refresh() implementation yet — the agent needs to reconnect via Connect Accounts.`,
    );
  }
  if (!connection.refreshToken) {
    throw new Error(
      `${connection.platform} connection for agent ${connection.agentId} expired but no refreshToken was stored — ` +
        `the agent needs to reconnect via Connect Accounts.`,
    );
  }

  const { accessToken, refreshToken, expiresAt } = await provider.refresh(connection.refreshToken);

  connection.accessToken = accessToken;
  if (refreshToken) connection.refreshToken = refreshToken;
  connection.expiresAt = expiresAt ?? null;
  await AppDataSource.getRepository(PlatformConnection).save(connection);

  return accessToken;
}

/**
 * The `PublishContext.connection` shape adapters need, resolved fresh from
 * the DB (and refreshed if expired) for one agent + platform. Throws a
 * clear error if the agent never connected this platform — callers
 * (routes/broadcasts.ts, services/ingestionService.ts) surface that as the
 * publish/poll failure reason rather than falling through to a stub.
 */
export async function resolveAgentConnection(
  agentId: string,
  platform: string,
): Promise<{ accessToken: string; externalAccountId: string; externalAccountName: string }> {
  const connection = await AppDataSource.getRepository(PlatformConnection).findOne({ where: { agentId, platform } });
  if (!connection) {
    throw new Error(
      `No ${platform} account connected for this agent yet — connect it first via the Connect Accounts screen.`,
    );
  }
  const accessToken = await getValidAccessToken(connection);
  return {
    accessToken,
    externalAccountId: connection.externalAccountId,
    externalAccountName: connection.externalAccountName,
  };
}
