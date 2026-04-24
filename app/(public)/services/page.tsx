import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ServicesPageClient } from "@/components/sections/ServicesPageClient";
import { STATIC_SERVICES } from "@/lib/services-data";

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <ServicesPageClient services={STATIC_SERVICES} />
      <Footer />
    </>
  );
}
