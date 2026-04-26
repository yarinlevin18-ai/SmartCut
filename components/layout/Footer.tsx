"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSiteContent } from "@/lib/actions";
import { CookiePreferencesButton } from "@/components/legal/CookiePreferencesButton";

export function Footer() {
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "#";
  const bitpayUrl = process.env.NEXT_PUBLIC_BITPAY_URL ?? "#";

  const [phone, setPhone] = useState("052-455-0069");
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    getSiteContent("phone").then((r) => {
      if (r.success && r.data) setPhone(r.data);
    });
    getSiteContent("address").then((r) => {
      if (r.success && r.data) setAddress(r.data);
    });
  }, []);

  // Waze deep link. ?q=<address> opens Waze with the address as a search
  // query — works on mobile (Waze app) and desktop (Waze web). Empty
  // address falls back to a Carmelis-Studio search so the button never
  // links to nothing.
  const wazeUrl = address
    ? `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
    : "https://waze.com/ul?q=Carmelis%20Studio&navigate=yes";

  return (
    <footer
      className="bg-black"
      style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20">
        {/* Top row: brand + nav columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12 mb-14">
          {/* Brand column */}
          <div className="text-center md:text-right">
            <div
              className="font-display text-gold-accent mb-3"
              style={{ fontSize: 28, letterSpacing: "0.02em" }}
              dir="ltr"
            >
              CARMELI&apos;S
            </div>
            <div
              className="font-label uppercase text-white/60"
              style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.42em" }}
            >
              S T U D I O
            </div>
            <p
              className="font-body text-white/50 mt-5 leading-relaxed"
              style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.8 }}
            >
              דיוק חסר פשרות.
            </p>
          </div>

          {/* Navigation column */}
          <div className="text-center">
            <h4
              className="font-label uppercase text-gold-accent mb-5"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.36em",
              }}
            >
              Navigate
            </h4>
            <nav className="flex flex-col gap-3">
              <Link
                href="/"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                בית
              </Link>
              <Link
                href="/services"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                שירותים
              </Link>
              <Link
                href="/gallery"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                גלריה
              </Link>
              <Link
                href="/booking"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                הזמנת תור
              </Link>
            </nav>
          </div>

          {/* Contact column */}
          <div className="text-center md:text-left">
            <h4
              className="font-label uppercase text-gold-accent mb-5"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.36em",
              }}
            >
              Contact
            </h4>
            <div className="flex flex-col gap-3">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="font-body text-white/70 hover:text-gold-accent transition-colors"
                  style={{ fontSize: 13, fontWeight: 300 }}
                  dir="ltr"
                >
                  {phone}
                </a>
              )}
              {address && (
                <div className="flex flex-col gap-1.5">
                  <span
                    className="font-body text-white/70"
                    style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.5 }}
                  >
                    {address}
                  </span>
                  {/* Wrap in a div so the inline-flex link inherits the
                      same text-align as the address text above (centered on
                      mobile, left in desktop RTL → leading edge of the
                      column). The previous `self-center md:self-start` put
                      it at the trailing edge in RTL, misaligned with the
                      address. */}
                  <div className="text-center md:text-left">
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-label uppercase text-gold-accent hover:text-gold-light transition-colors inline-flex items-center gap-1.5"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.28em",
                      }}
                    >
                      <span aria-hidden style={{ fontSize: 11 }}>↗</span>
                      נווט ב-Waze
                    </a>
                  </div>
                </div>
              )}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                Instagram
              </a>
              <Link
                href="/booking"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                הזמנה מהירה
              </Link>
              <a
                href={bitpayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                BitPay
              </a>
            </div>
          </div>

          {/* Legal column */}
          <div className="text-center md:text-left">
            <h4
              className="font-label uppercase text-gold-accent mb-5"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.36em",
              }}
            >
              Legal
            </h4>
            <div className="flex flex-col gap-3">
              <Link
                href="/privacy"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                מדיניות פרטיות
              </Link>
              <Link
                href="/terms"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                תנאי שימוש
              </Link>
              <Link
                href="/cookies"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                קובצי Cookie
              </Link>
              <Link
                href="/accessibility"
                className="font-body text-white/70 hover:text-gold-accent transition-colors"
                style={{ fontSize: 13, fontWeight: 300 }}
              >
                הצהרת נגישות
              </Link>
              <CookiePreferencesButton
                label="נהל העדפות Cookie"
                variant="link"
              />
            </div>
          </div>
        </div>

        {/* Gold divider */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="h-px flex-1 bg-white/8" />
          <span
            className="w-1.5 h-1.5 rotate-45 bg-gold-accent/80"
            aria-hidden
          />
          <span className="h-px flex-1 bg-white/8" />
        </div>

        {/* Bottom row: tagline */}
        <div className="flex items-center justify-center">
          <span
            className="font-label uppercase text-white/30"
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.28em",
            }}
          >
            Shaving &amp; Grooming Specialists
          </span>
        </div>

        {/* Software credit + legal ownership notice (Yarin Levin retains
            rights to the app itself; Carmeli's Studio owns the marketing
            content per /terms). */}
        <div className="mt-6 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-2 text-center">
          <span
            className="font-label uppercase text-white/30"
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.32em",
            }}
          >
            Designed &amp; Developed by Yarin Levin
          </span>
          <span className="text-white/20 hidden md:inline" aria-hidden>
            ·
          </span>
          <span
            className="font-label uppercase text-white/30"
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.32em",
            }}
          >
            &copy; {new Date().getFullYear()} Yarin Levin · All rights reserved
          </span>
        </div>
      </div>
    </footer>
  );
}
