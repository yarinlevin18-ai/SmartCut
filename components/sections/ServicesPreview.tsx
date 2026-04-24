import { STATIC_SERVICES } from "@/lib/services-data";
import { ServicesPreviewClient } from "./ServicesPreviewClient";

export function ServicesPreview() {
  return <ServicesPreviewClient services={STATIC_SERVICES} />;
}
