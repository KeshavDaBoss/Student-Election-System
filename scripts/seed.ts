import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { config } from "dotenv";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("Seeding database...");

  try {
    // Check if initial admin exists
    const admins = await db.select().from(schema.admins);
    
    if (admins.length === 0) {
      console.log("Adding initial admin: keshavprathamyadav@gmail.com");
      await db.insert(schema.admins).values({
        email: "keshavprathamyadav@gmail.com",
      });
    } else {
      console.log("Admin already exists, skipping.");
    }

    // Insert election config if missing
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
