import { getDb } from '@/db/db';
import { clubs, members, bookings, waivers } from '@/db/schema';
import { eq, ilike, and, gte, lte } from 'drizzle-orm';
export { retrieveKnowledge, seedClubKnowledge } from './rag';

// ─── Intent Classification ───────────────────────────────────────────────────

const INTENT_PATTERNS: Record<string, { keywords: string[]; requires: string[] }> = {
  booking: {
    keywords: ['book', 'reserve', 'court', 'schedule', 'slot', 'time', 'available', 'reservation'],
    requires: ['date', 'time'],
  },
  question: {
    keywords: ['what', 'how', 'when', 'who', 'where', 'hours', 'open', 'price', 'cost', 'fee', 'member', 'policy'],
    requires: ['topic'],
  },
  waiver: {
    keywords: ['waiver', 'sign', 'release', 'liability', 'form'],
    requires: ['member'],
  },
  directory: {
    keywords: ['find', 'lookup', 'search', 'member', 'coach', 'pro', 'instructor', 'who is'],
    requires: ['name'],
  },
  pricing: {
    keywords: ['price', 'cost', 'fee', 'membership', 'rate', 'package', 'how much'],
    requires: ['service'],
  },
  complaint: {
    keywords: ['problem', 'issue', 'broken', 'refund', 'cancel', 'unhappy', 'bad', 'wrong'],
    requires: ['issue_type'],
  },
};

export interface ClassifiedIntent {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  requiresHuman: boolean;
}

export function classifyIntent(message: string): ClassifiedIntent {
  const lower = message.toLowerCase();
  const entities: Record<string, string> = {};
  let bestIntent = 'general_question';
  let bestScore = 0;

  // Extract date entities
  const dateMatch = lower.match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})/);
  if (dateMatch) entities.date = dateMatch[0];

  // Extract time entities
  const timeMatch = lower.match(/(\d{1,2}(:\d{2})?\s*(am|pm))/);
  if (timeMatch) entities.time = timeMatch[0];

  // Extract name entities (simple heuristic)
  const nameMatch = lower.match(/(?:for|name is|i'm|i am|called)\s+([a-z]+(?:\s+[a-z]+)?)/);
  if (nameMatch) entities.name = nameMatch[1];

  // Score each intent
  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    const matches = config.keywords.filter(k => lower.includes(k));
    const score = matches.length / config.keywords.length;
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Complaints always require human
  const requiresHuman = bestIntent === 'complaint' || message.length < 5;

  return {
    intent: bestIntent,
    confidence: Math.round(bestScore * 100),
    entities,
    requiresHuman,
  };
}

// ─── Tool: Booking ────────────────────────────────────────────────────────────

export async function toolBooking(clubId: string, entities: Record<string, string>) {
  // Find available court slots
  let club: typeof clubs.$inferSelect | null | undefined;
  let existingBookings: Array<typeof bookings.$inferSelect> = [];

  const now = new Date();
  const searchDate = entities.date === 'today' ? now : new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const startOfDay = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  try {
    const database = getDb();
    club = await database.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
    existingBookings = await database.query.bookings.findMany({
      where: and(eq(bookings.clubId, clubId), gte(bookings.startTime, startOfDay), lte(bookings.startTime, endOfDay)),
    });
  } catch {
    club = {
      id: clubId,
      name: 'Pickleball Pro Club',
      slug: 'pickleball-pro-club',
      description: 'Premier pickleball facility with 8 courts, pro shop, and lessons.',
      address: 'Demo facility',
      phone: '(555) 014-2024',
      website: null,
      timezone: 'America/Chicago',
      settings: {
        courtCount: 8,
        bookingWindow: 14,
        maxGroupSize: 4,
        requireWaiver: true,
        operatingHours: [{ open: '06:00', close: '22:00' }],
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  if (!club) return { success: false, message: 'Club not found.' };

  const bookedSlots = new Set(existingBookings.map(b => b.startTime.getHours()));
  const courtCount = (club.settings as any)?.courtCount || 4;
  const openHours = (club.settings as any)?.operatingHours || [{ open: '06:00', close: '22:00' }];
  const [openH] = openHours[0].open.split(':').map(Number);
  const [closeH] = openHours[0].close.split(':').map(Number);

  const availableSlots: string[] = [];
  for (let h = openH; h < closeH; h++) {
    if (!bookedSlots.has(h)) {
      availableSlots.push(`${h}:00`);
    }
  }

  return {
    success: true,
    clubName: club.name,
    date: searchDate.toISOString().split('T')[0],
    courtCount,
    bookedSlots: existingBookings.length,
    availableSlots: availableSlots.slice(0, 6),
    message: availableSlots.length > 0
      ? `${availableSlots.length} slots available on ${searchDate.toLocaleDateString()}. First available: ${availableSlots.slice(0, 3).join(', ')}`
      : 'No courts available that day.',
  };
}

// ─── Tool: Member Lookup ─────────────────────────────────────────────────────

export async function toolMemberLookup(clubId: string, entities: Record<string, string>) {
  const name = entities.name;
  if (!name) return { success: false, message: 'No name provided for member lookup.' };

  let member: typeof members.$inferSelect | null | undefined;

  try {
    member = await getDb().query.members.findFirst({
      where: and(eq(members.clubId, clubId), ilike(members.name, `%${name}%`)),
    });
  } catch {
    member = name.includes('jordan')
      ? {
          id: 'demo-member',
          clubId,
          name: 'Jordan Lee',
          email: 'jordan@example.com',
          phone: '(555) 014-0140',
          skillLevel: '3.5',
          memberType: 'premium',
          joinedAt: new Date(),
        }
      : null;
  }

  if (!member) return { success: false, message: `No member found matching "${name}".` };

  return {
    success: true,
    member: { id: member.id, name: member.name, email: member.email, skillLevel: member.skillLevel, memberType: member.memberType },
    message: `${member.name} — ${member.skillLevel || 'unrated'} player, ${member.memberType} member`,
  };
}

// ─── Tool: Waiver Check ──────────────────────────────────────────────────────

export async function toolWaiverCheck(clubId: string, entities: Record<string, string>) {
  const name = entities.name;
  if (!name) {
    return {
      success: true,
      hasWaiver: false,
      message: 'No player name was provided, so the assistant should ask for the player name before checking waiver status.',
    };
  }

  let member: typeof members.$inferSelect | null | undefined;
  let waiver: typeof waivers.$inferSelect | null | undefined;

  try {
    const database = getDb();
    member = await database.query.members.findFirst({
      where: and(eq(members.clubId, clubId), ilike(members.name, `%${name}%`)),
    });

    if (member) {
      waiver = await database.query.waivers.findFirst({
        where: and(eq(waivers.memberId, member.id), eq(waivers.isActive, true)),
        orderBy: (w, { desc }) => [desc(w.signedAt)],
      });
    }
  } catch {
    member = {
      id: 'demo-member',
      clubId,
      name,
      email: null,
      phone: null,
      skillLevel: '3.0',
      memberType: 'guest',
      joinedAt: new Date(),
    };
    waiver = null;
  }

  if (!member) return { success: false, message: `No member found matching "${name}".` };

  if (!waiver || (waiver.expiresAt && new Date(waiver.expiresAt) < new Date())) {
    return {
      success: true,
      hasWaiver: false,
      message: `${member.name} does not have a current signed waiver. They need to sign before playing.`,
    };
  }

  return {
    success: true,
    hasWaiver: true,
    signedAt: waiver.signedAt,
    message: `${member.name} has a valid waiver signed on ${(waiver.signedAt || new Date()).toLocaleDateString()}.`,
  };
}
