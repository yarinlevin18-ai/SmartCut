"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();

  // Hide navbar after scrolling 100px down
  const navbarY = useTransform(scrollY, [0, 100], [0, -80]);

  const links = [
    { href: "/", label: "בית" },
    { href: "/services", label: "שירותים" },
    { href: "/gallery", label: "גלריה" },
    { href: "/booking", label: "הזמנה" },
  ];

  return (
    <motion.header
      style={{ y: navbarY }}
      className="sticky top-0 z-50 bg-gradient-to-r from-surface via-surface/95 to-surface/90 border-b border-gold-accent/10 backdrop-blur-sm shadow-sm"
      suppressHydrationWarning
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-gold-accent to-transparent"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between relative z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png"
            alt="Carmelis Studio"
            width={40}
            height={40}
            className="w-10 h-10"
            priority
          />
          <span className="font-display text-xl text-text hidden sm:inline">
            Carmeli&apos;s Studio
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8">
          {links.map((link, index) => {
            const isActive = pathname === link.href;
            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <Link
                  href={link.href}
                  className={`relative pb-1 focus:ring-2 focus:ring-gold-accent focus:rounded px-2 py-1 group ${
                    isActive
                      ? "text-gold-accent"
                      : "text-text hover:text-gold-accent"
                  }`}
                >
                  {link.label}
                  {/* Animated underline */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-gold-accent via-gold-light to-gold-accent"
                    animate={{
                      width: isActive ? "100%" : "0%",
                      opacity: isActive ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "סגור תפריט" : "פתח תפריט"}
          className="md:hidden flex flex-col justify-center items-center gap-1.5 w-12 h-12"
        >
          <motion.div
            animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 6 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-0.5 bg-text"
          />
          <motion.div
            animate={{ opacity: menuOpen ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-0.5 bg-text"
          />
          <motion.div
            animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -6 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-0.5 bg-text"
          />
        </button>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden bg-dark/95 border-t border-gold-accent/20"
          >
            <div className="py-4">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-4 py-3 transition-colors focus:ring-2 focus:ring-gold-accent focus:rounded ${
                      isActive
                        ? "text-gold-accent bg-gold-accent/10 border-r-2 border-gold-accent"
                        : "text-text hover:text-gold-accent"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
