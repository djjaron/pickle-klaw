import { and, count, desc, eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/db';
import {
  agentRuns,
  bookings,
  clubs,
  conversations,
  events,
  knowledgeChunks,
  locations,
  members,
  messages,
  waivers,
} from '@/db/schema';
import { seedClubKnowledge } from './rag';

export const DEMO_CLUB_SLUG = 'pickleball-pro-club';
export const DEMO_CLUB_ALIAS = 'demo';

export type ClubRecord = typeof clubs.$inferSelect;

export const fallbackDemoClub: ClubRecord = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Pickleball Pro Club',
  slug: DEMO_CLUB_SLUG,
  description: 'Premier pickleball facility with 8 courts, pro shop, lessons, leagues, and weekend events.',
  address: '1200 Rally Point Drive, Austin, TX',
  phone: '(555) 014-2024',
  website: 'https://example.com',
  timezone: 'America/Chicago',
  settings: {
    courtCount: 8,
    bookingWindow: 14,
    maxGroupSize: 4,
    requireWaiver: true,
    operatingHours: [{ open: '06:00', close: '22:00' }],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveClub(identifier?: string | null): Promise<ClubRecord> {
  const normalized = identifier || DEMO_CLUB_ALIAS;

  if (!hasDatabase) {
    return fallbackDemoClub;
  }

  if (normalized === DEMO_CLUB_ALIAS || normalized === 'demo-club' || normalized === DEMO_CLUB_SLUG) {
    return ensureDemoClub();
  }

  const database = getDb();
  const club = uuidPattern.test(normalized)
    ? await database.query.clubs.findFirst({ where: eq(clubs.id, normalized) })
    : await database.query.clubs.findFirst({ where: eq(clubs.slug, normalized) });

  return club || ensureDemoClub();
}

export async function ensureDemoClub(): Promise<ClubRecord> {
  if (!hasDatabase) {
    return fallbackDemoClub;
  }

  const database = getDb();
  const existing = await database.query.clubs.findFirst({
    where: eq(clubs.slug, DEMO_CLUB_SLUG),
  });

  if (existing) {
    const needsBackfill = !existing.settings || !existing.address || !existing.phone || !existing.website;
    const club = needsBackfill
      ? (
          await database
            .update(clubs)
            .set({
              description: existing.description || fallbackDemoClub.description,
              address: existing.address || fallbackDemoClub.address,
              phone: existing.phone || fallbackDemoClub.phone,
              website: existing.website || fallbackDemoClub.website,
              timezone: existing.timezone || fallbackDemoClub.timezone,
              settings: existing.settings || fallbackDemoClub.settings,
              updatedAt: new Date(),
            })
            .where(eq(clubs.id, existing.id))
            .returning()
        )[0] || existing
      : existing;

    await seedDemoChildren(existing.id);
    return club;
  }

  const [club] = await database
    .insert(clubs)
    .values({
      name: fallbackDemoClub.name,
      slug: fallbackDemoClub.slug,
      description: fallbackDemoClub.description,
      address: fallbackDemoClub.address,
      phone: fallbackDemoClub.phone,
      website: fallbackDemoClub.website,
      timezone: fallbackDemoClub.timezone,
      settings: fallbackDemoClub.settings,
    })
    .returning();

  await seedDemoChildren(club.id);
  return club;
}

async function seedDemoChildren(clubId: string) {
  const database = getDb();
  await seedClubKnowledge(clubId);

  const existingLocation = await database.query.locations.findFirst({
    where: eq(locations.clubId, clubId),
  });

  if (!existingLocation) {
    await database.insert(locations).values({
      clubId,
      name: 'Main Facility',
      address: fallbackDemoClub.address,
      courtCount: 8,
      isIndoor: true,
    });
  }

  const existingMember = await database.query.members.findFirst({
    where: eq(members.clubId, clubId),
  });

  let jordanId = existingMember?.id;
  if (!existingMember) {
    const seededMembers = await database
      .insert(members)
      .values([
        {
          clubId,
          name: 'Jordan Lee',
          email: 'jordan@example.com',
          phone: '(555) 014-0140',
          skillLevel: '3.5',
          memberType: 'premium',
        },
        {
          clubId,
          name: 'Avery Chen',
          email: 'avery@example.com',
          phone: '(555) 014-0141',
          skillLevel: '3.0',
          memberType: 'standard',
        },
      ])
      .returning();
    jordanId = seededMembers[0]?.id;
  }

  if (jordanId) {
    const existingWaiver = await database.query.waivers.findFirst({
      where: and(eq(waivers.clubId, clubId), eq(waivers.memberId, jordanId)),
    });

    if (!existingWaiver) {
      await database.insert(waivers).values({
        clubId,
        memberId: jordanId,
        waiverType: 'standard',
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    }
  }

  const existingEvent = await database.query.events.findFirst({
    where: eq(events.clubId, clubId),
  });

  if (!existingEvent) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(18, 0, 0, 0);
    const weekend = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    weekend.setHours(9, 0, 0, 0);

    await database.insert(events).values([
      {
        clubId,
        title: 'Monday Night Round Robin',
        type: 'open_play',
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        maxParticipants: 32,
        price: 1500,
        status: 'scheduled',
      },
      {
        clubId,
        title: 'Saturday Morning Tournament',
        type: 'tournament',
        startTime: weekend,
        endTime: new Date(weekend.getTime() + 4 * 60 * 60 * 1000),
        maxParticipants: 48,
        price: 2500,
        status: 'scheduled',
      },
    ]);
  }
}

export async function getDashboardStats(clubIdentifier?: string | null) {
  const club = await resolveClub(clubIdentifier);

  if (!hasDatabase) {
    return {
      club,
      totalConversations: 0,
      totalMessages: 0,
      totalAgentRuns: 0,
      totalKnowledgeChunks: 6,
      totalBookings: 0,
      intents: {},
      avgLatency: 0,
      recentRuns: [],
      offline: true,
    };
  }

  const database = getDb();
  const [conversationCount, messageCount, runCount, chunkCount, bookingCount, runs] = await Promise.all([
    database.select({ value: count() }).from(conversations).where(eq(conversations.clubId, club.id)),
    database
      .select({ value: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.clubId, club.id)),
    database
      .select({ value: count() })
      .from(agentRuns)
      .innerJoin(conversations, eq(agentRuns.conversationId, conversations.id))
      .where(eq(conversations.clubId, club.id)),
    database.select({ value: count() }).from(knowledgeChunks).where(eq(knowledgeChunks.clubId, club.id)),
    database.select({ value: count() }).from(bookings).where(eq(bookings.clubId, club.id)),
    database.query.agentRuns.findMany({
      orderBy: (run, { desc: descending }) => [descending(run.createdAt)],
      limit: 12,
    }),
  ]);

  const intents: Record<string, number> = {};
  let totalLatency = 0;
  const clubRuns = runs.filter((run) => run.intent);

  for (const run of clubRuns) {
    intents[run.intent] = (intents[run.intent] || 0) + 1;
    totalLatency += run.latencyMs || 0;
  }

  return {
    club,
    totalConversations: conversationCount[0]?.value || 0,
    totalMessages: messageCount[0]?.value || 0,
    totalAgentRuns: runCount[0]?.value || 0,
    totalKnowledgeChunks: chunkCount[0]?.value || 0,
    totalBookings: bookingCount[0]?.value || 0,
    intents,
    avgLatency: clubRuns.length > 0 ? Math.round(totalLatency / clubRuns.length) : 0,
    recentRuns: clubRuns.slice(0, 8).map((run) => ({
      id: run.id,
      intent: run.intent,
      confidence: run.confidence || 0,
      toolsUsed: run.toolsUsed || [],
      latencyMs: run.latencyMs || 0,
      createdAt: run.createdAt,
    })),
    offline: false,
  };
}
