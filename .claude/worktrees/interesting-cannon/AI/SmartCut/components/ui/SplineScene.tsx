"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";

// SSR disabled — Spline requires window, WebGLRenderingContext, requestAnimationFrame
const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

interface SplineSceneProps {
  /** URL to .splinecode file (local: "/scene.splinecode" or Spline CDN URL) */
  scene: string;
  /** Container height (default: 100%) */
  height?: string;
  /** Called when the scene finishes loading */
  onLoad?: () => void;
}

/**
 * SSR-safe Spline 3D scene embed.
 * - Fades in when the first frame renders
 * - Respects prefers-reduced-motion (skips render entirely)
 * - All overlay siblings must use pointer-events-none to preserve Spline mouse interaction
 */
export function SplineScene({ scene, height = "100%", onLoad }: SplineSceneProps) {
  const [loaded, setLoaded] = useState(false);
  const shouldReduce = useReducedMotion();

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  if (shouldReduce) return null;

  return (
    <div style={{ position: "absolute", inset: 0, height, zIndex: 1 }}>
      {/* Shimmer while loading */}
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(201,168,76,0.04) 0%, transparent 60%)",
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
      )}

      <motion.div
        style={{ position: "absolute", inset: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Spline
          scene={scene}
          onLoad={handleLoad}
          style={{ width: "100%", height: "100%" }}
        />
      </motion.div>
    </div>
  );
}
