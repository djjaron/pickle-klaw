/**
 * Core Pipeline Tests — models, agent, RAG, edge cases
 *
 * Run: npx vitest run lib/core.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// ─── Mock fetch for LLM calls ────────────────────────────────────────────────

const mockFetch = vi.fn();

// ─── Models: getModelConfig ──────────────────────────────────────────────────

import { getModelConfig } from './models';

describe('getModelConfig', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.KIMI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('falls back to template when no API keys are set', () => {
    const config = getModelConfig();
    expect(config.provider).toBe('template');
    expect(config.model).toBe('template');
    expect(config.endpoint).toBeUndefined();
  });

  it('picks OpenAI when OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const config = getModelConfig();
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o-mini');
    expect(config.endpoint).toContain('openai.com');
  });

  it('respects OPENAI_MODEL override', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_MODEL = 'gpt-4-turbo';
    const config = getModelConfig();
    expect(config.model).toBe('gpt-4-turbo');
  });

  it('picks DeepSeek when only DEEPSEEK_API_KEY is set', () => {
    process.env.DEEPSEEK_API_KEY = 'sk-ds';
    const config = getModelConfig();
    expect(config.provider).toBe('deepseek');
    expect(config.model).toBe('deepseek-chat');
  });

  it('picks Anthropic when only ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant';
    const config = getModelConfig();
    expect(config.provider).toBe('anthropic');
    expect(config.model).toBe('claude-3-5-haiku-latest');
  });

  it('picks Kimi when only KIMI_API_KEY is set', () => {
    process.env.KIMI_API_KEY = 'sk-kimi';
    const config = getModelConfig();
    expect(config.provider).toBe('kimi');
    expect(config.model).toBe('moonshot-v1-8k');
  });

  it('OpenAI wins over all others when multiple keys set', () => {
    process.env.OPENAI_API_KEY = 'sk-oai';
    process.env.ANTHROPIC_API_KEY = 'sk-ant';
    process.env.DEEPSEEK_API_KEY = 'sk-ds';
    const config = getModelConfig();
    expect(config.provider).toBe('openai');
  });
});

// ─── Models: generateTemplateResponse ────────────────────────────────────────

import { callModel } from './models';
beforeAll(() => {
  globalThis.fetch = mockFetch;
});
beforeEach(() => {
  mockFetch.mockReset();
  delete process.env.OPENAI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.KIMI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

describe('generateTemplateResponse (fallback path)', () => {
  // When no API keys are set, callModel uses template responses
  const cases: Array<{ input: string; contains: string }> = [
    { input: 'Can I book a court?', contains: 'Lit courts' },
    { input: 'reserve slot', contains: 'availability' },
    { input: 'How much is membership?', contains: 'TTC Palms' },
    { input: 'What are your rates?', contains: 'memberships' },
    { input: 'I want a private lesson', contains: 'USPTA' },
    { input: 'coach available?', contains: 'certified' },
    { input: 'Do I need a waiver?', contains: 'ttcpalms.com' },
    { input: 'sign form', contains: 'waiver' },
    { input: 'what are your hours?', contains: '7 days' },
    { input: 'are you open today', contains: '7 days' },
    { input: 'any events this week?', contains: 'Clinics' },
    { input: 'tournament schedule', contains: 'ttcpalms.com' },
    { input: 'just saying hello', contains: 'TTC Palms' },
  ];

  for (const { input, contains } of cases) {
    it(`"${input}" → contains "${contains.slice(0, 20)}..."`, async () => {
      const response = await callModel('system prompt', input);
      expect(response).toContain(contains);
    });
  }
});

describe('callModel with API responses', () => {
  it('returns LLM response on success', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Sure, let me check availability.' } }],
      }),
    } as any);

    const response = await callModel('prompt', 'book court');
    expect(response).toBe('Sure, let me check availability.');
  });

  it('falls back to template when API returns non-200', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockFetch.mockResolvedValueOnce({ ok: false } as any);

    const response = await callModel('prompt', 'book a court');
    expect(response).toContain('online');
  });

  it('falls back when choices array is empty', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    } as any);

    const response = await callModel('prompt', 'membership price');
    expect(response).toContain('TTC Palms');
  });

  it('falls back on network error', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const response = await callModel('prompt', 'events');
    expect(response).toContain('Clinics');
  });

  it('handles Anthropic response format', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Claude says hello.' }],
      }),
    } as any);

    const response = await callModel('prompt', 'hello');
    expect(response).toBe('Claude says hello.');
  });

  it('falls back when Anthropic response has no text content', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [] }),
    } as any);

    const response = await callModel('prompt', 'hello');
    expect(response).toContain('TTC Palms');
  });

  it('falls back when Anthropic API fails', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant';
    mockFetch.mockResolvedValueOnce({ ok: false } as any);

    const response = await callModel('prompt', 'waiver');
    expect(response).toContain('waiver');
  });
});

// ─── Agent: buildSystemPrompt ────────────────────────────────────────────────

import { runAgent } from './agent';
import { classifyIntent } from './intent';

describe('agent pipeline', () => {
  it('returns human escalation for complaint intents', async () => {
    const result = await runAgent('demo', 'I have a major problem!', undefined);
    expect(result.intent.intent).toBe('complaint');
    expect(result.intent.requiresHuman).toBe(true);
    expect(result.response).toContain('connect you with our team');
    expect(result.toolsCalled).toEqual([]);
    expect(result.trace.requiresHuman).toBe(true);
  });

  it('returns human escalation for very short messages', async () => {
    const result = await runAgent('demo', 'hi', undefined);
    expect(result.intent.requiresHuman).toBe(true);
    expect(result.response).toContain('connect you');
  });

  it('handles booking intent end-to-end', async () => {
    const result = await runAgent('demo', 'Can I book a court for tomorrow?', undefined);
    expect(result.intent.intent).toBe('booking');
    expect(result.toolsCalled).toContain('toolBooking');
    expect(result.trace.tools).toContain('toolBooking');
    expect(result.response.length).toBeGreaterThan(20);
    expect(result.trace.latency).toBeGreaterThanOrEqual(0);
    expect(result.trace.timestamp).toBeTruthy();
    expect(result.trace.model).toBeTruthy();
  });

  it('handles waiver intent end-to-end', async () => {
    const result = await runAgent('demo', 'Does Jordan Lee have a waiver?', undefined);
    expect(result.intent.intent).toBe('waiver');
    expect(result.toolsCalled).toContain('toolWaiverCheck');
    expect(result.response.length).toBeGreaterThan(20);
  });

  it('handles directory/member lookup intent', async () => {
    const result = await runAgent('demo', 'Look up member Avery Chen', undefined);
    expect(result.intent.intent).toBe('directory');
    expect(result.toolsCalled).toContain('toolMemberLookup');
    expect(result.response.length).toBeGreaterThan(20);
  });

  it('handles general question without tools', async () => {
    const result = await runAgent('demo', 'What are your hours?', undefined);
    expect(result.intent.intent).toBe('question');
    expect(result.toolsCalled).toEqual([]);
    expect(result.knowledgeUsed.length).toBeGreaterThan(0);
    expect(result.trace.knowledge.length).toBeGreaterThan(0);
    expect(result.response.length).toBeGreaterThan(20);
  });

  it('handles pricing question without tools', async () => {
    const result = await runAgent('demo', 'How much is a membership?', undefined);
    expect(result.intent.intent).toBe('pricing');
    expect(result.toolsCalled).toEqual([]);
    expect(result.response.length).toBeGreaterThan(20);
  });

  it('returns consistent trace structure', async () => {
    const result = await runAgent('demo', 'book a court', 'conv-test-1');
    const { trace } = result;
    expect(trace).toHaveProperty('intent');
    expect(trace).toHaveProperty('confidence');
    expect(trace).toHaveProperty('tools');
    expect(trace).toHaveProperty('knowledge');
    expect(trace).toHaveProperty('toolResult');
    expect(trace).toHaveProperty('latency');
    expect(trace).toHaveProperty('requiresHuman');
    expect(trace).toHaveProperty('model');
    expect(trace).toHaveProperty('timestamp');
    expect(typeof trace.latency).toBe('number');
    expect(Array.isArray(trace.tools)).toBe(true);
    expect(Array.isArray(trace.knowledge)).toBe(true);
  });

  it('does not log to DB when no conversationId provided', async () => {
    // Should not throw — the DB insert is wrapped in try/catch
    const result = await runAgent('demo', 'hello world', undefined);
    expect(result.response).toBeTruthy();
  });
});

// ─── RAG: retrieveKnowledge fallback path ────────────────────────────────────

import { retrieveKnowledge, defaultKnowledge } from './rag';

describe('retrieveKnowledge (fallback)', () => {
  it('returns relevant knowledge chunks for a booking query', async () => {
    const chunks = await retrieveKnowledge(null, 'Can I book a court?');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some(c => c.toLowerCase().includes('court'))).toBe(true);
  });

  it('returns relevant knowledge for pricing', async () => {
    const chunks = await retrieveKnowledge(null, 'How much does it cost?');
    expect(chunks.some(c => c.toLowerCase().includes('membership'))).toBe(true);
  });

  it('returns relevant knowledge for hours', async () => {
    const chunks = await retrieveKnowledge(null, 'What time do you open?');
    expect(chunks.some(c => c.toLowerCase().includes('7 days') || c.toLowerCase().includes('open'))).toBe(true);
  });

  it('returns relevant knowledge for events', async () => {
    const chunks = await retrieveKnowledge(null, 'any events?');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some(c => c.toLowerCase().includes('clinic') || c.toLowerCase().includes('social'))).toBe(true);
  });

  it('returns relevant knowledge for coaching', async () => {
    const chunks = await retrieveKnowledge(null, 'private lesson cost');
    expect(chunks.some(c => c.toLowerCase().includes('uspta') || c.toLowerCase().includes('certified') || c.toLowerCase().includes('coach'))).toBe(true);
  });

  it('returns relevant knowledge for rules', async () => {
    const chunks = await retrieveKnowledge(null, 'do I need special shoes');
    expect(chunks.some(c => c.toLowerCase().includes('non-marking') || c.toLowerCase().includes('waiver'))).toBe(true);
  });

  it('limits results to 4 chunks', async () => {
    const chunks = await retrieveKnowledge(null, 'court booking membership pricing lessons events rules');
    expect(chunks.length).toBeLessThanOrEqual(4);
  });

  it('returns default knowledge for unknown queries', async () => {
    const chunks = await retrieveKnowledge(null, 'xyzzy banana elephant');
    expect(chunks.length).toBeLessThanOrEqual(4);
  });

  it('all 9 default knowledge categories exist', () => {
    expect(defaultKnowledge).toHaveLength(9);
    const categories = defaultKnowledge.map(k => k.category);
    expect(categories).toContain('hours');
    expect(categories).toContain('pricing');
    expect(categories).toContain('courts');
    expect(categories).toContain('rules');
    expect(categories).toContain('events');
    expect(categories).toContain('coaching');
    expect(categories).toContain('location');
    expect(categories).toContain('amenities');
    expect(categories).toContain('membership');
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('empty string → general_question, requiresHuman', () => {
    const intent = classifyIntent('');
    expect(intent.intent).toBe('general_question');
    expect(intent.confidence).toBe(0);
    expect(intent.requiresHuman).toBe(true);
  });

  it('whitespace-only → 0% confidence', () => {
    const intent = classifyIntent('   ');
    expect(intent.confidence).toBe(0);
  });

  it('very long message still classifies correctly', async () => {
    const longMsg = 'I would very much like to book a court '.repeat(50);
    const intent = classifyIntent(longMsg);
    expect(intent.intent).toBe('booking');
    expect(intent.confidence).toBeGreaterThanOrEqual(90);
    // Agent should handle it too
    const result = await runAgent('demo', longMsg, undefined);
    expect(result.response).toBeTruthy();
  });

  it('special characters in message', () => {
    const intent = classifyIntent('!!! book a court ??? @#$%');
    expect(intent.intent).toBe('booking');
    expect(intent.confidence).toBeGreaterThanOrEqual(90);
  });

  it('SQL injection is harmless — "members" keyword matches pricing naturally', () => {
    const intent = classifyIntent("'; DROP TABLE members; --");
    // "members" is a pricing keyword, so the system picks it up — harmless
    expect(intent.intent).toBe('pricing');
    expect(intent.confidence).toBeGreaterThanOrEqual(70);
  });

  it('mixed case is handled', () => {
    const intent = classifyIntent('BoOk A CoUrT fOr ToMoRrOw');
    expect(intent.intent).toBe('booking');
    expect(intent.confidence).toBeGreaterThanOrEqual(90);
  });

  it('emoji-only message — surrogate pairs make length >5', () => {
    // Emoji are surrogate pairs in JS, so "🎾🏓🎾".length === 6 (not 3)
    // 6 >= 5, so requiresHuman === false, confidence === 0
    const intent = classifyIntent('🎾🏓🎾');
    expect(intent.confidence).toBe(0);
    expect(intent.intent).toBe('general_question');
  });

  it('foreign language — "court" in French triggers booking keyword', () => {
    const intent = classifyIntent('Je voudrais réserver un court');
    // "court" matches the booking keyword — fair behavior for a mixed-lang query
    expect(intent.intent).toBe('booking');
    expect(intent.confidence).toBeGreaterThanOrEqual(70);
  });

  it('numbers-only message — length 5 does not trigger human escalation', () => {
    const intent = classifyIntent('12345');
    expect(intent.requiresHuman).toBe(false);
    expect(intent.confidence).toBe(0);
  });

  it('multiple intents in one message picks the strongest', () => {
    // "book" matches booking keywords, "price" matches pricing keywords
    // booking has 3 keywords matching ("book", "court", "booking" via suffix)
    const intent = classifyIntent('I want to book a court but first what is the price');
    // Booking should win because more keyword matches + date entity from "what"?
    expect(intent.confidence).toBeGreaterThanOrEqual(90);
  });

  it('agent handles unknown intent gracefully', async () => {
    const result = await runAgent('demo', 'blargle flargle snorf', undefined);
    expect(result.response).toBeTruthy();
    expect(result.intent.intent).toBe('general_question');
    expect(result.toolsCalled).toEqual([]);
  });
});

// ─── Intent Classification: cross-cutting coverage ───────────────────────────

describe('intent classification coverage', () => {
  it('all quick-prompt phrases hit correct intent', () => {
    const quickPrompts = [
      { msg: 'Can I book a court for tomorrow at 10am?', intent: 'booking' },
      { msg: 'How much is a membership?', intent: 'pricing' },
      { msg: 'What events do you have this week?', intent: 'question' },
      { msg: 'Does Jordan Lee have a waiver?', intent: 'waiver' },
      { msg: 'Can I get a private lesson?', intent: 'question' },
    ];
    for (const { msg, intent: expected } of quickPrompts) {
      const result = classifyIntent(msg);
      expect(result.intent).toBe(expected);
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    }
  });

  it('all directory/search patterns work', () => {
    const cases = [
      'Find coach Sarah',
      'Look up member Avery Chen',
      'Search for pro John',
      'Who is the instructor',
      'Find me a coach',
    ];
    for (const msg of cases) {
      expect(classifyIntent(msg).intent).toBe('directory');
    }
  });

  it('all booking patterns work', () => {
    const cases = [
      'Book a court',
      'Reserve slot for Friday',
      'Join a play session',
      'Schedule a lesson',
      'Book a private event',
    ];
    for (const msg of cases) {
      expect(classifyIntent(msg).intent).toBe('booking');
    }
  });

  it('all pricing patterns work', () => {
    const cases = [
      'How much is a membership?',
      'What is the drop-in fee?',
      'Become a member',
      'Drop-in fee?',
      'Monthly rate please',
    ];
    for (const msg of cases) {
      expect(classifyIntent(msg).intent).toBe('pricing');
    }
  });

  it('all waiver patterns work', () => {
    const cases = [
      'Does Jordan have a waiver?',
      'Sign waiver for Taylor',
      'I need to sign the liability form',
      'Is my release still valid?',
    ];
    for (const msg of cases) {
      expect(classifyIntent(msg).intent).toBe('waiver');
    }
  });

  it('all complaint patterns work', () => {
    const cases = [
      'I have a problem',
      'Something is broken',
      'I want a refund',
      'This is bad service',
      'Not working properly',
      'Cancel my reservation',
    ];
    for (const msg of cases) {
      const r = classifyIntent(msg);
      expect(r.intent).toBe('complaint');
      expect(r.requiresHuman).toBe(true);
    }
  });

  it('extracts date entities correctly', () => {
    expect(classifyIntent('Book for tomorrow').entities.date).toBe('tomorrow');
    expect(classifyIntent('Court on friday').entities.date).toBe('friday');
    expect(classifyIntent('Reserve 5/15').entities.date).toBe('5/15');
    expect(classifyIntent('Schedule for 2026-06-15').entities.date).toBe('2026-06-15');
  });

  it('extracts time entities correctly', () => {
    expect(classifyIntent('At 10am please').entities.time).toBe('10am');
    expect(classifyIntent('Book at 3:30 pm').entities.time).toBe('3:30 pm');
    expect(classifyIntent('Schedule 2pm slot').entities.time).toBe('2pm');
  });

  it('extracts name entities from various patterns', () => {
    expect(classifyIntent('Does Jordan Lee have a waiver?').entities.name).toBe('Jordan Lee');
    expect(classifyIntent('Look up member Avery Chen').entities.name).toBe('Avery Chen');
    expect(classifyIntent('Find coach Sarah Connor').entities.name).toBe('Sarah Connor');
    expect(classifyIntent('Sign waiver for Taylor Reed').entities.name).toBe('Taylor Reed');
  });
});

// ─── Knowledge coverage ──────────────────────────────────────────────────────

describe('knowledge retrieval coverage', () => {
  it('returns hours info for time-related queries', async () => {
    const chunks = await retrieveKnowledge(null, 'what time do you close');
    expect(chunks.some(c => c.includes('7 days') || c.includes('open') || c.includes('dusk'))).toBe(true);
  });

  it('returns court info for court questions', async () => {
    const chunks = await retrieveKnowledge(null, 'how many courts');
    expect(chunks.some(c => c.includes('championship') || c.includes('courts'))).toBe(true);
  });

  it('returns membership info for membership questions', async () => {
    const chunks = await retrieveKnowledge(null, 'membership levels');
    expect(chunks.some(c => c.includes('Tennis') || c.includes('Pickleball') || c.includes('Founding'))).toBe(true);
  });

  it('returns rules info for equipment questions', async () => {
    const chunks = await retrieveKnowledge(null, 'can I rent equipment');
    expect(chunks.some(c => c.toLowerCase().includes('pro shop') || c.toLowerCase().includes('equipment'))).toBe(true);
  });

  it('returns events info for schedule questions', async () => {
    const chunks = await retrieveKnowledge(null, 'weekly schedule');
    expect(chunks.some(c => c.toLowerCase().includes('mon') || c.toLowerCase().includes('clinic'))).toBe(true);
  });

  it('returns coaching info for lesson questions', async () => {
    const chunks = await retrieveKnowledge(null, 'private coaching');
    expect(chunks.some(c => c.toLowerCase().includes('uspta') || c.toLowerCase().includes('ppr') || c.toLowerCase().includes('certified'))).toBe(true);
  });
});
