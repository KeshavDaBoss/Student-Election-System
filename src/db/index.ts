import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    if (!DATABASE_URL) {
      throw new Error("No database connection string was provided to `neon()`. Perhaps an environment variable has not been set?");
    }
    const sql = neon(DATABASE_URL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export { schema };
