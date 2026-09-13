import { IngestInfo, PlatformAdapter, PublishContext, RawComment } from "./types.js";
import { getOAuthProvider } from "../oauth/registry.js";

/**
 * Zoom has no "push RTMP into a meeting" ingest the way Facebook/YouTube do —
 * the direction is reversed: a running Zoom meeting can be configured to
 * *push out* to a custom RTMP destination ("Custom Live Streaming",
 * `PATCH /meetings/{id}/livestream`). Making that fit this app's
 * phone-camera-pushes-RTMP model needs either (a) the agent joining their
 * own Zoom meeting from a device and relying on Zoom's outbound relay, or
 * (b) a re-think of Zoom as a "viewers join a meeting link" platform instead
 * of an RTMP target. Real per-agent OAuth connect is wired (`oauth/zoom.ts`)
 * so the account-linking half of this works; the publish mechanics are
 * intentionally left throwing rather than faked — see docs/18 and
 * TASKS.md Day 3.
 */
export class ZoomAdapter implements PlatformAdapter {
  readonly platform = "zoom" as const;
  // Zoom's in-meeting chat isn't exposed as a live poll/webhook feed the way
  // Facebook/YouTube comments are — realistically only available after the
  // fact (meeting chat history / recording transcript), so it lands as
  // "delayed" rather than "live".
  readonly commentFreshness = "delayed" as const;

  get configured(): boolean {
    return getOAuthProvider("zoom")?.configured() ?? false;
  }

  private requireConnection(context: PublishContext) {
    if (!context.connection) {
      throw new Error("No Zoom account connected for this agent yet — connect one via the Connect Accounts screen first.");
    }
    return context.connection;
  }

  async publish(_broadcastId: string, context: PublishContext): Promise<IngestInfo> {
    this.requireConnection(context);
    // TODO: create a meeting (POST /users/me/meetings), configure custom live
    // streaming (PATCH /meetings/{id}/livestream) and start it
    // (PATCH /meetings/{id}/livestream/status) — see the class doc comment
    // for why this doesn't map cleanly onto IngestInfo{rtmpUrl, streamKey}
    // yet.
    throw new Error("Zoom live-publish is not implemented yet — the account is connectable but going live isn't wired up.");
  }

  async end(_broadcastId: string, context: PublishContext, _ingest?: IngestInfo): Promise<void> {
    this.requireConnection(context);
    throw new Error("Zoom live-publish is not implemented yet — the account is connectable but going live isn't wired up.");
  }

  async fetchComments(
    _broadcastId: string,
    context: PublishContext,
    _ingest: IngestInfo,
    _since: Date | null,
  ): Promise<RawComment[]> {
    this.requireConnection(context);
    throw new Error("Zoom chat retrieval is not implemented yet.");
  }
}
