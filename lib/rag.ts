import { eq } from 'drizzle-orm';
import { getDb } from '@/db/db';
import { knowledgeChunks } from '@/db/schema';

export const defaultKnowledge = [
  {
    category: 'hours',
    content: 'TTC Palms is open 7 days a week. Executive Office hours are Mon–Fri 9 AM – 1 PM. Lit courts available from dusk until 10 PM closing time.',
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
  {
    category: 'tournaments',
    content: 'TTC Palms hosts regular tournaments for all skill levels from 2.0 to 5.0. Check ttcpalms.com/events for upcoming tournament dates and registration.',
  },
  {
    category: 'dress code',
    content: 'TTC Palms requires proper tennis/pickleball attire. No swimwear, no jeans, no open-toed shoes. Non-marking court shoes are required on all playing surfaces.',
  },
  {
    category: 'doubles play',
    content: 'Group play and doubles is welcome. Courts accommodate up to 4 players. For groups larger than 4, reserve multiple adjacent courts. Regular court reservation policies apply.',
  },
  {
    category: 'kids programs',
    content: 'TTC Palms offers junior clinics and programs for kids ages 6-17. Kids waivers are required and must be signed by a parent or guardian. Contact frontdesk@ttcpalms.com for current youth program schedules.',
  },
  {
    category: 'private events',
    content: 'Private events and parties can be hosted at TTC Palms. The sunset terrace is available for private gatherings. Contact the Executive Office at (760) 346-6126 to discuss event packages and availability.',
  },
  {
    category: 'billing',
    content: 'For billing questions or concerns, contact the Executive Office at (760) 346-6126 or email frontdesk@ttcpalms.com. Membership charges are processed on the 1st of each month.',
  },
  {
    category: 'access cards',
    content: 'Lost or damaged membership cards can be replaced at the Pro Shop. A $10 replacement fee applies. You can still access the courts by checking in at the front desk.',
  },
  {
    category: 'referral program',
    content: 'TTC Palms members can refer friends and receive a credit toward their next month\'s dues. Referred friends receive a complimentary trial session. Ask at the Pro Shop for details.',
  },
  {
    category: 'equipment',
    content: 'Paddles, balls, and accessories are available for purchase at the Pro Shop. Demo paddles are available to try before you buy. Paddle rental is included with drop-in and guest passes.',
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
