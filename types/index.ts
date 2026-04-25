export interface SiteContent {
  key: string;
  value: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price?: number;
  duration_minutes?: number;
  icon?: string;
  display_order: number;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  storage_path: string;
  caption?: string;
  display_order: number;
  created_at: string;
}

export interface GalleryPhoto extends GalleryItem {
  public_url: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  /** Numeric ILS amount; null for "ask in-store" / variable pricing. */
  price: number | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  description?: string | null;
  price?: number | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface OAuthToken {
  id: string;
  provider: "google_calendar";
  account_email: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  calendar_id: string;
  created_at: string;
  updated_at: string;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "denied"
  | "completed"
  | "no_show";

export interface Booking {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  service_id?: string;
  slot_start: string | null;
  slot_end: string | null;
  status: BookingStatus;
  barber_id: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  notes?: string;
  created_at: string;
  manage_token: string;
  alt_offered_at: string | null;
  gcal_event_id: string | null;
  service?: Service;
}

export interface BookingInput {
  full_name: string;
  phone: string;
  email?: string;
  service_id: string;
  slot_start: string;
  notes?: string;
}

export type BookingFormData = BookingInput;

export interface ServerActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AvailabilityConfigRow {
  id?: string;
  barber_id: string | null;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
  is_closed: boolean;
}

export interface BlockedDate {
  date: string;
  reason: string | null;
  created_at: string;
}

export type NotificationChannel = "sms";
export type NotificationTemplate =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_reminder_24h"
  | "booking_rescheduled"
  | "booking_pending"
  | "booking_approved"
  | "booking_denied"
  | "booking_alternative_offered";
export type NotificationStatus = "queued" | "sending" | "sent" | "failed" | "skipped";
export type NotificationLocale = "he" | "en";

export interface Notification {
  id: string;
  booking_id: string | null;
  channel: NotificationChannel;
  template: NotificationTemplate;
  recipient: string;
  locale: NotificationLocale;
  status: NotificationStatus;
  attempts: number;
  provider: string | null;
  provider_message_id: string | null;
  error: string | null;
  payload: Record<string, unknown>;
  scheduled_for: string;
  created_at: string;
  sent_at: string | null;
  updated_at: string;
}

export interface NotificationEnqueueInput {
  booking_id: string;
  channel: NotificationChannel;
  template: NotificationTemplate;
  recipient: string;
  scheduled_for?: string;
  payload: Record<string, unknown>;
}
