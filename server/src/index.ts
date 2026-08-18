import "reflect-metadata";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { AppDataSource } from "./data-source.js";
import { authRoutes } from "./routes/auth.js";
import { propertyRoutes } from "./routes/properties.js";
import { broadcastRoutes } from "./routes/broadcasts.js";
import { contactRoutes } from "./routes/contacts.js";
import { leadRoutes } from "./routes/leads.js";
import { taskRoutes } from "./routes/tasks.js";
import { engagementRoutes } from "./routes/engagement.js";
import { platformConnectionRoutes } from "./routes/platformConnections.js";

const app = Fastify({ logger: true });

await AppDataSource.initialize();
app.log.info("Connected to Oracle Autonomous Database");

await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true, db: AppDataSource.isInitialized }));

await app.register(authRoutes);
await app.register(propertyRoutes);
await app.register(broadcastRoutes);
await app.register(contactRoutes);
await app.register(leadRoutes);
await app.register(taskRoutes);
await app.register(engagementRoutes);
await app.register(platformConnectionRoutes);

const port = Number(process.env.PORT ?? 4000);
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`lifesycle-live server listening on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
