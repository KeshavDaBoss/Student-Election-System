import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { electionConfig } from "@/db/schema";
import { requireClerkAdmin } from "@/lib/clerk-admin";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    
    const configs = await db.select().from(electionConfig).limit(1);
    
    if (configs.length > 0) {
      await db.update(electionConfig)
        .set({
          isAlwaysLive: data.isAlwaysLive,
          startTime: data.startTime ? new Date(data.startTime) : null,
          endTime: data.endTime ? new Date(data.endTime) : null,
          updatedAt: new Date()
        })
        .where(eq(electionConfig.id, configs[0].id));
    } else {
      await db.insert(electionConfig).values({
        isAlwaysLive: data.isAlwaysLive,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
  }
}
