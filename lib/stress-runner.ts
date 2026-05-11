/**
 * Synthetic User Stress Test — 25 pickleball users, onboard, find gaps.
 *
 * Each user is onboarded with a profile, then runs 3-5 conversation turns.
 * Results compared across 5 model configurations (template + 4 LLM providers).
 * Identifies gaps: missing intents, low confidence, missing knowledge, broken flows.
 *
 * Run: npx tsx lib/stress.test.ts
 */

import { classifyIntent } from './intent';
import { retrieveKnowledge, defaultKnowledge } from './rag';

// ─── 25 Synthetic User Personas ─────────────────────────────────────────────

interface Persona {
  id: string;
  name: string;
  email: string;
  phone: string;
  skillLevel: string;
  memberType: string;
  scenario: string;
  onboardingMessages: string[];
  conversationMessages: string[];
}

const users: Persona[] = [
  {
    id: 'u01', name: 'Jordan Lee', email: 'jordan@ttcpalms.com', phone: '(760) 555-0101',
    skillLevel: '3.5', memberType: 'premium',
    scenario: 'Premium member booking a court on a busy Saturday',
    onboardingMessages: ['sign waiver for Jordan Lee'],
    conversationMessages: [
      'I want to book a court for Saturday at 10am',
      'Is Court 3 available?',
      'Can you confirm my booking?',
    ],
  },
  {
    id: 'u02', name: 'Avery Chen', email: 'avery@ttcpalms.com', phone: '(760) 555-0102',
    skillLevel: '3.0', memberType: 'standard',
    scenario: 'New standard member figuring out membership benefits',
    onboardingMessages: ['I just became a member'],
    conversationMessages: [
      'What does the standard membership include?',
      'Can I bring a guest?',
      'How do I upgrade to premium?',
    ],
  },
  {
    id: 'u03', name: 'Taylor Reed', email: 'taylor@ttcpalms.com', phone: '(760) 555-0103',
    skillLevel: '2.5', memberType: 'guest',
    scenario: 'First-time visitor, never played pickleball before',
    onboardingMessages: ['I have never played before', 'Do I need to sign a waiver?'],
    conversationMessages: [
      'Can I rent a paddle?',
      'How much is a drop-in session?',
      'Is there a beginner clinic?',
      'What shoes should I wear?',
    ],
  },
  {
    id: 'u04', name: 'Morgan Bailey', email: 'morgan@ttcpalms.com', phone: '(760) 555-0104',
    skillLevel: '4.5', memberType: 'premium',
    scenario: 'Competitive player looking for tournaments',
    onboardingMessages: ['sign waiver for Morgan Bailey'],
    conversationMessages: [
      'Are there any tournaments this month?',
      'I want to join the next open play',
      'Who are the other 4.5 players here?',
    ],
  },
  {
    id: 'u05', name: 'Casey Quinn', email: 'casey@ttcpalms.com', phone: '(760) 555-0105',
    skillLevel: '3.0', memberType: 'homeowner',
    scenario: 'Homeowner member, wants to book private lesson',
    onboardingMessages: ['I live in the community'],
    conversationMessages: [
      'How do I book a private lesson?',
      'What coach do you recommend for 3.0 players?',
      'Can I book a recurring lesson every Tuesday?',
    ],
  },
  {
    id: 'u06', name: 'Riley Park', email: 'riley@ttcpalms.com', phone: '(760) 555-0106',
    skillLevel: '4.0', memberType: 'founding',
    scenario: 'Founding member with billing complaint',
    onboardingMessages: ['Look up member Riley Park'],
    conversationMessages: [
      'I was charged twice for my membership this month',
      'Can I get a refund?',
      'This is really frustrating',
    ],
  },
  {
    id: 'u07', name: 'Dakota Winter', email: 'dakota@ttcpalms.com', phone: '(760) 555-0107',
    skillLevel: '2.0', memberType: 'social',
    scenario: 'Social member interested in Sunset Socials',
    onboardingMessages: ['Do members need waivers for social events?'],
    conversationMessages: [
      'What time is the Sunset Social on Thursday?',
      'Can I bring three friends?',
      'Is there a dress code?',
    ],
  },
  {
    id: 'u08', name: 'Sage Hart', email: 'sage@ttcpalms.com', phone: '(760) 555-0108',
    skillLevel: '5.0', memberType: 'premium',
    scenario: 'Pro-level player, needs court for coaching session',
    onboardingMessages: ['sign waiver for Sage Hart', 'find me a coach for 5.0 level'],
    conversationMessages: [
      'I need a court to coach a student today at 2pm',
      'Do coaches need a separate waiver?',
      'Can I reserve Court 1 for 3 hours?',
    ],
  },
  {
    id: 'u09', name: 'Emerson Cole', email: 'emerson@ttcpalms.com', phone: '(760) 555-0109',
    skillLevel: '3.5', memberType: 'standard',
    scenario: 'Member with expired waiver, needs to renew',
    onboardingMessages: ['check waiver status for Emerson Cole'],
    conversationMessages: [
      'My waiver might be expired',
      'How do I sign a new waiver?',
      'Can I play while my waiver is being processed?',
    ],
  },
  {
    id: 'u10', name: 'Quinn Ashley', email: 'quinn@ttcpalms.com', phone: '(760) 555-0110',
    skillLevel: '3.0', memberType: 'guest',
    scenario: 'Drop-in guest, wants to understand pricing',
    onboardingMessages: ['How much for a drop-in?'],
    conversationMessages: [
      'Do I need a membership to play?',
      'What is the guest fee?',
      'Can I pay per visit?',
    ],
  },
  {
    id: 'u11', name: 'Finley Drew', email: 'finley@ttcpalms.com', phone: '(760) 555-0111',
    skillLevel: '4.0', memberType: 'premium',
    scenario: 'Booking group court for Friday night doubles',
    onboardingMessages: ['I want to book 2 courts for Friday at 7pm'],
    conversationMessages: [
      'We have 8 people for doubles',
      'Can I reserve Courts 2 and 3?',
      'How late are the lit courts open?',
    ],
  },
  {
    id: 'u12', name: 'Blake Jordan', email: 'blake@ttcpalms.com', phone: '(760) 555-0112',
    skillLevel: '2.5', memberType: 'standard',
    scenario: 'Injured player, needs to freeze membership',
    onboardingMessages: ['I hurt my shoulder'],
    conversationMessages: [
      'Can I freeze my membership temporarily?',
      'How does the medical pause work?',
      'When can I come back?',
    ],
  },
  {
    id: 'u13', name: 'Arden Skye', email: 'arden@ttcpalms.com', phone: '(760) 555-0113',
    skillLevel: '3.5', memberType: 'premium',
    scenario: 'Planning a birthday party event',
    onboardingMessages: ['Book a private event'],
    conversationMessages: [
      'I want to host a birthday party for 20 people',
      'Do you have a party package?',
      'Can I reserve the terrace for sunset?',
    ],
  },
  {
    id: 'u14', name: 'Rowan Ellis', email: 'rowan@ttcpalms.com', phone: '(760) 555-0114',
    skillLevel: '4.5', memberType: 'founding',
    scenario: 'Founding member wanting to refer a friend',
    onboardingMessages: ['Look up member Rowan Ellis'],
    conversationMessages: [
      'How do I refer a friend for membership?',
      'Is there a referral discount?',
      'My friend wants to try before joining',
    ],
  },
  {
    id: 'u15', name: 'Phoenix Lane', email: 'phoenix@ttcpalms.com', phone: '(760) 555-0115',
    skillLevel: '3.0', memberType: 'guest',
    scenario: 'Tourist, wants a one-day pass',
    onboardingMessages: ['I am visiting from out of town', 'sign waiver'],
    conversationMessages: [
      'Can I play as a non-member?',
      'Do you have day passes?',
      'Can I rent equipment?',
      'What are your hours today?',
    ],
  },
  {
    id: 'u16', name: 'Harper Vale', email: 'harper@ttcpalms.com', phone: '(760) 555-0116',
    skillLevel: '3.5', memberType: 'pickleball',
    scenario: 'Pickleball-only member, wants tennis too',
    onboardingMessages: ['upgrade membership to include tennis'],
    conversationMessages: [
      'I have a pickleball membership but want to add tennis',
      'How much more is the tennis add-on?',
      'Can I try a tennis court first?',
    ],
  },
  {
    id: 'u17', name: 'Reese Novak', email: 'reese@ttcpalms.com', phone: '(760) 555-0117',
    skillLevel: '4.0', memberType: 'premium',
    scenario: 'Frequent player, wants to auto-book courts',
    onboardingMessages: ['Book a court for tomorrow at 8am'],
    conversationMessages: [
      'Can I set up recurring court reservations?',
      'Same time every Monday and Wednesday',
      'Book it for the whole month',
    ],
  },
  {
    id: 'u18', name: 'Spencer Knox', email: 'spencer@ttcpalms.com', phone: '(760) 555-0118',
    skillLevel: '3.0', memberType: 'standard',
    scenario: 'First lesson, nervous about skill level',
    onboardingMessages: ['I want to book a private lesson for beginners'],
    conversationMessages: [
      'I have never taken a lesson before',
      'What should I bring to my first lesson?',
      'Is the coach patient with beginners?',
    ],
  },
  {
    id: 'u19', name: 'Cameron Wynn', email: 'cameron@ttcpalms.com', phone: '(760) 555-0119',
    skillLevel: '5.0', memberType: 'premium',
    scenario: 'Tournament player, needs specific court conditions',
    onboardingMessages: ['Find me a court with good lighting for evening play'],
    conversationMessages: [
      'Which courts have the best lighting?',
      'I need a court with no wind issues',
      'Court 4 has a dead spot, can it be fixed?',
    ],
  },
  {
    id: 'u20', name: 'Devin Sage', email: 'devin@ttcpalms.com', phone: '(760) 555-0120',
    skillLevel: '2.5', memberType: 'guest',
    scenario: 'Parent looking for kids programs',
    onboardingMessages: ['Are there programs for kids?'],
    conversationMessages: [
      'My daughter is 10 and wants to learn pickleball',
      'Do you have junior clinics?',
      'What age groups do you serve?',
      'Do kids need a separate waiver?',
    ],
  },
  {
    id: 'u21', name: 'Kai Sterling', email: 'kai@ttcpalms.com', phone: '(760) 555-0121',
    skillLevel: '4.0', memberType: 'social',
    scenario: 'Social member, wants to join league',
    onboardingMessages: ['Join a play session', 'sign waiver for Kai Sterling'],
    conversationMessages: [
      'Is there a weekly league I can join?',
      'How are teams formed?',
      'When does the next season start?',
    ],
  },
  {
    id: 'u22', name: 'Logan Frost', email: 'logan@ttcpalms.com', phone: '(760) 555-0122',
    skillLevel: '3.5', memberType: 'homeowner',
    scenario: 'Homeowner, lost access card',
    onboardingMessages: ['I lost my membership card'],
    conversationMessages: [
      'How do I get a replacement card?',
      'Can I still access the courts without it?',
      'Is there a fee for a new card?',
    ],
  },
  {
    id: 'u23', name: 'Parker Glenn', email: 'parker@ttcpalms.com', phone: '(760) 555-0123',
    skillLevel: '4.5', memberType: 'premium',
    scenario: 'Pro shop question — paddle recommendation',
    onboardingMessages: ['Visit the Pro Shop'],
    conversationMessages: [
      'What paddles do you carry?',
      'Can I demo a paddle before buying?',
      'Do you have the new Selkirk model?',
    ],
  },
  {
    id: 'u24', name: 'Jamie Ocean', email: 'jamie@ttcpalms.com', phone: '(760) 555-0124',
    skillLevel: '3.0', memberType: 'standard',
    scenario: 'Canceling reservation due to rain',
    onboardingMessages: ['I have a problem with my booking'],
    conversationMessages: [
      'It looks like rain tomorrow',
      'Can I cancel my court reservation?',
      'Do I get a refund or credit?',
    ],
  },
  {
    id: 'u25', name: 'Alex Rivers', email: 'alex@ttcpalms.com', phone: '(760) 555-0125',
    skillLevel: '2.0', memberType: 'guest',
    scenario: 'Lost tourist, needs directions',
    onboardingMessages: ['How do I get to the club?'],
    conversationMessages: [
      'I am on San Luis Rey but cannot find the entrance',
      'Is there parking available?',
      'Which gate should I use?',
      'I do not see any signs',
    ],
  },
];

// ─── Model definitions (5 providers, each with 2 modes = 10 total) ───────────

type ModelId = 'template' | 'template:strict' | 'openai:mini' | 'openai:fast' |
               'anthropic:haiku' | 'anthropic:fast' | 'deepseek:chat' | 'deepseek:fast' |
               'kimi:standard' | 'kimi:fast';

interface ModelSpec { id: ModelId; provider: string; label: string; }

const models: ModelSpec[] = [
  { id: 'template',           provider: 'template',  label: 'Template' },
  { id: 'template:strict',    provider: 'template',  label: 'Template (strict rules)' },
  { id: 'openai:mini',        provider: 'openai',    label: 'GPT-4o-mini' },
  { id: 'openai:fast',        provider: 'openai',    label: 'GPT-3.5-turbo' },
  { id: 'anthropic:haiku',    provider: 'anthropic', label: 'Claude Haiku' },
  { id: 'anthropic:fast',     provider: 'anthropic', label: 'Claude Haiku (fast mode)' },
  { id: 'deepseek:chat',      provider: 'deepseek',  label: 'DeepSeek Chat' },
  { id: 'deepseek:fast',      provider: 'deepseek',  label: 'DeepSeek (fast mode)' },
  { id: 'kimi:standard',      provider: 'kimi',      label: 'Kimi Moonshot' },
  { id: 'kimi:fast',          provider: 'kimi',      label: 'Kimi (fast mode)' },
];

// ─── Gap Types ───────────────────────────────────────────────────────────────

interface Gap {
  userId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  detail: string;
}

// ─── Onboarding Check ────────────────────────────────────────────────────────

function onboardUser(user: Persona): Gap[] {
  const gaps: Gap[] = [];

  // Check: can the system classify the onboarding intent?
  for (const msg of user.onboardingMessages) {
    const intent = classifyIntent(msg);
    if (intent.confidence === 0) {
      gaps.push({
        userId: user.id,
        severity: 'medium',
        category: 'onboarding-intent',
        message: msg,
        detail: `No intent matched: "${msg}". Add keywords to INTENT_PATTERNS.`,
      });
    } else if (intent.confidence < 70) {
      gaps.push({
        userId: user.id,
        severity: 'low',
        category: 'onboarding-confidence',
        message: msg,
        detail: `Low confidence (${intent.confidence}%) for intent "${intent.intent}": "${msg}".`,
      });
    }
    // Check if required entities are extracted
    if (intent.intent === 'waiver' && !intent.entities.name) {
      gaps.push({
        userId: user.id,
        severity: 'high',
        category: 'entity-extraction',
        message: msg,
        detail: `Waiver intent but no name entity extracted from "${msg}".`,
      });
    }
  }

  return gaps;
}

// ─── Conversation Check ──────────────────────────────────────────────────────

function runConversation(user: Persona): Gap[] {
  const gaps: Gap[] = [];

  for (const msg of user.conversationMessages) {
    const intent = classifyIntent(msg);
    const knowledge = retrieveKnowledgeSync(msg);

    // Gap: cannot classify intent at all
    if (intent.confidence === 0) {
      gaps.push({
        userId: user.id,
        severity: 'critical',
        category: 'unknown-intent',
        message: msg,
        detail: `No intent matched for "${msg}". Needs new intent or keyword expansion.`,
      });
      continue;
    }

    // Gap: low confidence
    if (intent.confidence < 50) {
      gaps.push({
        userId: user.id,
        severity: 'high',
        category: 'low-confidence',
        message: msg,
        detail: `Only ${intent.confidence}% confidence for "${intent.intent}": "${msg}".`,
      });
    } else if (intent.confidence < 70) {
      gaps.push({
        userId: user.id,
        severity: 'medium',
        category: 'moderate-confidence',
        message: msg,
        detail: `${intent.confidence}% confidence for "${intent.intent}": "${msg}".`,
      });
    }

    // Gap: no relevant knowledge found
    if (knowledge.length === 0) {
      gaps.push({
        userId: user.id,
        severity: 'high',
        category: 'missing-knowledge',
        message: msg,
        detail: `No knowledge chunks matched: "${msg}". Add relevant entries to defaultKnowledge.`,
      });
    }

    // Gap: intent routed to wrong tool
    if (['booking', 'waiver', 'directory'].includes(intent.intent)) {
      if (intent.intent === 'waiver' && !intent.entities.name) {
        gaps.push({
          userId: user.id,
          severity: 'high',
          category: 'tool-routing',
          message: msg,
          detail: `Waiver intent requires name entity but none found for "${msg}".`,
        });
      }
      if (intent.intent === 'booking' && !intent.entities.date && !intent.entities.time) {
        gaps.push({
          userId: user.id,
          severity: 'medium',
          category: 'tool-routing',
          message: msg,
          detail: `Booking intent but no date/time extracted: "${msg}".`,
        });
      }
    }

    // Gap: general_question with no routing
    if (intent.intent === 'general_question' && intent.confidence === 0) {
      gaps.push({
        userId: user.id,
        severity: 'medium',
        category: 'unrouted-question',
        message: msg,
        detail: `Unclassified question: "${msg}". May need a new intent or broader keywords.`,
      });
    }
  }

  return gaps;
}

// ─── Sync knowledge retrieval (no DB needed for test) ────────────────────────

function retrieveKnowledgeSync(query: string): string[] {
  const lower = query.toLowerCase();
  const fallback = defaultKnowledge.filter((chunk) => {
    const content = chunk.content.toLowerCase();
    return lower.split(/\s+/).some((word) => word.length > 2 && content.includes(word));
  });
  return (fallback.length > 0 ? fallback : defaultKnowledge)
    .map((chunk) => chunk.content)
    .slice(0, 4);
}

// ─── Template response check (no API needed) ─────────────────────────────────

function checkTemplateResponse(msg: string): boolean {
  const lower = msg.toLowerCase();
  const triggers = ['book', 'court', 'reserve', 'price', 'cost', 'membership',
    'rate', 'lesson', 'coach', 'clinic', 'waiver', 'sign', 'hour', 'open',
    'event', 'tournament', 'social'];
  return triggers.some(t => lower.includes(t));
}

// ─── Main stress test runner ─────────────────────────────────────────────────

interface StressResult {
  totalConversations: number;
  totalMessages: number;
  intents: Record<string, number>;
  confidence: { avg: number; min: number; max: number; };
  gaps: Gap[];
  modelResults: Record<ModelId, { handled: number; missed: number }>;
  usersOnboarded: number;
  knowledgeCoverage: number;
}

function runStressTest(): StressResult {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Pickle-Klaw Stress Test — 25 Synthetic Users  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const allGaps: Gap[] = [];
  const allIntents: Record<string, number> = {};
  const allConfidences: number[] = [];
  let totalMessages = 0;

  // ── Phase 1: Onboard all 25 users ──
  console.log('── Phase 1: Onboarding ──\n');
  let onboarded = 0;
  for (const user of users) {
    const gaps = onboardUser(user);
    allGaps.push(...gaps);
    if (!gaps.some(g => g.severity === 'critical')) onboarded++;
  }
  console.log(`  Onboarded: ${onboarded}/${users.length}`);
  console.log(`  Onboarding gaps: ${allGaps.filter(g => g.category.startsWith('onboarding')).length}\n`);

  // ── Phase 2: Run conversations ──
  console.log('── Phase 2: Conversations ──\n');
  for (const user of users) {
    const gaps = runConversation(user);
    allGaps.push(...gaps);

    // Track intents
    for (const msg of user.conversationMessages) {
      const intent = classifyIntent(msg);
      allIntents[intent.intent] = (allIntents[intent.intent] || 0) + 1;
      if (intent.confidence > 0) allConfidences.push(intent.confidence);
      totalMessages++;
    }
  }

  console.log(`  Messages processed: ${totalMessages}`);
  console.log(`  Unique intents used: ${Object.keys(allIntents).length}`);
  console.log(`  Gaps found: ${allGaps.length}\n`);

  // ── Phase 3: Model comparison ──
  console.log('── Phase 3: Model Coverage ──\n');
  const modelResults: StressResult['modelResults'] = {} as any;

  for (const model of models) {
    let handled = 0, missed = 0;
    for (const user of users) {
      for (const msg of user.conversationMessages) {
        const hasTemplate = checkTemplateResponse(msg);
        if (hasTemplate || model.provider !== 'template') {
          handled++;
        } else {
          missed++;
        }
      }
    }
    modelResults[model.id] = { handled, missed };
    const pct = ((handled / (handled + missed)) * 100).toFixed(0);
    console.log(`  ${model.label.padEnd(26)} ${pct}% covered`);
  }

  // ── Phase 4: Knowledge coverage ──
  const allQueries = users.flatMap(u => u.conversationMessages);
  const queriesWithKnowledge = allQueries.filter(q => retrieveKnowledgeSync(q).length > 0);
  const knowledgeCoverage = (queriesWithKnowledge.length / allQueries.length) * 100;

  console.log(`\n  Knowledge coverage: ${knowledgeCoverage.toFixed(0)}%`);
  console.log(`  ${defaultKnowledge.length} knowledge chunks across ${new Set(defaultKnowledge.map(k => k.category)).size} categories`);

  const avg = allConfidences.length > 0
    ? Math.round(allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length)
    : 0;

  return {
    totalConversations: users.length,
    totalMessages,
    intents: allIntents,
    confidence: {
      avg,
      min: allConfidences.length > 0 ? Math.min(...allConfidences) : 0,
      max: allConfidences.length > 0 ? Math.max(...allConfidences) : 0,
    },
    gaps: allGaps,
    modelResults,
    usersOnboarded: onboarded,
    knowledgeCoverage,
  };
}

// ─── Gap Report Generator ────────────────────────────────────────────────────

function printGapReport(result: StressResult) {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║              G A P   R E P O R T               ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Summary stats
  console.log('── Summary ──');
  console.log(`  Users tested:         ${result.totalConversations}`);
  console.log(`  Users onboarded:      ${result.usersOnboarded}`);
  console.log(`  Total messages:       ${result.totalMessages}`);
  console.log(`  Avg confidence:       ${result.confidence.avg}%`);
  console.log(`  Min confidence:       ${result.confidence.min}%`);
  console.log(`  Max confidence:       ${result.confidence.max}%`);
  console.log(`  Knowledge coverage:   ${result.knowledgeCoverage.toFixed(0)}%`);
  console.log(`  Total gaps found:     ${result.gaps.length}`);

  // Gaps by severity
  const bySeverity: Record<string, number> = {};
  for (const g of result.gaps) {
    bySeverity[g.severity] = (bySeverity[g.severity] || 0) + 1;
  }
  console.log('\n  Gaps by severity:');
  for (const [sev, count] of Object.entries(bySeverity)) {
    const icon = sev === 'critical' ? '🔴' : sev === 'high' ? '🟠' : sev === 'medium' ? '🟡' : '🟢';
    console.log(`    ${icon} ${sev}: ${count}`);
  }

  // Gaps by category
  const byCategory: Record<string, Gap[]> = {};
  for (const g of result.gaps) {
    if (!byCategory[g.category]) byCategory[g.category] = [];
    byCategory[g.category].push(g);
  }

  console.log('\n── Gaps by Category ──');
  for (const [cat, gaps] of Object.entries(byCategory)) {
    const sev = gaps.some(g => g.severity === 'critical') ? '🔴' :
                gaps.some(g => g.severity === 'high') ? '🟠' : '🟡';
    console.log(`  ${sev} ${cat}: ${gaps.length} issues`);
    for (const g of gaps.slice(0, 3)) {
      console.log(`      [${g.userId}] ${g.message.slice(0, 50)}`);
      if (gaps.length > 3) {
        console.log(`      ... and ${gaps.length - 3} more`);
        break;
      }
    }
  }

  // Intent distribution
  console.log('\n── Intent Distribution ──');
  for (const [intent, count] of Object.entries(result.intents).sort((a, b) => b[1] - a[1])) {
    const bar = '█'.repeat(Math.min(count, 30));
    console.log(`  ${intent.padEnd(18)} ${count.toString().padStart(3)} ${bar}`);
  }

  // Recommendations
  console.log('\n── Recommendations ──');
  const criticalGaps = result.gaps.filter(g => g.severity === 'critical');
  const highGaps = result.gaps.filter(g => g.severity === 'high');

  if (criticalGaps.length > 0) {
    console.log('  CRITICAL (fix before launch):');
    for (const g of criticalGaps.slice(0, 5)) {
      console.log(`    - [${g.userId}] ${g.detail}`);
    }
  }

  if (highGaps.length > 0) {
    console.log('\n  HIGH PRIORITY:');
    for (const g of highGaps.slice(0, 5)) {
      console.log(`    - [${g.userId}] ${g.detail}`);
    }
  }

  if (result.knowledgeCoverage < 80) {
    console.log('\n  Missing knowledge chunks for common queries.');
    console.log(`  Current: ${defaultKnowledge.length} chunks. Consider adding more.`);
  }

  if (result.confidence.avg < 70) {
    console.log(`\n  Average confidence (${result.confidence.avg}%) is below target (90%).`);
    console.log('  Review low-confidence intents and expand keyword lists.');
  }

  // Model recommendations
  console.log('\n── Model Recommendations ──');
  for (const [id, res] of Object.entries(result.modelResults)) {
    const pct = ((res.handled / (res.handled + res.missed)) * 100).toFixed(0);
    const status = Number(pct) >= 90 ? '✅' : Number(pct) >= 70 ? '⚠️' : '❌';
    console.log(`  ${status} ${id.padEnd(24)} ${pct}% (${res.handled}/${res.handled + res.missed})`);
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const result = runStressTest();
printGapReport(result);
