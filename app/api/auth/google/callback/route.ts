import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/gcal";
import { createServerAdmin } from "@/lib/supabase";

// GET /api/auth/google/callback?code=...&state=...
//
// Google redirects here after consent. Validates state cookie, exchanges
// the code for tokens, persists to oauth_tokens, redirects to /admin with
// a status flag.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToAdmin(status: "connected" | "error", reason?: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const url = new URL(`${base}/admin`);
  url.searchParams.set("gcal", status);
  if (reason) url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch {
    return redirectToAdmin("error", "unauthenticated");
  }

  const searchParams = new URL(req.url).searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    // user denied consent, etc.
    return redirectToAdmin("error", error);
  }
  if (!code || !state) {
    return redirectToAdmin("error", "missing_params");
  }

  // CSRF: state cookie must match the param.
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gcal_oauth_state")?.value;
  // Single-use — clear immediately regardless of outcome.
  cookieStore.delete("gcal_oauth_state");
  if (!expectedState || expectedState !== state) {
    return redirectToAdmin("error", "state_mismatch");
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    return redirectToAdmin("error", "exchange_failed");
  }

  // Upsert (one row per provider). Service role — anon never touches credentials.
  const admin = createServerAdmin();
  const { error: upsertErr } = await admin
    .from("oauth_tokens")
    .upsert(
      {
        provider: "google_calendar",
        account_email: tokens.email,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt,
        scope: tokens.scope,
        // calendar_id: defaults to 'primary' from migration 009.
      },
      { onConflict: "provider" },
    );

  if (upsertErr) {
    console.error("[gcal] upsert failed", upsertErr.message);
    return redirectToAdmin("error", "persist_failed");
  }

  return redirectToAdmin("connected");
}
