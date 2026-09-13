import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env.js";
import { Agent } from "./entities/Agent.js";
import { Property } from "./entities/Property.js";
import { Contact } from "./entities/Contact.js";
import { Broadcast } from "./entities/Broadcast.js";
import { EngagementEvent } from "./entities/EngagementEvent.js";
import { Lead } from "./entities/Lead.js";
import { Task } from "./entities/Task.js";
import { ActivityItem } from "./entities/ActivityItem.js";
import { PlatformConnection } from "./entities/PlatformConnection.js";

if (!env.database.url) {
  throw new Error(
    "Missing DATABASE_URL. Set it in server/.env to your Supabase Postgres connection string " +
      "(Supabase dashboard -> Project Settings -> Database -> Connection string -> URI) — see .env.example.",
  );
}

/**
 * Supabase is plain Postgres. Use the connection string from the Supabase
 * dashboard (Project Settings -> Database). The pooled connection (host
 * `...pooler.supabase.com`, port 6543) is the right default for a stateless
 * API; append `?sslmode=require` or rely on the `ssl` option below.
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.database.url,
  ssl: { rejectUnauthorized: false },
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.TYPEORM_LOGGING === "true",
  entities: [Agent, Property, Contact, Broadcast, EngagementEvent, Lead, Task, ActivityItem, PlatformConnection],
});
