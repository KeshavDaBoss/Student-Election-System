import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { requireClerkAdmin } from "@/lib/clerk-admin";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { email } = await request.json();
    
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    if (admin.role !== "superadmin") {
      return NextResponse.json({ error: "Only super-admins can add new admins." }, { status: 403 });
    }
    
    // Check if exists
    const existing = await db.select().from(admins).where(eq(admins.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 400 });
    }

    await db.insert(admins).values({ email: normalizedEmail });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add admin" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "0", 10);

  // Prevent deleting oneself
  if (id === admin.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  try {
    const target = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    if (target.length > 0 && target[0].isProtected) {
      return NextResponse.json({ error: "Cannot delete a protected admin" }, { status: 400 });
    }

    await db.delete(admins).where(eq(admins.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
  }
}
