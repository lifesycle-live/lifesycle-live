import "reflect-metadata";
import { BeforeInsert, Column, Entity, PrimaryColumn } from "typeorm";
import { randomUUID } from "node:crypto";

@Entity()
export class Contact {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email?: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  avatarUrl?: string | null;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
