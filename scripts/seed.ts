import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/db/schema";
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });

if (!process.env.TURSO_DATABASE_URL) {
  console.error("TURSO_DATABASE_URL is missing in .env.local");
  process.exit(1);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding database...");

  try {
    const admins = await db.select().from(schema.admins);
    const existingEmails = new Set(admins.map(a => a.email.toLowerCase()));

    const protectedAdmins = [
      "keshavprathamyadav@gmail.com",
      "prathamkeshavyadav@gmail.com",
    ];

    let addedCount = 0;
    for (const email of protectedAdmins) {
      if (!existingEmails.has(email)) {
        await db.insert(schema.admins).values({ email, isProtected: true, role: "superadmin" });
        console.log(`Adding protected admin: ${email}`);
        addedCount++;
      } else {
        const [existing] = await db.select().from(schema.admins).where(eq(schema.admins.email, email)).limit(1);
        if (existing) {
          const needsUpdate = existing.role !== "superadmin" || !existing.isProtected;
          if (needsUpdate) {
            await db.update(schema.admins).set({ role: "superadmin", isProtected: true }).where(eq(schema.admins.email, email));
            console.log(`Updating protected admin: ${email}`);
          }
        }
      }
    }

    if (addedCount === 0) {
      console.log("Protected admins already exist, skipping additions.");
    }

    const config = await db.select().from(schema.electionConfig);
    if (config.length === 0) {
      console.log("Initializing default election configuration (Live)");
      await db.insert(schema.electionConfig).values({
        isAlwaysLive: true,
      });
    }

    console.log("Seeding complete! ✅");
    process.exit(0);
  } catch (err) {
    console.error("Error during seeding:", err);
    process.exit(1);
  }
}

seed();
