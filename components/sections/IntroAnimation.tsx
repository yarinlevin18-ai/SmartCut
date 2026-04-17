"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { LogoImage } from "@/components/ui/LogoImage";

interface IntroAnimationProps {
  onComplete: () => void;
}

function ScissorsSVG() {
  return (
    <svg
      width="160"
      height="70"
      viewBox="0 0 160 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top blade */}
      <motion.g
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -22, 0] }}
        transition={{ delay: 1.8, duration: 0.25, ease: "easeInOut" }}
        style={{ originX: "60px", originY: "35px", transformOrigin: "60px 35px" }}
      >
        <path
          d="M60 35 L150 20 L148 27 L60 35Z"
          fill="#b8952a"
        />
        <circle cx="60" cy="35" r="9" fill="#b8952a" />
        <circle cx="60" cy="35" r="5" fill="#ffffff" />
        {/* Handle top */}
        <ellipse cx="25" cy="20" rx="20" ry="11" fill="none" stroke="#b8952a" strokeWidth="3" />
        <path d="M38 24 L60 35" stroke="#b8952a" strokeWidth="3" strokeLinecap="round" />
      </motion.g>

      {/* Bottom blade */}
      <motion.g
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, 22, 0] }}
        transition={{ delay: 1.8, duration: 0.25, ease: "easeInOut" }}
        style={{ originX: "60px", originY: "35px", transformOrigin: "60px 35px" }}
      >
        <path
          d="M60 35 L150 50 L148 43 L60 35Z"
          fill="#b8952a"
        />
        {/* Handle bottom */}
        <ellipse cx="25" cy="50" rx="20" ry="11" fill="none" stroke="#b8952a" strokeWidth="3" />
        <path d="M38 46 L60 35" stroke="#b8952a" strokeWidth="3" strokeLinecap="round" />
      </motion.g>

      {/* Screw center */}
      <circle cx="60" cy="35" r="5" fill="#d4a843" />
    </svg>
  );
}

export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const shouldReduce = useReducedMotion();
  const [showScissors, setShowScissors] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [exiting, setExiting] = useState(false);

  const complete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (shouldReduce) {
      const t = setTimeout(complete, 300);
      return () => clearTimeout(t);
    }

    // Logo rolls in (0-600ms)
    // Scissors appear and slide (700-1200ms)
    // Scissors snip (1100-1200ms)
    // Gold slash appears (1150-1500ms)
    const t1 = setTimeout(() => setShowScissors(true), 700);
    // Logo splits apart (1300ms)
    const t2 = setTimeout(() => setShowSplit(true), 1300);
    // Start exit fade (1600ms)
    const t3 = setTimeout(() => setExiting(true), 1600);
    // Call complete (1800ms)
    const t4 = setTimeout(complete, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [shouldReduce, complete]);

  if (shouldReduce) return null;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[9999] bg-white flex items-center justify-center overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Logo container with rolling animation */}
          <motion.div
            initial={{ x: "-110vw", rotate: -540 }}
            animate={{ x: 0, rotate: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-[150px] h-[150px]"
          >
            {/* Original logo (hidden when split starts) */}
            <motion.div
              animate={{ opacity: showSplit ? 0 : 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <LogoImage
                width={150}
                height={150}
                priority
                className="rounded-full"
              />
            </motion.div>

            {/* Top half (clips top 50%) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showSplit ? 1 : 0 }}
              transition={{ duration: 0 }}
              className="absolute inset-0 overflow-hidden rounded-full"
              style={{ clipPath: "inset(0 0 50% 0)" }}
            >
              <LogoImage
                width={150}
                height={150}
                priority
                className="rounded-full"
                alt=""
              />
              <motion.div
                animate={showSplit ? { y: -90, opacity: 0 } : { y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-0"
              />
            </motion.div>

            {/* Bottom half (clips bottom 50%) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showSplit ? 1 : 0 }}
              transition={{ duration: 0 }}
              className="absolute inset-0 overflow-hidden rounded-full"
              style={{ clipPath: "inset(50% 0 0 0)" }}
            >
              <LogoImage
                width={150}
                height={150}
                priority
                className="rounded-full"
                alt=""
              />
              <motion.div
                animate={showSplit ? { y: 90, opacity: 0 } : { y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-0"
              />
            </motion.div>

            {/* Scissors slide across */}
            <AnimatePresence>
              {showScissors && (
                <motion.div
                  key="scissors"
                  className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
                  initial={{ x: "-250px" }}
                  animate={{ x: "0px" }}
                  exit={{ x: "250px", opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ScissorsSVG />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Gold slash line (appears as scissors cuts) */}
            <AnimatePresence>
              {showScissors && (
                <motion.div
                  key="slash"
                  className="absolute top-1/2 left-0 right-0 h-[2px] bg-gold-accent -translate-y-1/2"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 1, 0] }}
                  transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                  style={{ transformOrigin: "center" }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
