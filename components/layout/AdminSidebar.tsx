"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClientBrowser } from "@/lib/supabase-browser";

const NAV_ITEMS = [
  { href: "/admin", label: "סקירה", en: "Dashboard" },
  { href: "/admin/services", label: "שירותים", en: "Services" },
  { href: "/admin/gallery", label: "גלריה", en: "Gallery" },
  { href: "/admin/bookings", label: "תורים", en: "Bookings" },
];

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

  return (
    <aside
      className="w-64 min-h-screen flex flex-col"
      style={{
        background: "#080808",
        borderLeft: "1px solid rgba(201,168,76,0.12)",
      }}
    >
      {/* Brand */}
      <div
        className="px-6 py-7"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="font-display text-gold-accent"
          style={{ fontSize: 24, letterSpacing: "0.02em" }}
          dir="ltr"
        >
          CARMELI&apos;S
        </div>
        <div
          className="font-label uppercase text-white/55 mt-1"
          style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.42em" }}
        >
          Admin Studio
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block group relative"
            >
              <div
                className={`flex items-center justify-between px-4 py-3 transition-all ${
                  isActive
                    ? "bg-white/5"
                    : "hover:bg-white/5"
                }`}
                style={{
                  borderLeft: isActive
                    ? "2px solid #c9a84c"
                    : "2px solid transparent",
                }}
              >
                <span
                  className={`font-body transition-colors ${
                    isActive
                      ? "text-gold-accent"
                      : "text-white/80 group-hover:text-gold-accent"
                  }`}
                  style={{ fontSize: 14, fontWeight: 400 }}
                >
                  {item.label}
                </span>
                <span
                  className={`font-label uppercase transition-colors ${
                    isActive ? "text-gold-accent/70" : "text-white/30"
                  }`}
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.28em",
                  }}
                >
                  {item.en}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div
        className="px-6 py-5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="font-label uppercase text-white/40 mb-2"
          style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.32em" }}
        >
          Logged in as
        </div>
        <div
          className="font-body text-white/85 mb-5 truncate"
          style={{ fontSize: 13, fontWeight: 400 }}
          dir="ltr"
          title={email}
        >
          {loading ? "…" : email || "—"}
        </div>
        <button
          onClick={handleLogout}
          className="w-full font-label uppercase transition-all duration-200 hover:bg-gold-accent hover:text-black"
          style={{
            border: "1px solid rgba(201,168,76,0.4)",
            color: "#c9a84c",
            background: "transparent",
            fontSize: 11,
            fontWeight: 600,
            padding: "10px 16px",
            borderRadius: 0,
            letterSpacing: "0.24em",
          }}
        >
          התנתקות · Logout
        </button>
      </div>
    </aside>
  );
}
