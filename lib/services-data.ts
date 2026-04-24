import type { Service } from "@/types";

export const STATIC_SERVICES: Service[] = [
  {
    id: "beard",
    name: "Beard",
    description: "עיצוב זקן",
    price: 50,
    duration_minutes: 30,
    display_order: 1,
    created_at: "",
  },
  {
    id: "classic",
    name: "Classic",
    description: "עיצוב שיער",
    price: 90,
    duration_minutes: 30,
    display_order: 2,
    created_at: "",
  },
  {
    id: "premium",
    name: "Premium",
    description: "עיצוב שיער & קיצוץ זקן",
    price: 110,
    duration_minutes: 45,
    display_order: 3,
    created_at: "",
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "עיצוב שיער & עיצוב זקן & שעווה",
    price: 130,
    duration_minutes: 60,
    display_order: 4,
    created_at: "",
  },
];
