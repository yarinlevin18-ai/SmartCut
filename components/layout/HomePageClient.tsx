import { Hero } from "@/components/sections/Hero";
import { ServicesPreview } from "@/components/sections/ServicesPreview";
import { GalleryPreview } from "@/components/sections/GalleryPreview";
import { About } from "@/components/sections/About";
import { Reviews } from "@/components/sections/Reviews";
import { CTASection } from "@/components/sections/CTASection";
import { IntroAnimationWrapper } from "@/components/sections/IntroAnimationWrapper";
import { Navbar } from "@/components/layout/Navbar";

export async function HomePageClient() {
  return (
    <>
      <IntroAnimationWrapper />
      <Navbar />
      <main suppressHydrationWarning>
        <Hero />
        <About />
        <ServicesPreview />
        <GalleryPreview />
        <Reviews />
        <CTASection />
      </main>
    </>
  );
}
