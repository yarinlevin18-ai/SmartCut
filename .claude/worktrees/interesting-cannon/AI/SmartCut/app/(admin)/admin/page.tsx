import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="flex-1 p-8">
      <div>
        <h1 className="text-4xl font-bold text-text mb-2">Dashboard</h1>
        <p className="text-muted mb-8">Welcome back to Carmelis Studio admin</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-surface border border-white/10 rounded-lg p-6">
            <h2 className="text-sm font-medium text-muted mb-2">Services</h2>
            <p className="text-3xl font-bold text-gold">Manage your services</p>
            <a
              href="/admin/services"
              className="inline-block mt-4 text-gold hover:text-gold-light transition-colors"
            >
              Go to Services →
            </a>
          </div>

          <div className="bg-surface border border-white/10 rounded-lg p-6">
            <h2 className="text-sm font-medium text-muted mb-2">Gallery</h2>
            <p className="text-3xl font-bold text-gold">Upload & organize photos</p>
            <a
              href="/admin/gallery"
              className="inline-block mt-4 text-gold hover:text-gold-light transition-colors"
            >
              Go to Gallery →
            </a>
          </div>

          <div className="bg-surface border border-white/10 rounded-lg p-6">
            <h2 className="text-sm font-medium text-muted mb-2">Bookings</h2>
            <p className="text-3xl font-bold text-gold">View booking leads</p>
            <a
              href="/admin/bookings"
              className="inline-block mt-4 text-gold hover:text-gold-light transition-colors"
            >
              Go to Bookings →
            </a>
          </div>
        </div>

        <div className="mt-12 bg-surface border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-bold text-text mb-4">Quick Start</h2>
          <ul className="space-y-3 text-muted">
            <li className="flex items-start">
              <span className="text-gold mr-3">•</span>
              <span>Add or edit services to display on your public site</span>
            </li>
            <li className="flex items-start">
              <span className="text-gold mr-3">•</span>
              <span>Upload gallery photos and organize them by drag-and-drop</span>
            </li>
            <li className="flex items-start">
              <span className="text-gold mr-3">•</span>
              <span>View all booking leads captured from your booking form</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
