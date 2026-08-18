import "reflect-metadata";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { randomUUID } from "node:crypto";
import { Contact } from "./Contact.js";
import { Lead } from "./Lead.js";
import { Broadcast } from "./Broadcast.js";

@Entity()
export class Task {
  @PrimaryColumn({ type: "varchar2", length: 36 })
  id!: string;

  @Column({ type: "varchar2", length: 1000 })
  title!: string;

  @Column({ type: "varchar2", length: 36, nullable: true })
  contactId?: string | null;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: "contactId" })
  contact?: Contact | null;

  @Column({ type: "varchar2", length: 36, nullable: true })
  leadId?: string | null;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: "leadId" })
  lead?: Lead | null;

  @Column({ type: "varchar2", length: 36, nullable: true })
  broadcastId?: string | null;

  @ManyToOne(() => Broadcast, { nullable: true })
  @JoinColumn({ name: "broadcastId" })
  broadcast?: Broadcast | null;

  @Column({ type: "timestamp", nullable: true })
  dueAt?: Date | null;

  @Column({ type: "boolean", default: false })
  done!: boolean;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
