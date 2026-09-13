import "reflect-metadata";
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { randomUUID } from "node:crypto";
import { Contact } from "./Contact.js";
import { Broadcast } from "./Broadcast.js";

@Entity()
export class ActivityItem {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  contactId!: string;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: "contactId" })
  contact!: Contact;

  @Column({ type: "varchar", length: 30 })
  type!: string;

  @Column({ type: "text" })
  summary!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "varchar", length: 36, nullable: true })
  broadcastId?: string | null;

  @ManyToOne(() => Broadcast, { nullable: true })
  @JoinColumn({ name: "broadcastId" })
  broadcast?: Broadcast | null;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
