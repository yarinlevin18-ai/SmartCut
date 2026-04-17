"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSiteContent } from "@/lib/actions";

export function Footer() {
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "#";
  const bitpayUrl = process.env.NEXT_PUBLIC_BITPAY_URL ?? "#";
  const wixUrl = process.env.NEXT_PUBLIC_WIX_BOOKING_URL ?? "https://www.carmelis-studio.com/book-online";

  const [phone, setPhone] = useState("");

  useEffect(() => {
    getSiteContent("phone").then((r) => {
      if (r.success && r.data) setPhone(r.data);
    });
  }, []);

  return (
    <footer
      style={{
        background: "#080808",
        borderTop: "1px solid rgba(201,168,76,0.1)",
      }}
    >
      <div className="max-w-7xl mx-auto px-9 py-[26px] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <span
          className="font-display italic text-gold-accent"
          style={{ fontSize: 17 }}
        >
          Carmeli&apos;s Studio
        </span>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-6">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-muted hover:text-gold-accent transition-colors"
            style={{ fontSize: 12 }}
          >
            אינסטגרם
          </a>
          <a
            href={wixUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-muted hover:text-gold-accent transition-colors"
            style={{ fontSize: 12 }}
          >
            הזמן תור
          </a>
          <a
            href={bitpayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-muted hover:text-gold-accent transition-colors"
            style={{ fontSize: 12 }}
          >
            BitPay
          </a>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="font-body text-muted hover:text-gold-accent transition-colors"
              style={{ fontSize: 12 }}
            >
              {phone}
            </a>
          )}
          <Link
            href="/services"
            className="font-body text-muted hover:text-gold-accent transition-colors"
            style={{ fontSize: 12 }}
          >
            שירותים
          </Link>
          <Link
            href="/gallery"
            className="font-body text-muted hover:text-gold-accent transition-colors"
            style={{ fontSize: 12 }}
          >
            גלריה
          </Link>
        </nav>

        {/* Copyright */}
        <span
          className="font-body"
          style={{ color: "#3a3a3a", fontSize: 10, letterSpacing: "0.06em" }}
        >
          &copy; 2025 קרמליס סטודיו
        </span>
      </div>
    </footer>
  );
}
