"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { GalleryPhoto } from "@/types";
import Image from "next/image";
import Link from "next/link";

interface GalleryPreviewClientProps {
  photos: GalleryPhoto[];
}

export function GalleryPreviewClient({ photos }: GalleryPreviewClientProps) {
  const [current, setCurrent] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback(
    (index: number, dir: number) => {
      if (isTransitioning) return;
      const newIndex = (index + photos.length) % photos.length;
      if (newIndex === current) return;

      setDirection(dir);
      setNextIndex(newIndex);
      setIsTransitioning(true);

      // Step 1: animate exit of current slide (outgoing fg)
      // Step 2: After 280ms, set next slide and start entry animation
      const timer = setTimeout(() => {
        setCurrent(newIndex);
        setNextIndex(null);
        setIsTransitioning(false);
      }, 280);

      return () => clearTimeout(timer);
    },
    [current, photos.length, isTransitioning]
  );

  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        // RTL: ArrowLeft = next
        next();
      } else if (e.key === "ArrowRight") {
        // RTL: ArrowRight = prev
        prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  if (photos.length === 0) {
    return (
      <section
        className="px-5 md:px-10 py-[72px]"
        style={{ backgroundColor: "#0b0b0d" }}
      >
        <p className="text-center text-muted font-body text-sm">אין תמונות בגלריה עדיין</p>
      </section>
    );
  }

  const activePhoto = photos[current];
  const displayPhoto = nextIndex !== null ? photos[nextIndex] : activePhoto;

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0b0b0d" }}
    >
      <div className="relative z-10 px-5 md:px-10 py-[72px]">
        {/* Section heading */}
        <div className="text-center mb-9">
          <p
            className="font-body text-gold-accent mb-[10px]"
            style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 400 }}
          >
            גלריה
          </p>
          <h2
            className="font-body text-text"
            style={{ fontSize: 32, fontWeight: 300, letterSpacing: "0.08em" }}
          >
            העבודות שלנו
          </h2>
          <div className="w-10 h-[1.5px] bg-gold-accent mx-auto mt-3" />
        </div>

        {/* Slider */}
        <div
          className="relative rounded-lg overflow-hidden bg-[#111] cursor-grab active:cursor-grabbing"
          style={{ height: 520 }}
        >
          {/* Blurred background */}
          {displayPhoto.public_url && (
            <div
              className="absolute pointer-events-none"
              style={{
                inset: "-20px",
                backgroundImage: `url(${displayPhoto.public_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(14px) brightness(0.25) saturate(0.5)",
                transform: "scale(1.1)",
              }}
            />
          )}

          {/* Foreground slide - current photo (exiting if transitioning) */}
          {activePhoto.public_url && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={false}
              animate={
                isTransitioning && nextIndex !== null
                  ? { x: direction > 0 ? 90 : -90, opacity: 0 }
                  : { x: 0, opacity: 1 }
              }
              transition={
                isTransitioning && nextIndex !== null
                  ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 0 }
              }
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -40) next();
                else if (info.offset.x > 40) prev();
              }}
            >
              <div className="relative h-full" style={{ width: "65%" }}>
                <Image
                  src={activePhoto.public_url}
                  alt={activePhoto.caption || "Gallery photo"}
                  fill
                  sizes="65vw"
                  className="object-cover object-top rounded"
                  draggable={false}
                />
              </div>
            </motion.div>
          )}

          {/* Foreground slide - next photo (entering if transitioning) */}
          {isTransitioning && nextIndex !== null && displayPhoto.public_url && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ x: direction > 0 ? -70 : 70, opacity: 0.2 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -40) next();
                else if (info.offset.x > 40) prev();
              }}
            >
              <div className="relative h-full" style={{ width: "65%" }}>
                <Image
                  src={displayPhoto.public_url}
                  alt={displayPhoto.caption || "Gallery photo"}
                  fill
                  sizes="65vw"
                  className="object-cover object-top rounded"
                  draggable={false}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-4 px-1">
          {/* Dots */}
          <div className="flex gap-2">
            {photos.map((_, i) => (
              <button
                key={i}
                aria-label={`תמונה ${i + 1}`}
                onClick={() => goTo(i, i > current ? 1 : -1)}
                className="rounded-full border-none p-0 transition-all duration-200"
                style={{
                  width: 7,
                  height: 7,
                  background: i === current ? "#c9a84c" : "rgba(255,255,255,0.15)",
                  transform: i === current ? "scale(1.35)" : "scale(1)",
                }}
              />
            ))}
          </div>

          {/* Counter */}
          <span className="font-body text-muted" style={{ fontSize: 12, letterSpacing: "0.1em" }}>
            {String(current + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
          </span>

          {/* Arrows */}
          <div className="flex gap-[10px]">
            <button
              aria-label="הקודם"
              onClick={prev}
              className="flex items-center justify-center transition-colors duration-200 hover:bg-gold-accent/12"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid rgba(201,168,76,0.35)",
                color: "#c9a84c",
                background: "transparent",
                fontSize: 20,
              }}
            >
              ›
            </button>
            <button
              aria-label="הבא"
              onClick={next}
              className="flex items-center justify-center transition-colors duration-200 hover:bg-gold-accent/12"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid rgba(201,168,76,0.35)",
                color: "#c9a84c",
                background: "transparent",
                fontSize: 20,
              }}
            >
              ‹
            </button>
          </div>
        </div>

        {/* View all */}
        <div className="text-center mt-8">
          <Link
            href="/gallery"
            className="font-body text-muted hover:text-gold-accent transition-colors"
            style={{ fontSize: 12, letterSpacing: "0.1em" }}
          >
            לכל הגלריה →
          </Link>
        </div>
      </div>
    </section>
  );
}
