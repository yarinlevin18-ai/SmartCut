"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1] as const;

export function CTASection() {
  const shouldReduce = useReducedMotion();

  return (
    <section
      id="book"
      className="relative overflow-hidden bg-black"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at center, rgba(201,168,76,0.12) 0%, transparent 65%)",
      }}
    >
      {/* Top border accent */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.5) 50%, transparent 100%)",
        }}
      />

      <motion.div
        initial={shouldReduce ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 py-28 md:py-36 text-center"
      >
        <p
          className="font-label uppercase text-gold-accent mb-6"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.36em",
          }}
        >
          Book Your Seat
        </p>

        <h2
          className="font-display text-white mb-6"
          style={{
            fontSize: "clamp(44px, 7vw, 88px)",
            lineHeight: 1.02,
          }}
        >
          הגיע הזמן
          <br />
          <span className="italic gold-shine">להשקיע בעצמך</span>
        </h2>

        <div className="flex items-center justify-center gap-3 mt-8 mb-10">
          <span className="h-px w-14 bg-gold-accent/60" />
          <span
            className="w-2 h-2 rotate-45 bg-gold-accent"
            aria-hidden
          />
          <span className="h-px w-14 bg-gold-accent/60" />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-12">
          <Link
            href="/booking"
            className="font-label uppercase inline-block transition-all duration-200 hover:bg-gold-light"
            style={{
              border: "1px solid #c9a84c",
              color: "#000",
              background: "#c9a84c",
              fontSize: 12,
              fontWeight: 700,
              padding: "16px 52px",
              borderRadius: 0,
              letterSpacing: "0.28em",
            }}
          >
            הזמינו תור
          </Link>
        </div>
      </motion.div>

      {/* Bottom border accent */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.5) 50%, transparent 100%)",
        }}
      />
    </section>
  );
}
