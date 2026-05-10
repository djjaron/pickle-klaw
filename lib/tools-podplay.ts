/**
 * PodPlay-Powered Agent Tools
 *
 * Real-tool implementations that call the PodPlay API instead of using
 * hardcoded fallback data. These replace the fake tools in lib/tools.ts
 * when PodPlay is configured.
 *
 * Usage: The agent orchestrator can swap to these tools by checking
 * isPodPlayConfigured() and calling the PodPlay variants.
 */

import {
  isPodPlayConfigured,
  searchCustomers,
  getCustomerByEmail,
  createCustomer,
  getAvailableTables,
  getOpenEvents,
  createReservation,
  signUpForEvent,
  hasValidWaiver,
  getCustomerAgreements,
  getTables,
  getPods,
  getAreas,
} from './podplay';

import type { PodPlayCustomer, PodPlayTable, PodPlayEvent } from './podplay';

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Resolve a relative date word like "today", "tomorrow" to ISO date string */
function resolveDate(entityDate?: string): string {
  if (!entityDate) return new Date().toISOString().split('T')[0];

  const lower = entityDate.toLowerCase();
  if (lower === 'today') return new Date().toISOString().split('T')[0];
  if (lower === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // Named days: monday, tuesday, etc.
  const days: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  if (days[lower] !== undefined) {
    const today = new Date();
    const targetDay = days[lower];
    const currentDay = today.getDay();
    const diff = (targetDay - currentDay + 7) % 7 || 7; // next occurrence
    const d = new Date();
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }

  // Try parsing as ISO date
  const parsed = new Date(entityDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  // Fallback
  return new Date().toISOString().split('T')[0];
}

/** Resolve a customer by name or email from PodPlay */
async function resolveCustomer(
  nameOrEmail: string,
): Promise<{ customer: PodPlayCustomer | null; isNew: boolean }> {
  if (!isPodPlayConfigured()) {
    return { customer: null, isNew: false };
  }

  // Try email first
  if (nameOrEmail.includes('@')) {
    const customer = await getCustomerByEmail(nameOrEmail);
    return { customer, isNew: false };
  }

  // Try name search
  const results = await searchCustomers(nameOrEmail);
  if (results.length > 0) {
    return { customer: results[0], isNew: false };
  }

  return { customer: null, isNew: false };
}

// ─── Tool: Booking — find available courts & book ────────────────────────────

export async function toolBookingPodPlay(
  clubId: string,
  entities: Record<string, string>,
) {
  if (!isPodPlayConfigured()) {
    return {
      success: false,
      message: 'PodPlay API is not configured. Set PODPLAY_BASE_URL and PODPLAY_BEARER_TOKEN env vars.',
    };
  }

  try {
    const searchDate = resolveDate(entities.date);
    const endDate = new Date(new Date(searchDate).getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Get all areas, then find available tables
    const areas = await getAreas();
    if (areas.length === 0) {
      return { success: false, message: 'No locations found for this club.' };
    }

    // Search across all areas for available tables
    const allTables: { table: PodPlayTable; areaName: string }[] = [];
    for (const area of areas) {
      try {
        const tables = await getAvailableTables(area.id, searchDate, endDate);
        for (const t of tables) {
          allTables.push({ table: t, areaName: area.name });
        }
      } catch {
        // Skip areas that error
      }
    }

    if (allTables.length === 0) {
      return {
        success: true,
        date: searchDate,
        availableSlots: [],
        courtsAvailable: 0,
        message: `No courts available on ${searchDate}. All courts are booked.`,
      };
    }

    // Build time slots from available tables
    const slots = new Set<string>();
    for (const { table } of allTables) {
      // Tables represent time-bound inventory — the label often includes time info
      if (table.label) slots.add(table.label);
    }

    return {
      success: true,
      date: searchDate,
      courtsAvailable: allTables.length,
      availableSlots: [...slots].slice(0, 8),
      locations: areas.length,
      message: `${allTables.length} courts available on ${searchDate} across ${areas.length} locations.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Unable to check availability: ${err.message}`,
    };
  }
}

// ─── Tool: Create Reservation ────────────────────────────────────────────────

export async function toolCreateReservationPodPlay(
  customerId: string,
  tableId: string,
  startTime: string,
  durationMinutes = 60,
) {
  if (!isPodPlayConfigured()) {
    return { success: false, message: 'PodPlay is not configured.' };
  }

  try {
    const endTime = new Date(
      new Date(startTime).getTime() + durationMinutes * 60 * 1000,
    ).toISOString();

    const reservation = await createReservation({
      tableId,
      customerId,
      startTime,
      endTime,
    });

    return {
      success: true,
      reservationId: reservation.id,
      status: reservation.status,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      message: `Court booked successfully! Reservation ${reservation.id} is ${reservation.status}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Booking failed: ${err.message}`,
    };
  }
}

// ─── Tool: Member / Customer Lookup ──────────────────────────────────────────

export async function toolMemberLookupPodPlay(
  clubId: string,
  entities: Record<string, string>,
) {
  if (!isPodPlayConfigured()) {
    return { success: false, message: 'PodPlay is not configured.' };
  }

  const name = entities.name;
  const email = entities.email;

  if (!name && !email) {
    return { success: false, message: 'Please provide a name or email to look up.' };
  }

  try {
    const query = email || name!;
    const { customer } = await resolveCustomer(query);

    if (!customer) {
      return {
        success: false,
        message: `No member found matching "${query}". They may need to create a profile first.`,
      };
    }

    return {
      success: true,
      member: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone,
        membership: customer.membershipType || 'none',
      },
      message: `${customer.firstName} ${customer.lastName} — ${customer.membershipType || 'no'} membership`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Member lookup failed: ${err.message}`,
    };
  }
}

// ─── Tool: Waiver / Agreement Check ──────────────────────────────────────────

export async function toolWaiverCheckPodPlay(
  clubId: string,
  entities: Record<string, string>,
) {
  if (!isPodPlayConfigured()) {
    return { success: false, message: 'PodPlay is not configured.' };
  }

  const name = entities.name;
  if (!name) {
    return {
      success: true,
      hasWaiver: false,
      message: 'I need a name to check waiver status. Who should I look up?',
    };
  }

  try {
    const { customer } = await resolveCustomer(name);
    if (!customer) {
      return {
        success: true,
        hasWaiver: false,
        message: `No profile found for "${name}". They'll need to create a profile and sign a waiver before playing.`,
      };
    }

    const waiver = await hasValidWaiver(customer.id);

    if (waiver.hasWaiver) {
      return {
        success: true,
        hasWaiver: true,
        customerName: `${customer.firstName} ${customer.lastName}`,
        signedAt: waiver.signedAt,
        expiresAt: waiver.expiresAt,
        message: `${customer.firstName} ${customer.lastName} has a valid waiver on file.`,
      };
    }

    return {
      success: true,
      hasWaiver: false,
      customerName: `${customer.firstName} ${customer.lastName}`,
      message: `${customer.firstName} ${customer.lastName} does not have a current signed waiver. They need to sign one before playing.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Waiver check failed: ${err.message}`,
    };
  }
}

// ─── Tool: Event Lookup ──────────────────────────────────────────────────────

export async function toolEventLookupPodPlay(clubId: string, entities: Record<string, string>) {
  if (!isPodPlayConfigured()) {
    return { success: false, message: 'PodPlay is not configured.' };
  }

  try {
    const searchDate = resolveDate(entities.date);

    const areas = await getAreas();
    if (areas.length === 0) {
      return { success: false, message: 'No locations found.' };
    }

    const allEvents: { event: PodPlayEvent; areaName: string }[] = [];
    for (const area of areas) {
      try {
        const events = await getOpenEvents(area.id, searchDate);
        for (const e of events) {
          allEvents.push({ event: e, areaName: area.name });
        }
      } catch {
        // skip
      }
    }

    if (allEvents.length === 0) {
      return {
        success: true,
        date: searchDate,
        events: [],
        message: `No open events found on ${searchDate}.`,
      };
    }

    const eventList = allEvents.slice(0, 6).map(({ event, areaName }) => ({
      id: event.id,
      title: event.title,
      type: event.subType,
      startTime: event.startTime,
      spotsLeft: event.spotsAvailable,
      price: event.price ? `$${(event.price / 100).toFixed(2)}` : 'Free',
      location: areaName,
    }));

    return {
      success: true,
      date: searchDate,
      events: eventList,
      totalFound: allEvents.length,
      message: `Found ${allEvents.length} events near ${searchDate}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Event lookup failed: ${err.message}`,
    };
  }
}

// ─── Tool: Sign Up For Event ─────────────────────────────────────────────────

export async function toolSignUpForEventPodPlay(
  eventId: string,
  customerId: string,
) {
  if (!isPodPlayConfigured()) {
    return { success: false, message: 'PodPlay is not configured.' };
  }

  try {
    const signup = await signUpForEvent(eventId, customerId);
    return {
      success: true,
      signupId: signup.id,
      status: signup.status,
      message:
        signup.status === 'waitlisted'
          ? 'You have been added to the waitlist for this event.'
          : 'You are confirmed for this event!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Sign-up failed: ${err.message}`,
    };
  }
}

// ─── Tool: Create Customer Profile ───────────────────────────────────────────

export async function toolCreateCustomerPodPlay(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}) {
  if (!isPodPlayConfigured()) {
    return { success: false, message: 'PodPlay is not configured.' };
  }

  try {
    // Check if already exists
    const existing = await getCustomerByEmail(data.email);
    if (existing) {
      return {
        success: true,
        alreadyExists: true,
        customerId: existing.id,
        message: `A profile for ${existing.firstName} ${existing.lastName} already exists.`,
      };
    }

    const customer = await createCustomer(data);
    return {
      success: true,
      customerId: customer.id,
      message: `Profile created for ${customer.firstName} ${customer.lastName}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Profile creation failed: ${err.message}`,
    };
  }
}
