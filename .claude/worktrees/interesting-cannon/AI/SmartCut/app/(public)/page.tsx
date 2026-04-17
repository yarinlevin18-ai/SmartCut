import { Footer } from "@/components/layout/Footer";
import { HomePageClient } from "@/components/layout/HomePageClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <>
      <HomePageClient />
      <Footer />
    </>
  );
}
