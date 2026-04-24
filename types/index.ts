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

export type BookingStatus =
  | "confirmed"
  | "cancelled"
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
  | "booking_reminder_24h";
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
