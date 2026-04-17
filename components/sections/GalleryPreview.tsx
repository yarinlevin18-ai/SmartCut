import { getGallery } from "@/lib/actions";
import { GalleryPreviewClient } from "./GalleryPreviewClient";

export async function GalleryPreview() {
  const result = await getGallery();
  const photos = result.success && result.data ? result.data.slice(0, 9) : [];

  if (!result.success && result.error) {
    return (
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-muted">לא ניתן לטעון את הגלריה כרגע</p>
        </div>
      </section>
    );
  }

  return <GalleryPreviewClient photos={photos} />;
}
