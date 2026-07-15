import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Create the Neon SQL client
// DATABASE_URL should be set in .env.local
const sql = neon(process.env.DATABASE_URL!);

// Create Drizzle ORM instance with typed schema
export const db = drizzle(sql, { schema });

export { schema };
