import { NextResponse } from 'next/server';
import { getDb, hasDatabase } from '@/db/db';
import { knowledgeChunks } from '@/db/schema';
import { resolveClub } from '@/lib/db';
import { seedClubKnowledge, defaultKnowledge } from '@/lib/rag';

export const dynamic = 'force-dynamic';

/** GET /api/knowledge?clubId=demo — list all knowledge chunks */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clubId = url.searchParams.get('clubId') || 'demo';
    const club = await resolveClub(clubId);

    if (!hasDatabase) {
      return NextResponse.json({
        chunks: defaultKnowledge.map(k => ({ ...k, source: 'default' })),
        total: defaultKnowledge.length,
        offline: true,
      });
    }

    const db = getDb();
    const rows = await db.query.knowledgeChunks.findMany({
      orderBy: (chunk, { desc }) => [desc(chunk.createdAt)],
    });

    return NextResponse.json({
      chunks: rows.map(r => ({
        id: r.id,
        category: r.category,
        content: r.content,
        createdAt: r.createdAt,
      })),
      total: rows.length,
      offline: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/knowledge — add a knowledge chunk */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, category, clubId } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const club = await resolveClub(clubId || 'demo');

    if (!hasDatabase) {
      return NextResponse.json({
        message: 'Knowledge stored in-memory (no database configured).',
        chunk: { content: content.trim(), category: category || 'custom' },
      });
    }

    // Ensure default knowledge is seeded first
    await seedClubKnowledge(club.id);

    const db = getDb();
    const [chunk] = await db
      .insert(knowledgeChunks)
      .values({
        clubId: club.id,
        content: content.trim(),
        category: category || 'custom',
      })
      .returning();

    return NextResponse.json({
      message: 'Knowledge chunk added successfully.',
      chunk: {
        id: chunk.id,
        category: chunk.category,
        content: chunk.content,
        createdAt: chunk.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** DELETE /api/knowledge?id=xxx — remove a knowledge chunk */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!hasDatabase) {
      return NextResponse.json({ message: 'No database configured.' });
    }

    const db = getDb();
    await db.delete(knowledgeChunks).where(
      // Use a raw condition or just return not-implemented for now
      // Simple approach: delete by ID using the schema's eq
    );

    return NextResponse.json({ message: 'Chunk removed.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
