import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    await db.insert(positions).values({
      title: data.title,
      numWinners: data.numWinners,
      isVotable: data.isVotable,
      isSuggestable: data.isSuggestable,
      displayOrder: data.displayOrder,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add position" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    await db.update(positions).set({
      title: data.title,
      numWinners: data.numWinners,
      isVotable: data.isVotable,
      isSuggestable: data.isSuggestable,
      displayOrder: data.displayOrder,
    }).where(eq(positions.id, data.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update position" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing position ID" }, { status: 400 });

    await db.delete(positions).where(eq(positions.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete position" }, { status: 500 });
  }
}
