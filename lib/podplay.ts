/**
 * PodPlay API Client
 *
 * PodPlay is a pickleball facility management platform. This client wraps their
 * v2 REST API for use by the Pickle-Klaw chatbot agent.
 *
 * Docs: https://help.podplay.app/en/articles/6086529
 * Swagger: https://{club}.podplay.app/apis/v2/docs
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export interface PodPlayConfig {
  /** Base URL: https://{clubname}.podplay.app */
  baseUrl: string;
  /** Bearer token from an admin-profile login session */
  bearerToken: string;
}

let _config: PodPlayConfig | null = null;

export function configurePodPlay(config: PodPlayConfig) {
  _config = config;
}

export function resetPodPlay() {
  _config = null;
}

export function isPodPlayConfigured(): boolean {
  // Check both cached config and env vars — env vars can change at runtime
  const baseUrl = _config?.baseUrl || process.env.PODPLAY_BASE_URL || '';
  const bearerToken = _config?.bearerToken || process.env.PODPLAY_BEARER_TOKEN || '';
  return Boolean(baseUrl && bearerToken);
}

function config(): PodPlayConfig {
  if (!_config) {
    // Fall back to env vars for Netlify / local dev
    _config = {
      baseUrl: process.env.PODPLAY_BASE_URL || '',
      bearerToken: process.env.PODPLAY_BEARER_TOKEN || '',
    };
  }
  if (!_config.baseUrl || !_config.bearerToken) {
    throw new Error('PodPlay is not configured — set PODPLAY_BASE_URL and PODPLAY_BEARER_TOKEN env vars');
  }
  return _config;
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const { baseUrl, bearerToken } = config();
  const url = new URL(`${baseUrl}/api/v2${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PodPlay ${res.status} on GET ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const { baseUrl, bearerToken } = config();
  const res = await fetch(`${baseUrl}/api/v2${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PodPlay ${res.status} on POST ${path}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Type definitions ────────────────────────────────────────────────────────

export interface PodPlayLocation {
  id: string;
  name: string;
  type: 'region' | 'area';
  address?: string;
  timezone?: string;
}

export interface PodPlayPod {
  id: string;
  name: string;
  areaId: string;
  sport?: string;
}

export interface PodPlayTable {
  id: string;
  name: string;
  podId: string;
  /** Court number or identifier */
  label?: string;
}

export interface PodPlayEvent {
  id: string;
  title: string;
  type: 'REGULAR' | 'EVENT';
  subType: 'PRIVATE' | 'OPEN_PLAY' | 'TOURNAMENT' | 'PRIVATE_EVENT' | 'CLINIC' | 'LEAGUE';
  startTime: string;
  endTime: string;
  /** How many spots remain */
  spotsAvailable: number;
  maxParticipants: number;
  price?: number; // cents
  tableId?: string;
  areaId?: string;
}

export interface PodPlayCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthday?: string;
  gender?: string;
  /** Active membership type, null if none */
  membershipType?: string | null;
}

export interface PodPlayAgreement {
  id: string;
  type: 'LIABILITY_WAIVER' | 'KIDS_WAIVER';
  signedAt?: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface PodPlayReservation {
  id: string;
  type: 'REGULAR';
  subType: 'PRIVATE';
  tableId: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  bookedById: string;
  guestIds: string[];
  price?: number;
}

export interface PodPlayEventSignup {
  id: string;
  eventId: string;
  customerId: string;
  status: 'pending' | 'confirmed' | 'waitlisted';
  createdAt: string;
}

// ─── Locations ───────────────────────────────────────────────────────────────

export async function getRegions(): Promise<PodPlayLocation[]> {
  return apiGet<PodPlayLocation[]>('/locations/regions');
}

export async function getAreas(regionId?: string): Promise<PodPlayLocation[]> {
  return apiGet<PodPlayLocation[]>('/locations/areas', regionId ? { regionId } : undefined);
}

export async function getPods(areaId: string): Promise<PodPlayPod[]> {
  return apiGet<PodPlayPod[]>('/locations/pods', { areaId });
}

export async function getTables(podId: string): Promise<PodPlayTable[]> {
  return apiGet<PodPlayTable[]>('/locations/tables', { podId });
}

/** Get all available tables (courts) for a date range */
export async function getAvailableTables(
  areaId: string,
  startDate: string,
  endDate: string,
): Promise<PodPlayTable[]> {
  return apiGet<PodPlayTable[]>('/locations/tables/available', {
    areaId,
    startDate,
    endDate,
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function getEvents(
  areaId: string,
  filters?: { startDate?: string; endDate?: string; type?: string },
): Promise<PodPlayEvent[]> {
  return apiGet<PodPlayEvent[]>('/events', { areaId, ...filters });
}

export async function getEvent(eventId: string): Promise<PodPlayEvent> {
  return apiGet<PodPlayEvent>(`/events/${eventId}`);
}

/** Get open events a customer can sign up for */
export async function getOpenEvents(areaId: string, startDate?: string): Promise<PodPlayEvent[]> {
  return apiGet<PodPlayEvent[]>('/events/open', {
    areaId,
    ...(startDate ? { startDate } : {}),
  });
}

/** Sign a customer up for an event */
export async function signUpForEvent(
  eventId: string,
  customerId: string,
): Promise<PodPlayEventSignup> {
  return apiPost<PodPlayEventSignup>('/events/signup', { eventId, customerId });
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function getCustomer(customerId: string): Promise<PodPlayCustomer> {
  return apiGet<PodPlayCustomer>(`/users/${customerId}`);
}

/** Search customers by name, email, or phone */
export async function searchCustomers(
  query: string,
): Promise<PodPlayCustomer[]> {
  return apiGet<PodPlayCustomer[]>('/users/search', { query });
}

/** Look up customer by email (exact match) */
export async function getCustomerByEmail(email: string): Promise<PodPlayCustomer | null> {
  const results = await apiGet<PodPlayCustomer[]>('/users/search', { email });
  return results.length > 0 ? results[0] : null;
}

/**
 * Create a new customer profile.
 * Required: firstName, lastName, email. Optional: phone, birthday, gender.
 */
export async function createCustomer(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthday?: string;
  gender?: string;
}): Promise<PodPlayCustomer> {
  return apiPost<PodPlayCustomer>('/users', data);
}

// ─── Orders / Reservations ───────────────────────────────────────────────────

/** Create a court reservation */
export async function createReservation(data: {
  tableId: string;
  customerId: string;
  startTime: string; // ISO 8601
  endTime: string;
  guestIds?: string[];
}): Promise<PodPlayReservation> {
  return apiPost<PodPlayReservation>('/orders/reservation', {
    type: 'REGULAR',
    subType: 'PRIVATE',
    ...data,
  });
}

/** Get reservation details */
export async function getReservation(reservationId: string): Promise<PodPlayReservation> {
  return apiGet<PodPlayReservation>(`/orders/reservation/${reservationId}`);
}

// ─── Agreements / Waivers ────────────────────────────────────────────────────

/** Get waivers/agreements for a customer */
export async function getCustomerAgreements(
  customerId: string,
): Promise<PodPlayAgreement[]> {
  return apiGet<PodPlayAgreement[]>(`/agreements/customer/${customerId}`);
}

/** Check if a customer has a valid (active, not expired) liability waiver */
export async function hasValidWaiver(customerId: string): Promise<{
  hasWaiver: boolean;
  signedAt?: string;
  expiresAt?: string;
}> {
  const agreements = await getCustomerAgreements(customerId);
  const waiver = agreements.find(
    a => a.type === 'LIABILITY_WAIVER' && a.isActive,
  );
  if (!waiver) return { hasWaiver: false };
  if (waiver.expiresAt && new Date(waiver.expiresAt) < new Date()) {
    return { hasWaiver: false, signedAt: waiver.signedAt, expiresAt: waiver.expiresAt };
  }
  return {
    hasWaiver: true,
    signedAt: waiver.signedAt,
    expiresAt: waiver.expiresAt,
  };
}
