"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface ScrollRevealProps {
  children: string;
  baseOpacity?: number;
  enableBlur?: boolean;
  blurStrength?: number;
  baseRotation?: number;
  rotationEnd?: string;
  wordAnimationEnd?: string;
  containerClassName?: string;
  textClassName?: string;
}

export default function ScrollReveal({
  children,
  baseOpacity = 0.08,
  enableBlur = true,
  blurStrength = 5,
  baseRotation = 2,
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
  containerClassName = "",
  textClassName = "",
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLElement>(null);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (shouldReduce || !containerRef.current) return;

    let triggers: unknown[] = [];

    const run = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const el = containerRef.current;
      if (!el) return;

      const wordSpans = Array.from(el.querySelectorAll<HTMLElement>(".sr-word"));
      if (!wordSpans.length) return;

      // 1. Container rotation
      const t1 = gsap.fromTo(
        el,
        { rotation: baseRotation },
        {
          rotation: 0,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: rotationEnd,
            scrub: true,
          },
        }
      );

      // 2. Word opacity
      const t2 = gsap.fromTo(
        wordSpans,
        { opacity: baseOpacity },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.05,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: wordAnimationEnd,
            scrub: true,
          },
        }
      );

      // 3. Word blur
      if (enableBlur) {
        const t3 = gsap.fromTo(
          wordSpans,
          { filter: `blur(${blurStrength}px)` },
          {
            filter: "blur(0px)",
            ease: "none",
            stagger: 0.05,
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              end: wordAnimationEnd,
              scrub: true,
            },
          }
        );
        triggers.push(t3);
      }

      triggers = [t1, t2, ...triggers];
    };

    run();

    return () => {
      const cleanup = async () => {
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        ScrollTrigger.getAll().forEach((st) => {
          if (
            containerRef.current &&
            st.vars.trigger === containerRef.current
          ) {
            st.kill();
          }
        });
      };
      cleanup();
    };
  }, [shouldReduce, baseOpacity, enableBlur, blurStrength, baseRotation, rotationEnd, wordAnimationEnd]);

  const words = children.split(/\s+/).filter(Boolean);

  return (
    <section
      ref={containerRef}
      className={`scroll-reveal ${containerClassName}`}
      style={{ margin: "20px 0", willChange: "transform" }}
    >
      <p
        className={`scroll-reveal-text ${textClassName}`}
        style={{
          fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
          lineHeight: 1.7,
          fontWeight: 400,
          color: "#c8c8c4",
          textAlign: "center",
        }}
      >
        {words.map((word, i) => (
          <span
            key={i}
            className="sr-word"
            style={{
              display: "inline-block",
              marginLeft: "0.25em",
              willChange: "opacity, filter",
              opacity: shouldReduce ? 1 : baseOpacity,
            }}
          >
            {word}
          </span>
        ))}
      </p>
    </section>
  );
}
