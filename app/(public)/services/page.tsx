import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ServicesPageClient } from "@/components/sections/ServicesPageClient";
import { getServices } from "@/lib/actions";

export default async function ServicesPage() {
  const result = await getServices();
  const services = result.success && result.data ? result.data : [];

  return (
    <>
      <Navbar />
      <ServicesPageClient services={services} />
      <Footer />
    </>
  );
}
