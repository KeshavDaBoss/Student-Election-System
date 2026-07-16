import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    await sql`ALTER TABLE positions DROP COLUMN IF EXISTS is_active;`;
    await sql`ALTER TABLE positions ADD COLUMN IF NOT EXISTS is_votable BOOLEAN NOT NULL DEFAULT true;`;
    await sql`ALTER TABLE positions ADD COLUMN IF NOT EXISTS is_suggestable BOOLEAN NOT NULL DEFAULT false;`;
    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

main();
