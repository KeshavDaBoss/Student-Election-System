import { NextResponse } from "next/server";
import { db } from "@/db";
import { electionConfig } from "@/db/schema";

export async function GET() {
  try {
    const configs = await db.select().from(electionConfig).limit(1);
    const config = configs[0];

    return NextResponse.json({
      voterTutorialVideoUrl: config?.voterTutorialVideoUrl ?? null,
    });
  } catch {
    return NextResponse.json({ voterTutorialVideoUrl: null });
  }
}
