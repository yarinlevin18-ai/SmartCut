import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";

const ALLOWED_TAGS = new Set(["services", "gallery", "site_content"]);

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get("tag");
  if (!tag || !ALLOWED_TAGS.has(tag)) {
    return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
  }

  revalidateTag(tag);
  return NextResponse.json({ revalidated: tag });
}
