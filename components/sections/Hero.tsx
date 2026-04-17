"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const LOGO_URL =
  "https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png";
const BG_URL =
  "https://vfqanptaeqbpizevonpv.supabase.co/storage/v1/object/public/gallery/Gemini_Generated_Image_g4qm65g4qm65g4qm.png";

export function Hero() {
  const shouldReduce = useReducedMotion();

  const headline = "Carmeli's Studio";

  const charContainerVariants: Variants = shouldReduce
    ? { hidden: {}, visible: {} }
    : { hidden: {}, visible: { transition: { staggerChildren: 0.04, delayChildren: 0.3 } } };

  const charVariants: Variants = shouldReduce
    ? { hidden: {}, visible: {} }
    : {
        hidden: { y: "100%", opacity: 0 },
        visible: {
          y: "0%",
          opacity: 1,
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        },
      };

  const fadeUp = shouldReduce
    ? {}
    : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

  return (
    <section className="relative overflow-hidden flex items-center justify-center min-h-screen">
      {/* Background image with dark filter */}
      <Image
        src={BG_URL}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_30%]"
        style={{ filter: "brightness(0.32)" }}
      />

      {/* Bottom fade to #0d0d0d */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{ height: "180px", background: "linear-gradient(to bottom, transparent 0%, #0d0d0d 100%)" }}
      />

      {/* Content */}
      <div className="relative z-20 text-center flex flex-col items-center gap-5">
        {/* Circular logo */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-full overflow-hidden flex items-center justify-center bg-[#111]"
          style={{
            width: 110,
            height: 110,
            border: "2px solid rgba(201,168,76,0.7)",
          }}
        >
          <Image
            src={LOGO_URL}
            alt="Carmelis Studio"
            width={105}
            height={105}
            priority
            className="object-contain"
            style={{ transform: "scale(1.2)" }}
          />
        </motion.div>

        {/* Headline with character stagger */}
        <motion.h1
          variants={charContainerVariants}
          initial="hidden"
          animate="visible"
          className="font-display italic text-text leading-none"
          style={{ fontSize: "clamp(36px, 6vw, 58px)", fontWeight: 600, letterSpacing: "0.04em" }}
          dir="ltr"
        >
          {headline.split("").map((char, i) => (
            <span key={i} style={{ overflow: "hidden", display: "inline-block" }}>
              <motion.span variants={charVariants} style={{ display: "inline-block" }}>
                {char === " " ? "\u00A0" : char}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        {/* Gold divider line */}
        <motion.div
          variants={fadeUp as Variants}
          initial="hidden"
          animate="visible"
          className="bg-gold-accent"
          style={{ width: 48, height: 1.5 }}
        />

        {/* Outline CTA */}
        <motion.div
          variants={fadeUp as Variants}
          initial="hidden"
          animate="visible"
          style={{ marginTop: 4 }}
        >
          <Link href="/booking">
            <button
              className="font-body transition-colors duration-200 hover:bg-gold-accent/10"
              style={{
                border: "1px solid #c9a84c",
                color: "#c9a84c",
                fontSize: 13,
                padding: "13px 36px",
                borderRadius: 3,
                background: "transparent",
                letterSpacing: "0.05em",
              }}
            >
              הזמן תור עכשיו
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
