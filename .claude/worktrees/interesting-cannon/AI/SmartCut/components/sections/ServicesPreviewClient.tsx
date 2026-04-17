"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Service } from "@/types";
import Link from "next/link";
import { containerVariants, itemVariants } from "@/lib/animations";
import { BorderGlow } from "@/components/ui/BorderGlow";

interface ServicesPreviewClientProps {
  services: Service[];
}

export function ServicesPreviewClient({ services }: ServicesPreviewClientProps) {
  const shouldReduce = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 20% 30%, rgba(201,168,76,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(201,168,76,0.03) 0%, transparent 60%), repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(201,168,76,0.015) 40px, rgba(201,168,76,0.015) 41px)",
        backgroundColor: "#0b0b0d",
      }}
    >
      <div className="relative z-10 px-5 md:px-10 py-[72px]">
        {/* Section heading */}
        <div className="text-center mb-11">
          <p
            className="font-body text-gold-accent mb-[10px]"
            style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 400 }}
          >
            הסטודיו
          </p>
          <h2
            className="font-body text-text"
            style={{ fontSize: 32, fontWeight: 300, letterSpacing: "0.08em" }}
          >
            השירותים שלנו
          </h2>
          <div className="w-10 h-[1.5px] bg-gold-accent mx-auto mt-3" />
        </div>

        {/* Cards grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          variants={shouldReduce ? {} : containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {services.map((service) => (
            <motion.div
              key={service.id}
              variants={shouldReduce ? {} : itemVariants}
            >
            <BorderGlow
              className="rounded-lg p-6 h-full"
              style={{
                background: "rgba(20,20,23,0.85)",
                borderTop: "2px solid #c9a84c",
              }}
              borderRadius={8}
              spread={100}
            >
              {/* Service name in display italic */}
              <p
                className="font-display italic text-gold-accent mb-1"
                style={{ fontSize: 22, fontWeight: 600 }}
              >
                {service.name}
              </p>

              {/* Description */}
              <p className="font-body text-muted mb-[18px]" style={{ fontSize: 12, lineHeight: 1.7 }}>
                {service.description ?? ""}
              </p>

              {/* Meta row */}
              <div
                className="flex justify-between items-end pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span
                  className="font-display text-gold-accent"
                  style={{ fontSize: 22 }}
                >
                  ₪{service.price}
                </span>
                <Link
                  href={`/booking?service=${service.id}`}
                  className="font-body text-muted hover:text-gold-accent transition-colors"
                  style={{ fontSize: 12 }}
                >
                  הזמן &rarr;
                </Link>
              </div>
            </BorderGlow>
            </motion.div>
          ))}
        </motion.div>

        {/* View all link */}
        <div className="text-center mt-10">
          <Link
            href="/services"
            className="font-body text-muted hover:text-gold-accent transition-colors"
            style={{ fontSize: 12, letterSpacing: "0.1em" }}
          >
            לכל השירותים →
          </Link>
        </div>
      </div>
    </section>
  );
}
