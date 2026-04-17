"use client";

import { useEffect, useState } from "react";

export function ScrollOverlayProvider() {
  const [scrollOpacity, setScrollOpacity] = useState(0);

  useEffect(() => {
    let animationFrameId: number;

    const handleScroll = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        // Calculate opacity based on scroll position
        // At 0px scroll: opacity 0 (white)
        // At 400px scroll: opacity 1 (black)
        const maxScroll = 400;
        const currentScroll = window.scrollY;
        const rawOpacity = currentScroll / maxScroll;

        // Apply cubic easing for smooth transition
        const opacity = Math.min(
          rawOpacity < 0.5
            ? 2 * rawOpacity * rawOpacity  // ease-in
            : 1 - Math.pow(-2 * rawOpacity + 2, 2) / 2, // ease-out
          1
        );

        setScrollOpacity(opacity);
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `rgba(0, 0, 0, ${scrollOpacity})`,
        pointerEvents: "none",
        zIndex: 9998,
        transition: "background-color 0.05s ease-out",
      }}
      suppressHydrationWarning
    />
  );
}
