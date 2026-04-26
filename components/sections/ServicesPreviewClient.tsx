"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Service } from "@/types";
import Link from "next/link";

interface ServicesPreviewClientProps {
  services: Service[];
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function ServicesPreviewClient({ services }: ServicesPreviewClientProps) {
  const shouldReduce = useReducedMotion();

  const container: Variants = shouldReduce
    ? { hidden: {}, visible: {} }
    : {
        hidden: {},
        visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
      };

  const row: Variants = shouldReduce
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: 22 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: EASE },
        },
      };

  return (
    <section
      id="menu"
      className="relative overflow-hidden bg-black"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 60%)",
      }}
    >
      {/* Top-edge bridge — softens cut from the hero's bottom fade (#0d0d0d) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(13,13,13,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-24 md:py-32">
        {/* Eyebrow + heading */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center mb-14 md:mb-20"
        >
          <p
            className="font-label uppercase text-gold-accent mb-4"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.36em",
            }}
          >
            Menu · מחירון
          </p>
          <h2
            className="font-display gold-shine"
            style={{
              fontSize: "clamp(40px, 6vw, 72px)",
              lineHeight: 1,
            }}
          >
            מחירון שירותים
          </h2>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="h-px w-10 bg-gold-accent/60" />
            <span
              className="w-1.5 h-1.5 rotate-45 bg-gold-accent"
              aria-hidden
            />
            <span className="h-px w-10 bg-gold-accent/60" />
          </div>
        </motion.div>

        {/* Dotted-leader menu */}
        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="flex flex-col divide-y divide-white/10"
        >
          {services.map((service) => (
            <motion.li key={service.id} variants={row} className="py-6 md:py-7">
              <Link
                href={`/booking?service=${service.id}`}
                className="group flex items-baseline gap-4 md:gap-6 hover:text-gold-accent transition-colors"
              >
                <span
                  className="font-display text-white group-hover:text-gold-accent transition-colors"
                  style={{
                    fontSize: "clamp(22px, 2.6vw, 32px)",
                    lineHeight: 1.1,
                  }}
                >
                  {service.name}
                </span>
                <span
                  aria-hidden
                  className="flex-1 border-b border-dotted border-white/25 translate-y-[-6px]"
                />
                <span
                  className="font-display text-gold-accent shrink-0"
                  style={{ fontSize: "clamp(20px, 2.2vw, 28px)" }}
                >
                  ₪{service.price}
                </span>
              </Link>
              {service.description && (
                <p
                  className="font-body text-white/55 mt-2 md:mt-3"
                  style={{ fontSize: 14, lineHeight: 1.75, fontWeight: 300 }}
                >
                  {service.description}
                  {service.duration_minutes ? (
                    <span
                      className="font-label uppercase text-white/35 mr-3"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.28em",
                      }}
                    >
                      · {service.duration_minutes} דק&apos;
                    </span>
                  ) : null}
                </p>
              )}
            </motion.li>
          ))}
        </motion.ul>

        {/* View all CTA */}
        <div className="text-center mt-16">
          <Link
            href="/services"
            className="inline-flex items-center gap-3 font-label uppercase text-white/80 hover:text-gold-accent transition-colors"
            style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.28em" }}
          >
            <span>כל השירותים</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
