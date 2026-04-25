import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "@/lib/rate-limit";

const MANAGE_PREFIX = "/booking/manage/";

// 30 req / 60s per IP on the public manage page. Comfortable for a real user
// (open page → click cancel → maybe reschedule → save → refresh) but cuts off
// scrapers and pathological clients.
const MANAGE_LIMIT = 30;
const MANAGE_WINDOW_MS = 60_000;

function clientIp(request: NextRequest): string {
  // Vercel sets request.ip; fall through to forwarded headers for self-hosted /
  // proxied deployments; finally use a literal so dev still works.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const direct = (request as unknown as { ip?: string }).ip;
  if (direct) return direct;

  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();

  const real = request.headers.get("x-real-ip");
  if (real) return real;

  return "unknown";
}

function rateLimited(request: NextRequest): NextResponse | null {
  const ip = clientIp(request);
  const result = rateLimit({
    scope: "booking_manage",
    key: ip,
    limit: MANAGE_LIMIT,
    windowMs: MANAGE_WINDOW_MS,
  });
  if (result.allowed) {
    const ok = NextResponse.next();
    ok.headers.set("x-ratelimit-limit", String(MANAGE_LIMIT));
    ok.headers.set("x-ratelimit-remaining", String(result.remaining));
    return ok;
  }
  return new NextResponse("Too many requests. Try again shortly.", {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfterSec),
      "x-ratelimit-limit": String(MANAGE_LIMIT),
      "x-ratelimit-remaining": "0",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public manage page: rate-limit only, no auth.
  if (pathname.startsWith(MANAGE_PREFIX)) {
    const limited = rateLimited(request);
    if (limited) return limited;
    return NextResponse.next();
  }

  // Admin paths below this line — original Supabase auth flow.

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>,
        ) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }: {
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }) => response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/booking/manage/:path*"],
};
