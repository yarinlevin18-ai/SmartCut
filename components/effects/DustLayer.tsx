"use client";

import { useEffect, useRef } from "react";

// Subtle ambient dust motes drifting in the studio light. Sits above the page
// background, below all content. Pointer-events disabled. Pauses when the
// document is hidden to avoid burning battery in background tabs. Respects
// prefers-reduced-motion.
//
// Design intent (per user direction): "blends in, flows naturally" — use a
// gold tint that matches the studio palette, low opacity, slow drift. Should
// be visible on a still capture but never call attention to itself.

interface Particle {
  x: number;
  y: number;
  /** Radius in CSS px. */
  r: number;
  /** Drift velocity in CSS px / second. */
  vx: number;
  vy: number;
  /** Alpha 0..1, breathes via sine over `phase`. */
  baseAlpha: number;
  phase: number;
}

const PARTICLE_DENSITY = 0.00009; // particles per CSS px²; ~120 on a 1440x900 viewport
const MIN_PARTICLES = 24;
const MAX_PARTICLES = 180;

// Gold accent in the studio palette.
const COLOR_R = 201;
const COLOR_G = 168;
const COLOR_B = 76;

export function DustLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    const resize = (): void => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = Math.min(
        MAX_PARTICLES,
        Math.max(MIN_PARTICLES, Math.floor(width * height * PARTICLE_DENSITY))
      );
      particles = Array.from({ length: targetCount }, () => spawn(width, height));
    };

    resize();

    if (reduceMotion) {
      // Render one static frame and stop. Still atmospheric, no animation.
      drawFrame(ctx, particles, 0, width, height);
      return;
    }

    let last = performance.now();
    let raf = 0;
    let visible = true;

    const tick = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp to 50ms — avoids huge jumps after tab-switch
      last = now;
      step(particles, dt, width, height);
      drawFrame(ctx, particles, now / 1000, width, height);
      if (visible) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = (): void => {
      visible = !document.hidden;
      if (visible) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{ opacity: 0.85 }}
    />
  );
}

// ---- helpers ----

function spawn(width: number, height: number): Particle {
  // Small particles favored — most are barely-visible motes, a few are larger
  // catches-of-light. Bias toward small via 1 - sqrt(rand).
  const t = 1 - Math.sqrt(Math.random());
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    r: 0.4 + t * 1.6, // 0.4 .. 2.0 px
    vx: (Math.random() - 0.5) * 6, // px/sec, gentle horizontal drift
    vy: 4 + Math.random() * 10, // px/sec, mostly downward like drifting dust
    baseAlpha: 0.06 + Math.random() * 0.18, // up to ~0.24 — visible but soft
    phase: Math.random() * Math.PI * 2,
  };
}

function step(particles: Particle[], dt: number, width: number, height: number): void {
  for (const p of particles) {
    // Add a tiny sin-curl to make drift feel organic instead of straight-line.
    const wobble = Math.sin(p.phase + p.y * 0.01) * 0.6;
    p.x += (p.vx + wobble) * dt;
    p.y += p.vy * dt;
    p.phase += dt * 0.4;

    // Wrap. Fade-in from the top edge on respawn so they don't pop.
    if (p.y - p.r > height) {
      p.y = -p.r;
      p.x = Math.random() * width;
    }
    if (p.x < -p.r) p.x = width + p.r;
    else if (p.x > width + p.r) p.x = -p.r;
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  tSec: number,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  for (const p of particles) {
    // Slow alpha breathing so the field feels alive even when static.
    const alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(p.phase + tSec * 0.6));
    // Soft falloff via radial gradient — cheaper than per-pixel blur.
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
    grad.addColorStop(0, `rgba(${COLOR_R},${COLOR_G},${COLOR_B},${alpha})`);
    grad.addColorStop(1, `rgba(${COLOR_R},${COLOR_G},${COLOR_B},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
