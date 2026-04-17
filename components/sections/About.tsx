"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getSiteContent } from "@/lib/actions";
import { containerVariants, itemVariants } from "@/lib/animations";

interface AboutProps {}

export function About({}: AboutProps) {
  const [aboutText, setAboutText] = useState(
    "קרמליס סטודיו הוא לא סתם מספרה. זה מקום שנבנה עבור הגבר שיודע מה הוא שווה.\n\nכל תור מתחיל ברגע של שקט — קצף חם, סכין חדה, ידיים שמכירות את העבודה. בין פגישה לפגישה, בין אחריות לאחריות, מגיע לכם הפסקה שתרגישו בה.\n\nממוקמים בתל אביב. פתוחים ששה ימים בשבוע. מחכים לכם."
  );

  useEffect(() => {
    getSiteContent("about_text").then((result) => {
      if (result.success && result.data) setAboutText(result.data);
    });
  }, []);

  const paragraphs = aboutText.split("\n\n").filter(p => p.trim());

  return (
    <section className="py-20 bg-dark/50">
      <motion.div
        className="max-w-4xl mx-auto px-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.h2
          variants={itemVariants}
          className="font-display text-4xl text-center text-white mb-12"
        >
          אודות קרמליס סטודיו
        </motion.h2>

        {paragraphs.map((paragraph, i) => (
          <motion.p
            key={i}
            variants={itemVariants}
            className="text-lg text-gray-300 text-center leading-relaxed mb-6"
          >
            {paragraph}
          </motion.p>
        ))}
      </motion.div>
    </section>
  );
}
