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

  const listings = [
    {
      address: "42 Willow Street",
      price: "Offers over £450,000",
      propertyType: "3-bed semi-detached house",
      bedrooms: 3,
      bathrooms: 2,
      imageUrl:
        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=70",
      summary:
        "A beautifully renovated family home moments from Green Park station. Open-plan kitchen/diner opening onto a south-facing garden, with a converted loft study.",
      features: ["Renovated kitchen (2023)", "South-facing garden", "Loft study", "EPC rating B", "2 min to station"],
      images: [
        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=70",
      ],
    },
    {
      address: "12 Elm Court",
      price: "£325,000",
      propertyType: "2-bed apartment",
      bedrooms: 2,
      bathrooms: 1,
      imageUrl:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70",
      summary:
        "Bright top-floor apartment with a private balcony and river views. Allocated parking, secure entry, and a share of freehold.",
      features: ["Private balcony", "River views", "Allocated parking", "Share of freehold", "Chain free"],
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70",
      ],
    },
    {
      address: "8 Riverside Mews",
      price: "£610,000",
      propertyType: "4-bed townhouse",
      bedrooms: 4,
      bathrooms: 3,
      imageUrl:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70",
      summary:
        "Spacious three-storey townhouse in a quiet gated mews. Integral garage, roof terrace, and underfloor heating throughout the ground floor.",
      features: ["Gated development", "Integral garage", "Roof terrace", "Underfloor heating", "Walk to riverside"],
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=70",
        "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=70",
      ],
    },
  ];

  for (const listing of listings) {
    const existing = await properties.findOne({ where: { address: listing.address } });
    await properties.save(
      properties.create({
        ...(existing ?? {}),
        ...listing,
        features: JSON.stringify(listing.features),
        images: JSON.stringify(listing.images),
      }),
    );
  }

  console.log(`Seeded agent login: ${email} / ${password}`);
  console.log(`Agent id: ${agent.id}`);

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
