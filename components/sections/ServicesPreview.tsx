import { getServices } from "@/lib/actions";
import { ServicesPreviewClient } from "./ServicesPreviewClient";

export async function ServicesPreview() {
  const result = await getServices();
  const services = result.success && result.data ? result.data.slice(0, 3) : [];

  return <ServicesPreviewClient services={services} />;
}
