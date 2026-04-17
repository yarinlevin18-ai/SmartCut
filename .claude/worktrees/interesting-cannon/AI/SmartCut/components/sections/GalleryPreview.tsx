import { getGallery } from "@/lib/actions";
import { GalleryPreviewClient } from "./GalleryPreviewClient";
import { GalleryPhoto } from "@/types";

const DEMO_PHOTOS: GalleryPhoto[] = [
  { id: "1", storage_path: "gallery-1", caption: "עיצוב שיער", display_order: 1, created_at: "", public_url: "/gallery-1.png" },
  { id: "2", storage_path: "gallery-2", caption: "תספורת קלאסית", display_order: 2, created_at: "", public_url: "/gallery-2.png" },
  { id: "3", storage_path: "gallery-3", caption: "עיצוב זקן", display_order: 3, created_at: "", public_url: "/gallery-3.png" },
  { id: "4", storage_path: "gallery-4", caption: "גילוח קלאסי", display_order: 4, created_at: "", public_url: "/gallery-4.png" },
  { id: "5", storage_path: "gallery-5", caption: "טיפול פנים", display_order: 5, created_at: "", public_url: "/gallery-5.png" },
  { id: "6", storage_path: "gallery-6", caption: "עיצוב מדויק", display_order: 6, created_at: "", public_url: "/gallery-6.png" },
  { id: "7", storage_path: "gallery-7", caption: "תספורת + זקן", display_order: 7, created_at: "", public_url: "/gallery-7.png" },
  { id: "8", storage_path: "gallery-8", caption: "חבילת פינוק", display_order: 8, created_at: "", public_url: "/gallery-8.png" },
  { id: "9", storage_path: "gallery-9", caption: "לוק מושלם", display_order: 9, created_at: "", public_url: "/gallery-9.png" },
];

export async function GalleryPreview() {
  const result = await getGallery();
  const fetched = result.success && result.data ? result.data.slice(0, 9) : [];
  const photos: GalleryPhoto[] = fetched.length > 0 ? fetched : DEMO_PHOTOS;

  return <GalleryPreviewClient photos={photos} />;
}
