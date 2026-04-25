import { Hero } from "@/components/sections/Hero";
import { ServicesPreview } from "@/components/sections/ServicesPreview";
import { ProductsPreview } from "@/components/sections/ProductsPreview";
import { GalleryPreview } from "@/components/sections/GalleryPreview";
import { Reviews } from "@/components/sections/Reviews";
import { CTASection } from "@/components/sections/CTASection";
import { IntroAnimationWrapper } from "@/components/sections/IntroAnimationWrapper";
import { Navbar } from "@/components/layout/Navbar";
import { getProducts } from "@/lib/actions";

export async function HomePageClient() {
  const productsRes = await getProducts();
  const products = productsRes.success && productsRes.data ? productsRes.data : [];

  return (
    <>
      <IntroAnimationWrapper />
      <Navbar />
      <main suppressHydrationWarning>
        <Hero />
        <ServicesPreview />
        <ProductsPreview products={products} />
        <GalleryPreview />
        <Reviews />
        <CTASection />
      </main>
    </>
  );
}
