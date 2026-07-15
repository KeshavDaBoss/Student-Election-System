import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { sql, ilike, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  try {
    let whereClause = undefined;
    
    if (search) {
      whereClause = or(
        ilike(students.name, `%${search}%`),
        ilike(students.electionNumber, `%${search}%`)
      );
    }

    // Get paginated students
    const voters = await db
      .select({
        id: students.id,
        name: students.name,
        electionNumber: students.electionNumber,
        class: students.class,
        section: students.section,
        hasVoted: students.hasVoted,
        votedAt: students.votedAt,
      })
      .from(students)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset)
      .orderBy(students.name);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(whereClause);
      
    const totalCount = Number(countResult[0].count);

    return NextResponse.json({
      voters,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error("Fetch voters error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { students: parsedStudents } = body;

    if (!Array.isArray(parsedStudents) || parsedStudents.length === 0) {
      return NextResponse.json(
        { error: "No valid students provided." },
        { status: 400 }
      );
    }

    // Upsert students (using onConflictDoUpdate would be cleaner, but requires specifying all columns.
    // Drizzle Neon HTTP driver might have some quirks with bulk upserts on unique constraints.
    // For simplicity and safety, we'll insert in batches and handle conflicts gracefully if possible, 
    // or just use Drizzle's ON CONFLICT DO UPDATE).

    let count = 0;
    
    // We process in smaller chunks to avoid request size limits if CSV is huge
    const chunkSize = 500;
    for (let i = 0; i < parsedStudents.length; i += chunkSize) {
      const chunk = parsedStudents.slice(i, i + chunkSize);
      
      await db.insert(students).values(chunk).onConflictDoUpdate({
        target: students.electionNumber,
        set: {
          name: sql`EXCLUDED.name`,
          class: sql`EXCLUDED.class`,
          section: sql`EXCLUDED.section`,
        }
      });
      
      count += chunk.length;
    }

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Voter upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload voters to database." },
      { status: 500 }
    );
  }
}
