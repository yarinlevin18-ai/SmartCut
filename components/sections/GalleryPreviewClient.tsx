"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GalleryPhoto } from "@/types";
import Image from "next/image";
import Link from "next/link";

interface GalleryPreviewClientProps {
  photos: GalleryPhoto[];
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function GalleryPreviewClient({ photos }: GalleryPreviewClientProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const shouldReduce = useReducedMotion();

  const goTo = useCallback(
    (index: number, dir: number) => {
      const newIndex = (index + photos.length) % photos.length;
      if (newIndex === current) return;
      setDirection(dir);
      setCurrent(newIndex);
    },
    [current, photos.length]
  );

  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") next();
      else if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  if (photos.length === 0) {
    return (
      <section className="bg-black px-5 md:px-10 py-24">
        <p className="text-center text-white/40 font-body text-sm">
          אין תמונות בגלריה עדיין
        </p>
      </section>
    );
  }

  const activePhoto = photos[current];

  return (
    <section
      id="gallery"
      className="relative overflow-hidden bg-black"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 100%, rgba(201,168,76,0.06) 0%, transparent 60%)",
      }}
    >
      {/* Bottom-edge bridge — fades black → reviews' #050505 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(5,5,5,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        {/* Heading */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center mb-14 md:mb-20"
        >
          <p
            className="font-label uppercase text-gold-accent mb-4"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.36em",
            }}
          >
            Gallery · גלריה
          </p>
          <h2
            className="font-display text-white"
            style={{
              fontSize: "clamp(40px, 6vw, 72px)",
              lineHeight: 1,
            }}
          >
            גלריה
          </h2>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="h-px w-10 bg-gold-accent/60" />
            <span
              className="w-1.5 h-1.5 rotate-45 bg-gold-accent"
              aria-hidden
            />
            <span className="h-px w-10 bg-gold-accent/60" />
          </div>
        </motion.div>

        {/* Slider frame */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative overflow-hidden bg-[#0a0a0a]"
          style={{
            aspectRatio: "16 / 10",
            border: "1px solid rgba(201,168,76,0.18)",
          }}
        >
          {/* Blurred backdrop */}
          {activePhoto.public_url && (
            <div
              aria-hidden
              className="absolute pointer-events-none"
              style={{
                inset: "-30px",
                backgroundImage: `url(${activePhoto.public_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(20px) brightness(0.22) saturate(0.6)",
                transform: "scale(1.15)",
              }}
            />
          )}

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              initial={
                shouldReduce
                  ? { opacity: 0 }
                  : { x: direction > 0 ? 60 : -60, opacity: 0 }
              }
              animate={{ x: 0, opacity: 1 }}
              exit={
                shouldReduce
                  ? { opacity: 0 }
                  : { x: direction > 0 ? -60 : 60, opacity: 0 }
              }
              transition={{ duration: 0.55, ease: EASE }}
              drag={shouldReduce ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -50) next();
                else if (info.offset.x > 50) prev();
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {activePhoto.public_url && (
                <div className="relative h-full w-full">
                  <Image
                    src={activePhoto.public_url}
                    alt={activePhoto.caption || "Gallery photo"}
                    fill
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-contain"
                    draggable={false}
                    priority={current === 0}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Caption overlay */}
          {activePhoto.caption && (
            <div
              className="absolute left-0 right-0 bottom-0 z-10 px-6 md:px-10 py-5 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
              }}
            >
              <p
                className="font-body text-white/85 text-center"
                style={{ fontSize: 14, fontWeight: 300, letterSpacing: "0.02em" }}
              >
                {activePhoto.caption}
              </p>
            </div>
          )}
        </motion.div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-8 gap-6">
          {/* Prev arrow */}
          <button
            aria-label="הקודם"
            onClick={prev}
            className="flex items-center justify-center transition-all hover:bg-gold-accent hover:text-black"
            style={{
              width: 48,
              height: 48,
              border: "1px solid rgba(201,168,76,0.4)",
              color: "#c9a84c",
              background: "transparent",
              borderRadius: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Counter + dots */}
          <div className="flex flex-col items-center gap-3 flex-1">
            <span
              className="font-label uppercase text-white/60"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.36em" }}
            >
              {String(current + 1).padStart(2, "0")} &nbsp;/&nbsp;{" "}
              {String(photos.length).padStart(2, "0")}
            </span>
            <div className="flex gap-2">
              {photos.map((_, i) => (
                <button
                  key={i}
                  aria-label={`תמונה ${i + 1}`}
                  onClick={() => goTo(i, i > current ? 1 : -1)}
                  className="transition-all duration-300"
                  style={{
                    width: i === current ? 24 : 6,
                    height: 2,
                    background:
                      i === current ? "#c9a84c" : "rgba(255,255,255,0.2)",
                    border: "none",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Next arrow */}
          <button
            aria-label="הבא"
            onClick={next}
            className="flex items-center justify-center transition-all hover:bg-gold-accent hover:text-black"
            style={{
              width: 48,
              height: 48,
              border: "1px solid rgba(201,168,76,0.4)",
              color: "#c9a84c",
              background: "transparent",
              borderRadius: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* View all CTA */}
        <div className="text-center mt-14">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-3 font-label uppercase text-white/80 hover:text-gold-accent transition-colors"
            style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.28em" }}
          >
            <span>כל הגלריה</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
