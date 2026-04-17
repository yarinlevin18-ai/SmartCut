"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabase-browser";
import { getBookings, deleteBooking } from "@/lib/actions";
import type { Booking } from "@/types";

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const checkAuth = async (): Promise<void> => {
    const supabase = createClientBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/admin/login");
      return;
    }

    loadBookings();
  };

  const loadBookings = async (): Promise<void> => {
    const result = await getBookings();
    setBookings(result.success && result.data ? result.data : []);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDeleteBooking = async (id: string): Promise<void> => {
    if (!window.confirm("Delete this booking?")) {
      return;
    }

    const result = await deleteBooking(id);
    if (result.success) {
      loadBookings();
    }
  };


  if (loading) {
    return (
      <div className="flex-1 p-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div>
        <h1 className="text-4xl font-bold text-text mb-2">Booking Leads</h1>
        <p className="text-muted mb-8">
          View booking requests submitted through your form
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-surface border border-white/10 rounded-lg p-8 text-center">
          <p className="text-muted">No bookings yet</p>
        </div>
      ) : (
        <div className="bg-surface border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto md:overflow-hidden">
            <table className="min-w-full">
            <thead className="bg-bg border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-sm font-medium text-muted">Name</th>
                <th className="px-6 py-4 text-sm font-medium text-muted">Phone</th>
                <th className="px-6 py-4 text-sm font-medium text-muted">Selected Time</th>
                <th className="px-6 py-4 text-sm font-medium text-muted">Service</th>
                <th className="px-6 py-4 text-sm font-medium text-muted">
                  Preferred Date
                </th>
                <th className="px-6 py-4 text-sm font-medium text-muted">Time</th>
                <th className="px-6 py-4 text-sm font-medium text-muted">
                  Submitted
                </th>
                <th className="px-6 py-4 text-sm font-medium text-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-bg/50 transition-colors cursor-pointer"
                  title={booking.notes || ""}
                >
                  <td className="px-6 py-4 text-text">{booking.full_name}</td>
                  <td className="px-6 py-4 text-text text-sm">{booking.phone}</td>
                  <td className="px-6 py-4 text-text text-sm">{booking.preferred_time || "—"}</td>
                  <td className="px-6 py-4 text-text">
                    {booking.service?.name || "—"}
                  </td>
                  <td className="px-6 py-4 text-text text-sm">
                    {booking.preferred_date
                      ? formatDate(booking.preferred_date)
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-text text-sm">
                    {booking.preferred_time || "—"}
                  </td>
                  <td className="px-6 py-4 text-muted text-sm">
                    {formatDate(booking.created_at)}
                  </td>
                  <td className="px-6 py-4 text-text text-sm">
                    <button
                      onClick={() => handleDeleteBooking(booking.id)}
                      className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded hover:bg-red-500/30 transition-colors text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {bookings.length > 0 && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded px-4 py-3 text-blue-300 text-sm">
          <p>
            💡 Bookings are captured for your records. Customers are redirected to Wix
            Bookings to complete the full reservation.
          </p>
        </div>
      )}
    </div>
  );
}
