import { getServices } from "@/lib/actions";
import { ServicesPreviewClient } from "./ServicesPreviewClient";

export async function ServicesPreview() {
  const result = await getServices();
  const services = result.success && result.data ? result.data : [];

  return <ServicesPreviewClient services={services} />;
}
