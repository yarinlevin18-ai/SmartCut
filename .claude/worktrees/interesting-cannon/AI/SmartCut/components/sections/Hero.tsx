"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { BorderGlow } from "@/components/ui/BorderGlow";
import LightRays from "@/components/ui/LightRays";

const LOGO_URL = "/logo.jpg";
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
        hidden: { y: "110%", opacity: 0, filter: "blur(6px)" },
        visible: {
          y: "0%",
          opacity: 1,
          filter: "blur(0px)",
          transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
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

      {/* Gold light rays overlay */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#c9a84c"
        lightSpread={0.5}
        rayLength={2.2}
        raysSpeed={0.4}
        pulsating
        fadeDistance={0.9}
        saturation={0.85}
        followMouse
        mouseInfluence={0.06}
        style={{ zIndex: 6 }}
      />

      {/* Bottom fade to #0d0d0d */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{ height: "180px", background: "linear-gradient(to bottom, transparent 0%, #0d0d0d 100%)" }}
      />

      {/* Content */}
      <div className="relative z-20 text-center flex flex-col items-center gap-8">
        {/* Logo + Headline integrated container */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="relative flex flex-col items-center gap-4"
        >
          {/* Circular logo */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              borderRadius: "50%",
              overflow: "hidden",
              width: 148,
              height: 148,
              border: "2px solid rgba(201,168,76,0.7)",
              boxShadow: "0 0 32px rgba(201,168,76,0.25), 0 0 0 4px rgba(201,168,76,0.08)",
              flexShrink: 0,
              background: "#fff",
            }}
          >
            <Image
              src={LOGO_URL}
              alt="Carmelis Studio"
              width={148}
              height={148}
              priority
              className="object-cover w-full h-full"
              style={{ transform: "scale(1.08)", transformOrigin: "center" }}
            />
          </motion.div>

          {/* Connecting line from logo to text */}
          <motion.div
            variants={fadeUp as Variants}
            initial="hidden"
            animate="visible"
            className="bg-gradient-to-b from-gold-accent via-gold-accent to-transparent"
            style={{ width: 1.5, height: 20 }}
          />

          {/* Headline with character stagger + gold glow */}
          <motion.h1
            variants={charContainerVariants}
            initial="hidden"
            animate="visible"
            className="font-display italic leading-none"
            style={{
              fontSize: "clamp(40px, 6vw, 68px)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textAlign: "center",
            }}
            dir="ltr"
          >
            {headline.split("").map((char, i) => {
              // Compute gradient position per character so gold flows left→right
              const pct = headline.length > 1 ? (i / (headline.length - 1)) * 100 : 0;
              return (
                <span key={i} style={{ overflow: "hidden", display: "inline-block" }}>
                  <motion.span
                    variants={charVariants}
                    style={{
                      display: "inline-block",
                      background: `linear-gradient(135deg, #e2c97e 0%, #c9a84c 40%, #f5e6b8 70%, #c9a84c 100%)`,
                      backgroundSize: "250% 250%",
                      backgroundPosition: `${pct}% 50%`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      ...(shouldReduce ? {} : { animation: `heroShimmer 4s linear infinite ${1.8 + i * 0.04}s` }),
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                </span>
              );
            })}
          </motion.h1>
        </motion.div>

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
          <BorderGlow borderRadius={3} spread={130} color="#c9a84c" borderWidth={1}>
            <Link href="/booking">
              <motion.button
                className="font-body relative"
                style={{
                  border: "none",
                  color: "#c9a84c",
                  fontSize: 13,
                  padding: "13px 36px",
                  borderRadius: 3,
                  background: "transparent",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  display: "block",
                }}
                animate={shouldReduce ? {} : {
                  boxShadow: [
                    "0 0 0px rgba(201,168,76,0)",
                    "0 0 20px rgba(201,168,76,0.5)",
                    "0 0 0px rgba(201,168,76,0)",
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.04, backgroundColor: "rgba(201,168,76,0.08)" }}
                whileTap={{ scale: 0.97 }}
              >
                הזמן תור עכשיו
              </motion.button>
            </Link>
          </BorderGlow>
        </motion.div>
      </div>
    </section>
  );
}
