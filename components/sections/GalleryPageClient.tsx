"use client";

import { motion } from "framer-motion";
import { GalleryPhoto } from "@/types";
import Image from "next/image";

interface GalleryPageClientProps {
  photos: GalleryPhoto[];
}

export function GalleryPageClient({ photos }: GalleryPageClientProps) {
  return (
    <main className="min-h-screen bg-dark py-20">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-5xl text-center text-white mb-16"
        >
          העבודות שלנו
        </motion.h1>

        {photos.length === 0 ? (
          <div className="text-center text-muted">אין תמונות בגלריה עדיין</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="relative aspect-square rounded-lg overflow-hidden group bg-dark/50"
              >
                {photo.public_url ? (
                  <Image
                    src={photo.public_url}
                    alt={photo.caption || "Gallery photo"}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-dark/70">
                    <p className="text-muted text-sm">תמונה לא זמינה</p>
                  </div>
                )}
                {photo.caption && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white text-center px-4">{photo.caption}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
