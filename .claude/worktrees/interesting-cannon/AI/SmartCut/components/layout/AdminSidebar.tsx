"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClientBrowser } from "@/lib/supabase-browser";

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async (): Promise<void> => {
      const supabase = createClientBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email || "");
      setLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async (): Promise<void> => {
    const supabase = createClientBrowser();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <aside className="w-64 bg-surface border-r border-white/10 min-h-screen p-6">
        <div>Loading...</div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-surface border-r border-white/10 min-h-screen p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gold">Carmelis Admin</h1>
        <p className="text-sm text-muted mt-2">{email}</p>
      </div>

      <nav className="flex-1 space-y-2">
        <Link
          href="/admin"
          className={`block px-4 py-3 rounded text-text hover:bg-white/5 transition-colors focus:ring-2 focus:ring-gold-accent ${
            pathname === "/admin" ? "border-r-2 border-gold-accent" : ""
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/admin/services"
          className={`block px-4 py-3 rounded text-text hover:bg-white/5 transition-colors focus:ring-2 focus:ring-gold-accent ${
            pathname === "/admin/services" ? "border-r-2 border-gold-accent" : ""
          }`}
        >
          Services
        </Link>
        <Link
          href="/admin/gallery"
          className={`block px-4 py-3 rounded text-text hover:bg-white/5 transition-colors focus:ring-2 focus:ring-gold-accent ${
            pathname === "/admin/gallery" ? "border-r-2 border-gold-accent" : ""
          }`}
        >
          Gallery
        </Link>
        <Link
          href="/admin/bookings"
          className={`block px-4 py-3 rounded text-text hover:bg-white/5 transition-colors focus:ring-2 focus:ring-gold-accent ${
            pathname === "/admin/bookings" ? "border-r-2 border-gold-accent" : ""
          }`}
        >
          Bookings
        </Link>
      </nav>

      <button
        onClick={handleLogout}
        className="w-full px-4 py-3 bg-gold text-dark font-semibold rounded hover:bg-gold-light transition-colors"
      >
        Logout
      </button>
    </aside>
  );
}
