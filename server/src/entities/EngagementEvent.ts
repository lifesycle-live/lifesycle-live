import "reflect-metadata";
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { randomUUID } from "node:crypto";
import { Broadcast } from "./Broadcast.js";

@Entity()
export class EngagementEvent {
  @PrimaryColumn({ type: "varchar2", length: 36 })
  id!: string;

  @Column({ type: "varchar2", length: 36 })
  broadcastId!: string;

  @ManyToOne(() => Broadcast)
  @JoinColumn({ name: "broadcastId" })
  broadcast!: Broadcast;

  @Column({ type: "varchar2", length: 20 })
  platform!: string;

  /**
   * The platform's own id for this comment (Graph API comment id, YouTube
   * liveChatMessage id, ...). Null for events not created by the ingestion
   * pipeline. Used to dedupe repeated polls of the same comment window.
   */
  @Column({ type: "varchar2", length: 255, nullable: true })
  externalId?: string | null;

  @Column({ type: "varchar2", length: 20 })
  freshness!: string;

  @Column({ type: "varchar2", length: 255 })
  authorName!: string;

  @Column({ type: "text" })
  text!: string;

  @Column({ type: "varchar2", length: 30 })
  intent!: string;

  @Column({ type: "number" })
  intentConfidence!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "varchar2", length: 36, nullable: true })
  convertedToLeadId?: string | null;

  @Column({ type: "varchar2", length: 36, nullable: true })
  convertedToTaskId?: string | null;

  @Column({ type: "boolean", default: false })
  dismissed!: boolean;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
