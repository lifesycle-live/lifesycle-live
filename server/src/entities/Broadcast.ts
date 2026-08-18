import "reflect-metadata";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { randomUUID } from "node:crypto";
import { Property } from "./Property.js";
import { Agent } from "./Agent.js";

export type BroadcastStatus = "scheduled" | "live" | "ended" | "failed";

@Entity()
export class Broadcast {
  @PrimaryColumn({ type: "varchar2", length: 36 })
  id!: string;

  @Column({ type: "varchar2", length: 36 })
  propertyId!: string;

  @ManyToOne(() => Property)
  @JoinColumn({ name: "propertyId" })
  property!: Property;

  @Column({ type: "varchar2", length: 36 })
  agentId!: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: "agentId" })
  agent!: Agent;

  @Column({ type: "varchar2", length: 20 })
  status!: BroadcastStatus;

  @Column({ type: "timestamp", nullable: true })
  startedAt?: Date | null;

  @Column({ type: "timestamp", nullable: true })
  endedAt?: Date | null;

  /** JSON-encoded PlatformId[] — see docs/06-system-architecture.md. */
  @Column({ type: "text" })
  platforms!: string;

  /** JSON-encoded Partial<Record<PlatformId, {rtmpUrl, streamKey}>>. */
  @Column({ type: "text", nullable: true })
  ingest?: string | null;

  @Column({ type: "number", default: 0 })
  peakViewers!: number;

  @Column({ type: "varchar2", length: 1000, nullable: true })
  transcriptUrl?: string | null;

  @Column({ type: "varchar2", length: 1000, nullable: true })
  recordingUrl?: string | null;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
