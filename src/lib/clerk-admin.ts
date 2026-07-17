import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function requireClerkAdmin() {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
  if (!email) return null;

  const adminResults = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  return adminResults[0] || null;
}
