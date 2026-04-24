"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { getSiteContent } from "@/lib/actions";

const EASE = [0.22, 1, 0.36, 1] as const;

const DEFAULT_ABOUT =
  "קרמליס סטודיו הוא לא סתם מספרה. זה מקום שנבנה עבור הגבר שיודע מה הוא שווה.\n\nכל תור מתחיל ברגע של שקט — קצף חם, סכין חדה, ידיים שמכירות את העבודה. בין פגישה לפגישה, בין אחריות לאחריות, מגיע לכם הפסקה שתרגישו בה.\n\nמחכים לכם.";

export function About() {
  const [aboutText, setAboutText] = useState(DEFAULT_ABOUT);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    getSiteContent("about_text").then((result) => {
      if (result.success && result.data) setAboutText(result.data);
    });
  }, []);

  const paragraphs = aboutText.split("\n\n").filter((p) => p.trim());

  const container: Variants = shouldReduce
    ? { hidden: {}, visible: {} }
    : {
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.12, delayChildren: 0.05 },
        },
      };

  const item: Variants = shouldReduce
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
      id="about"
      className="relative overflow-hidden bg-black"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.05) 0%, transparent 65%)",
      }}
    >
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-10 py-24 md:py-32 text-center">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p
            variants={item}
            className="font-label uppercase text-gold-accent mb-4"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.36em",
            }}
          >
            About · הסיפור שלנו
          </motion.p>

          <motion.h2
            variants={item}
            className="font-display text-white mb-8"
            style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              lineHeight: 1.05,
            }}
          >
            אמנות הגילוח
            <br />
            <span className="italic text-gold-accent">הגברי</span>
          </motion.h2>

          <motion.div
            variants={item}
            className="flex items-center justify-center gap-3 mb-10"
          >
            <span className="h-px w-10 bg-gold-accent/60" />
            <span
              className="w-1.5 h-1.5 rotate-45 bg-gold-accent"
              aria-hidden
            />
            <span className="h-px w-10 bg-gold-accent/60" />
          </motion.div>

          {paragraphs.map((paragraph, i) => (
            <motion.p
              key={i}
              variants={item}
              className="font-body text-white/70 mb-6 last:mb-0"
              style={{
                fontSize: "clamp(15px, 1.3vw, 17px)",
                fontWeight: 300,
                lineHeight: 1.85,
              }}
            >
              {paragraph}
            </motion.p>
          ))}

          {/* Stats row */}
          <motion.div
            variants={item}
            className="grid grid-cols-3 gap-4 md:gap-10 mt-16 pt-12 border-t border-white/10"
          >
            {[
              { value: "5+", label: "Years" },
              { value: "10k+", label: "Cuts" },
              { value: "6", label: "Days / week" },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  className="font-display text-gold-accent mb-2"
                  style={{
                    fontSize: "clamp(32px, 4vw, 48px)",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  className="font-label uppercase text-white/55"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.36em",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
