"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const REVIEWS = [
  {
    quote:
      "הכי הכי בעולם. מגיע עם ציפיות ויוצא עם חוויה. מוסף ערך לכל פגישה שלי.",
    name: "יואב ב.",
    role: "לקוח קבוע",
  },
  {
    quote:
      "שירות ברמה אחרת. הפרטים הקטנים — הקצף החם, המגבות, הקפה — הופכים תסרוקת לטקס.",
    name: "אורן מ.",
    role: "תל אביב",
  },
  {
    quote:
      "המקום היחיד שאני נותן בו את הראש שלי בעיניים עצומות. דיוק, סגנון, אווירה.",
    name: "דניאל ק.",
    role: "לקוח 3 שנים",
  },
];

export function Reviews() {
  const shouldReduce = useReducedMotion();

  const container: Variants = shouldReduce
    ? { hidden: {}, visible: {} }
    : {
        hidden: {},
        visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
      };

  const card: Variants = shouldReduce
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: 28 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: EASE },
        },
      };

  return (
    <section
      id="reviews"
      className="relative overflow-hidden"
      style={{
        background: "#050505",
        backgroundImage:
          "linear-gradient(180deg, rgba(201,168,76,0.04) 0%, transparent 40%, rgba(201,168,76,0.04) 100%)",
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        {/* Heading */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center mb-16 md:mb-20"
        >
          <p
            className="font-label uppercase text-gold-accent mb-4"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.36em",
            }}
          >
            Testimonials · מה אומרים
          </p>
          <h2
            className="font-display text-white"
            style={{
              fontSize: "clamp(40px, 6vw, 72px)",
              lineHeight: 1,
            }}
          >
            לקוחות שחזרו, וחוזרים
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

        {/* Cards */}
        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
        >
          {REVIEWS.map((review, i) => (
            <motion.li
              key={i}
              variants={card}
              className="relative bg-black p-8 md:p-10 flex flex-col"
              style={{
                border: "1px solid rgba(201,168,76,0.15)",
              }}
            >
              {/* Gold diamond ornament */}
              <div className="flex items-center gap-2 mb-6">
                <span className="h-px w-6 bg-gold-accent/60" />
                <span
                  className="w-1.5 h-1.5 rotate-45 bg-gold-accent"
                  aria-hidden
                />
              </div>

              {/* Quote */}
              <blockquote
                className="font-body text-white/85 flex-1"
                style={{
                  fontSize: 16,
                  fontWeight: 300,
                  lineHeight: 1.8,
                }}
              >
                &ldquo;{review.quote}&rdquo;
              </blockquote>

              {/* Attribution */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div
                  className="font-display text-gold-accent mb-1"
                  style={{ fontSize: 18, lineHeight: 1.2 }}
                >
                  {review.name}
                </div>
                <div
                  className="font-label uppercase text-white/50"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.32em",
                  }}
                >
                  {review.role}
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        {/* Rating footer */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          className="flex flex-col items-center gap-3 mt-16"
        >
          <div className="flex items-center gap-1 text-gold-accent">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          <div
            className="font-label uppercase text-white/60"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.32em",
            }}
          >
            5.0 · Google Reviews
          </div>
        </motion.div>
      </div>
    </section>
  );
}
