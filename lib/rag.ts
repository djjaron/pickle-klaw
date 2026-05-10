import { eq } from 'drizzle-orm';
import { getDb } from '@/db/db';
import { knowledgeChunks } from '@/db/schema';

export const defaultKnowledge = [
  {
    category: 'hours',
    content: 'We are open Monday through Friday 6am-10pm, Saturday 7am-9pm, Sunday 8am-8pm.',
  },
  {
    category: 'pricing',
    content: 'Drop-in play is $15. Standard membership is $49/month for 4 court sessions. Premium membership is $89/month for unlimited courts. Guests are $10 with a member.',
  },
  {
    category: 'courts',
    content: 'The club has 6 outdoor courts and 2 indoor courts. Indoor courts require a reservation. Outdoor courts are first-come, first-served outside league blocks.',
  },
  {
    category: 'rules',
    content: 'All players need non-marking shoes and a signed waiver. Paddle rentals are $5. Courts are limited to 4 players unless staff approves a clinic.',
  },
  {
    category: 'events',
    content: 'Weekly events include Monday Night Round Robin at 6pm, Wednesday Drill & Play at 7pm, and Saturday Morning Tournament at 9am.',
  },
  {
    category: 'coaching',
    content: 'Lessons are available: private lessons are $60/hour, semi-private lessons are $40/person/hour, and group clinics are $25/person.',
  },
];

export async function retrieveKnowledge(clubId: string | null, query: string): Promise<string[]> {
  const lower = query.toLowerCase();

  try {
    if (!clubId) {
      throw new Error('No club id');
    }

    const rows = await getDb().query.knowledgeChunks.findMany({
      where: eq(knowledgeChunks.clubId, clubId),
      limit: 12,
    });

    const relevant = rows.filter((chunk) => {
      const content = chunk.content.toLowerCase();
      return lower.split(/\s+/).some((word) => word.length > 2 && content.includes(word));
    });

    return (relevant.length > 0 ? relevant : rows).map((chunk) => chunk.content).slice(0, 4);
  } catch {
    const fallback = defaultKnowledge.filter((chunk) => {
      const content = chunk.content.toLowerCase();
      return lower.split(/\s+/).some((word) => word.length > 2 && content.includes(word));
    });

    return (fallback.length > 0 ? fallback : defaultKnowledge).map((chunk) => chunk.content).slice(0, 4);
  }
}

export async function seedClubKnowledge(clubId: string) {
  const database = getDb();

  const existing = await database.query.knowledgeChunks.findFirst({
    where: eq(knowledgeChunks.clubId, clubId),
  });

  if (existing) {
    return;
  }

  await database.insert(knowledgeChunks).values(
    defaultKnowledge.map((chunk) => ({
      clubId,
      content: chunk.content,
      category: chunk.category,
    })),
  );
}
