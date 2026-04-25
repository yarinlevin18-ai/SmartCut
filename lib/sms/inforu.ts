import "server-only";

// Inforu SMS adapter (Israeli business SMS provider).
// Docs: https://apidoc.inforu.co.il/  (v2 JSON REST surface)
//
// Endpoint: POST https://capi.inforu.co.il/api/v2/SMS/SendSms
// Auth: HTTP Basic with base64("<username>:<api-token>")
//
// Real-API probes confirmed (without credentials):
//   - 401 + StatusId:-1  on missing auth
//   - 401 + StatusId:-2  on bad creds OR non-allowlisted IP
//
// IMPORTANT — IP ALLOWLISTING:
//   Inforu requires the originating server's IP to be allowlisted in the
//   account portal IN ADDITION to credentials. First-send failures from a
//   new deployment commonly look like auth errors but are actually IP
//   block errors — see the "illegal IP" mention in the error message.
//   For Vercel: their egress IPs are not stable; you may need to use
//   Vercel's static IPs (Pro plan) or wait for Inforu to allow a CIDR.
//
// Env vars (set in .env.local and on the deploy target):
//   INFORU_USERNAME  — account username
//   INFORU_API_TOKEN — API token from dashboard (NOT the account password)
//   INFORU_SENDER    — approved sender ID (display name on the SMS; e.g. "Carmelis")
//   INFORU_API_URL   — optional override (defaults to capi.inforu.co.il/api/v2/SMS/SendSms)

export type SmsSendResult =
  | { ok: true; providerMessageId: string | null; provider: "inforu"; requestId: string | null }
  | { ok: false; error: string; retriable: boolean; provider: "inforu"; requestId: string | null };

type InforuEnv = {
  username: string;
  apiToken: string;
  sender: string;
  apiUrl: string;
};

function loadEnv(): InforuEnv | { error: string } {
  const username = process.env.INFORU_USERNAME;
  const apiToken = process.env.INFORU_API_TOKEN;
  const sender = process.env.INFORU_SENDER;
  const apiUrl = process.env.INFORU_API_URL ?? "https://capi.inforu.co.il/api/v2/SMS/SendSms";
  if (!username || !apiToken || !sender) {
    return { error: "INFORU_USERNAME / INFORU_API_TOKEN / INFORU_SENDER not set" };
  }
  return { username, apiToken, sender, apiUrl };
}

export async function sendInforuSms(recipientE164: string, body: string): Promise<SmsSendResult> {
  const env = loadEnv();
  if ("error" in env) {
    return { ok: false, error: env.error, retriable: false, provider: "inforu", requestId: null };
  }

  // Inforu expects the local Israeli format (e.g. 0501234567) for Israeli numbers.
  // E.164 '+9725XXXXXXXX' -> '05XXXXXXXX'
  const localPhone = recipientE164.startsWith("+972")
    ? "0" + recipientE164.slice(4)
    : recipientE164;

  const reqBody = {
    Data: {
      Message: body,
      Recipients: [{ Phone: localPhone }],
      Settings: { Sender: env.sender },
    },
  };

  const auth = Buffer.from(`${env.username}:${env.apiToken}`).toString("base64");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(env.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(reqBody),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* keep raw */ }

    const requestId = typeof json?.RequestId === "string" ? json.RequestId : null;

    if (!res.ok) {
      // HTTP-level failure — but may also have a structured StatusId in the body.
      const statusId = readStatusId(json);
      const desc = readStatusDescription(json) ?? text.slice(0, 200);
      return {
        ok: false,
        error: formatError(statusId, desc, res.status),
        retriable: isRetriableHttp(res.status, statusId),
        provider: "inforu",
        requestId,
      };
    }

    // 2xx — Inforu returns StatusId (v2 JSON) or Status (legacy field name).
    // 1 = success; negative values are documented errors.
    const statusId = readStatusId(json);
    if (statusId === 1) {
      // Message-id field name varies by endpoint. Common shapes:
      //   { Data: { BulkId: "..." } }            // bulk send
      //   { Data: { MessageId: "..." } }         // single send
      //   { Data: [{ Phone, MessageId }] }       // per-recipient array
      const data = json?.Data as
        | { BulkId?: string | number; MessageId?: string | number }
        | Array<{ MessageId?: string | number }>
        | undefined;
      const messageId = extractMessageId(data);
      return { ok: true, providerMessageId: messageId, provider: "inforu", requestId };
    }

    const desc = readStatusDescription(json) ?? text.slice(0, 200);
    return {
      ok: false,
      error: formatError(statusId, desc, res.status),
      retriable: isRetriableInforuCode(statusId),
      provider: "inforu",
      requestId,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const aborted = msg.includes("aborted");
    return {
      ok: false,
      error: aborted ? "inforu_timeout" : `inforu_fetch_error: ${msg}`,
      retriable: true,
      provider: "inforu",
      requestId: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ---- helpers ----

function readStatusId(json: Record<string, unknown> | null): number | null {
  if (!json) return null;
  // v2 returns StatusId; older docs / endpoints may use Status — accept both.
  if (typeof json.StatusId === "number") return json.StatusId;
  if (typeof json.Status === "number") return json.Status;
  return null;
}

function readStatusDescription(json: Record<string, unknown> | null): string | null {
  if (!json) return null;
  if (typeof json.StatusDescription === "string") return json.StatusDescription;
  if (typeof json.DetailedDescription === "string" && json.DetailedDescription.length > 0) {
    return json.DetailedDescription as string;
  }
  return null;
}

function extractMessageId(
  data:
    | { BulkId?: string | number; MessageId?: string | number }
    | Array<{ MessageId?: string | number }>
    | undefined,
): string | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    if (first?.MessageId !== undefined) return String(first.MessageId);
    return null;
  }
  if (data.BulkId !== undefined) return String(data.BulkId);
  if (data.MessageId !== undefined) return String(data.MessageId);
  return null;
}

function formatError(statusId: number | null, desc: string, httpStatus: number): string {
  if (statusId !== null) {
    // Inforu's "Authentication failed or illegal IP address" path is a
    // common deployment-day surprise — surface it loudly so the operator
    // doesn't waste time on credentials when the issue is IP allowlisting.
    if (statusId === -2 && /illegal\s*IP/i.test(desc)) {
      return `inforu_status_-2: IP not allowlisted (or bad creds): ${desc}`;
    }
    return `inforu_status_${statusId}: ${desc}`;
  }
  return `inforu_http_${httpStatus}: ${desc}`;
}

// HTTP-level retry policy: 5xx retriable, 4xx not (auth or validation).
// The auth error from a missing IP allowlist is 401 → not retriable, which
// is correct (retrying won't help; operator must add the IP).
function isRetriableHttp(httpStatus: number, statusId: number | null): boolean {
  if (httpStatus >= 500) return true;
  // Some servers wrap StatusId errors in an HTTP 4xx; those should still be
  // classified by the body StatusId.
  if (statusId !== null) return isRetriableInforuCode(statusId);
  return false;
}

// Body-level retry policy. Conservative defaults — unknown codes are NOT
// retried to avoid runaway loops. Refine once we have real send data.
//
// Known v2 codes (from real-API probes):
//   -1  Authorization empty/missing       NON-RETRIABLE
//   -2  Auth failed OR IP not allowlisted NON-RETRIABLE (operator action needed)
// Suspected codes (carried over from XML-era Go adapter — verify when live):
//   -6  Recipients missing                NON-RETRIABLE (validation)
//   -9  Message text missing              NON-RETRIABLE (validation)
//   -13/-14/-15  Quota exceeded           NON-RETRIABLE (operator action)
//   -22 User blocked                      NON-RETRIABLE
function isRetriableInforuCode(statusId: number | null): boolean {
  // Conservative: nothing in the known map is retriable. We may discover
  // genuinely-transient codes (rate limit etc.) once we have live traffic
  // and add them here.
  return statusId !== null ? false : false;
}
