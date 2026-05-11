import { eq } from 'drizzle-orm';
import { getDb } from '@/db/db';
import { knowledgeChunks } from '@/db/schema';

export const defaultKnowledge = [
  {
    category: 'hours',
    content: 'TTC Palms is open 7 days a week. Executive Office hours are Mon–Fri 9 AM – 1 PM. Lit courts available from dusk until 10 PM.',
  },
  {
    category: 'location',
    content: 'TTC Palms is located at 45750 San Luis Rey, Palm Desert, CA 92260. Enter at Shadow Mountain Resort gate off San Luis Rey — dial 111 at the gate if not a member. Turn left on Club Circle Dr and follow to the parking in front of the courts.',
  },
  {
    category: 'pricing',
    content: 'Memberships are available for Tennis, Pickleball, Social, Homeowner, and Founding levels. Private lessons are available by appointment in 60 or 90 minute sessions. Morning Clinics run Mon, Wed, Fri 7AM–9AM with 8 players max.',
  },
  {
    category: 'courts',
    content: 'TTC Palms features championship pickleball and tennis courts with professional surfaces. Court reservations can be made online. Lit courts are available dusk to 10 PM.',
  },
  {
    category: 'rules',
    content: 'All players must sign a waiver before playing. Guest waivers are available online. Non-marking shoes required on all courts. Proper tennis/pickleball attire required.',
  },
  {
    category: 'coaching',
    content: 'Elite coaching from USPTA and PPR certified professionals. Private lessons by appointment (60 or 90 min). Morning Clinics Mon/Wed/Fri 7AM–9AM. Sunset Socials on Thu & Sat evenings (coming soon).',
  },
  {
    category: 'amenities',
    content: 'TTC Palms offers a Bollettieri infinity pool, pro shop with equipment and apparel, members-only lounges, sunset terrace, and a future restaurant. Parking is available directly in front of the courts.',
  },
  {
    category: 'events',
    content: 'TTC Palms hosts regular events including Morning Clinics (Mon/Wed/Fri 7AM), Sunset Socials (Thu/Sat evenings, coming soon), tournaments, and private events. Check ttcpalms.com/events for the latest schedule.',
  },
  {
    category: 'membership',
    content: 'TTC Palms offers Tennis, Pickleball, Social, Homeowner, and Founding memberships. Contact frontdesk@ttcpalms.com or call (760) 346-6126 to inquire. Schedule a tour at ttcpalms.com/membership.',
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
