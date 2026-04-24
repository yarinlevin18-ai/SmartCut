import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getServices } from "@/lib/actions";
import { BookingForm } from "./BookingForm";

interface BookingPageProps {
  searchParams: Promise<{ service?: string }>;
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const params = await searchParams;
  const preselectedServiceId = params?.service ?? null;
  const result = await getServices();
  const services = result.success && result.data ? result.data : [];

  return (
    <>
      <Navbar />
      <BookingForm
        services={services}
        preselectedServiceId={preselectedServiceId}
      />
      <Footer />
    </>
  );
}
