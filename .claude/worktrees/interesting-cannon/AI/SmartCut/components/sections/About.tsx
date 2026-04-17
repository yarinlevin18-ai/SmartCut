"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getSiteContent } from "@/lib/actions";
import { itemVariants } from "@/lib/animations";
import ScrollReveal from "@/components/ui/ScrollReveal";

export function About() {
  const [aboutText, setAboutText] = useState(
    "קרמליס סטודיו הוא לא סתם מספרה. זה מקום שנבנה עבור הגבר שיודע מה הוא שווה.\n\nכל תור מתחיל ברגע של שקט — קצף חם, סכין חדה, ידיים שמכירות את העבודה. בין פגישה לפגישה, בין אחריות לאחריות, מגיע לכם הפסקה שתרגישו בה.\n\nממוקמים בתל אביב. פתוחים ששה ימים בשבוע. מחכים לכם."
  );

  useEffect(() => {
    getSiteContent("about_text").then((result) => {
      if (result.success && result.data) setAboutText(result.data);
    });
  }, []);

  const paragraphs = aboutText.split("\n\n").filter((p) => p.trim());

  return (
    <section className="py-24 bg-dark/50">
      <div className="max-w-3xl mx-auto px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-3"
        >
          <p
            className="font-body text-gold-accent mb-3"
            style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}
          >
            הסיפור שלנו
          </p>
          <motion.h2
            variants={itemVariants}
            className="font-display italic text-4xl text-center"
            style={{
              background: "linear-gradient(135deg, #e2c97e 0%, #c9a84c 50%, #f5e6b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            אודות קרמליס סטודיו
          </motion.h2>
          <div className="w-10 h-[1.5px] bg-gold-accent mx-auto mt-4" />
        </motion.div>

        {/* Scroll-reveal paragraphs */}
        {paragraphs.map((paragraph, i) => (
          <ScrollReveal
            key={i}
            baseOpacity={0.08}
            enableBlur
            blurStrength={4}
            baseRotation={i % 2 === 0 ? 1.5 : -1.5}
          >
            {paragraph}
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
