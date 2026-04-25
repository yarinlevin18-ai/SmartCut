import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { createServerAdmin } from "./supabase";
import type { NotificationTemplate } from "@/types";

const JERUSALEM_TZ = "Asia/Jerusalem";

export type NotificationBookingContext = {
  booking_id: string;
  customer_name: string;
  phone: string; // E.164
  slot_start: string; // ISO UTC
  slot_end: string; // ISO UTC
  service_name: string;
  duration_minutes: number;
  /** Opaque UUID from bookings.manage_token. Required so the SMS body can include the self-service manage link. */
  manage_token: string;
};

/**
 * Resolve the public site URL for manage-link inclusion in SMS bodies.
 * Order of precedence:
 *   1. NEXT_PUBLIC_SITE_URL — explicit, set per environment
 *   2. https://carmelis.co.il — production fallback (matches the live domain)
 * No leading scheme defaults; bare hostnames in templates would render as
 * relative paths in some SMS clients.
 */
function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv && /^https?:\/\//.test(fromEnv)) return fromEnv.replace(/\/$/, "");
  return "https://carmelis.co.il";
}

type EnqueueRow = {
  booking_id: string;
  channel: "sms";
  template: NotificationTemplate;
  recipient: string;
  locale: "he";
  payload: Record<string, unknown>;
  scheduled_for: string;
};

function buildPayload(ctx: NotificationBookingContext): Record<string, unknown> {
  return {
    customer_name: ctx.customer_name,
    service_name: ctx.service_name,
    duration_minutes: ctx.duration_minutes,
    slot_start_iso: ctx.slot_start,
    slot_start_local_date: formatInTimeZone(ctx.slot_start, JERUSALEM_TZ, "dd/MM/yyyy"),
    slot_start_local_time: formatInTimeZone(ctx.slot_start, JERUSALEM_TZ, "HH:mm"),
    slot_start_local_weekday: formatInTimeZone(ctx.slot_start, JERUSALEM_TZ, "EEEE"),
    manage_token: ctx.manage_token,
    manage_url: `${siteUrl()}/booking/manage/${ctx.manage_token}`,
  };
}

function reminderSendAt(slotStartIso: string): string {
  return new Date(new Date(slotStartIso).getTime() - 24 * 60 * 60 * 1000).toISOString();
}

/**
 * On cancellation: enqueue a cancellation SMS (immediate) AND mark any still-queued
 * reminders for this booking as 'skipped' so they don't fire.
 */
export async function enqueueBookingCancelled(
  ctx: NotificationBookingContext
): Promise<{ enqueued: number; skippedReminders: number }> {
  const payload = buildPayload(ctx);
  const now = new Date().toISOString();
  const rows: EnqueueRow[] = [
    {
      booking_id: ctx.booking_id,
      channel: "sms",
      template: "booking_cancelled",
      recipient: ctx.phone,
      locale: "he",
      payload,
      scheduled_for: now,
    },
  ];

  try {
    const admin = createServerAdmin();
    const [insertRes, skipRes] = await Promise.all([
      admin.from("notifications").insert(rows),
      admin
        .from("notifications")
        .update({ status: "skipped", error: "booking_cancelled" })
        .eq("booking_id", ctx.booking_id)
        .eq("template", "booking_reminder_24h")
        .eq("status", "queued")
        .select("id"),
    ]);
    if (insertRes.error) {
      console.error("[notifications] enqueue cancelled failed", insertRes.error.message);
    }
    return {
      enqueued: insertRes.error ? 0 : rows.length,
      skippedReminders: skipRes.data?.length ?? 0,
    };
  } catch (err) {
    console.error("[notifications] enqueue cancelled threw", err instanceof Error ? err.message : err);
    return { enqueued: 0, skippedReminders: 0 };
  }
}

/**
 * On reschedule: enqueue a 'booking_rescheduled' SMS for the NEW slot, skip the
 * still-queued old reminder, and enqueue a fresh reminder at new_slot_start - 24h.
 *
 * The ctx passed here describes the NEW slot. The caller is responsible for
 * passing the new slot_start/slot_end (the RPC return supplies these).
 */
export async function enqueueBookingRescheduled(
  ctx: NotificationBookingContext
): Promise<{ enqueued: number; skippedReminders: number }> {
  const payload = buildPayload(ctx);
  const now = new Date().toISOString();
  const reminderAt = reminderSendAt(ctx.slot_start);
  const reminderIsFuture = new Date(reminderAt).getTime() > Date.now();

  const rows: EnqueueRow[] = [
    {
      booking_id: ctx.booking_id,
      channel: "sms",
      template: "booking_rescheduled",
      recipient: ctx.phone,
      locale: "he",
      payload,
      scheduled_for: now,
    },
  ];
  if (reminderIsFuture) {
    rows.push({
      booking_id: ctx.booking_id,
      channel: "sms",
      template: "booking_reminder_24h",
      recipient: ctx.phone,
      locale: "he",
      payload,
      scheduled_for: reminderAt,
    });
  }

  try {
    const admin = createServerAdmin();
    // Order matters: skip the OLD reminder FIRST, then insert the new rows.
    // If we paralleled these, the skip's WHERE (template=reminder AND status=queued)
    // would also catch the freshly-inserted new reminder.
    const skipRes = await admin
      .from("notifications")
      .update({ status: "skipped", error: "booking_rescheduled" })
      .eq("booking_id", ctx.booking_id)
      .eq("template", "booking_reminder_24h")
      .eq("status", "queued")
      .select("id");
    const insertRes = await admin.from("notifications").insert(rows);
    if (insertRes.error) {
      console.error("[notifications] enqueue rescheduled failed", insertRes.error.message);
    }
    return {
      enqueued: insertRes.error ? 0 : rows.length,
      skippedReminders: skipRes.data?.length ?? 0,
    };
  } catch (err) {
    console.error("[notifications] enqueue rescheduled threw", err instanceof Error ? err.message : err);
    return { enqueued: 0, skippedReminders: 0 };
  }
}

// ============================================================================
// Phase 5 — approval workflow helpers
// ============================================================================

/**
 * Public form submission acknowledgement. Single SMS, no reminder yet — the
 * 24h reminder is enqueued only when the admin approves (since pending could
 * be denied or rescheduled).
 */
export async function enqueueBookingPending(
  ctx: NotificationBookingContext
): Promise<{ enqueued: number }> {
  const payload = buildPayload(ctx);
  const row: EnqueueRow = {
    booking_id: ctx.booking_id,
    channel: "sms",
    template: "booking_pending",
    recipient: ctx.phone,
    locale: "he",
    payload,
    scheduled_for: new Date().toISOString(),
  };
  try {
    const admin = createServerAdmin();
    const { error } = await admin.from("notifications").insert([row]);
    if (error) {
      console.error("[notifications] enqueue pending failed", error.code, error.message);
      return { enqueued: 0 };
    }
    return { enqueued: 1 };
  } catch (err) {
    console.error("[notifications] enqueue pending threw", err instanceof Error ? err.message : err);
    return { enqueued: 0 };
  }
}

/**
 * Admin approve. Enqueues the approved-confirmation SMS AND the 24h reminder
 * (which wasn't enqueued at form-submit time — see enqueueBookingPending).
 */
export async function enqueueBookingApproved(
  ctx: NotificationBookingContext
): Promise<{ enqueued: number }> {
  const payload = buildPayload(ctx);
  const now = new Date().toISOString();
  const reminderAt = reminderSendAt(ctx.slot_start);
  const reminderIsFuture = new Date(reminderAt).getTime() > Date.now();

  const rows: EnqueueRow[] = [
    {
      booking_id: ctx.booking_id,
      channel: "sms",
      template: "booking_approved",
      recipient: ctx.phone,
      locale: "he",
      payload,
      scheduled_for: now,
    },
  ];
  if (reminderIsFuture) {
    rows.push({
      booking_id: ctx.booking_id,
      channel: "sms",
      template: "booking_reminder_24h",
      recipient: ctx.phone,
      locale: "he",
      payload,
      scheduled_for: reminderAt,
    });
  }

  try {
    const admin = createServerAdmin();
    const { error } = await admin.from("notifications").insert(rows);
    if (error) {
      console.error("[notifications] enqueue approved failed", error.code, error.message);
      return { enqueued: 0 };
    }
    return { enqueued: rows.length };
  } catch (err) {
    console.error("[notifications] enqueue approved threw", err instanceof Error ? err.message : err);
    return { enqueued: 0 };
  }
}

/**
 * Admin deny (outright reject). One SMS, no reminder. Also clears any pending
 * acknowledgement that hasn't sent yet (skip queued booking_pending).
 */
export async function enqueueBookingDenied(
  ctx: NotificationBookingContext
): Promise<{ enqueued: number; skippedAcks: number }> {
  const payload = buildPayload(ctx);
  const row: EnqueueRow = {
    booking_id: ctx.booking_id,
    channel: "sms",
    template: "booking_denied",
    recipient: ctx.phone,
    locale: "he",
    payload,
    scheduled_for: new Date().toISOString(),
  };
  try {
    const admin = createServerAdmin();
    // Skip any still-queued ack first (sequenced — see enqueueBookingRescheduled
    // for the why on sequencing skip-then-insert).
    const skipRes = await admin
      .from("notifications")
      .update({ status: "skipped", error: "booking_denied" })
      .eq("booking_id", ctx.booking_id)
      .in("template", ["booking_pending", "booking_reminder_24h"])
      .eq("status", "queued")
      .select("id");
    const insRes = await admin.from("notifications").insert([row]);
    if (insRes.error) {
      console.error("[notifications] enqueue denied failed", insRes.error.code, insRes.error.message);
    }
    return {
      enqueued: insRes.error ? 0 : 1,
      skippedAcks: skipRes.data?.length ?? 0,
    };
  } catch (err) {
    console.error("[notifications] enqueue denied threw", err instanceof Error ? err.message : err);
    return { enqueued: 0, skippedAcks: 0 };
  }
}

/**
 * Admin offers an alternative slot. Send the customer the URL to accept/cancel.
 * No reminder yet — they haven't confirmed. ctx describes the NEW slot.
 */
export async function enqueueBookingAlternativeOffered(
  ctx: NotificationBookingContext
): Promise<{ enqueued: number }> {
  const payload = buildPayload(ctx);
  const row: EnqueueRow = {
    booking_id: ctx.booking_id,
    channel: "sms",
    template: "booking_alternative_offered",
    recipient: ctx.phone,
    locale: "he",
    payload,
    scheduled_for: new Date().toISOString(),
  };
  try {
    const admin = createServerAdmin();
    const { error } = await admin.from("notifications").insert([row]);
    if (error) {
      console.error("[notifications] enqueue alt-offered failed", error.code, error.message);
      return { enqueued: 0 };
    }
    return { enqueued: 1 };
  } catch (err) {
    console.error("[notifications] enqueue alt-offered threw", err instanceof Error ? err.message : err);
    return { enqueued: 0 };
  }
}
