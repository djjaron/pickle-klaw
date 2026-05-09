import { pgTable, text, timestamp, uuid, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core';

// All tables prefixed with 'klw_' to avoid collisions with existing PickleCall tables
export const clubs = pgTable('klw_clubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  address: text('address'),
  phone: text('phone'),
  website: text('website'),
  timezone: text('timezone').default('America/New_York'),
  settings: jsonb('settings').$type<{
    courtCount?: number;
    bookingWindow?: number; // days
    maxGroupSize?: number;
    requireWaiver?: boolean;
    operatingHours?: { open: string; close: string }[];
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Locations ───────────────────────────────────────────────────────────────
export const locations = pgTable('klw_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  courtCount: integer('court_count').default(1),
  isIndoor: boolean('is_indoor').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Members ─────────────────────────────────────────────────────────────────
export const members = pgTable('klw_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id).notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  skillLevel: text('skill_level'), // '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0'
  memberType: text('member_type').default('standard'), // 'standard' | 'premium' | 'guest'
  joinedAt: timestamp('joined_at').defaultNow(),
}, table => ({
  clubEmailIdx: index('member_club_email_idx').on(table.clubId, table.email),
}));

// ─── Events ──────────────────────────────────────────────────────────────────
export const events = pgTable('klw_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id),
  title: text('title').notNull(),
  type: text('type').default('open_play'), // 'open_play' | 'tournament' | 'league' | 'lesson' | 'clinic'
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  maxParticipants: integer('max_participants'),
  skillLevelRange: jsonb('skill_level_range').$type<{ min?: string; max?: string }>(),
  price: integer('price'), // cents
  status: text('status').default('scheduled'), // 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Bookings ────────────────────────────────────────────────────────────────
export const bookings = pgTable('klw_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id).notNull(),
  eventId: uuid('event_id').references(() => events.id),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  type: text('type').notNull(), // 'court' | 'event' | 'lesson'
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  courtNumber: integer('court_number'),
  status: text('status').default('confirmed'), // 'confirmed' | 'cancelled' | 'no_show' | 'completed'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Waivers ─────────────────────────────────────────────────────────────────
export const waivers = pgTable('klw_waivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id).notNull(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  signedAt: timestamp('signed_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  waiverType: text('waiver_type').default('standard'),
  isActive: boolean('is_active').default(true),
});

// ─── Conversations ───────────────────────────────────────────────────────────
export const conversations = pgTable('klw_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id).notNull(),
  memberId: uuid('member_id').references(() => members.id),
  source: text('source').default('demo'), // 'demo' | 'sms' | 'voice' | 'web'
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  status: text('status').default('active'), // 'active' | 'closed'
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Messages ────────────────────────────────────────────────────────────────
export const messages = pgTable('klw_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  role: text('role').notNull(), // 'customer' | 'agent' | 'system'
  content: text('content').notNull(),
  intent: text('intent'), // 'booking' | 'question' | 'waiver' | 'directory' | 'pricing' | 'complaint'
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Agent Runs ──────────────────────────────────────────────────────────────
export const agentRuns = pgTable('klw_agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  messageId: uuid('message_id').references(() => messages.id),
  intent: text('intent').notNull(),
  confidence: integer('confidence').default(100), // 0-100
  toolsUsed: jsonb('tools_used').$type<string[]>(),
  knowledgeChunks: jsonb('knowledge_chunks').$type<string[]>(),
  modelResponse: text('model_response'),
  traceData: jsonb('trace_data').$type<Record<string, any>>(),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Knowledge Chunks ────────────────────────────────────────────────────────
export const knowledgeChunks = pgTable('klw_knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id).notNull(),
  content: text('content').notNull(),
  category: text('category').default('general'), // 'hours' | 'pricing' | 'courts' | 'rules' | 'events' | 'general'
  embeddingSource: text('embedding_source'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Integrations ────────────────────────────────────────────────────────────
export const integrations = pgTable('klw_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id).notNull(),
  type: text('type').notNull(), // 'twilio' | 'stripe' | 'google_calendar' | 'mailchimp'
  config: jsonb('config').$type<Record<string, any>>(),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
