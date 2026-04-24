"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";
import { createClient, createAnonClient, createServerAdmin } from "./supabase";
import { requireAdmin } from "./auth";
import { enqueueBookingCreated, enqueueBookingCancelled } from "./notifications";
import type {
  Service,
  GalleryPhoto,
  Booking,
  BookingInput,
  ServerActionResult,
  AvailabilityConfigRow,
  BlockedDate,
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
    const supabase = await createClient();
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
    console.log(`[Gallery] Adding gallery item: ${storagePath}`);

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
    console.log(`[Gallery] Setting display_order to: ${nextOrder}`);

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

    console.log(`[Gallery] Database insert succeeded: ${data.id}`);

    const photo: GalleryPhoto = {
      ...data,
      public_url: supabase.storage
        .from("gallery")
        .getPublicUrl(storagePath).data.publicUrl,
    };

    revalidateTag("gallery");
    revalidatePath("/");
    revalidatePath("/gallery");

    console.log(`[Gallery] Item added successfully: ${data.id}`);
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
    console.log(`[Gallery] Uploading file: ${filename}, size: ${buffer.length} bytes, type: ${contentType}`);

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

    console.log(`[Gallery] Storage upload succeeded: ${filename}`);

    // Get public URL using anon client (safe for client-side use)
    const anonSupabase = await createClient();
    const { data } = anonSupabase.storage.from("gallery").getPublicUrl(filename);

    console.log(`[Gallery] Generated public URL: ${data.publicUrl}`);

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

  const supabase = await createClient();

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
        status: "confirmed",
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
  await enqueueBookingCreated({
    booking_id: booking.id,
    customer_name: booking.full_name,
    phone,
    email: booking.email,
    slot_start: slotStartIso,
    slot_end: slotEndIso,
    service_name: serviceName,
    duration_minutes: duration,
  });

  revalidatePath("/admin/bookings");
  return { success: true, data: booking };
}

export async function getBookings(): Promise<ServerActionResult<Booking[]>> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(*)")
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
      .select("id, full_name, phone, email, slot_start, slot_end, service_id, services(name, duration_minutes)")
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: "Booking not found or already cancelled" };

    const svc = Array.isArray(data.services) ? data.services[0] : data.services;
    if (data.slot_start && data.slot_end && data.phone) {
      await enqueueBookingCancelled({
        booking_id: data.id,
        customer_name: data.full_name,
        phone: data.phone,
        email: data.email ?? null,
        slot_start: data.slot_start,
        slot_end: data.slot_end,
        service_name: (svc?.name as string | undefined) ?? "",
        duration_minutes: (svc?.duration_minutes as number | undefined) ?? 0,
      });
    }

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to cancel booking";
    return { success: false, error: errorMessage };
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
