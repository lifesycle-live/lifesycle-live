import "reflect-metadata";
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { randomUUID } from "node:crypto";
import { Contact } from "./Contact.js";
import { Broadcast } from "./Broadcast.js";

@Entity()
export class Lead {
  @PrimaryColumn({ type: "varchar2", length: 36 })
  id!: string;

  @Column({ type: "varchar2", length: 36 })
  contactId!: string;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: "contactId" })
  contact!: Contact;

  @Column({ type: "varchar2", length: 30 })
  source!: string;

  @Column({ type: "varchar2", length: 20, nullable: true })
  sourcePlatform?: string | null;

  @Column({ type: "varchar2", length: 36, nullable: true })
  broadcastId?: string | null;

  @ManyToOne(() => Broadcast, { nullable: true })
  @JoinColumn({ name: "broadcastId" })
  broadcast?: Broadcast | null;

  @Column({ type: "varchar2", length: 36, nullable: true })
  propertyId?: string | null;

  @Column({ type: "varchar2", length: 20 })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
