import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { candidates, positions } from "@/db/schema";
import { requireClerkAdmin } from "@/lib/clerk-admin";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const allPositions = await db.select().from(positions).orderBy(positions.displayOrder);
    const allCandidates = await db.select().from(candidates);

    const positionsWithCandidates = allPositions.map(p => ({
      ...p,
      candidates: allCandidates.filter(c => c.positionId === p.id)
    }));

    return NextResponse.json(positionsWithCandidates);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    await db.insert(candidates).values({
      positionId: data.positionId,
      name: data.name,
      class: data.class || null,
      section: data.section || null,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add candidate" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    await db.update(candidates).set({
      name: data.name,
      class: data.class || null,
      section: data.section || null,
    }).where(eq(candidates.id, data.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "0", 10);

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    await db.delete(candidates).where(eq(candidates.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete candidate" }, { status: 500 });
  }
}
