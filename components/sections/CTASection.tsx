"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { itemVariants } from "@/lib/animations";

export function CTASection() {
  return (
    <section className="relative py-20 bg-dark overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,149,42,0.10),transparent_70%)] pointer-events-none" />
      <motion.div
        variants={itemVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="relative z-10 max-w-4xl mx-auto px-4 text-center"
      >
        <motion.div
          className="w-16 h-[2px] bg-gold-accent mx-auto mb-8 origin-center"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
        />
        <h2 className="font-display text-5xl md:text-6xl text-white mb-4">
          הגיע הזמן להשקיע בעצמך
        </h2>
        <p className="text-xl text-muted mb-8">
          מקום אחד בשבוע. ידיים מקצועיות. חוויה שתרצו לחזור אליה.
        </p>
        <Link href="/booking">
          <Button size="lg" className="text-lg px-12 py-5">
            קבע תור עכשיו
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}
