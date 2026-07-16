import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

const PROTECTED_EMAILS = new Set([
  "keshavprathamyadav@gmail.com",
  "prathamkeshavyadav@gmail.com",
]);

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { email } = await request.json();
    
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    if (PROTECTED_EMAILS.has(normalizedEmail)) {
      return NextResponse.json({ error: "This email is reserved and already has protected admin access." }, { status: 400 });
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
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "0", 10);

  // Prevent deleting oneself
  if (id === admin.adminId) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  try {
    const target = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    if (target.length > 0 && PROTECTED_EMAILS.has(target[0].email)) {
      return NextResponse.json({ error: "Cannot delete a protected admin" }, { status: 400 });
    }

    await db.delete(admins).where(eq(admins.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
  }
}
