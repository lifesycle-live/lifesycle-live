import "reflect-metadata";
import { BeforeInsert, Column, Entity, PrimaryColumn } from "typeorm";
import { randomUUID } from "node:crypto";

@Entity()
export class Property {
  @PrimaryColumn({ type: "varchar2", length: 36 })
  id!: string;

  @Column({ type: "varchar2", length: 500 })
  address!: string;

  @Column({ type: "varchar2", length: 255, nullable: true })
  price?: string | null;

  @Column({ type: "varchar2", length: 1000, nullable: true })
  thumbnailUrl?: string | null;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
