import type { NotificationTemplate } from "@/types";

// Hebrew SMS templates. Kept short — SMS billing rounds up per 67-char Unicode segment.
// Payload is the JSONB snapshotted at enqueue time (see lib/notifications.ts).

type TemplatePayload = {
  customer_name?: string;
  service_name?: string;
  slot_start_local_date?: string;
  slot_start_local_time?: string;
  slot_start_local_weekday?: string;
};

const SHOP = "כרמליס סטודיו";

export function renderSmsBody(
  template: NotificationTemplate,
  payload: Record<string, unknown>
): string {
  const p = payload as TemplatePayload;
  const name = p.customer_name?.split(" ")[0] ?? "";
  const date = p.slot_start_local_date ?? "";
  const time = p.slot_start_local_time ?? "";
  const service = p.service_name ?? "";

  switch (template) {
    case "booking_confirmed":
      return `היי ${name}, התור שלך ל${service} נקבע ל-${date} בשעה ${time}. נתראה! ${SHOP}`.trim();

    case "booking_reminder_24h":
      return `תזכורת: יש לך תור מחר ${date} בשעה ${time} ל${service}. ${SHOP}`.trim();

    case "booking_cancelled":
      return `התור שלך ל-${date} ${time} בוטל. לקביעת מועד חדש תוכל להיכנס לאתר. ${SHOP}`.trim();

    case "booking_rescheduled":
      return `היי ${name}, התור שלך עבר ל-${date} בשעה ${time}. ${SHOP}`.trim();

    default: {
      const exhaustive: never = template;
      throw new Error(`Unknown template: ${exhaustive as string}`);
    }
  }
}
