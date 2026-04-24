"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const BG_URL =
  "https://vfqanptaeqbpizevonpv.supabase.co/storage/v1/object/public/gallery/Gemini_Generated_Image_g4qm65g4qm65g4qm.png";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const shouldReduce = useReducedMotion();
  const wordmark = "CARMELI'S";

  return (
    <section className="relative overflow-hidden flex items-center justify-center min-h-screen">
      <Image
        src={BG_URL}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_35%]"
        style={{ filter: "brightness(0.28) saturate(0.85)" }}
      />

      {/* Vignette for luxury feel */}
      <div
        aria-hidden
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.55) 75%, #000 100%)",
        }}
      />

      {/* Fade to page bg */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: "220px",
          background:
            "linear-gradient(to bottom, transparent 0%, #0d0d0d 100%)",
        }}
      />

      <div className="relative z-20 text-center flex flex-col items-center gap-8 px-6">
        {/* Eyebrow label */}
        <motion.span
          initial={shouldReduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
          className="font-label uppercase text-gold-accent"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.36em",
          }}
        >
          Shaving & Grooming Specialists
        </motion.span>

        {/* Giant wordmark — DM Serif Display */}
        <motion.h1
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
          className="font-display text-white leading-[0.9]"
          style={{
            fontSize: "clamp(64px, 12vw, 180px)",
            letterSpacing: "0.01em",
          }}
          dir="ltr"
          aria-label="Carmeli's Studio"
        >
          {wordmark}
          <span
            className="block font-label uppercase text-white/80 mt-3"
            style={{
              fontSize: "clamp(14px, 1.6vw, 22px)",
              fontWeight: 500,
              letterSpacing: "0.42em",
            }}
          >
            S&nbsp;T&nbsp;U&nbsp;D&nbsp;I&nbsp;O
          </span>
        </motion.h1>

        {/* Hebrew tagline */}
        <motion.p
          initial={shouldReduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
          className="font-body text-white/75 max-w-xl"
          style={{
            fontSize: "clamp(15px, 1.3vw, 18px)",
            fontWeight: 300,
            lineHeight: 1.7,
          }}
        >
          אמנות הגילוח הגברי. דיוק חסר פשרות. סטייל מובהק. חוויה אישית.
        </motion.p>

        {/* Gold divider */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 1.1 }}
          className="bg-gold-accent"
          style={{ width: 56, height: 1 }}
        />

        {/* CTA row — two outlined buttons */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 1.2 }}
          className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4"
        >
          <Link
            href="/booking"
            className="font-label uppercase inline-block transition-all duration-200 hover:bg-gold-accent hover:text-black"
            style={{
              border: "1px solid #c9a84c",
              color: "#c9a84c",
              fontSize: 12,
              fontWeight: 600,
              padding: "14px 44px",
              borderRadius: 0,
              background: "transparent",
              letterSpacing: "0.24em",
            }}
          >
            הזמינו תור
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 font-label uppercase text-white/40"
        style={{ fontSize: 10, letterSpacing: "0.3em" }}
      >
        <span>Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-6 w-px bg-white/30"
        />
      </motion.div>
    </section>
  );
}
