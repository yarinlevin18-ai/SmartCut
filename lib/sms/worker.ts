import "server-only";
import { createServerAdmin } from "../supabase";
import { sendInforuSms, type SmsSendResult } from "./inforu";
import { renderSmsBody } from "./templates";
import type { NotificationTemplate } from "@/types";

const MAX_ATTEMPTS = 5;
const CLAIM_BATCH = 20;

type QueuedRow = {
  id: string;
  booking_id: string | null;
  channel: "sms";
  template: NotificationTemplate;
  recipient: string;
  payload: Record<string, unknown>;
  attempts: number;
};

export type WorkerRunResult = {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
};

/**
 * Single pass: claim up to CLAIM_BATCH queued SMS rows whose scheduled_for <= now(),
 * dispatch each via Inforu, and flip status accordingly.
 *
 * Concurrency strategy: we claim rows by flipping status->'sending' atomically
 * using an UPDATE ... WHERE status='queued' ... RETURNING. No row is touched
 * twice even with multiple workers running.
 */
export async function runNotificationsWorker(): Promise<WorkerRunResult> {
  const admin = createServerAdmin();
  const result: WorkerRunResult = { claimed: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  // Claim: select candidates, then stamp 'sending' atomically.
  // (Supabase JS doesn't expose FOR UPDATE SKIP LOCKED; two-step with a filter
  // on the final UPDATE keeps it race-safe since 'sending' is a one-way flip.)
  const candidates = await admin
    .from("notifications")
    .select("id")
    .eq("status", "queued")
    .eq("channel", "sms")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(CLAIM_BATCH);

  if (candidates.error) {
    throw new Error(`worker_claim_select: ${candidates.error.message}`);
  }
  if (!candidates.data || candidates.data.length === 0) return result;

  const ids = candidates.data.map((r) => r.id);
  const claim = await admin
    .from("notifications")
    .update({ status: "sending" })
    .in("id", ids)
    .eq("status", "queued") // guards against another worker beating us
    .select("id, booking_id, channel, template, recipient, payload, attempts");

  if (claim.error) {
    throw new Error(`worker_claim_update: ${claim.error.message}`);
  }
  const claimed = (claim.data ?? []) as QueuedRow[];
  result.claimed = claimed.length;

  for (const row of claimed) {
    try {
      const body = renderSmsBody(row.template, row.payload ?? {});
      const send: SmsSendResult = await sendInforuSms(row.recipient, body);
      const nextAttempts = row.attempts + 1;

      if (send.ok) {
        await admin
          .from("notifications")
          .update({
            status: "sent",
            attempts: nextAttempts,
            provider: send.provider,
            provider_message_id: send.providerMessageId,
            error: null,
            sent_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        result.sent++;
      } else if (send.retriable && nextAttempts < MAX_ATTEMPTS) {
        // Exponential backoff: delay = 2^attempts minutes
        const delayMs = Math.pow(2, nextAttempts) * 60_000;
        await admin
          .from("notifications")
          .update({
            status: "queued",
            attempts: nextAttempts,
            provider: send.provider,
            error: send.error,
            scheduled_for: new Date(Date.now() + delayMs).toISOString(),
          })
          .eq("id", row.id);
        result.skipped++;
      } else {
        // Include Inforu RequestId in the error column when present — it's the
        // single most useful piece of info if you have to open a support ticket.
        const errWithRid = send.requestId
          ? `${send.error} [rid:${send.requestId}]`
          : send.error;
        await admin
          .from("notifications")
          .update({
            status: "failed",
            attempts: nextAttempts,
            provider: send.provider,
            error: errWithRid,
          })
          .eq("id", row.id);
        result.failed++;
        result.errors.push({ id: row.id, error: errWithRid });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await admin
        .from("notifications")
        .update({ status: "failed", error: `worker_throw: ${msg}`, attempts: row.attempts + 1 })
        .eq("id", row.id);
      result.failed++;
      result.errors.push({ id: row.id, error: msg });
    }
  }

  return result;
}
