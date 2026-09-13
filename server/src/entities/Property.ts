import "reflect-metadata";
import { BeforeInsert, Column, Entity, PrimaryColumn } from "typeorm";
import { randomUUID } from "node:crypto";

@Entity()
export class Property {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 500 })
  address!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  price?: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  thumbnailUrl?: string | null;

  /** Hero image shown on the listing card + detail screen. */
  @Column({ type: "varchar", length: 1000, nullable: true })
  imageUrl?: string | null;

  @Column({ type: "int", nullable: true })
  bedrooms?: number | null;

  @Column({ type: "int", nullable: true })
  bathrooms?: number | null;

  /** e.g. "Detached house", "2-bed flat". */
  @Column({ type: "varchar", length: 120, nullable: true })
  propertyType?: string | null;

  @Column({ type: "varchar", length: 2000, nullable: true })
  summary?: string | null;

  /** JSON-encoded string[] of selling points — parsed at the serialize boundary. */
  @Column({ type: "text", nullable: true })
  features?: string | null;

  /** JSON-encoded string[] of photo URLs shown in the listing gallery — parsed at the serialize boundary. */
  @Column({ type: "text", nullable: true })
  images?: string | null;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
