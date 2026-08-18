import "reflect-metadata";
import bcrypt from "bcryptjs";
import { AppDataSource } from "./data-source.js";
import { Agent } from "./entities/Agent.js";
import { Property } from "./entities/Property.js";

/**
 * Seeds only what a real deployment needs to boot: one login and the
 * property listings an agent would actually enter. Deliberately does NOT
 * seed fake leads/tasks/engagement events — those only exist once a real
 * broadcast generates them, so an empty CRM here is the honest state.
 */
async function main() {
  await AppDataSource.initialize();

  const agents = AppDataSource.getRepository(Agent);
  const properties = AppDataSource.getRepository(Property);

  const email = process.env.SEED_AGENT_EMAIL ?? "agent@lifesycle.example";
  const password = process.env.SEED_AGENT_PASSWORD ?? "changeme123";

  let agent = await agents.findOne({ where: { email } });
  if (!agent) {
    agent = await agents.save(
      agents.create({ email, passwordHash: await bcrypt.hash(password, 10), name: "Demo Agent" }),
    );
  }

  const existingProperties = await properties.count();
  if (existingProperties === 0) {
    await properties.save([
      properties.create({ address: "42 Willow Street", price: "Offers over £450,000" }),
      properties.create({ address: "12 Elm Court", price: "£325,000" }),
      properties.create({ address: "8 Riverside Mews", price: "£610,000" }),
    ]);
  }

  console.log(`Seeded agent login: ${email} / ${password}`);
  console.log(`Agent id: ${agent.id}`);

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
