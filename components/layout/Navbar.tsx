"use client";

import Link from "next/link";
import Image from "next/image";
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
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between gap-4">
        {/* Logo + wordmark (right in RTL) */}
        <Link
          href="/"
          className="flex items-center gap-3 shrink-0"
          aria-label="קרמליס סטודיו — דף הבית"
        >
          <Image
            src="https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png"
            alt=""
            width={36}
            height={36}
            className="w-9 h-9"
            priority
          />
          <span
            className="font-display text-gold-accent hidden sm:inline"
            style={{ fontSize: 22, lineHeight: 1, letterSpacing: "0.02em" }}
          >
            Carmeli&apos;s
          </span>
        </Link>

        {/* Desktop nav — uppercase Hebrew letter-spaced */}
        <nav
          className="hidden md:flex items-center gap-8"
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
                    isActive ? "text-gold-accent" : "text-white/85 hover:text-gold-accent"
                  }`}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.28em",
                  }}
                >
                  {link.label}
                </span>
                <span
                  aria-hidden
                  className={`absolute right-0 left-0 -bottom-0.5 h-px bg-gold-accent origin-right transition-transform duration-300 ${
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "סגור תפריט" : "פתח תפריט"}
            aria-expanded={menuOpen}
            className="md:hidden flex flex-col justify-center items-center gap-1.5 w-11 h-11"
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
      </div>

      {/* Mobile nav */}
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
                      letterSpacing: "0.28em",
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
