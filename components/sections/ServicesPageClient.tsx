"use client";

import { motion } from "framer-motion";
import { Service } from "@/types";
import Link from "next/link";

interface ServicesPageClientProps {
  services: Service[];
}

export function ServicesPageClient({ services }: ServicesPageClientProps) {
  return (
    <main className="min-h-screen bg-dark py-20">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-5xl text-center text-white mb-16"
        >
          כל השירותים שלנו
        </motion.h1>

        {services.length === 0 ? (
          <div className="text-center text-muted">אין שירותים זמינים</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-dark border border-gold-accent/20 rounded-lg p-4 md:p-8 hover:border-gold-accent/50 transition-all"
              >
                <h2 className="font-logo text-2xl text-white mb-4">
                  {service.name}
                </h2>
                <p className="font-body text-gray-400 mb-6">{service.description}</p>
                <div className="flex justify-between items-center mb-6 text-gold-accent font-body">
                  <span className="text-lg font-semibold">₪{service.price}</span>
                  <span className="text-sm">{service.duration_minutes} דקות</span>
                </div>
                <Link
                  href={`/booking?service=${service.id}`}
                  className="block text-center bg-gold-accent text-dark px-6 py-3 rounded font-semibold hover:bg-gold-light transition-colors font-body"
                >
                  הזמן תור
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
