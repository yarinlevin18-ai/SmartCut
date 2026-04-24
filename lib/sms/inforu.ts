import "server-only";

// Inforu SMS adapter (Israeli business SMS provider).
// Docs: https://www.inforu.co.il/api  — we use the v2 JSON REST surface.
// Endpoint: POST https://api.inforu.co.il/api/v2/SMS/SendSms
// Auth: HTTP Basic with base64("<username>:<api-token>")
//
// Env vars (set in .env.local and on the deploy target):
//   INFORU_USERNAME  — account username
//   INFORU_API_TOKEN — API token from dashboard (NOT the account password)
//   INFORU_SENDER    — approved sender ID (display name on the SMS; e.g. "Carmelis")
//   INFORU_API_URL   — optional override (defaults to https://api.inforu.co.il/api/v2/SMS/SendSms)

export type SmsSendResult =
  | { ok: true; providerMessageId: string | null; provider: "inforu" }
  | { ok: false; error: string; retriable: boolean; provider: "inforu" };

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
  const apiUrl = process.env.INFORU_API_URL ?? "https://api.inforu.co.il/api/v2/SMS/SendSms";
  if (!username || !apiToken || !sender) {
    return { error: "INFORU_USERNAME / INFORU_API_TOKEN / INFORU_SENDER not set" };
  }
  return { username, apiToken, sender, apiUrl };
}

export async function sendInforuSms(recipientE164: string, body: string): Promise<SmsSendResult> {
  const env = loadEnv();
  if ("error" in env) {
    return { ok: false, error: env.error, retriable: false, provider: "inforu" };
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

    if (!res.ok) {
      // HTTP-level failure — retry 5xx, don't retry 4xx (bad request, bad auth)
      return {
        ok: false,
        error: `inforu_http_${res.status}: ${text.slice(0, 200)}`,
        retriable: res.status >= 500,
        provider: "inforu",
      };
    }

    // Inforu v2 returns { Status: 1 = success, or negative on error, StatusDescription: "...", Data: { BulkId } }
    const status = typeof json?.Status === "number" ? (json.Status as number) : null;
    if (status === 1) {
      const data = json?.Data as { BulkId?: string | number } | undefined;
      const bulkId = data?.BulkId !== undefined ? String(data.BulkId) : null;
      return { ok: true, providerMessageId: bulkId, provider: "inforu" };
    }

    const desc = typeof json?.StatusDescription === "string" ? json.StatusDescription : text.slice(0, 200);
    // Inforu status codes: -1/-2/-3 auth errors (non-retriable), -6/-7 rate/balance (retriable),
    // -10..-20 validation (non-retriable). Default to non-retriable for unknowns to avoid loops.
    const retriable = status === -6 || status === -7;
    return { ok: false, error: `inforu_status_${status}: ${desc}`, retriable, provider: "inforu" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const aborted = msg.includes("aborted");
    return {
      ok: false,
      error: aborted ? "inforu_timeout" : `inforu_fetch_error: ${msg}`,
      retriable: true,
      provider: "inforu",
    };
  } finally {
    clearTimeout(timeout);
  }
}
