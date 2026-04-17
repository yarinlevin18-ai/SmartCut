"use client";

import { useRef, useState, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

interface BorderGlowProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Glow color (default: gold accent) */
  color?: string;
  /** Border width in px (default: 1) */
  borderWidth?: number;
  /** Glow arc spread in degrees (default: 80) */
  spread?: number;
  /** Border radius passed through to the wrapper */
  borderRadius?: string | number;
}

/**
 * Wraps children with a mouse-reactive conic-gradient border.
 * The glow follows the cursor around the edge of the element.
 * On touch/reduced-motion, falls back to a static gold border.
 */
export function BorderGlow({
  children,
  className,
  style,
  color = "#c9a84c",
  borderWidth = 1,
  spread = 80,
  borderRadius = 8,
}: BorderGlowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(90);
  const [hovered, setHovered] = useState(false);
  const shouldReduce = useReducedMotion();

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || shouldReduce) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const deg = Math.atan2(y, x) * (180 / Math.PI) + 90;
    setAngle(deg);
  }, [shouldReduce]);

  const borderRadiusPx = typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius;

  const staticBorder = `1px solid rgba(201,168,76,0.25)`;

  if (shouldReduce) {
    return (
      <div
        className={className}
        style={{ ...style, border: staticBorder, borderRadius: borderRadiusPx }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        position: "relative",
        borderRadius: borderRadiusPx,
        // Transparent border used as spacing so content doesn't overlap the glow layer
        border: `${borderWidth}px solid transparent`,
        backgroundClip: "padding-box",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glow border layer — sits behind content via negative inset */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -borderWidth,
          borderRadius: borderRadiusPx,
          padding: borderWidth,
          background: hovered
            ? `conic-gradient(from ${angle}deg, transparent ${90 - spread / 2}deg, ${color} ${90}deg, transparent ${90 + spread / 2}deg)`
            : `linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.06))`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          transition: hovered ? "none" : "background 0.4s ease",
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}
