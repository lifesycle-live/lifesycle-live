import "reflect-metadata";
import { BeforeInsert, Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";
import { randomUUID } from "node:crypto";

@Entity()
export class Agent {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
