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

export interface Booking {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  service_id?: string;
  preferred_date?: string;
  preferred_time?: string;
  notes?: string;
  created_at: string;
  service?: Service;
}

export interface BookingFormData {
  full_name: string;
  phone: string;
  service_id: string;
  preferred_time: string;
}

export interface ServerActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
