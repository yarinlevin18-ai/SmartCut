"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import Image from "next/image";

export interface MasonryItem {
  id: string;
  img: string;
  url?: string;
  height: number;
  caption?: string;
}

interface MasonryProps {
  items: MasonryItem[];
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: "bottom" | "top" | "left" | "right" | "center" | "random";
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
  colorShiftOnHover?: boolean;
  gap?: number;
}

const BREAKPOINTS: [number, number][] = [
  [1500, 5],
  [1000, 4],
  [600, 3],
  [400, 2],
  [0, 1],
];

function getColumns(width: number): number {
  for (const [bp, cols] of BREAKPOINTS) {
    if (width >= bp) return cols;
  }
  return 1;
}

interface ItemLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

function packColumns(
  items: MasonryItem[],
  cols: number,
  containerWidth: number,
  gap: number
): ItemLayout[] {
  const colWidth = (containerWidth - gap * (cols - 1)) / cols;
  const colHeights = Array(cols).fill(0) as number[];
  return items.map((item) => {
    const shortest = colHeights.indexOf(Math.min(...colHeights));
    const renderedH = Math.round(item.height / 2);
    const x = shortest * (colWidth + gap);
    const y = colHeights[shortest];
    colHeights[shortest] += renderedH + gap;
    return { x, y, width: colWidth, height: renderedH };
  });
}

function totalHeight(layouts: ItemLayout[], gap: number): number {
  if (!layouts.length) return 0;
  return Math.max(...layouts.map((l) => l.y + l.height));
}

export default function Masonry({
  items,
  ease = "power3.out",
  duration = 0.6,
  stagger = 0.05,
  animateFrom = "bottom",
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false,
  gap = 12,
}: MasonryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();
  const hasMounted = useRef(false);
  const [containerW, setContainerW] = useState(0);
  const [layouts, setLayouts] = useState<ItemLayout[]>([]);

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Recompute layout on width or items change
  useEffect(() => {
    if (!containerW) return;
    const cols = getColumns(containerW);
    setLayouts(packColumns(items, cols, containerW, gap));
  }, [containerW, items, gap]);

  // GSAP entrance + reflow
  useEffect(() => {
    if (!layouts.length || shouldReduce) return;

    const run = async () => {
      const { gsap } = await import("gsap");
      const el = containerRef.current;
      if (!el) return;

      const itemEls = Array.from(
        el.querySelectorAll<HTMLElement>("[data-masonry-item]")
      );

      if (!hasMounted.current) {
        // Entrance animation
        hasMounted.current = true;
        itemEls.forEach((itemEl, i) => {
          const layout = layouts[i];
          if (!layout) return;
          let fromX = 0, fromY = 0;
          const dir =
            animateFrom === "random"
              ? (["bottom", "top", "left", "right"] as const)[
                  Math.floor(Math.random() * 4)
                ]
              : animateFrom;
          if (dir === "bottom") fromY = 60;
          else if (dir === "top") fromY = -60;
          else if (dir === "left") fromX = -60;
          else if (dir === "right") fromX = 60;
          else if (dir === "center") {
            fromX = containerW / 2 - (layout.x + layout.width / 2);
            fromY = (el.clientHeight || 400) / 2 - (layout.y + layout.height / 2);
          }
          gsap.fromTo(
            itemEl,
            {
              opacity: 0,
              x: layout.x + fromX,
              y: layout.y + fromY,
              width: layout.width,
              height: layout.height,
              filter: blurToFocus ? "blur(10px)" : "blur(0px)",
            },
            {
              opacity: 1,
              x: layout.x,
              y: layout.y,
              width: layout.width,
              height: layout.height,
              filter: "blur(0px)",
              duration,
              ease,
              delay: i * stagger,
            }
          );
        });
      } else {
        // Reflow
        itemEls.forEach((itemEl, i) => {
          const layout = layouts[i];
          if (!layout) return;
          gsap.to(itemEl, {
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layout.height,
            duration,
            ease,
            overwrite: "auto",
          });
        });
      }
    };
    run();
  }, [layouts, shouldReduce, animateFrom, blurToFocus, duration, ease, stagger, containerW]);

  // Hover handlers
  const onEnter = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (shouldReduce) return;
      const { gsap } = await import("gsap");
      const img = e.currentTarget.querySelector<HTMLElement>(".m-img");
      if (scaleOnHover && img)
        gsap.to(img, { scale: hoverScale, duration: 0.25, ease: "power2.out" });
      if (colorShiftOnHover) {
        const overlay = e.currentTarget.querySelector<HTMLElement>(".m-overlay");
        if (overlay) gsap.to(overlay, { opacity: 1, duration: 0.3 });
      }
    },
    [shouldReduce, scaleOnHover, hoverScale, colorShiftOnHover]
  );

  const onLeave = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (shouldReduce) return;
      const { gsap } = await import("gsap");
      const img = e.currentTarget.querySelector<HTMLElement>(".m-img");
      if (scaleOnHover && img)
        gsap.to(img, { scale: 1, duration: 0.25, ease: "power2.out" });
      if (colorShiftOnHover) {
        const overlay = e.currentTarget.querySelector<HTMLElement>(".m-overlay");
        if (overlay) gsap.to(overlay, { opacity: 0, duration: 0.3 });
      }
    },
    [shouldReduce, scaleOnHover, colorShiftOnHover]
  );

  const containerHeight = totalHeight(layouts, gap);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: containerHeight || "auto" }}
    >
      {items.map((item, i) => {
        const layout = layouts[i];
        // Before layout computed: stack vertically as fallback
        const fallbackStyle: React.CSSProperties = layout
          ? {
              position: "absolute",
              left: 0,
              top: 0,
              width: layout.width,
              height: layout.height,
              transform: `translate(${layout.x}px, ${layout.y}px)`,
              opacity: shouldReduce ? 1 : 0,
            }
          : { position: "relative", width: "100%", height: "auto", marginBottom: gap };

        return (
          <div
            key={item.id}
            data-masonry-item
            data-key={item.id}
            style={fallbackStyle}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
          >
            {/* Image */}
            <div
              className="m-img"
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
                cursor: item.url ? "pointer" : "default",
              }}
              onClick={() => item.url && window.open(item.url, "_blank", "noopener")}
            >
              <Image
                src={item.img}
                alt={item.caption ?? ""}
                fill
                sizes="(max-width:600px) 50vw, (max-width:1000px) 33vw, 25vw"
                className="object-cover"
                style={{ borderRadius: 10 }}
              />
              {/* Caption overlay */}
              {item.caption && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "10px 12px",
                    background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
                    color: "#f0f0ec",
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    borderRadius: "0 0 10px 10px",
                  }}
                >
                  {item.caption}
                </div>
              )}
              {/* Color shift overlay */}
              {colorShiftOnHover && (
                <div
                  className="m-overlay"
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    background:
                      "linear-gradient(135deg, rgba(201,168,76,0.3), rgba(180,100,50,0.3))",
                    borderRadius: 10,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
