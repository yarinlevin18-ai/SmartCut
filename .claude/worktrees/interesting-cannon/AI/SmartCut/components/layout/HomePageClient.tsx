import { Hero } from "@/components/sections/Hero";
import { ServicesPreview } from "@/components/sections/ServicesPreview";
import { GalleryPreview } from "@/components/sections/GalleryPreview";
import { IntroAnimationWrapper } from "@/components/sections/IntroAnimationWrapper";
import { SectionDivider } from "@/components/ui/SectionDivider";

export async function HomePageClient() {
  return (
    <>
      <IntroAnimationWrapper />
      <main suppressHydrationWarning>
        <Hero />
        <SectionDivider />
        <GalleryPreview />
        <SectionDivider />
        <ServicesPreview />
      </main>
    </>
  );
}
