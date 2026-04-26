"use client";

import { motion } from "framer-motion";
import type { Product } from "@/types";

interface ProductsPageClientProps {
  products: Product[];
}

function pickCols(n: number): 2 | 3 {
  if (n <= 1) return 2;
  if (n === 2 || n === 4) return 2;
  return 3;
}

export function ProductsPageClient({ products }: ProductsPageClientProps) {
  const cols = pickCols(products.length);

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(201,168,76,0.08) 0%, rgba(13,13,13,0) 55%), radial-gradient(ellipse at bottom, rgba(201,168,76,0.04) 0%, rgba(13,13,13,0) 60%), #0d0d0d",
      }}
    >
      {/* Subtle film grain — matches the Services page treatment */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p
            className="font-label uppercase text-gold-accent mb-4"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.42em" }}
          >
            Products · המוצרים
          </p>
          <h1
            className="font-display gold-shine mb-4"
            style={{ fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 1.05 }}
          >
            הקולקציה שלנו
          </h1>
          <div className="flex justify-center">
            <span
              aria-hidden
              className="block"
              style={{
                width: 56,
                height: 1,
                background:
                  "linear-gradient(to right, transparent, #c9a84c, transparent)",
              }}
            />
          </div>
        </motion.div>

        {products.length === 0 ? (
          <div
            className="text-center text-white/55 py-20 font-body"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            הקולקציה תעלה בקרוב.
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 ${cols === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-6 md:gap-8 max-w-5xl mx-auto`}
          >
            {products.map((product, i) => (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -2 }}
                className="group relative flex flex-col"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(0,0,0,0) 100%), #0a0a0a",
                  border: "1px solid rgba(201,168,76,0.18)",
                  padding: 0,
                  borderRadius: 0,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.4)",
                  transition: "border-color 200ms ease",
                }}
              >
                <CornerMark className="top-0 right-0" />
                <CornerMark className="top-0 left-0 -scale-x-100" />
                <CornerMark className="bottom-0 right-0 -scale-y-100" />
                <CornerMark className="bottom-0 left-0 -scale-x-100 -scale-y-100" />

                {/* Image */}
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden"
                  style={{ background: "#0d0d0d" }}
                >
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-label uppercase text-white/20"
                      style={{ fontSize: 10, letterSpacing: "0.32em" }}
                    >
                      no image
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col p-6 md:p-7">
                  <h2
                    className="font-display text-white"
                    style={{ fontSize: 24, lineHeight: 1.15 }}
                  >
                    {product.name}
                  </h2>
                  {product.description && (
                    <p
                      className="font-body text-white/55 mt-3"
                      style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
                    >
                      {product.description}
                    </p>
                  )}
                  <div
                    className="mt-auto pt-5 flex items-center justify-between"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {product.price !== null ? (
                      <span
                        className="font-display text-gold-accent"
                        style={{ fontSize: 24, lineHeight: 1 }}
                      >
                        ₪{product.price}
                      </span>
                    ) : (
                      <span
                        className="font-label uppercase text-white/45"
                        style={{ fontSize: 10, letterSpacing: "0.28em" }}
                      >
                        שאל בסטודיו
                      </span>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CornerMark({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute ${className}`}
      style={{
        width: 14,
        height: 14,
        borderTop: "1px solid rgba(201,168,76,0.55)",
        borderRight: "1px solid rgba(201,168,76,0.55)",
      }}
    />
  );
}
