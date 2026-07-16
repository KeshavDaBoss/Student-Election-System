import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { electionConfig, admins } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Ensure config exists
    let configs = await db.select().from(electionConfig).limit(1);
    
    if (configs.length === 0) {
      await db.insert(electionConfig).values({ isAlwaysLive: true });
      configs = await db.select().from(electionConfig).limit(1);
    }

    const adminList = await db.select().from(admins).orderBy(admins.email);
    const filteredAdmins = adminList.filter(a => !a.isProtected);

    return NextResponse.json({ config: configs[0], admins: filteredAdmins });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
