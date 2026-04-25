"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/types";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ProductsPreviewProps {
  products: Product[];
}

/**
 * Homepage products section. Slots between Services and Gallery.
 * Renders up to 4 active products in a balanced grid; if there are
 * more, shows a "כל המוצרים" link to /products.
 */
export function ProductsPreview({ products }: ProductsPreviewProps) {
  const shouldReduce = useReducedMotion();
  if (!products.length) return null;

  const featured = products.slice(0, 4);
  const cols = featured.length === 4 ? 2 : Math.min(featured.length, 3);
  const showAllLink = products.length > 4;

  return (
    <section
      id="products"
      className="relative overflow-hidden bg-black"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 60%)",
      }}
    >
      {/* Top + bottom bridges to blend into adjacent sections */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-24 md:py-32">
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
              letterSpacing: "0.42em",
            }}
          >
            Products · המוצרים
          </p>
          <h2
            className="font-display text-white"
            style={{ fontSize: "clamp(36px, 5.5vw, 56px)", lineHeight: 1.05 }}
          >
            הקולקציה
          </h2>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="h-px w-10 bg-gold-accent/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-gold-accent" aria-hidden />
            <span className="h-px w-10 bg-gold-accent/60" />
          </div>
        </motion.div>

        {/* Grid */}
        <div
          className={`grid grid-cols-1 ${cols === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-6 md:gap-8`}
        >
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>

        {showAllLink && (
          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-block font-label uppercase transition-all duration-200 hover:bg-gold-accent hover:text-black"
              style={{
                border: "1px solid rgba(201,168,76,0.5)",
                color: "#c9a84c",
                background: "transparent",
                fontSize: 11,
                fontWeight: 600,
                padding: "14px 28px",
                borderRadius: 0,
                letterSpacing: "0.32em",
              }}
            >
              כל המוצרים →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.article
      initial={shouldReduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE, delay: index * 0.08 }}
      whileHover={shouldReduce ? undefined : { y: -2 }}
      className="group relative flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(0,0,0,0) 100%), #0a0a0a",
        border: "1px solid rgba(201,168,76,0.18)",
        padding: 0,
        borderRadius: 0,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
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
        <h3
          className="font-display text-white"
          style={{ fontSize: 22, lineHeight: 1.2 }}
        >
          {product.name}
        </h3>
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
              style={{ fontSize: 22, lineHeight: 1 }}
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
  );
}
