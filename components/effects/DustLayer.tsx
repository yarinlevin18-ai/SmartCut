"use client";

import { useEffect, useRef } from "react";

// Subtle ambient dust motes drifting in the studio light. Sits above the page
// background, below all content. Pointer-events disabled. Pauses when the
// document is hidden to avoid burning battery in background tabs. Respects
// prefers-reduced-motion.
//
// Design intent: "blends in, flows naturally" + reacts to scroll so the field
// feels integrated with the page rather than pasted on top. Two dynamic hooks:
//   1. Scroll parallax — particles get a brief upward kick proportional to
//      the user's scroll velocity, simulating "passing through" the dust.
//   2. Per-particle hue jitter — each mote shifts slightly between gold and
//      cream so the field has texture instead of looking like a uniform LED
//      grid.

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
  /** -1..+1 hue jitter — shifts gold ↔ cream so the field isn't monochrome. */
  hueShift: number;
  /** Per-particle parallax sensitivity 0.4..1.0 — slower particles feel
   *  "deeper", faster ones feel "closer to the camera". */
  parallax: number;
}

const PARTICLE_DENSITY = 0.00009; // particles per CSS px²; ~120 on a 1440x900 viewport
const MIN_PARTICLES = 24;
const MAX_PARTICLES = 180;

// Base color = studio gold #c9a84c. Particles individually shift toward
// either a warmer amber or a cooler cream by `hueShift`.
const BASE_R = 201;
const BASE_G = 168;
const BASE_B = 76;

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

    // Scroll-velocity tracking. Decays over time so the kick fades back to
    // baseline after the user stops scrolling.
    let scrollVelocity = 0;
    let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    let lastScrollT = performance.now();

    const onScroll = (): void => {
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastScrollT) / 1000);
      const dy = window.scrollY - lastScrollY;
      // Smooth toward the new instantaneous velocity (px/sec). EMA factor 0.4
      // means a single big scroll spike doesn't dominate the field forever.
      const instant = dy / dt;
      scrollVelocity = scrollVelocity * 0.6 + instant * 0.4;
      lastScrollY = window.scrollY;
      lastScrollT = now;
    };

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
      // Decay scroll velocity each frame so the kick is brief, not permanent.
      scrollVelocity *= Math.pow(0.001, dt); // half-life ~0.1s
      step(particles, dt, width, height, scrollVelocity);
      drawFrame(ctx, particles, now / 1000, width, height);
      if (visible) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = (): void => {
      visible = !document.hidden;
      if (visible) {
        last = performance.now();
        // Reset scroll baseline so a long-paused tab doesn't show a fake jump.
        lastScrollY = window.scrollY;
        lastScrollT = performance.now();
        scrollVelocity = 0;
        raf = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      // Inline styles (not Tailwind classes) — this layer is critical for
      // visual integrity and we don't want a Tailwind JIT hiccup turning it
      // into a 300×150 invisible canvas. zIndex 40 sits above section
      // backgrounds, below navbar (z-50) and modals (z-60+). Screen blend
      // mode means the canvas only ADDS light — text underneath is never
      // darkened.
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 40,
        opacity: 0.85,
        mixBlendMode: "screen",
      }}
    />
  );
}

// ---- helpers ----

function spawn(width: number, height: number): Particle {
  // Small particles favored — most are barely-visible motes, a few are larger
  // catches-of-light. Bias toward small via 1 - sqrt(rand).
  const t = 1 - Math.sqrt(Math.random());
  // Parallax: smaller (deeper-looking) motes drift slower and react to scroll
  // less; bigger ones feel closer.
  const parallax = 0.4 + t * 0.6;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    r: 0.4 + t * 1.6, // 0.4 .. 2.0 px
    vx: (Math.random() - 0.5) * 6, // px/sec, gentle horizontal drift
    vy: 4 + Math.random() * 10, // px/sec, mostly downward like drifting dust
    baseAlpha: 0.06 + Math.random() * 0.18, // up to ~0.24 — visible but soft
    phase: Math.random() * Math.PI * 2,
    hueShift: (Math.random() - 0.5) * 2, // -1 .. +1
    parallax,
  };
}

function step(
  particles: Particle[],
  dt: number,
  width: number,
  height: number,
  scrollVelocity: number,
): void {
  // Convert scroll velocity (pixels per second of page scroll) into a
  // counter-motion on the particles. When user scrolls DOWN (positive
  // scrollVelocity), particles move UP relative to the viewport, simulating
  // "passing through" them. Capped so a wild flick doesn't fling everything
  // off-screen. Per-particle parallax scales the effect.
  const scrollKick = -Math.max(-1500, Math.min(1500, scrollVelocity)) * dt * 0.35;

  for (const p of particles) {
    // Add a tiny sin-curl to make drift feel organic instead of straight-line.
    const wobble = Math.sin(p.phase + p.y * 0.01) * 0.6;
    p.x += (p.vx + wobble) * dt;
    p.y += p.vy * dt + scrollKick * p.parallax;
    p.phase += dt * 0.4;

    // Vertical wrap. After a strong scroll up, particles can overshoot
    // either edge — wrap both ways so we don't lose the field.
    if (p.y - p.r > height) {
      p.y = -p.r;
      p.x = Math.random() * width;
    } else if (p.y + p.r < 0) {
      p.y = height + p.r;
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

    // Per-particle hue tweak. hueShift -1 → warmer/amber, +1 → cooler/cream.
    // Stays inside the studio palette either way.
    const r = clamp(BASE_R + p.hueShift * 14, 0, 255);
    const g = clamp(BASE_G + p.hueShift * 28, 0, 255);
    const b = clamp(BASE_B + p.hueShift * 50, 0, 255);

    // Soft falloff via radial gradient — cheaper than per-pixel blur.
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
    grad.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},${alpha})`);
    grad.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
