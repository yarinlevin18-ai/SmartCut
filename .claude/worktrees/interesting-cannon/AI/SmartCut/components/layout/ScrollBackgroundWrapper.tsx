"use client";

import { useScroll, useTransform, motion } from "framer-motion";
import type { ReactNode } from "react";

interface ScrollBackgroundWrapperProps {
  children: ReactNode;
}

export function ScrollBackgroundWrapper({ children }: ScrollBackgroundWrapperProps) {
  const { scrollY } = useScroll();

  // Transition from white (hero) to dark background as user scrolls
  // At scrollY=0 (top): white, At scrollY=1200: dark
  const backgroundColor = useTransform(
    scrollY,
    [0, 1200],
    ["#ffffff", "#0d0d0d"]
  );

  // Fade overlay opacity - more subtle and starts later
  const overlayOpacity = useTransform(
    scrollY,
    [400, 800, 1200],
    [0, 0.2, 0.5]
  );

  return (
    <motion.div style={{ backgroundColor }} className="relative transition-none">
      {/* Fade overlay for smooth color transition */}
      <motion.div
        style={{ opacity: overlayOpacity }}
        className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/20 pointer-events-none z-0"
      />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
