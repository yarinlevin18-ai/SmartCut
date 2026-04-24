"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { createClient, createAnonClient, createServerAdmin } from "./supabase";
import { requireAdmin } from "./auth";
import type {
  Service,
  GalleryPhoto,
  Booking,
  BookingFormData,
  ServerActionResult,
} from "@/types";

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

export async function createBooking(
  booking: BookingFormData
): Promise<ServerActionResult<Booking>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .insert([{
        full_name: booking.full_name,
        phone: booking.phone,
        email: "",
        service_id: booking.service_id,
        preferred_date: booking.preferred_date,
        preferred_time: booking.preferred_time,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/admin/bookings");
    return {
      success: true,
      data: data!,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create booking";
    return {
      success: false,
      error: errorMessage,
    };
  }
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

export async function deleteBooking(id: string): Promise<ServerActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("bookings").delete().eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/bookings");
    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete booking";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
