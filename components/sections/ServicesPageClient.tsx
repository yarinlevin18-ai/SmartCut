"use client";

import { motion } from "framer-motion";
import { Service } from "@/types";
import Link from "next/link";

interface ServicesPageClientProps {
  services: Service[];
}

export function ServicesPageClient({ services }: ServicesPageClientProps) {
  // Pick a column count that produces a balanced last row regardless of how
  // many services exist. With 3 cols and 4 services you get an awkward 1-card
  // orphan. With 2 cols and 4 you get 2x2. The rule below picks 2 for counts
  // {2,4}, and 3 for {3,5,6+} — gives the best balance for a small catalogue.
  const cols = pickCols(services.length);

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        // Soft gold studio-light vignette over the dark base. Subtle gradient
        // adds depth so the section isn't a flat black slab; the dust layer
        // (added in app/layout.tsx) drifts on top of this.
        background:
          "radial-gradient(ellipse at top, rgba(201,168,76,0.08) 0%, rgba(13,13,13,0) 55%), radial-gradient(ellipse at bottom, rgba(201,168,76,0.04) 0%, rgba(13,13,13,0) 60%), #0d0d0d",
      }}
    >
      {/* Subtle grain via SVG filter — gives the gold gradient a film-photo feel.
          Pointer-events disabled so it never interferes with clicks. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p
            className="font-label uppercase text-gold-accent mb-4"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.42em" }}
          >
            Services · השירותים
          </p>
          <h1
            className="font-display text-white mb-4"
            style={{ fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 1.05 }}
          >
            כל השירותים שלנו
          </h1>
          {/* Hairline gold divider — small, centred, period detail. */}
          <div className="flex justify-center">
            <span
              aria-hidden
              className="block"
              style={{
                width: 56,
                height: 1,
                background:
                  "linear-gradient(to right, transparent, #c9a84c, transparent)",
              }}
            />
          </div>
        </motion.div>

        {services.length === 0 ? (
          <div className="text-center text-muted py-20">אין שירותים זמינים</div>
        ) : (
          <div
            className={`grid grid-cols-1 ${cols === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-6 md:gap-8 max-w-5xl mx-auto`}
          >
            {services.map((service, i) => (
              <motion.article
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -2 }}
                className="group relative flex flex-col"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(0,0,0,0) 100%), #0a0a0a",
                  border: "1px solid rgba(201,168,76,0.18)",
                  padding: "32px 28px",
                  // Sharp corners match the studio aesthetic used elsewhere
                  // (admin, manage page). No rounded-lg.
                  borderRadius: 0,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.4)",
                  transition: "border-color 200ms ease",
                }}
              >
                {/* Gold corner accents — luxe period detail */}
                <CornerMark className="top-0 right-0" />
                <CornerMark className="top-0 left-0 -scale-x-100" />
                <CornerMark className="bottom-0 right-0 -scale-y-100" />
                <CornerMark className="bottom-0 left-0 -scale-x-100 -scale-y-100" />

                {/* Header row: name */}
                <div className="mb-5">
                  <h2
                    className="font-display text-white"
                    style={{ fontSize: 28, lineHeight: 1.1 }}
                  >
                    {service.name}
                  </h2>
                </div>

                {/* Description */}
                {service.description && (
                  <p
                    className="font-body text-white/55 mb-6"
                    style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
                  >
                    {service.description}
                  </p>
                )}

                {/* Stats row — duration + price, separated by a subtle hairline */}
                <div
                  className="flex items-center justify-between mb-7 pt-5"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span
                    className="font-label uppercase text-white/50"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.28em",
                    }}
                  >
                    {service.duration_minutes} דקות
                  </span>
                  <span
                    className="font-display text-gold-accent"
                    style={{ fontSize: 26, lineHeight: 1 }}
                  >
                    ₪{service.price}
                  </span>
                </div>

                {/* CTA */}
                <Link
                  href={`/booking?service=${service.id}`}
                  className="block text-center font-label uppercase transition-all duration-200 mt-auto group-hover:bg-gold-accent group-hover:text-black"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.32em",
                    padding: "14px 16px",
                    border: "1px solid rgba(201,168,76,0.5)",
                    color: "#c9a84c",
                    background: "transparent",
                    borderRadius: 0,
                  }}
                >
                  הזמן תור
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function pickCols(n: number): 2 | 3 {
  if (n <= 1) return 2;
  if (n === 2 || n === 4) return 2;
  return 3;
}

function CornerMark({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute ${className}`}
      style={{
        width: 14,
        height: 14,
        borderTop: "1px solid rgba(201,168,76,0.55)",
        borderRight: "1px solid rgba(201,168,76,0.55)",
      }}
    />
  );
}
