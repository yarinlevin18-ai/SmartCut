import "server-only";
import { createServerAdmin } from "./supabase";
import { formatInTimeZone } from "date-fns-tz";

// Google Calendar v3 client. Single connected account (the studio owner's),
// row stored in oauth_tokens with provider='google_calendar'.
//
// Auth flow lives in /api/auth/google/{connect,callback}/route.ts. Once
// connected, this module:
//   - tracks/refreshes the access token automatically
//   - creates / updates / deletes events for bookings
//
// All public helpers are FAIL-SOFT: a missing connection or transient API
// failure NEVER throws to the caller. Logged + swallowed. Bookings work
// without Google Calendar; the integration is purely additive.

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
// `openid email` are needed for the id_token in the token-exchange response;
// that's how we discover which Google account just authorized us (display only,
// not used for auth — the access_token is the real credential).
const SCOPE = "openid email https://www.googleapis.com/auth/calendar.events";
const JERUSALEM_TZ = "Asia/Jerusalem";

// 60-second skew buffer — refresh proactively before the access token's true
// expiry to avoid landing right on the edge mid-call.
const REFRESH_SKEW_MS = 60_000;

export interface GcalEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function loadGcalEnv(): GcalEnv | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function isGcalConfigured(): boolean {
  return loadGcalEnv() !== null;
}

export function buildAuthUrl(state: string): string | null {
  const env = loadGcalEnv();
  if (!env) return null;
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: "code",
    scope: SCOPE,
    // offline → returns a refresh_token. consent → forces the prompt so we
    // get a fresh refresh_token even if the user has authorized us before.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
  scope: string;
  token_type: "Bearer";
  id_token?: string;
}

interface IdTokenPayload {
  email?: string;
}

/**
 * Exchange the OAuth code (from /callback) for a refresh + access token.
 * Returns null if Google rejects.
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
  email: string | null;
} | null> {
  const env = loadGcalEnv();
  if (!env) return null;

  const body = new URLSearchParams({
    code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: env.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[gcal] token exchange failed", res.status, text.slice(0, 200));
    return null;
  }

  const data = (await res.json()) as TokenResponse;
  if (!data.refresh_token) {
    console.error("[gcal] no refresh_token in response — user may have already authorized; revoke and retry");
    return null;
  }

  // Crack the id_token to learn which Google account just authorized us.
  // Display only — we don't verify the signature, the access_token is the
  // actual credential. If id_token is malformed, fall back to null email.
  let email: string | null = null;
  if (data.id_token) {
    try {
      const [, payloadB64] = data.id_token.split(".");
      // padded base64-url → base64
      const padded = payloadB64.padEnd(payloadB64.length + ((4 - (payloadB64.length % 4)) % 4), "=");
      const json = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      const parsed = JSON.parse(json) as IdTokenPayload;
      email = parsed.email ?? null;
    } catch {
      /* swallow */
    }
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope,
    email,
  };
}

interface StoredToken {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  calendar_id: string;
}

async function loadStoredToken(): Promise<StoredToken | null> {
  const admin = createServerAdmin();
  const { data, error } = await admin
    .from("oauth_tokens")
    .select("id, access_token, refresh_token, expires_at, calendar_id")
    .eq("provider", "google_calendar")
    .maybeSingle();
  if (error) {
    console.error("[gcal] load token failed", error.message);
    return null;
  }
  return (data as StoredToken | null) ?? null;
}

/**
 * Refresh the access token if it's close to expiry (or already expired).
 * Updates the stored row. Returns the fresh access token, or null on
 * failure (caller should treat as "not connected").
 */
async function getOrRefreshAccessToken(): Promise<{
  accessToken: string;
  calendarId: string;
} | null> {
  const stored = await loadStoredToken();
  if (!stored) return null;

  const expiresAt = new Date(stored.expires_at).getTime();
  if (expiresAt - Date.now() > REFRESH_SKEW_MS) {
    return { accessToken: stored.access_token, calendarId: stored.calendar_id };
  }

  const env = loadGcalEnv();
  if (!env) return null;

  const body = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: stored.refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[gcal] refresh failed", res.status, text.slice(0, 200));
    // If Google says invalid_grant, the refresh token has been revoked.
    // Caller should prompt the user to reconnect.
    return null;
  }

  const data = (await res.json()) as TokenResponse;
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  const admin = createServerAdmin();
  const upd = await admin
    .from("oauth_tokens")
    .update({
      access_token: data.access_token,
      expires_at: newExpiresAt,
      // Google sometimes rotates the refresh_token; persist if returned.
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    })
    .eq("id", stored.id);
  if (upd.error) {
    console.error("[gcal] persist refreshed token failed", upd.error.message);
  }

  return { accessToken: data.access_token, calendarId: stored.calendar_id };
}

// ============================================================================
// Booking → Calendar event
// ============================================================================

export interface BookingForGcal {
  id: string;
  full_name: string;
  phone: string;
  notes: string | null;
  slot_start: string; // ISO UTC
  slot_end: string; // ISO UTC
  service_name: string;
  manage_token: string;
}

interface GcalEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
  location?: string;
}

function buildEventBody(b: BookingForGcal): GcalEvent {
  const summary = `${b.full_name} — ${b.service_name}`;
  const lines: string[] = [];
  lines.push(`Customer: ${b.full_name}`);
  lines.push(`Phone: ${b.phone}`);
  if (b.notes) lines.push(`Notes: ${b.notes}`);
  // Manage URL — handy if the barber wants to deep-link to the admin row.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://carmelis.co.il";
  lines.push("");
  lines.push(`Manage: ${baseUrl}/admin/bookings`);

  return {
    summary,
    description: lines.join("\n"),
    start: {
      // Google accepts UTC ISO; the timeZone hint helps clients render
      // correctly across DST. We send UTC dateTime + TZ so display is
      // unambiguous regardless of the viewer's calendar settings.
      dateTime: new Date(b.slot_start).toISOString(),
      timeZone: JERUSALEM_TZ,
    },
    end: {
      dateTime: new Date(b.slot_end).toISOString(),
      timeZone: JERUSALEM_TZ,
    },
    location: "Carmelis Studio",
  };
}

/**
 * Create a Google Calendar event for this booking. Returns the event id, or
 * null if the integration isn't connected / the API call failed. Never throws.
 */
export async function createEventForBooking(
  b: BookingForGcal,
): Promise<string | null> {
  try {
    const tok = await getOrRefreshAccessToken();
    if (!tok) return null;
    const url = `${CALENDAR_API_BASE}/${encodeURIComponent(tok.calendarId)}/events`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.accessToken}`,
      },
      body: JSON.stringify(buildEventBody(b)),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[gcal] createEvent failed", res.status, text.slice(0, 300));
      return null;
    }
    const data = (await res.json()) as GcalEvent;
    return data.id ?? null;
  } catch (err) {
    console.error("[gcal] createEvent threw", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Update an existing event when the slot or details change. Returns true on success. */
export async function updateEventForBooking(
  eventId: string,
  b: BookingForGcal,
): Promise<boolean> {
  try {
    const tok = await getOrRefreshAccessToken();
    if (!tok) return false;
    const url = `${CALENDAR_API_BASE}/${encodeURIComponent(tok.calendarId)}/events/${encodeURIComponent(eventId)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.accessToken}`,
      },
      body: JSON.stringify(buildEventBody(b)),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[gcal] updateEvent failed", res.status, text.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[gcal] updateEvent threw", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Delete the event when the booking is cancelled. Returns true on success. */
export async function deleteEvent(eventId: string): Promise<boolean> {
  try {
    const tok = await getOrRefreshAccessToken();
    if (!tok) return false;
    const url = `${CALENDAR_API_BASE}/${encodeURIComponent(tok.calendarId)}/events/${encodeURIComponent(eventId)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tok.accessToken}` },
    });
    // 200 OK or 410 Gone (already deleted) both mean "not in the calendar
    // anymore" → success from our perspective.
    if (res.ok || res.status === 410) return true;
    const text = await res.text();
    console.error("[gcal] deleteEvent failed", res.status, text.slice(0, 300));
    return false;
  } catch (err) {
    console.error("[gcal] deleteEvent threw", err instanceof Error ? err.message : err);
    return false;
  }
}

// ============================================================================
// Read events (for displaying the calendar inside the admin dashboard)
// ============================================================================

export interface GcalEventSummary {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string; // ISO UTC, derived from start.dateTime ?? start.date
  end: string;
  isAllDay: boolean;
  htmlLink: string | null;
}

interface GcalListResponse {
  items?: Array<{
    id: string;
    summary?: string;
    description?: string;
    location?: string;
    start?: { dateTime?: string; date?: string; timeZone?: string };
    end?: { dateTime?: string; date?: string; timeZone?: string };
    htmlLink?: string;
    status?: string;
  }>;
}

/**
 * Fetch upcoming events from the connected calendar. Returns up to `maxResults`
 * events between now and now + `daysAhead` days, expanded (recurring events
 * become individual instances), ordered by start time. Returns null if
 * disconnected / API error — caller renders a fallback.
 */
export async function listUpcomingEvents(
  daysAhead = 7,
  maxResults = 50,
): Promise<GcalEventSummary[] | null> {
  try {
    const tok = await getOrRefreshAccessToken();
    if (!tok) return null;

    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + daysAhead * 24 * 3600_000).toISOString();
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(maxResults),
    });
    const url = `${CALENDAR_API_BASE}/${encodeURIComponent(tok.calendarId)}/events?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tok.accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[gcal] listUpcomingEvents failed", res.status, text.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as GcalListResponse;

    return (data.items ?? [])
      // Drop cancelled events — Google leaves tombstones in the response.
      .filter((e) => e.status !== "cancelled")
      .map((e) => {
        const startVal = e.start?.dateTime ?? e.start?.date;
        const endVal = e.end?.dateTime ?? e.end?.date;
        const isAllDay = Boolean(e.start?.date && !e.start?.dateTime);
        return {
          id: e.id,
          summary: e.summary ?? "(ללא כותרת)",
          description: e.description ?? null,
          location: e.location ?? null,
          start: startVal ? new Date(startVal).toISOString() : "",
          end: endVal ? new Date(endVal).toISOString() : "",
          isAllDay,
          htmlLink: e.htmlLink ?? null,
        } satisfies GcalEventSummary;
      })
      .filter((e) => e.start && e.end);
  } catch (err) {
    console.error("[gcal] listUpcomingEvents threw", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Revoke + remove the stored token. Best-effort revoke — even if Google
 * rejects, we still wipe the row so the integration is "disconnected" locally.
 */
export async function revokeAndDisconnect(): Promise<{ ok: boolean }> {
  const stored = await loadStoredToken();
  if (!stored) return { ok: true };

  // Tell Google to invalidate the refresh token.
  try {
    await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(stored.refresh_token)}`, {
      method: "POST",
    });
  } catch (err) {
    console.error("[gcal] revoke threw", err instanceof Error ? err.message : err);
    // continue — local wipe still happens
  }

  const admin = createServerAdmin();
  const del = await admin.from("oauth_tokens").delete().eq("id", stored.id);
  if (del.error) {
    console.error("[gcal] disconnect delete failed", del.error.message);
    return { ok: false };
  }
  return { ok: true };
}

/**
 * Status for the admin UI.
 */
export async function getGcalStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  account_email: string | null;
}> {
  if (!isGcalConfigured()) {
    return { configured: false, connected: false, account_email: null };
  }
  const admin = createServerAdmin();
  const { data } = await admin
    .from("oauth_tokens")
    .select("account_email")
    .eq("provider", "google_calendar")
    .maybeSingle();
  return {
    configured: true,
    connected: !!data,
    account_email: (data?.account_email as string | null) ?? null,
  };
}

// ----- helpers exposed for tests / scripts -----

/** Test-only formatting smoke. */
export function debugFormatSlot(iso: string): string {
  return formatInTimeZone(iso, JERUSALEM_TZ, "yyyy-MM-dd HH:mm");
}
