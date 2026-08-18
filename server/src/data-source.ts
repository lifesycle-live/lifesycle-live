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

if (!env.oracle.connectString || !env.oracle.user || !env.oracle.password) {
  throw new Error(
    "Missing Oracle connection settings. Set ORACLE_CONNECT_STRING, ORACLE_USER, ORACLE_PASSWORD " +
      "(and ORACLE_WALLET_LOCATION/ORACLE_WALLET_PASSWORD for Autonomous Database) in server/.env — see .env.example.",
  );
}

/**
 * Autonomous Database connects over mTLS using the wallet you download from
 * the OCI console ("DB Connection" -> "Download Wallet"). node-oracledb's
 * Thin mode (no Instant Client install needed) supports this directly via
 * walletLocation/walletPassword passed through `extra`.
 */
export const AppDataSource = new DataSource({
  type: "oracle",
  connectString: env.oracle.connectString,
  username: env.oracle.user,
  password: env.oracle.password,
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.TYPEORM_LOGGING === "true",
  entities: [Agent, Property, Contact, Broadcast, EngagementEvent, Lead, Task, ActivityItem, PlatformConnection],
  extra: env.oracle.walletLocation
    ? {
        walletLocation: env.oracle.walletLocation,
        walletPassword: env.oracle.walletPassword,
      }
    : undefined,
});
