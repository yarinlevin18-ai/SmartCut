"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";
import { createClient, createAnonClient, createServerAdmin } from "./supabase";
import { requireAdmin } from "./auth";
import {
  createEventForBooking,
  updateEventForBooking,
  deleteEvent as gcalDeleteEvent,
  type BookingForGcal,
} from "./gcal";
import {
  enqueueBookingCancelled,
  enqueueBookingRescheduled,
  enqueueBookingPending,
  enqueueBookingApproved,
  enqueueBookingDenied,
  enqueueBookingAlternativeOffered,
} from "./notifications";
import type {
  Service,
  GalleryPhoto,
  Booking,
  BookingInput,
  BookingStatus,
  Product,
  ProductInput,
  ServerActionResult,
  AvailabilityConfigRow,
  BlockedDate,
  Notification,
  NotificationStatus,
} from "@/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const JERUSALEM_TZ = "Asia/Jerusalem";

// Israeli mobile prefixes are 05X — landlines (02/03/04/08/09) are not bookable
// targets here, so we deliberately reject them.
function normalizeIsraeliPhone(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s-]/g, "");
  let digits: string;
  if (cleaned.startsWith("+972")) {
    digits = cleaned.slice(4);
  } else if (cleaned.startsWith("972")) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("0")) {
    digits = cleaned.slice(1);
  } else {
    return null;
  }
  if (!/^\d{9}$/.test(digits)) return null;
  if (!digits.startsWith("5")) return null;
  return `+972${digits}`;
}

// ============================================================================
// SITE CONTENT
// ============================================================================

async function fetchSiteContent(
  key: string
): Promise<ServerActionResult<string | null>> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", key)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found (single() with no results)
      throw error;
    }

    return {
      success: true,
      data: data?.value || null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch site content";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export const getSiteContent = unstable_cache(
  fetchSiteContent,
  ["site_content"],
  { revalidate: 3600, tags: ["site_content"] }
);

export async function updateSiteContent(
  key: string,
  value: string
): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    // Service-role write — site_content has no anon/authenticated INSERT
    // policy in migration 001, only UPDATE/DELETE. First save of a key
    // (no existing row) is an INSERT under upsert semantics and gets
    // RLS-blocked when using the cookie-based SSR client. Same pattern as
    // createBooking. requireAdmin() above is the actual auth gate.
    const supabase = createServerAdmin();
    const { error } = await supabase.from("site_content").upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) throw error;

    revalidateTag("site_content");
    revalidatePath("/");
    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update site content";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// SERVICES
// ============================================================================

async function fetchServices(): Promise<ServerActionResult<Service[]>> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch services";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export const getServices = unstable_cache(
  fetchServices,
  ["services"],
  { revalidate: 3600, tags: ["services"] }
);

export async function getService(
  id: string
): Promise<ServerActionResult<Service | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return {
      success: true,
      data: data || null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch service";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function createService(
  service: Omit<Service, "id" | "created_at">
): Promise<ServerActionResult<Service>> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .insert([{ ...service, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;

    revalidateTag("services");
    revalidatePath("/");
    revalidatePath("/services");
    return {
      success: true,
      data: data!,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create service";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function updateService(
  id: string,
  service: Partial<Omit<Service, "id" | "created_at">>
): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("services")
      .update(service)
      .eq("id", id);

    if (error) throw error;

    revalidateTag("services");
    revalidatePath("/");
    revalidatePath("/services");
    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update service";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function deleteService(id: string): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("services").delete().eq("id", id);

    if (error) throw error;

    revalidateTag("services");
    revalidatePath("/");
    revalidatePath("/services");
    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete service";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// GALLERY
// ============================================================================

async function fetchGallery(): Promise<ServerActionResult<GalleryPhoto[]>> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw error;

    const photos: GalleryPhoto[] =
      data?.map((item) => {
        const urlData = supabase.storage
          .from("gallery")
          .getPublicUrl(item.storage_path);
        const photo: GalleryPhoto = {
          id: item.id,
          storage_path: item.storage_path,
          caption: item.caption || "",
          display_order: item.display_order,
          created_at: item.created_at,
          public_url: urlData.data?.publicUrl || "",
        };
        return photo;
      }) || [];

    return {
      success: true,
      data: photos,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch gallery";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export const getGallery = unstable_cache(
  fetchGallery,
  ["gallery"],
  { revalidate: 3600, tags: ["gallery"] }
);

export async function addGalleryItem(
  storagePath: string,
  caption?: string
): Promise<ServerActionResult<GalleryPhoto>> {
  try {
    await requireAdmin();

    // Use service role for database operations (bypasses RLS that requires auth)
    const supabase = createServerAdmin();

    // Get max display_order
    const { data: maxData, error: orderError } = await supabase
      .from("gallery")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1);

    if (orderError) {
      console.error(`[Gallery] Failed to get max display order:`, orderError);
      throw orderError;
    }

    const nextOrder = ((maxData?.[0]?.display_order) || 0) + 1;

    // Insert gallery item
    const { data, error } = await supabase
      .from("gallery")
      .insert([
        {
          storage_path: storagePath,
          caption,
          display_order: nextOrder,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(`[Gallery] Database insert failed:`, error);
      throw error;
    }

    const photo: GalleryPhoto = {
      ...data,
      public_url: supabase.storage
        .from("gallery")
        .getPublicUrl(storagePath).data.publicUrl,
    };

    revalidateTag("gallery");
    revalidatePath("/");
    revalidatePath("/gallery");

    return {
      success: true,
      data: photo,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add gallery item";
    console.error(`[Gallery] addGalleryItem failed:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function deleteGalleryItem(
  id: string
): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // Fetch the item to get storage_path
    const { data: item, error: fetchError } = await supabase
      .from("gallery")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    // Delete from storage if file exists
    if (item?.storage_path) {
      await supabase.storage.from("gallery").remove([item.storage_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("gallery")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    revalidateTag("gallery");
    revalidatePath("/");
    revalidatePath("/gallery");
    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to delete gallery item";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function updateGalleryCaption(
  id: string,
  caption: string
): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("gallery")
      .update({ caption })
      .eq("id", id);

    if (error) throw error;

    revalidateTag("gallery");
    revalidatePath("/");
    revalidatePath("/gallery");
    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update caption";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function uploadGalleryPhoto(
  base64Data: string,
  fileName: string,
  contentType: string
): Promise<ServerActionResult<{ storagePath: string; publicUrl: string }>> {
  try {
    await requireAdmin();
    // Use service role key for storage operations (requires elevated permissions)
    const supabase = createServerAdmin();
    const filename = `${Date.now()}-${fileName}`;

    // Convert Base64 to Buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Upload to storage with elevated permissions
    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(filename, buffer, {
        contentType: contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[Gallery] Storage upload failed:`, uploadError);
      throw uploadError;
    }

    // Get public URL using anon client (safe for client-side use)
    const anonSupabase = await createClient();
    const { data } = anonSupabase.storage.from("gallery").getPublicUrl(filename);

    return {
      success: true,
      data: {
        storagePath: filename,
        publicUrl: data.publicUrl,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload photo";
    console.error(`[Gallery] uploadGalleryPhoto failed:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// BOOKINGS
// ============================================================================

export async function getAvailableSlots(
  serviceId: string,
  date: string
): Promise<ServerActionResult<string[]>> {
  if (!UUID_RE.test(serviceId)) {
    return { success: false, error: "Invalid service id" };
  }
  if (!DATE_RE.test(date)) {
    return { success: false, error: "Invalid date format" };
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_service_id: serviceId,
    p_date: date,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const rows = (data ?? []) as Array<{ slot_start: string } | string>;
  const slots = rows.map((r) =>
    typeof r === "string" ? r : r.slot_start
  );
  return { success: true, data: slots };
}

export async function createBooking(
  input: BookingInput
): Promise<ServerActionResult<Booking>> {
  if (!input.full_name || !input.full_name.trim()) {
    return { success: false, error: "Missing full name" };
  }
  if (!input.phone) {
    return { success: false, error: "Missing phone" };
  }
  if (!UUID_RE.test(input.service_id)) {
    return { success: false, error: "Invalid service id" };
  }
  const slotStartDate = new Date(input.slot_start);
  if (Number.isNaN(slotStartDate.getTime())) {
    return { success: false, error: "Invalid slot_start" };
  }
  const phone = normalizeIsraeliPhone(input.phone);
  if (!phone) {
    return { success: false, error: "Invalid phone" };
  }

  // This server action runs on the server (not in the browser). The user-facing
  // "anon" RLS distinction is moot — the request reaches Postgres from our
  // Node process, not from the browser. Use service-role for the write so:
  //   1. The INSERT is not blocked by SSR-cookie / role weirdness
  //      (the bookings_anon_insert WITH CHECK was failing for logged-out
  //      visitors because the SSR client wasn't asserting role='anon').
  //   2. The .select() after insert can read back the row (anon has no
  //      SELECT policy, would have returned empty).
  // App-level validation above (UUID, phone format, slot timing) plus the
  // bookings_no_overlap GIST exclusion + bookings_status_chk CHECK are the
  // real gates against bad data. RLS would only have caught role.
  const supabase = createServerAdmin();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("duration_minutes,name")
    .eq("id", input.service_id)
    .single();

  if (serviceError) {
    return { success: false, error: serviceError.message };
  }
  const duration = service?.duration_minutes;
  if (typeof duration !== "number" || duration <= 0) {
    return { success: false, error: "Service has no duration" };
  }
  const serviceName = typeof service?.name === "string" ? service.name : "";

  const slotEndDate = new Date(slotStartDate.getTime() + duration * 60_000);
  const slotStartIso = slotStartDate.toISOString();
  const slotEndIso = slotEndDate.toISOString();

  const preferred_date = formatInTimeZone(
    slotStartDate,
    JERUSALEM_TZ,
    "yyyy-MM-dd"
  );
  const preferred_time = formatInTimeZone(
    slotStartDate,
    JERUSALEM_TZ,
    "HH:mm"
  );

  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        full_name: input.full_name.trim(),
        phone,
        email: input.email && input.email.trim() ? input.email.trim() : null,
        service_id: input.service_id,
        slot_start: slotStartIso,
        slot_end: slotEndIso,
        // Phase 5: bookings arrive as pending and require admin approval.
        // The 24h-reminder is enqueued only on approval (see approveBooking),
        // so a denied/rescheduled booking never sends a stale reminder.
        status: "pending",
        barber_id: null,
        preferred_date,
        preferred_time,
        notes: input.notes ?? null,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === "23P01") {
      return { success: false, error: "SLOT_TAKEN" };
    }
    if (error.code === "23514") {
      return { success: false, error: "SLOT_IN_PAST" };
    }
    return { success: false, error: error.message };
  }

  const booking = data as Booking;

  // Fire-and-forget: never block booking success on the notifications pipeline.
  await enqueueBookingPending({
    booking_id: booking.id,
    customer_name: booking.full_name,
    phone,
    slot_start: slotStartIso,
    slot_end: slotEndIso,
    service_name: serviceName,
    duration_minutes: duration,
    manage_token: booking.manage_token,
  });

  revalidatePath("/admin/bookings");
  return { success: true, data: booking };
}

export async function getBookings(): Promise<ServerActionResult<Booking[]>> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    // Alias the embedded service to `service` (singular) so it matches the
    // Booking type. PostgREST's default key is the table name `services`, but
    // every consumer in the app reads `booking.service?.name` — without the
    // alias the field is silently undefined and the service line never
    // renders in the calendar chip / pending requests / today schedule.
    const { data, error } = await supabase
      .from("bookings")
      .select("*, service:services(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch bookings";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Aggregate the bookings table into per-customer rows, dedup'd by phone.
 *
 * Phone is the only stable identifier — names get typo'd and emails are
 * frequently blank. We normalise to digits-only with a leading '+' (where
 * present) so "052-455-0069", "0524550069", and "+972-52-455-00-69" all
 * collapse to the same person.
 *
 * Cancelled and denied bookings still count toward `total_visits` (the
 * customer DID try to book) but NOT toward `completed_visits` or
 * `total_spend` — those measure actual revenue / chair time.
 *
 * Sorted by most-recent activity descending so the customers a barber is
 * most likely to look up — recent visitors — surface to the top.
 */
export async function getCustomers(): Promise<ServerActionResult<import("@/types").Customer[]>> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*, service:services(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as Booking[];

    // Normalise phone: strip everything except digits and a leading '+'.
    // Empty / unparseable phones get bucketed under "(no phone)" so they
    // don't all collide as the empty-string key.
    const phoneKey = (raw: string | null | undefined): string => {
      const s = (raw ?? "").trim();
      if (!s) return "(no-phone)";
      const plus = s.startsWith("+") ? "+" : "";
      const digits = s.replace(/\D/g, "");
      if (!digits) return "(no-phone)";
      return `${plus}${digits}`;
    };

    type Customer = import("@/types").Customer;
    const map = new Map<string, Customer>();

    for (const b of rows) {
      const key = phoneKey(b.phone);
      const existing = map.get(key);
      const slotOrCreated = b.slot_start ?? b.created_at;
      const isRevenueBooking =
        b.status === "confirmed" || b.status === "completed";
      const price = isRevenueBooking
        ? Number((b.service as { price?: number } | undefined)?.price ?? 0) || 0
        : 0;

      if (!existing) {
        map.set(key, {
          phone_key: key,
          // First booking we encounter is the newest (rows sorted DESC), so
          // it's the most-recent name and email — exactly what the UI wants.
          name: (b.full_name || "").trim() || "—",
          phone: b.phone || "",
          email: b.email ?? null,
          total_visits: 1,
          completed_visits: b.status === "completed" ? 1 : 0,
          last_visit: slotOrCreated,
          total_spend: price,
          services: b.service?.name ? [b.service.name] : [],
          bookings: [b],
        });
        continue;
      }

      existing.total_visits += 1;
      if (b.status === "completed") existing.completed_visits += 1;
      existing.total_spend += price;
      // Pull email forward if we got one on a later booking and didn't have
      // one before — partial info merges instead of stomping.
      if (!existing.email && b.email) existing.email = b.email;
      if (b.service?.name && !existing.services.includes(b.service.name)) {
        existing.services.push(b.service.name);
      }
      // last_visit is the max of slot_start (preferred) or created_at.
      if (
        slotOrCreated &&
        (!existing.last_visit ||
          new Date(slotOrCreated).getTime() >
            new Date(existing.last_visit).getTime())
      ) {
        existing.last_visit = slotOrCreated;
      }
      existing.bookings.push(b);
    }

    const customers = Array.from(map.values()).sort((a, b) => {
      const at = a.last_visit ? new Date(a.last_visit).getTime() : 0;
      const bt = b.last_visit ? new Date(b.last_visit).getTime() : 0;
      return bt - at;
    });

    return { success: true, data: customers };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load customers",
    };
  }
}

/**
 * Soft-cancel a booking. Sets status='cancelled' (which removes it from the
 * overlap exclusion), enqueues a cancellation notice, and marks any pending
 * reminder as 'skipped'. Preserves audit trail — use purgeBooking for true delete.
 */
export async function cancelBooking(id: string): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(id)) return { success: false, error: "Invalid booking id" };
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .neq("status", "cancelled")
      .select("id, full_name, phone, slot_start, slot_end, service_id, manage_token, gcal_event_id, services(name, duration_minutes)")
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: "Booking not found or already cancelled" };

    const svc = Array.isArray(data.services) ? data.services[0] : data.services;
    if (data.slot_start && data.slot_end && data.phone) {
      await enqueueBookingCancelled({
        booking_id: data.id,
        customer_name: data.full_name,
        phone: data.phone,
        slot_start: data.slot_start,
        slot_end: data.slot_end,
        service_name: (svc?.name as string | undefined) ?? "",
        duration_minutes: (svc?.duration_minutes as number | undefined) ?? 0,
        manage_token: data.manage_token as string,
      });
    }

    // Phase 7: remove the corresponding Google Calendar event.
    if (data.gcal_event_id) {
      const removed = await gcalDeleteEvent(data.gcal_event_id as string);
      if (removed) {
        await supabase.from("bookings").update({ gcal_event_id: null }).eq("id", data.id);
      }
    }

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to cancel booking";
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// PHASE 5 — APPROVAL WORKFLOW (admin actions)
// ============================================================================

/**
 * Admin approves a pending booking: status pending → confirmed.
 * Enqueues the approval SMS + 24h reminder. The GIST exclusion catches
 * any concurrent collision (another pending booking that grabbed the slot
 * first and got approved before us) — surfaced as SLOT_TAKEN.
 */
export async function approveBooking(id: string): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(id)) return { success: false, error: "Invalid booking id" };
    const supabase = createServerAdmin();

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "confirmed", alt_offered_at: null })
      .eq("id", id)
      .eq("status", "pending")
      .select(
        "id, full_name, phone, slot_start, slot_end, service_id, manage_token, services(name, duration_minutes)",
      )
      .single();

    if (error) {
      if (error.code === "23P01") return { success: false, error: "SLOT_TAKEN" };
      return { success: false, error: error.message };
    }
    if (!data) return { success: false, error: "Booking not pending or not found" };

    const svc = Array.isArray(data.services) ? data.services[0] : data.services;
    if (data.slot_start && data.slot_end && data.phone) {
      await enqueueBookingApproved({
        booking_id: data.id,
        customer_name: data.full_name,
        phone: data.phone,
        slot_start: data.slot_start,
        slot_end: data.slot_end,
        service_name: (svc?.name as string | undefined) ?? "",
        duration_minutes: (svc?.duration_minutes as number | undefined) ?? 0,
        manage_token: data.manage_token as string,
      });

      // Phase 7: mirror to Google Calendar (fire-and-forget; never blocks).
      const gcalCtx: BookingForGcal = {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        notes: null,
        slot_start: data.slot_start,
        slot_end: data.slot_end,
        service_name: (svc?.name as string | undefined) ?? "",
        manage_token: data.manage_token as string,
      };
      const eventId = await createEventForBooking(gcalCtx);
      if (eventId) {
        await supabase.from("bookings").update({ gcal_event_id: eventId }).eq("id", data.id);
      }
    }

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to approve" };
  }
}

export type DenyMode =
  | { mode: "reject" }
  | { mode: "alternative"; new_slot_start: string };

/**
 * Admin denies a pending booking. Two modes:
 *  - reject: status pending → denied, single denial SMS.
 *  - alternative: keep status='pending' but rewrite slot_start/slot_end + set
 *    alt_offered_at = now(). SMS to customer with the new slot details and
 *    a manage URL that opens the customer-confirm UI.
 *
 * Both modes skip any queued booking_pending ack (the customer is about to
 * receive a more specific message).
 */
export async function denyBooking(
  id: string,
  options: DenyMode,
): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(id)) return { success: false, error: "Invalid booking id" };
    const supabase = createServerAdmin();

    if (options.mode === "reject") {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "denied", alt_offered_at: null })
        .eq("id", id)
        .eq("status", "pending")
        .select(
          "id, full_name, phone, slot_start, slot_end, service_id, manage_token, services(name, duration_minutes)",
        )
        .single();

      if (error) return { success: false, error: error.message };
      if (!data) return { success: false, error: "Booking not pending or not found" };

      const svc = Array.isArray(data.services) ? data.services[0] : data.services;
      if (data.slot_start && data.slot_end && data.phone) {
        await enqueueBookingDenied({
          booking_id: data.id,
          customer_name: data.full_name,
          phone: data.phone,
          slot_start: data.slot_start,
          slot_end: data.slot_end,
          service_name: (svc?.name as string | undefined) ?? "",
          duration_minutes: (svc?.duration_minutes as number | undefined) ?? 0,
          manage_token: data.manage_token as string,
        });
      }

      revalidatePath("/admin/bookings");
      revalidatePath("/admin/notifications");
      return { success: true };
    }

    // mode === "alternative"
    const newSlotStart = new Date(options.new_slot_start);
    if (Number.isNaN(newSlotStart.getTime())) {
      return { success: false, error: "Invalid new_slot_start" };
    }
    if (newSlotStart.getTime() - Date.now() < 24 * 3600_000) {
      return { success: false, error: "NEW_SLOT_TOO_SOON" };
    }
    // 15-minute grid alignment.
    if (newSlotStart.getTime() % (15 * 60_000) !== 0) {
      return { success: false, error: "INVALID_SLOT" };
    }

    // Need service.duration to compute new_slot_end.
    const cur = await supabase
      .from("bookings")
      .select("id, status, service_id, full_name, phone, manage_token, services(name, duration_minutes)")
      .eq("id", id)
      .single();
    if (cur.error || !cur.data) return { success: false, error: cur.error?.message ?? "Not found" };
    if (cur.data.status !== "pending") {
      return { success: false, error: "Booking not pending" };
    }
    const svc = Array.isArray(cur.data.services) ? cur.data.services[0] : cur.data.services;
    const duration = (svc?.duration_minutes as number | undefined) ?? 0;
    if (!duration) return { success: false, error: "Service has no duration" };
    const newSlotEnd = new Date(newSlotStart.getTime() + duration * 60_000);

    // Atomic mutation. The GIST exclusion will catch a slot that's been taken
    // by another booking since the admin opened the modal.
    const upd = await supabase
      .from("bookings")
      .update({
        slot_start: newSlotStart.toISOString(),
        slot_end: newSlotEnd.toISOString(),
        alt_offered_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");
    if (upd.error) {
      if (upd.error.code === "23P01") return { success: false, error: "SLOT_TAKEN" };
      return { success: false, error: upd.error.message };
    }

    if (cur.data.phone) {
      await enqueueBookingAlternativeOffered({
        booking_id: cur.data.id,
        customer_name: cur.data.full_name,
        phone: cur.data.phone,
        slot_start: newSlotStart.toISOString(),
        slot_end: newSlotEnd.toISOString(),
        service_name: (svc?.name as string | undefined) ?? "",
        duration_minutes: duration,
        manage_token: cur.data.manage_token as string,
      });
    }

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to deny" };
  }
}

/**
 * @deprecated use cancelBooking. Kept as an alias so existing callers keep
 * working during the transition; the action now soft-cancels instead of deleting.
 */
export async function deleteBooking(id: string): Promise<ServerActionResult> {
  return cancelBooking(id);
}

// ============================================================================
// SELF-SERVICE CANCEL (public, token-gated)
// See: docs/adr/0003-self-service-cancel.md
// ============================================================================

export type ManageBookingView = {
  booking_id: string;
  full_name: string;
  phone: string;
  slot_start: string | null;
  slot_end: string | null;
  service_id: string | null;
  service_name: string | null;
  status: BookingStatus;
  /** Set when admin offered an alternative slot for a pending booking. */
  alt_offered_at: string | null;
};

export type CancelByTokenStatus =
  | "ok"
  | "not_found"
  | "already_cancelled"
  | "too_late"
  | "slot_in_past";

/** Read booking details by opaque manage token. Returns null when token unknown. */
export async function getBookingByToken(
  token: string
): Promise<ManageBookingView | null> {
  if (!UUID_RE.test(token)) return null;
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .rpc("get_booking_by_token", { p_token: token })
    .maybeSingle();
  if (error || !data) return null;
  return data as ManageBookingView;
}

/**
 * Cancel a booking via the public manage link. Calls cancel_booking_by_token RPC
 * (SECURITY DEFINER, bypasses RLS for anon, enforces 24h cutoff in SQL). On 'ok',
 * fires the cancellation SMS via the existing enqueue helper.
 */
export async function cancelBookingByToken(
  token: string
): Promise<{ status: CancelByTokenStatus; slot_start: string | null }> {
  if (!UUID_RE.test(token)) return { status: "not_found", slot_start: null };

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .rpc("cancel_booking_by_token", { p_token: token })
    .maybeSingle();

  if (error || !data) return { status: "not_found", slot_start: null };

  const result = data as {
    status: CancelByTokenStatus;
    booking_id: string | null;
    slot_start: string | null;
    slot_end: string | null;
    service_id: string | null;
    full_name: string | null;
    phone: string | null;
  };

  if (result.status === "ok" && result.booking_id && result.slot_start && result.slot_end && result.phone) {
    // Fetch service name + duration for the SMS payload (RPC didn't return them).
    const admin = createServerAdmin();
    const { data: svc } = result.service_id
      ? await admin
          .from("services")
          .select("name, duration_minutes")
          .eq("id", result.service_id)
          .maybeSingle()
      : { data: null as { name: string; duration_minutes: number } | null };

    await enqueueBookingCancelled({
      booking_id: result.booking_id,
      customer_name: result.full_name ?? "",
      phone: result.phone,
      slot_start: result.slot_start,
      slot_end: result.slot_end,
      service_name: svc?.name ?? "",
      duration_minutes: svc?.duration_minutes ?? 0,
      manage_token: token,
    });

    // Phase 7: remove the Google Calendar event if there was one.
    const { data: row } = await admin
      .from("bookings")
      .select("gcal_event_id")
      .eq("id", result.booking_id)
      .maybeSingle();
    if (row?.gcal_event_id) {
      const removed = await gcalDeleteEvent(row.gcal_event_id as string);
      if (removed) {
        await admin.from("bookings").update({ gcal_event_id: null }).eq("id", result.booking_id);
      }
    }

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/notifications");
  }

  return { status: result.status, slot_start: result.slot_start };
}

export type RescheduleByTokenStatus =
  | "ok"
  | "not_found"
  | "already_cancelled"
  | "slot_in_past"
  | "too_late"
  | "new_slot_in_past"
  | "new_slot_too_soon"
  | "invalid_slot"
  | "slot_unavailable";

/**
 * Reschedule a booking via the public manage link. Calls reschedule_booking_by_token
 * RPC (SECURITY DEFINER, bypasses RLS for anon, enforces 24h cutoff in SQL on both
 * old and new slots, GIST exclusion catches overlaps). On 'ok', skips the queued
 * old reminder and enqueues a fresh booking_rescheduled SMS + new reminder.
 */
export async function rescheduleBookingByToken(
  token: string,
  newSlotStartIso: string
): Promise<{
  status: RescheduleByTokenStatus;
  new_slot_start: string | null;
  new_slot_end: string | null;
}> {
  if (!UUID_RE.test(token)) {
    return { status: "not_found", new_slot_start: null, new_slot_end: null };
  }
  // Cheap client-side sanity check; the RPC validates authoritatively.
  const parsed = new Date(newSlotStartIso);
  if (Number.isNaN(parsed.getTime())) {
    return { status: "invalid_slot", new_slot_start: null, new_slot_end: null };
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .rpc("reschedule_booking_by_token", {
      p_token: token,
      p_new_slot_start: newSlotStartIso,
    })
    .maybeSingle();

  if (error || !data) {
    return { status: "not_found", new_slot_start: null, new_slot_end: null };
  }

  const result = data as {
    status: RescheduleByTokenStatus;
    booking_id: string | null;
    old_slot_start: string | null;
    new_slot_start: string | null;
    new_slot_end: string | null;
    service_id: string | null;
    full_name: string | null;
    phone: string | null;
  };

  if (
    result.status === "ok" &&
    result.booking_id &&
    result.new_slot_start &&
    result.new_slot_end &&
    result.phone
  ) {
    const admin = createServerAdmin();
    const { data: svc } = result.service_id
      ? await admin
          .from("services")
          .select("name, duration_minutes")
          .eq("id", result.service_id)
          .maybeSingle()
      : { data: null as { name: string; duration_minutes: number } | null };

    await enqueueBookingRescheduled({
      booking_id: result.booking_id,
      customer_name: result.full_name ?? "",
      phone: result.phone,
      slot_start: result.new_slot_start,
      slot_end: result.new_slot_end,
      service_name: svc?.name ?? "",
      duration_minutes: svc?.duration_minutes ?? 0,
      manage_token: token,
    });

    // Phase 7: update the existing Google Calendar event (if any) to the
    // new slot. If the booking has no event yet (e.g. legacy or integration
    // wasn't connected at approval), create one now.
    const { data: row } = await admin
      .from("bookings")
      .select("gcal_event_id")
      .eq("id", result.booking_id)
      .maybeSingle();
    const gcalCtx: BookingForGcal = {
      id: result.booking_id,
      full_name: result.full_name ?? "",
      phone: result.phone,
      notes: null,
      slot_start: result.new_slot_start,
      slot_end: result.new_slot_end,
      service_name: svc?.name ?? "",
      manage_token: token,
    };
    if (row?.gcal_event_id) {
      await updateEventForBooking(row.gcal_event_id as string, gcalCtx);
    } else {
      const eventId = await createEventForBooking(gcalCtx);
      if (eventId) {
        await admin.from("bookings").update({ gcal_event_id: eventId }).eq("id", result.booking_id);
      }
    }

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/notifications");
  }

  return {
    status: result.status,
    new_slot_start: result.new_slot_start,
    new_slot_end: result.new_slot_end,
  };
}

export type ConfirmAlternativeStatus =
  | "ok"
  | "not_found"
  | "not_pending"
  | "slot_in_past"
  | "too_late"
  | "slot_unavailable";

/**
 * Customer-facing accept/cancel of an admin-suggested alternative slot.
 * Calls customer_confirm_alternative_by_token RPC. On 'ok' + accept,
 * enqueues booking_approved (with reminder). On 'ok' + cancel, enqueues
 * booking_cancelled.
 */
export async function customerConfirmAlternativeByToken(
  token: string,
  decision: "accept" | "cancel",
): Promise<{ status: ConfirmAlternativeStatus }> {
  if (!UUID_RE.test(token)) return { status: "not_found" };
  if (decision !== "accept" && decision !== "cancel") {
    return { status: "not_pending" };
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .rpc("customer_confirm_alternative_by_token", {
      p_token: token,
      p_decision: decision,
    })
    .maybeSingle();

  if (error || !data) return { status: "not_found" };

  const result = data as {
    status: ConfirmAlternativeStatus;
    booking_id: string | null;
    slot_start: string | null;
    slot_end: string | null;
    service_id: string | null;
    full_name: string | null;
    phone: string | null;
  };

  if (
    result.status === "ok" &&
    result.booking_id &&
    result.slot_start &&
    result.slot_end &&
    result.phone
  ) {
    const admin = createServerAdmin();
    const { data: svc } = result.service_id
      ? await admin
          .from("services")
          .select("name, duration_minutes")
          .eq("id", result.service_id)
          .maybeSingle()
      : { data: null as { name: string; duration_minutes: number } | null };

    const ctx = {
      booking_id: result.booking_id,
      customer_name: result.full_name ?? "",
      phone: result.phone,
      slot_start: result.slot_start,
      slot_end: result.slot_end,
      service_name: svc?.name ?? "",
      duration_minutes: svc?.duration_minutes ?? 0,
      manage_token: token,
    };

    if (decision === "accept") {
      await enqueueBookingApproved(ctx);
      // Phase 7: alternative-offered bookings have status=pending so they
      // never had a gcal event yet. Create one now that the customer accepted.
      const gcalCtx: BookingForGcal = {
        id: result.booking_id,
        full_name: result.full_name ?? "",
        phone: result.phone,
        notes: null,
        slot_start: result.slot_start,
        slot_end: result.slot_end,
        service_name: svc?.name ?? "",
        manage_token: token,
      };
      const eventId = await createEventForBooking(gcalCtx);
      if (eventId) {
        await admin.from("bookings").update({ gcal_event_id: eventId }).eq("id", result.booking_id);
      }
    } else {
      await enqueueBookingCancelled(ctx);
      // No gcal event to delete (alt-offered never created one), but be
      // defensive in case the row had one from a previous accept that got
      // un-done somehow.
      const { data: row } = await admin
        .from("bookings")
        .select("gcal_event_id")
        .eq("id", result.booking_id)
        .maybeSingle();
      if (row?.gcal_event_id) {
        const removed = await gcalDeleteEvent(row.gcal_event_id as string);
        if (removed) {
          await admin.from("bookings").update({ gcal_event_id: null }).eq("id", result.booking_id);
        }
      }
    }

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/notifications");
  }

  return { status: result.status };
}

// ============================================================================
// PHASE 6 — PRODUCTS (retail catalogue)
// ============================================================================

/**
 * Public read. Returns ACTIVE products only by default; pass activeOnly=false
 * (admin only) to get the full catalogue.
 */
export async function getProducts(
  activeOnly = true,
): Promise<ServerActionResult<Product[]>> {
  try {
    const supabase = createAnonClient();
    let q = supabase
      .from("products")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return { success: true, data: (data ?? []) as Product[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch products",
    };
  }
}

/** Admin variant — returns all products including inactive. */
export async function getProductsAdmin(): Promise<ServerActionResult<Product[]>> {
  try {
    await requireAdmin();
    const supabase = createServerAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { success: true, data: (data ?? []) as Product[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch products",
    };
  }
}

export async function createProduct(
  input: ProductInput,
): Promise<ServerActionResult<Product>> {
  try {
    await requireAdmin();
    const name = input.name?.trim();
    if (!name) return { success: false, error: "Missing name" };
    if (input.price !== null && input.price !== undefined && input.price < 0) {
      return { success: false, error: "Invalid price" };
    }

    const supabase = createServerAdmin();

    // Append to end of catalogue.
    const { data: maxRow } = await supabase
      .from("products")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.display_order ?? 0) + 1;

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          description: input.description?.trim() || null,
          price: input.price ?? null,
          image_url: input.image_url ?? null,
          is_active: input.is_active ?? true,
          display_order: nextOrder,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    revalidateTag("products");
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin/products");

    return { success: true, data: data as Product };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create product",
    };
  }
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<ServerActionResult<Product>> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(id)) return { success: false, error: "Invalid id" };

    const supabase = createServerAdmin();
    const patch: Record<string, unknown> = {};
    if (typeof input.name === "string") patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.price !== undefined) patch.price = input.price;
    if (input.image_url !== undefined) patch.image_url = input.image_url;
    if (typeof input.is_active === "boolean") patch.is_active = input.is_active;

    if (Object.keys(patch).length === 0) {
      return { success: false, error: "No fields to update" };
    }

    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidateTag("products");
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin/products");

    return { success: true, data: data as Product };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update product",
    };
  }
}

export async function deleteProduct(id: string): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(id)) return { success: false, error: "Invalid id" };
    const supabase = createServerAdmin();

    // Best-effort: also clean up the image from storage if it's in our bucket.
    const { data: row } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();
    if (row?.image_url) {
      // image_url may be a full public URL; extract the storage path.
      const path = extractProductsBucketPath(row.image_url);
      if (path) {
        await supabase.storage.from("products").remove([path]);
      }
    }

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;

    revalidateTag("products");
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete product",
    };
  }
}

/**
 * Move a product up or down in the display_order. Direction +1 = down (later),
 * -1 = up (earlier). Swaps with the adjacent product so order stays compact.
 */
export async function reorderProduct(
  id: string,
  direction: 1 | -1,
): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(id)) return { success: false, error: "Invalid id" };
    const supabase = createServerAdmin();

    const { data: cur } = await supabase
      .from("products")
      .select("id, display_order")
      .eq("id", id)
      .maybeSingle();
    if (!cur) return { success: false, error: "Not found" };

    // Find the adjacent product to swap with.
    const cmp = direction === 1 ? "gt" : "lt";
    const order: "asc" | "desc" = direction === 1 ? "asc" : "desc";
    const { data: neighbour } = await supabase
      .from("products")
      .select("id, display_order")
      [cmp]("display_order", cur.display_order)
      .order("display_order", { ascending: order === "asc" })
      .limit(1)
      .maybeSingle();

    if (!neighbour) {
      // Already at the edge.
      return { success: true };
    }

    // Swap. Two updates aren't atomic but for a single-admin tool that's fine.
    await supabase.from("products").update({ display_order: neighbour.display_order }).eq("id", cur.id);
    await supabase.from("products").update({ display_order: cur.display_order }).eq("id", neighbour.id);

    revalidateTag("products");
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reorder",
    };
  }
}

/**
 * Upload a product image to the 'products' storage bucket. Returns the public URL
 * for the caller to put into product.image_url.
 *
 * Caller passes Base64-encoded bytes (matches the gallery upload pattern).
 */
export async function uploadProductImage(
  base64Data: string,
  fileName: string,
  contentType: string,
): Promise<ServerActionResult<{ storagePath: string; publicUrl: string }>> {
  try {
    await requireAdmin();
    if (!base64Data) return { success: false, error: "Missing data" };

    const supabase = createServerAdmin();
    const filename = `${Date.now()}-${fileName}`;
    const buffer = Buffer.from(base64Data, "base64");

    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(filename, buffer, { contentType, upsert: false });

    if (uploadError) {
      console.error("[Products] Upload failed:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from("products").getPublicUrl(filename);

    return {
      success: true,
      data: { storagePath: filename, publicUrl: data.publicUrl },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to upload";
    console.error("[Products] uploadProductImage failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/** Extract storage path from a full Supabase public URL like
 *  https://<project>.supabase.co/storage/v1/object/public/products/<path>
 *  Returns null if the URL isn't a products-bucket URL we own. */
function extractProductsBucketPath(url: string): string | null {
  const match = /\/storage\/v1\/object\/public\/products\/(.+)$/.exec(url);
  return match?.[1] ?? null;
}

// ============================================================================
// AVAILABILITY (weekly schedule + blocked dates)
// ============================================================================

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeTime(value: string): string {
  // Accept "HH:MM" or "HH:MM:SS" from Postgres time columns and normalize to "HH:MM".
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : value;
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export async function getAvailabilityConfig(): Promise<
  ServerActionResult<AvailabilityConfigRow[]>
> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("availability_config")
      .select("*")
      .is("barber_id", null)
      .order("weekday", { ascending: true });

    if (error) throw error;

    const rows: AvailabilityConfigRow[] = (data || []).map((r) => ({
      id: r.id,
      barber_id: r.barber_id,
      weekday: r.weekday as AvailabilityConfigRow["weekday"],
      open_time: normalizeTime(r.open_time),
      close_time: normalizeTime(r.close_time),
      break_start: r.break_start ? normalizeTime(r.break_start) : null,
      break_end: r.break_end ? normalizeTime(r.break_end) : null,
      is_closed: r.is_closed,
    }));

    return { success: true, data: rows };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch availability config";
    return { success: false, error: errorMessage };
  }
}

export async function updateAvailabilityConfig(
  rows: AvailabilityConfigRow[]
): Promise<ServerActionResult<AvailabilityConfigRow[]>> {
  try {
    await requireAdmin();

    if (!Array.isArray(rows) || rows.length !== 7) {
      return { success: false, error: "Expected 7 weekday rows" };
    }

    const seenWeekdays = new Set<number>();
    for (const row of rows) {
      if (
        typeof row.weekday !== "number" ||
        row.weekday < 0 ||
        row.weekday > 6
      ) {
        return { success: false, error: "Invalid weekday (must be 0-6)" };
      }
      if (seenWeekdays.has(row.weekday)) {
        return {
          success: false,
          error: `Duplicate weekday ${row.weekday}`,
        };
      }
      seenWeekdays.add(row.weekday);

      if (!TIME_RE.test(row.open_time) || !TIME_RE.test(row.close_time)) {
        return {
          success: false,
          error: `Invalid time format on weekday ${row.weekday}`,
        };
      }
      if (timeToMinutes(row.open_time) >= timeToMinutes(row.close_time)) {
        return {
          success: false,
          error: `שעת סגירה חייבת להיות אחרי שעת פתיחה (יום ${row.weekday})`,
        };
      }

      const hasStart = row.break_start != null && row.break_start !== "";
      const hasEnd = row.break_end != null && row.break_end !== "";
      if (hasStart !== hasEnd) {
        return {
          success: false,
          error: `יש להזין גם תחילת הפסקה וגם סיום הפסקה (יום ${row.weekday})`,
        };
      }
      if (hasStart && hasEnd) {
        if (
          !TIME_RE.test(row.break_start as string) ||
          !TIME_RE.test(row.break_end as string)
        ) {
          return {
            success: false,
            error: `פורמט הפסקה לא חוקי (יום ${row.weekday})`,
          };
        }
        if (
          timeToMinutes(row.break_start as string) >=
          timeToMinutes(row.break_end as string)
        ) {
          return {
            success: false,
            error: `סיום הפסקה חייב להיות אחרי תחילתה (יום ${row.weekday})`,
          };
        }
      }
    }

    const supabase = await createClient();

    const payload = rows.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      barber_id: null,
      weekday: row.weekday,
      open_time: row.open_time,
      close_time: row.close_time,
      break_start:
        row.break_start && row.break_start !== "" ? row.break_start : null,
      break_end:
        row.break_end && row.break_end !== "" ? row.break_end : null,
      is_closed: !!row.is_closed,
      updated_at: new Date().toISOString(),
    }));

    const { error: deleteError } = await supabase
      .from("availability_config")
      .delete()
      .is("barber_id", null);

    if (deleteError) throw deleteError;

    const { data, error } = await supabase
      .from("availability_config")
      .insert(payload)
      .select();

    if (error) throw error;

    revalidatePath("/admin/availability");
    revalidatePath("/booking");
    revalidatePath("/");

    const updated: AvailabilityConfigRow[] = (data || [])
      .map((r) => ({
        id: r.id,
        barber_id: r.barber_id,
        weekday: r.weekday as AvailabilityConfigRow["weekday"],
        open_time: normalizeTime(r.open_time),
        close_time: normalizeTime(r.close_time),
        break_start: r.break_start ? normalizeTime(r.break_start) : null,
        break_end: r.break_end ? normalizeTime(r.break_end) : null,
        is_closed: r.is_closed,
      }))
      .sort((a, b) => a.weekday - b.weekday);

    return { success: true, data: updated };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update availability config";
    return { success: false, error: errorMessage };
  }
}

export async function getBlockedDates(): Promise<
  ServerActionResult<BlockedDate[]>
> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("blocked_dates")
      .select("*")
      .order("date", { ascending: true });

    if (error) throw error;

    return { success: true, data: (data || []) as BlockedDate[] };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch blocked dates";
    return { success: false, error: errorMessage };
  }
}

export async function addBlockedDate(
  date: string,
  reason?: string
): Promise<ServerActionResult<BlockedDate>> {
  try {
    await requireAdmin();

    if (!DATE_RE.test(date)) {
      return { success: false, error: "Invalid date format (YYYY-MM-DD)" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blocked_dates")
      .insert([
        {
          date,
          reason: reason && reason.trim() ? reason.trim() : null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/admin/availability");
    revalidatePath("/booking");

    return { success: true, data: data as BlockedDate };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add blocked date";
    return { success: false, error: errorMessage };
  }
}

export async function removeBlockedDate(
  date: string
): Promise<ServerActionResult> {
  try {
    await requireAdmin();

    if (!DATE_RE.test(date)) {
      return { success: false, error: "Invalid date format (YYYY-MM-DD)" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("date", date);

    if (error) throw error;

    revalidatePath("/admin/availability");
    revalidatePath("/booking");

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to remove blocked date";
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// NOTIFICATIONS (admin viewer + manual overrides)
// ============================================================================

export type NotificationWithBooking = Notification & {
  bookings: { full_name: string; slot_start: string | null } | null;
};

export async function getNotifications(filters?: {
  status?: NotificationStatus | "all";
  sinceDays?: number;
}): Promise<ServerActionResult<NotificationWithBooking[]>> {
  try {
    await requireAdmin();
    const supabase = createServerAdmin();
    let query = supabase
      .from("notifications")
      .select("*, bookings(full_name, slot_start)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.sinceDays && filters.sinceDays > 0) {
      const since = new Date(Date.now() - filters.sinceDays * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", since);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data ?? []) as NotificationWithBooking[] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch notifications";
    return { success: false, error: msg };
  }
}

export async function markNotificationSent(id: string): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(id)) return { success: false, error: "Invalid id" };
    const supabase = createServerAdmin();
    const { error } = await supabase
      .from("notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider: "manual",
        error: null,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to mark sent";
    return { success: false, error: msg };
  }
}

export async function skipNotification(id: string): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(id)) return { success: false, error: "Invalid id" };
    const supabase = createServerAdmin();
    const { error } = await supabase
      .from("notifications")
      .update({ status: "skipped", error: "manual_skip" })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to skip";
    return { success: false, error: msg };
  }
}

export async function retryNotification(id: string): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(id)) return { success: false, error: "Invalid id" };
    const supabase = createServerAdmin();
    const { error } = await supabase
      .from("notifications")
      .update({
        status: "queued",
        attempts: 0,
        error: null,
        scheduled_for: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to retry";
    return { success: false, error: msg };
  }
}
