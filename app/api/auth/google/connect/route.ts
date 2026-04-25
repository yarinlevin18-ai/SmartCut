import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { buildAuthUrl } from "@/lib/gcal";

// GET /api/auth/google/connect
//
// Admin-only. Redirects the browser to Google's consent screen with a CSRF
// `state` token in a short-lived cookie that the callback must echo back.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const state = randomBytes(24).toString("hex");
  const url = buildAuthUrl(state);
  if (!url) {
    return NextResponse.json(
      { error: "google_oauth_not_configured" },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("gcal_oauth_state", state, {
    path: "/api/auth/google/callback",
    httpOnly: true,
    sameSite: "lax", // Google redirects back as a top-level navigation
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes — covers slow consent screens
  });

  return NextResponse.redirect(url);
}
