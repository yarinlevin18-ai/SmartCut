"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/", label: "בית" },
    { href: "/services", label: "שירותים" },
    { href: "/products", label: "מוצרים" },
    { href: "/gallery", label: "גלריה" },
    { href: "/booking", label: "הזמנה" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-black/85 backdrop-blur-md border-b border-white/5">
      {/* Centered desktop nav. No corner brand — the hero already wordmarks
          the site at full size; a small logo in the corner just competes
          with that and adds nothing. The "בית" link covers the
          home-navigation case. */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 relative flex items-center justify-center min-h-[60px]">
        {/* Desktop nav — center-aligned, generous letter-spacing */}
        <nav
          className="hidden md:flex items-center gap-10"
          aria-label="ניווט ראשי"
        >
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative py-2"
              >
                <span
                  className={`font-label uppercase transition-colors ${
                    isActive
                      ? "text-gold-accent"
                      : "text-white/80 hover:text-gold-accent"
                  }`}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.36em",
                  }}
                >
                  {link.label}
                </span>
                <span
                  aria-hidden
                  className={`absolute right-0 left-0 -bottom-0.5 h-px bg-gold-accent origin-center transition-transform duration-300 ${
                    isActive
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Mobile hamburger — absolutely positioned to the leading edge (right
            in RTL). The header keeps the centered layout on desktop and the
            hamburger doesn't pull the rest off-axis on mobile. */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "סגור תפריט" : "פתח תפריט"}
          aria-expanded={menuOpen}
          className="md:hidden absolute right-5 top-1/2 -translate-y-1/2 flex flex-col justify-center items-center gap-1.5 w-11 h-11"
        >
          <motion.span
            animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 6 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-px bg-white"
          />
          <motion.span
            animate={{ opacity: menuOpen ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-px bg-white"
          />
          <motion.span
            animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -6 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-px bg-white"
          />
        </button>
      </div>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            key="mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden overflow-hidden bg-black border-t border-white/10"
            aria-label="תפריט נייד"
          >
            <div className="py-3">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-6 py-4 font-label uppercase transition-colors ${
                      isActive
                        ? "text-gold-accent"
                        : "text-white/85 hover:text-gold-accent"
                    }`}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.32em",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
