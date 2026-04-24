"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createService, updateService } from "@/lib/actions";
import type { Service } from "@/types";

interface ServiceModalProps {
  service: Service | null;
  onClose: () => void;
}

const inputStyle = {
  border: "1px solid rgba(255,255,255,0.15)",
  fontSize: 14,
  fontWeight: 400 as const,
  borderRadius: 0,
};

const labelStyle = {
  fontSize: 10,
  fontWeight: 600 as const,
  letterSpacing: "0.32em",
};

export function ServiceModal({ service, onClose }: ServiceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration_minutes, setDurationMinutes] = useState("");
  const [icon, setIcon] = useState("");
  const [display_order, setDisplayOrder] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description || "");
      setPrice(service.price?.toString() || "");
      setDurationMinutes(service.duration_minutes?.toString() || "");
      setIcon(service.icon || "");
      setDisplayOrder(service.display_order.toString());
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const serviceData = {
        name,
        description,
        price: parseInt(price),
        duration_minutes: parseInt(duration_minutes),
        icon,
        display_order: parseInt(display_order) || 0,
      };

      const result = service
        ? await updateService(service.id, serviceData)
        : await createService(serviceData);

      if (!result.success) {
        setError("Failed to save service: " + result.error);
        setLoading(false);
        return;
      }

      onClose();
    } catch {
      setError("Failed to save service");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0a0a0a] p-8 md:p-10 w-full max-w-lg my-8"
        style={{ border: "1px solid rgba(201,168,76,0.25)" }}
      >
        {/* Header */}
        <div className="mb-8">
          <p
            className="font-label uppercase text-gold-accent mb-2"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.32em",
            }}
          >
            {service ? "Edit · עריכה" : "New · חדש"}
          </p>
          <h2
            className="font-display text-white"
            style={{ fontSize: 28, lineHeight: 1.1 }}
          >
            {service ? "עריכת שירות" : "שירות חדש"}
          </h2>
          <div className="flex items-center gap-2 mt-4">
            <span className="h-px w-10 bg-gold-accent/60" />
            <span
              className="w-1.5 h-1.5 rotate-45 bg-gold-accent"
              aria-hidden
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className="block font-label uppercase text-gold-accent mb-2"
              style={labelStyle}
            >
              שם · Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-black text-white placeholder-white/30 font-body focus:outline-none focus:border-gold-accent transition-colors"
              style={inputStyle}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label
              className="block font-label uppercase text-gold-accent mb-2"
              style={labelStyle}
            >
              תיאור · Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-black text-white placeholder-white/30 font-body focus:outline-none focus:border-gold-accent transition-colors resize-none"
              style={inputStyle}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block font-label uppercase text-gold-accent mb-2"
                style={labelStyle}
              >
                מחיר · ₪ *
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-3 bg-black text-white placeholder-white/30 font-body focus:outline-none focus:border-gold-accent transition-colors"
                style={inputStyle}
                required
                disabled={loading}
                dir="ltr"
              />
            </div>

            <div>
              <label
                className="block font-label uppercase text-gold-accent mb-2"
                style={labelStyle}
              >
                זמן · Min *
              </label>
              <input
                type="number"
                value={duration_minutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-4 py-3 bg-black text-white placeholder-white/30 font-body focus:outline-none focus:border-gold-accent transition-colors"
                style={inputStyle}
                required
                disabled={loading}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block font-label uppercase text-gold-accent mb-2"
                style={labelStyle}
              >
                אייקון · Icon
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-4 py-3 bg-black text-white placeholder-white/30 font-body focus:outline-none focus:border-gold-accent transition-colors"
                style={inputStyle}
                placeholder="✂️"
                disabled={loading}
              />
            </div>

            <div>
              <label
                className="block font-label uppercase text-gold-accent mb-2"
                style={labelStyle}
              >
                סדר · Order
              </label>
              <input
                type="number"
                value={display_order}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full px-4 py-3 bg-black text-white placeholder-white/30 font-body focus:outline-none focus:border-gold-accent transition-colors"
                style={inputStyle}
                disabled={loading}
                dir="ltr"
              />
            </div>
          </div>

          {error && (
            <div
              className="px-4 py-3 font-body text-red-300"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                fontSize: 13,
                borderRadius: 0,
              }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 font-label uppercase hover:bg-white/5 transition-all disabled:opacity-50"
              style={{
                border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.85)",
                background: "transparent",
                fontSize: 11,
                fontWeight: 600,
                padding: "12px 20px",
                borderRadius: 0,
                letterSpacing: "0.24em",
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 font-label uppercase hover:bg-gold-light transition-all disabled:opacity-50"
              style={{
                border: "1px solid #c9a84c",
                color: "#000",
                background: "#c9a84c",
                fontSize: 11,
                fontWeight: 700,
                padding: "12px 20px",
                borderRadius: 0,
                letterSpacing: "0.28em",
              }}
            >
              {loading ? "…" : "שמור"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
