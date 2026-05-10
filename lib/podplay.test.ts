/**
 * PodPlay Chatbot Integration Tests
 *
 * Tests the full chatbot pipeline — intent classification → PodPlay tools → agent response.
 * Uses mocked API responses since PodPlay access isn't available yet.
 *
 * Run: npx vitest run lib/podplay.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// ─── Mock PodPlay HTTP layer ─────────────────────────────────────────────────

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

function mockApiResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  };
}

// Seed config so tools don't throw "not configured"
beforeAll(() => {
  process.env.PODPLAY_BASE_URL = 'https://demo-club.podplay.app';
  process.env.PODPLAY_BEARER_TOKEN = 'test-token-abc123';
});

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── Imports ─────────────────────────────────────────────────────────────────

import { classifyIntent } from './intent';
import {
  toolBookingPodPlay,
  toolMemberLookupPodPlay,
  toolWaiverCheckPodPlay,
  toolEventLookupPodPlay,
  toolCreateReservationPodPlay,
  toolSignUpForEventPodPlay,
  toolCreateCustomerPodPlay,
} from './tools-podplay';
import { resetPodPlay } from './podplay';

// ─── 1. Intent Classification (pure logic, no API needed) ────────────────────

describe('Intent Classification', () => {
  const cases: Array<{ input: string; expectedIntent: string; minConfidence: number }> = [
    { input: 'Can I book a court for tomorrow at 10am?', expectedIntent: 'booking', minConfidence: 90 },
    { input: 'I want to reserve a slot on Tuesday at 3pm', expectedIntent: 'booking', minConfidence: 90 },
    { input: 'Book a private event', expectedIntent: 'booking', minConfidence: 90 },
    { input: 'Schedule a lesson or clinic', expectedIntent: 'booking', minConfidence: 90 },
    { input: 'Join a play session', expectedIntent: 'booking', minConfidence: 90 },
    { input: 'How much is a membership?', expectedIntent: 'pricing', minConfidence: 90 },
    { input: 'Become a member', expectedIntent: 'pricing', minConfidence: 90 },
    { input: 'What events do you have this week?', expectedIntent: 'question', minConfidence: 90 },
    { input: 'Does Jordan Lee have a waiver?', expectedIntent: 'waiver', minConfidence: 90 },
    { input: 'sign waiver for Jordan', expectedIntent: 'waiver', minConfidence: 90 },
    { input: 'Find me coach Sarah', expectedIntent: 'directory', minConfidence: 90 },
    { input: 'I have a problem with my booking', expectedIntent: 'complaint', minConfidence: 70 },
    { input: 'Visit the Pro Shop', expectedIntent: 'question', minConfidence: 90 },
    { input: 'hello', expectedIntent: 'general_question', minConfidence: 0 },
  ];

  for (const { input, expectedIntent, minConfidence } of cases) {
    it(`classifies "${input}" as ${expectedIntent} (≥${minConfidence}%)`, () => {
      const result = classifyIntent(input);
      expect(result.intent).toBe(expectedIntent);
      expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
    });
  }
});

// ─── 2. Booking Tool (mocked PodPlay) ────────────────────────────────────────

describe('toolBookingPodPlay', () => {
  it('returns available courts when PodPlay has openings', async () => {
    mockFetch
      // getAreas
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'area-1', name: 'Main Facility', address: '123 Pickle St' },
      ]))
      // getAvailableTables for area-1
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'table-8am', name: 'Court 1', label: '8:00 AM', podId: 'pod-1' },
        { id: 'table-9am', name: 'Court 1', label: '9:00 AM', podId: 'pod-1' },
        { id: 'table-10am', name: 'Court 2', label: '10:00 AM', podId: 'pod-1' },
      ]));

    const result = await toolBookingPodPlay('demo', { date: '2026-06-15' });

    expect(result.success).toBe(true);
    expect(result.courtsAvailable).toBe(3);
    expect(result.availableSlots).toContain('8:00 AM');
    expect(result.availableSlots).toContain('9:00 AM');
    expect(result.availableSlots).toContain('10:00 AM');
    expect(result.message).toContain('3 courts');
  });

  it('returns empty when all courts are booked', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'area-1', name: 'Main Facility' },
      ]))
      .mockResolvedValueOnce(mockApiResponse([]));

    const result = await toolBookingPodPlay('demo', { date: '2026-06-15' });

    expect(result.success).toBe(true);
    expect(result.availableSlots).toEqual([]);
    expect(result.courtsAvailable).toBe(0);
    expect(result.message).toContain('No courts available');
  });

  it('handles PodPlay API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // getAreas will throw, caught internally
    const result = await toolBookingPodPlay('demo', {});

    expect(result.success).toBe(false);
    expect(result.message).toContain('Unable to check');
  });
});

// ─── 3. Member Lookup Tool ───────────────────────────────────────────────────

describe('toolMemberLookupPodPlay', () => {
  it('finds a member by name', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse([
      {
        id: 'cust-1',
        firstName: 'Jordan',
        lastName: 'Lee',
        email: 'jordan@example.com',
        phone: '(555) 014-0140',
        membershipType: 'premium',
      },
    ]));

    const result = await toolMemberLookupPodPlay('demo', { name: 'Jordan Lee' });

    expect(result.success).toBe(true);
    expect(result.member!.name).toBe('Jordan Lee');
    expect(result.member!.membership).toBe('premium');
    expect(result.message).toContain('premium membership');
  });

  it('finds a member by email', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse([
      {
        id: 'cust-2',
        firstName: 'Avery',
        lastName: 'Chen',
        email: 'avery@example.com',
        membershipType: null,
      },
    ]));

    const result = await toolMemberLookupPodPlay('demo', { email: 'avery@example.com' });

    expect(result.success).toBe(true);
    expect(result.member!.name).toBe('Avery Chen');
    expect(result.member!.membership).toBe('none');
  });

  it('returns not found for unknown members', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse([]));

    const result = await toolMemberLookupPodPlay('demo', { name: 'Nobody' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('No member found');
  });

  it('requires a name or email', async () => {
    const result = await toolMemberLookupPodPlay('demo', {});

    expect(result.success).toBe(false);
    expect(result.message).toContain('name or email');
  });
});

// ─── 4. Waiver Check Tool ───────────────────────────────────────────────────

describe('toolWaiverCheckPodPlay', () => {
  it('confirms a valid waiver for existing member', async () => {
    mockFetch
      // searchCustomers
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'cust-1', firstName: 'Jordan', lastName: 'Lee', email: 'j@e.com' },
      ]))
      // getCustomerAgreements
      .mockResolvedValueOnce(mockApiResponse([
        {
          id: 'waiver-1',
          type: 'LIABILITY_WAIVER',
          signedAt: '2026-01-15T00:00:00Z',
          isActive: true,
        },
      ]));

    const result = await toolWaiverCheckPodPlay('demo', { name: 'Jordan Lee' });

    expect(result.success).toBe(true);
    expect(result.hasWaiver).toBe(true);
    expect(result.customerName).toBe('Jordan Lee');
    expect(result.message).toContain('valid waiver');
  });

  it('detects missing waiver', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'cust-2', firstName: 'Avery', lastName: 'Chen', email: 'a@e.com' },
      ]))
      .mockResolvedValueOnce(mockApiResponse([]));

    const result = await toolWaiverCheckPodPlay('demo', { name: 'Avery Chen' });

    expect(result.success).toBe(true);
    expect(result.hasWaiver).toBe(false);
    expect(result.message).toContain('does not have');
  });

  it('detects expired waiver', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'cust-3', firstName: 'Sam', lastName: 'Smith', email: 's@e.com' },
      ]))
      .mockResolvedValueOnce(mockApiResponse([
        {
          id: 'waiver-2',
          type: 'LIABILITY_WAIVER',
          signedAt: '2025-01-01T00:00:00Z',
          expiresAt: '2025-07-01T00:00:00Z',
          isActive: true,
        },
      ]));

    const result = await toolWaiverCheckPodPlay('demo', { name: 'Sam Smith' });

    expect(result.success).toBe(true);
    expect(result.hasWaiver).toBe(false);
    expect(result.message).toContain('does not have');
  });

  it('asks for a name when none provided', async () => {
    const result = await toolWaiverCheckPodPlay('demo', {});

    expect(result.success).toBe(true);
    expect(result.hasWaiver).toBe(false);
    expect(result.message).toContain('I need a name');
  });
});

// ─── 5. Event Lookup Tool ───────────────────────────────────────────────────

describe('toolEventLookupPodPlay', () => {
  it('returns open events', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'area-1', name: 'Main Facility' },
      ]))
      .mockResolvedValueOnce(mockApiResponse([
        {
          id: 'evt-1',
          title: 'Monday Night Round Robin',
          type: 'EVENT',
          subType: 'OPEN_PLAY',
          startTime: '2026-06-15T18:00:00Z',
          endTime: '2026-06-15T20:00:00Z',
          spotsAvailable: 8,
          maxParticipants: 32,
          price: 1500,
        },
        {
          id: 'evt-2',
          title: 'Saturday Tournament',
          type: 'EVENT',
          subType: 'TOURNAMENT',
          startTime: '2026-06-21T09:00:00Z',
          endTime: '2026-06-21T13:00:00Z',
          spotsAvailable: 2,
          maxParticipants: 48,
          price: 2500,
        },
      ]));

    const result = await toolEventLookupPodPlay('demo', { date: '2026-06-15' });

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(2);
    expect(result.events![0].title).toBe('Monday Night Round Robin');
    expect(result.events![0].type).toBe('OPEN_PLAY');
    expect(result.events![0].price).toBe('$15.00');
    expect(result.events![1].spotsLeft).toBe(2);
    expect(result.totalFound).toBe(2);
  });

  it('returns empty when no events', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse([{ id: 'area-1', name: 'Main' }]))
      .mockResolvedValueOnce(mockApiResponse([]));

    const result = await toolEventLookupPodPlay('demo', { date: '2026-06-15' });

    expect(result.success).toBe(true);
    expect(result.events).toEqual([]);
    expect(result.message).toContain('No open events');
  });
});

// ─── 6. Create Reservation Tool ──────────────────────────────────────────────

describe('toolCreateReservationPodPlay', () => {
  it('creates a court reservation successfully', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse({
      id: 'res-123',
      type: 'REGULAR',
      subType: 'PRIVATE',
      tableId: 'table-8am',
      startTime: '2026-06-15T08:00:00Z',
      endTime: '2026-06-15T09:00:00Z',
      status: 'confirmed',
      bookedById: 'cust-1',
      guestIds: [],
    }));

    const result = await toolCreateReservationPodPlay(
      'cust-1',
      'table-8am',
      '2026-06-15T08:00:00Z',
    );

    expect(result.success).toBe(true);
    expect(result.reservationId).toBe('res-123');
    expect(result.status).toBe('confirmed');
    expect(result.message).toContain('confirmed');
  });

  it('handles reservation failure', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(
      { error: 'Table already booked for this time slot' },
      409,
    ));

    const result = await toolCreateReservationPodPlay(
      'cust-1',
      'table-8am',
      '2026-06-15T08:00:00Z',
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Booking failed');
  });
});

// ─── 7. Event Sign-Up Tool ───────────────────────────────────────────────────

describe('toolSignUpForEventPodPlay', () => {
  it('confirms event sign-up', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse({
      id: 'signup-1',
      eventId: 'evt-1',
      customerId: 'cust-1',
      status: 'confirmed',
      createdAt: '2026-06-15T12:00:00Z',
    }));

    const result = await toolSignUpForEventPodPlay('evt-1', 'cust-1');

    expect(result.success).toBe(true);
    expect(result.status).toBe('confirmed');
    expect(result.message).toContain('confirmed');
  });

  it('handles waitlist scenario', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse({
      id: 'signup-2',
      eventId: 'evt-2',
      customerId: 'cust-1',
      status: 'waitlisted',
      createdAt: '2026-06-15T12:00:00Z',
    }));

    const result = await toolSignUpForEventPodPlay('evt-2', 'cust-1');

    expect(result.success).toBe(true);
    expect(result.status).toBe('waitlisted');
    expect(result.message).toContain('waitlist');
  });
});

// ─── 8. Create Customer Tool ─────────────────────────────────────────────────

describe('toolCreateCustomerPodPlay', () => {
  it('creates a new customer', async () => {
    mockFetch
      // getCustomerByEmail — not found
      .mockResolvedValueOnce(mockApiResponse([]))
      // createCustomer
      .mockResolvedValueOnce(mockApiResponse({
        id: 'cust-new',
        firstName: 'Taylor',
        lastName: 'Reed',
        email: 'taylor@example.com',
      }));

    const result = await toolCreateCustomerPodPlay({
      firstName: 'Taylor',
      lastName: 'Reed',
      email: 'taylor@example.com',
    });

    expect(result.success).toBe(true);
    expect(result.customerId).toBe('cust-new');
    expect(result.alreadyExists).toBeUndefined();
  });

  it('detects existing customer', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse([
      { id: 'cust-1', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@example.com' },
    ]));

    const result = await toolCreateCustomerPodPlay({
      firstName: 'Jordan',
      lastName: 'Lee',
      email: 'jordan@example.com',
    });

    expect(result.success).toBe(true);
    expect(result.alreadyExists).toBe(true);
    expect(result.customerId).toBe('cust-1');
    expect(result.message).toContain('already exists');
  });
});

// ─── 9. Full Chatbot Pipeline Tests ──────────────────────────────────────────

describe('Chatbot Pipeline (intent → tool → response)', () => {
  it('booking flow: "Can I book a court for tomorrow?"', async () => {
    // Step 1: Classify intent
    const intent = classifyIntent('Can I book a court for tomorrow at 10am?');
    expect(intent.intent).toBe('booking');
    expect(intent.confidence).toBeGreaterThanOrEqual(90);
    expect(intent.entities.date).toBe('tomorrow');

    // Step 2: Run booking tool
    mockFetch
      .mockResolvedValueOnce(mockApiResponse([{ id: 'area-1', name: 'Main' }]))
      .mockResolvedValueOnce(mockApiResponse([
        { id: 't1', name: 'Court 1', label: '10:00 AM', podId: 'p1' },
      ]));

    const toolResult = await toolBookingPodPlay('demo', intent.entities);
    expect(toolResult.success).toBe(true);
    expect(toolResult.courtsAvailable).toBeGreaterThan(0);

    // Step 3: Agent would generate response using toolResult.message
    expect(toolResult.message).toMatch(/court/i);
  });

  it('waiver flow: "Does Jordan Lee have a waiver?"', async () => {
    const intent = classifyIntent('Does Jordan Lee have a waiver?');
    expect(intent.intent).toBe('waiver');
    expect(intent.entities.name).toBe('Jordan Lee');

    mockFetch
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'cust-1', firstName: 'Jordan', lastName: 'Lee', email: 'j@e.com' },
      ]))
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'w1', type: 'LIABILITY_WAIVER', signedAt: '2026-01-01T00:00:00Z', isActive: true },
      ]));

    const toolResult = await toolWaiverCheckPodPlay('demo', intent.entities);
    expect(toolResult.success).toBe(true);
    expect(toolResult.hasWaiver).toBe(true);
  });

  it('member lookup flow: "Look up member Avery Chen"', async () => {
    const intent = classifyIntent('Look up member Avery Chen');
    expect(intent.intent).toBe('directory');
    expect(intent.entities.name).toBe('Avery Chen');

    mockFetch.mockResolvedValueOnce(mockApiResponse([
      { id: 'cust-2', firstName: 'Avery', lastName: 'Chen', email: 'a@e.com', membershipType: 'standard' },
    ]));

    const toolResult = await toolMemberLookupPodPlay('demo', intent.entities);
    expect(toolResult.success).toBe(true);
    expect(toolResult.member!.membership).toBe('standard');
  });

  it('event flow: "What events do you have this week?"', async () => {
    const intent = classifyIntent('What events do you have this week?');
    expect(intent.intent).toBe('question');

    mockFetch
      .mockResolvedValueOnce(mockApiResponse([{ id: 'area-1', name: 'Main' }]))
      .mockResolvedValueOnce(mockApiResponse([
        { id: 'e1', title: 'Round Robin', type: 'EVENT', subType: 'OPEN_PLAY',
          startTime: '2026-06-15T18:00:00Z', endTime: '2026-06-15T20:00:00Z',
          spotsAvailable: 10, maxParticipants: 32, price: 0 },
      ]));

    const toolResult = await toolEventLookupPodPlay('demo', intent.entities);
    expect(toolResult.success).toBe(true);
    expect(toolResult.events!.length).toBeGreaterThan(0);
  });

  it('pricing flow: "How much is a membership?"', async () => {
    const intent = classifyIntent('How much is a membership?');
    expect(intent.intent).toBe('pricing');
    expect(intent.confidence).toBeGreaterThanOrEqual(90);
    // Pricing doesn't call PodPlay tools — it goes to knowledge/LLM
    expect(intent.entities).toBeDefined();
  });

  it('escalation flow: "I have a problem with my booking" → complaint', async () => {
    const intent = classifyIntent('I have a problem with my booking');
    // Should flag as complaint requiring human
    expect(intent.intent).toBe('complaint');
    expect(intent.requiresHuman).toBe(true);
  });

  it('fallback: unconfigured PodPlay returns helpful error', async () => {
    // Remove config from cache and env
    resetPodPlay();
    delete process.env.PODPLAY_BASE_URL;
    delete process.env.PODPLAY_BEARER_TOKEN;

    const result = await toolBookingPodPlay('demo', { date: '2026-06-15' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('not configured');

    // Restore for remaining tests
    process.env.PODPLAY_BASE_URL = 'https://demo-club.podplay.app';
    process.env.PODPLAY_BEARER_TOKEN = 'test-token-abc123';
  });
});
