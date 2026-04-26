import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getCustomers } from "@/lib/actions";
import { CustomersClient } from "./CustomersClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "לקוחות · ניהול",
};

/**
 * Customers page — aggregated view of everyone who's ever booked, dedup'd
 * by phone. Server-renders the data once; the client component handles
 * search and the per-customer expand/collapse.
 *
 * Future ideas (not built yet — keep this shipped first):
 *   - Manual notes per customer (allergies, preferences) → new table
 *   - Tag system (VIP, slow tipper, etc.)
 *   - "Last seen N days ago" pill turning red after 60 days for win-back lists
 *   - CSV export for SMS marketing once notifications add-on is purchased
 */
export default async function CustomersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const result = await getCustomers();
  const customers = result.success && result.data ? result.data : [];

  return <CustomersClient initialCustomers={customers} />;
}
