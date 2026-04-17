import { getServices } from "@/lib/actions";
import { ServicesPreviewClient } from "./ServicesPreviewClient";
import { Service } from "@/types";

const DEMO_SERVICES: Service[] = [
  { id: "1", name: "גילוח קלאסי", description: "גילוח ידני מסורתי עם קצף חם וסכין ישרה. יוצאים עם עור חלק וראש פנוי.", price: 120, duration_minutes: 45, display_order: 1, created_at: "" },
  { id: "2", name: "עיצוב זקן", description: "הזקן מדבר לפניכם — שיהיה מה לומר. עיצוב מדויק, קווים נקיים, תוצאה שמחזיקה.", price: 80, duration_minutes: 30, display_order: 2, created_at: "" },
  { id: "3", name: "תספורת + עיצוב", description: "מהשיער ועד הסנטר — כל פרט מטופל. השילוב המושלם לגבר שמכבד את עצמו.", price: 160, duration_minutes: 60, display_order: 3, created_at: "" },
  { id: "4", name: "חבילת פינוק", description: "גילוח קלאסי, עיצוב זקן, טיפול פנים וסיום עם קרם לחות. חוויה שלמה.", price: 240, duration_minutes: 90, display_order: 4, created_at: "" },
];

export async function ServicesPreview() {
  const result = await getServices();
  const fetched = result.success && result.data ? result.data.slice(0, 4) : [];
  const services = fetched.length > 0 ? fetched : DEMO_SERVICES;

  return <ServicesPreviewClient services={services} />;
}
