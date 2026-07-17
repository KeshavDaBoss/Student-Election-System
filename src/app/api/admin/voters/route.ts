import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { requireClerkAdmin } from "@/lib/clerk-admin";
import { sql, like, or, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const admin = await requireClerkAdmin();
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
      const pattern = `%${search.toLowerCase()}%`;
      whereClause = or(
        like(sql`lower(${students.name})`, pattern),
        like(sql`lower(${students.electionNumber})`, pattern)
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
  const admin = await requireClerkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Single student creation
    if (body.student) {
      const { name, electionNumber, class: studentClass, section } = body.student;
      
      // Check if election number exists
      const existing = await db.select().from(students).where(eq(students.electionNumber, electionNumber)).limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ error: "Election number already exists" }, { status: 400 });
      }

      await db.insert(students).values({
        name,
        electionNumber,
        class: studentClass,
        section,
      });

      return NextResponse.json({ success: true });
    }

    // Bulk upload
    const { students: parsedStudents } = body;

    if (!Array.isArray(parsedStudents) || parsedStudents.length === 0) {
      return NextResponse.json(
        { error: "No valid students provided." },
        { status: 400 }
      );
    }

    let count = 0;
    const chunkSize = 500;
    for (let i = 0; i < parsedStudents.length; i += chunkSize) {
      const chunk = parsedStudents.slice(i, i + chunkSize);
      
      await db.insert(students).values(chunk).onConflictDoUpdate({
        target: students.electionNumber,
        set: {
          name: sql`excluded.name`,
          class: sql`excluded.class`,
          section: sql`excluded.section`,
        }
      });
      
      count += chunk.length;
    }

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Voter create/upload error:", error);
    return NextResponse.json(
      { error: "Failed to process voters." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, electionNumber, class: studentClass, section } = body;

    // Check if new election number belongs to someone else
    const existing = await db.select().from(students).where(eq(students.electionNumber, electionNumber)).limit(1);
    if (existing.length > 0 && existing[0].id !== id) {
      return NextResponse.json({ error: "Election number belongs to another voter" }, { status: 400 });
    }

    await db.update(students).set({
      name,
      electionNumber,
      class: studentClass,
      section,
    }).where(eq(students.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Voter update error:", error);
    return NextResponse.json(
      { error: "Failed to update voter." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireClerkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "0", 10);

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  try {
    await db.delete(students).where(eq(students.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Voter delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete voter." },
      { status: 500 }
    );
  }
}
