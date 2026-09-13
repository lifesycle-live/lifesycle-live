import "reflect-metadata";
import { BeforeInsert, Column, CreateDateColumn, Entity, PrimaryColumn, Unique, UpdateDateColumn } from "typeorm";
import { randomUUID } from "node:crypto";

/**
 * One agent's connected account on one platform — the result of the agent
 * running the "Connect your accounts" OAuth flow once. Broadcasts publish
 * using the connection that matches the broadcasting agent + platform,
 * instead of a single shared credential in .env.
 */
@Entity()
@Unique(["agentId", "platform"])
export class PlatformConnection {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  agentId!: string;

  @Column({ type: "varchar", length: 20 })
  platform!: string;

  /** Long-lived access token for this agent's account on this platform. Never serialized back to the client. */
  @Column({ type: "varchar", length: 2000 })
  accessToken!: string;

  /**
   * Null for platforms whose access token doesn't expire (e.g. a Facebook
   * Page token minted from a long-lived user token) or that don't support
   * refresh yet. Never serialized back to the client.
   */
  @Column({ type: "varchar", length: 2000, nullable: true })
  refreshToken?: string | null;

  /** Null where the platform's token doesn't expire (e.g. a Facebook Page token minted from a long-lived user token). */
  @Column({ type: "timestamp", nullable: true })
  expiresAt?: Date | null;

  /** The platform's id for the connected account (Facebook Page id, YouTube channel id, ...). */
  @Column({ type: "varchar", length: 255 })
  externalAccountId!: string;

  @Column({ type: "varchar", length: 255 })
  externalAccountName!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
