// Renders the /legal/terms and /legal/privacy content (server/src/routes/legal.ts)
// to static HTML so the app's Vercel deploy can serve them at a permanent URL —
// Facebook App Review requires stable Terms/Privacy links, and this server isn't
// deployed anywhere persistent yet. Run: npm run legal:export (from server/).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { page, TERMS, PRIVACY } from "../routes/legal.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, "../../../app/legal-static");

async function writePage(slug: string, title: string, body: string): Promise<void> {
  const dir = path.join(outRoot, slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), page(title, body), "utf8");
  console.log(`wrote ${path.join(dir, "index.html")}`);
}

await writePage("terms", "Terms of Service", TERMS);
await writePage("privacy", "Privacy Policy", PRIVACY);
