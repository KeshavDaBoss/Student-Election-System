import { NextRequest, NextResponse } from "next/server";
import { requireClerkAdmin } from "@/lib/clerk-admin";

export async function GET(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    email: admin.email,
    role: admin.role,
  });
}
