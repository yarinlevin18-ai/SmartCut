"use client";

import { motion } from "framer-motion";
import { GalleryPhoto } from "@/types";
import Masonry, { MasonryItem } from "@/components/ui/Masonry";

interface GalleryPageClientProps {
  photos: GalleryPhoto[];
}

// Vary heights so the masonry layout is interesting
const HEIGHTS = [460, 380, 520, 400, 480, 360, 500, 420, 440];

export function GalleryPageClient({ photos }: GalleryPageClientProps) {
  const items: MasonryItem[] = photos.map((photo, i) => ({
    id: photo.id,
    img: photo.public_url,
    caption: photo.caption ?? "",
    height: HEIGHTS[i % HEIGHTS.length],
  }));

  return (
    <main id="main-content" className="min-h-screen bg-dark py-20">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="font-display italic text-5xl text-center mb-4"
          style={{
            background: "linear-gradient(135deg, #e2c97e 0%, #c9a84c 50%, #f5e6b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          העבודות שלנו
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-10 h-[1.5px] bg-gold-accent mx-auto mb-16"
        />

        {photos.length === 0 ? (
          <div className="text-center text-muted">אין תמונות בגלריה עדיין</div>
        ) : (
          <Masonry
            items={items}
            animateFrom="bottom"
            blurToFocus
            scaleOnHover
            hoverScale={0.97}
            colorShiftOnHover
            stagger={0.06}
            duration={0.65}
            gap={14}
          />
        )}
      </div>
    </main>
  );
}
