import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GalleryPageClient } from "@/components/sections/GalleryPageClient";
import { getGallery } from "@/lib/actions";

export default async function GalleryPage() {
  const result = await getGallery();
  const photos = result.success && result.data ? result.data : [];

  return (
    <>
      <Navbar />
      {!result.success && result.error ? (
        <main className="min-h-screen bg-dark py-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted mb-4">לא ניתן לטעון את הגלריה כרגע</p>
            <p className="text-sm text-gray-500">אנא נסו שוב בעוד מספר דקות</p>
          </div>
        </main>
      ) : (
        <GalleryPageClient photos={photos} />
      )}
      <Footer />
    </>
  );
}
