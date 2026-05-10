/**
 * Intent Classification — pure function, no server dependencies.
 * Safe to import in client components.
 */

export const INTENT_PATTERNS: Record<string, { keywords: string[]; requires: string[] }> = {
  booking: {
    keywords: ['book', 'book a', 'booking', 'reserve', 'reservation', 'court', 'courts', 'schedule', 'slot', 'available', 'hold', 'grab', 'join', 'session', 'play', 'event', 'lesson', 'clinic'],
    requires: ['date'],
  },
  question: {
    keywords: ['what', 'how', 'when', 'who', 'where', 'hours', 'open', 'lesson', 'lessons', 'event', 'events', 'can you', 'can i', 'tell me', 'do you', 'week', 'today', 'private', 'visit', 'shop', 'pro shop'],
    requires: [],
  },
  waiver: {
    keywords: ['waiver', 'waivers', 'sign', 'signed', 'signing', 'release', 'liability', 'form', 'forms'],
    requires: ['name'],
  },
  directory: {
    keywords: ['find', 'lookup', 'look up', 'search', 'coach', 'coaches', 'instructor', 'find me', 'who is', 'pro'],
    requires: ['name'],
  },
  pricing: {
    keywords: ['price', 'pricing', 'cost', 'costs', 'fee', 'fees', 'membership', 'rate', 'rates', 'package', 'how much', 'drop-in', 'drop in', 'drop', 'become', 'member', 'sign up'],
    requires: [],
  },
  complaint: {
    keywords: ['problem', 'problem with', 'issue', 'broken', 'refund', 'cancel', 'unhappy', 'bad', 'wrong', 'not working', 'doesn\'t work', 'complaint', 'help'],
    requires: [],
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

  // Extract name entities from the ORIGINAL message to preserve case.
  const namePatterns = [
    /(?:does|find|look\s*up|lookup|search|for)\s+(?:member\s+|coach\s+|pro\s+|instructor\s+)?([a-z]+(?:\s+[a-z]+))\b/i,
    /(?:name is|i'm|i am|called)\s+([a-z]+(?:\s+[a-z]+)?)\b/i,
    /([a-z]+\s+[a-z]+)\s*(?:have|has|need|get|sign|check)/i,
  ];
  for (const pattern of namePatterns) {
    const nameMatch = message.match(pattern);
    if (nameMatch) {
      entities.name = nameMatch[1].trim();
      break;
    }
  }

  // Score each intent using point-based system
  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    const matches = config.keywords.filter(k => {
      const suffix = k.includes(' ') ? '' : '(s|es|ing|ed)?';
      const pattern = new RegExp(`\\b${k.replace(/\s+/g, '\\s+')}${suffix}\\b`, 'i');
      return pattern.test(lower);
    });
    if (matches.length === 0) continue;

    const keywordPoints = Math.min(matches.length, 3) * 10;
    const entityPoints = config.requires.filter(r => entities[r]).length * 10;
    const priorityBonus = intent === 'complaint' ? 3 : 0;

    const score = (70 + keywordPoints + entityPoints + priorityBonus) / 100;
    if (score > bestScore) {
      bestScore = Math.min(score, 0.99);
      bestIntent = intent;
    }
  }

  const requiresHuman = bestIntent === 'complaint' || message.length < 5;

  return {
    intent: bestIntent,
    confidence: Math.round(bestScore * 100),
    entities,
    requiresHuman,
  };
}
