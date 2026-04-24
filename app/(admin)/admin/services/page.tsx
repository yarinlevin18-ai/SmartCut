"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { deleteService, getServices } from "@/lib/actions";
import type { Service } from "@/types";
import { ServiceModal } from "./ServiceModal";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async (): Promise<void> => {
    const result = await getServices();
    setServices(result.success && result.data ? result.data : []);
    setLoading(false);
  };

  const handleDelete = async (id: string): Promise<void> => {
    const result = await deleteService(id);
    setConfirmDelete(null);
    if (!result.success) {
      alert("Failed to delete service: " + result.error);
      return;
    }
    setServices(services.filter((s) => s.id !== id));
  };

  const handleModalClose = async () => {
    setShowModal(false);
    setEditingService(null);
    await loadServices();
  };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-10 flex-wrap">
        <div>
          <p
            className="font-label uppercase text-gold-accent mb-3"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.36em",
            }}
          >
            Services · שירותים
          </p>
          <h1
            className="font-display text-white mb-2"
            style={{ fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.05 }}
          >
            ניהול שירותים
          </h1>
          <p
            className="font-body text-white/55"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            {services.length} שירותים פעילים
          </p>
        </div>
        <button
          onClick={() => {
            setEditingService(null);
            setShowModal(true);
          }}
          className="font-label uppercase transition-all duration-200 hover:bg-gold-light"
          style={{
            border: "1px solid #c9a84c",
            color: "#000",
            background: "#c9a84c",
            fontSize: 11,
            fontWeight: 700,
            padding: "12px 28px",
            borderRadius: 0,
            letterSpacing: "0.28em",
          }}
        >
          + שירות חדש
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div
          className="py-16 text-center font-body text-white/40"
          style={{ fontSize: 13 }}
        >
          טוען…
        </div>
      ) : services.length === 0 ? (
        <div
          className="p-12 text-center"
          style={{
            background: "#080808",
            border: "1px solid rgba(201,168,76,0.12)",
          }}
        >
          <p
            className="font-body text-white/60 mb-5"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            אין שירותים עדיין
          </p>
          <button
            onClick={() => {
              setEditingService(null);
              setShowModal(true);
            }}
            className="font-label uppercase text-gold-accent hover:text-gold-light transition-colors"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.28em",
            }}
          >
            צור שירות ראשון ←
          </button>
        </div>
      ) : (
        <div
          style={{
            background: "#080808",
            border: "1px solid rgba(201,168,76,0.12)",
          }}
        >
          <ul className="divide-y divide-white/5">
            {services.map((service) => (
              <li
                key={service.id}
                className="p-6 md:p-7 flex items-center gap-5 hover:bg-white/[0.02] transition-colors"
              >
                {/* Order badge */}
                <div
                  className="shrink-0 w-10 h-10 flex items-center justify-center font-display text-gold-accent"
                  style={{
                    border: "1px solid rgba(201,168,76,0.25)",
                    fontSize: 15,
                  }}
                >
                  {service.display_order}
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className="font-display text-white"
                      style={{ fontSize: 20, lineHeight: 1.2 }}
                    >
                      {service.name}
                    </span>
                    {service.duration_minutes ? (
                      <span
                        className="font-label uppercase text-white/40"
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.28em",
                        }}
                      >
                        · {service.duration_minutes} דק&apos;
                      </span>
                    ) : null}
                  </div>
                  {service.description && (
                    <p
                      className="font-body text-white/55 mt-2 line-clamp-2"
                      style={{
                        fontSize: 13,
                        fontWeight: 300,
                        lineHeight: 1.6,
                      }}
                    >
                      {service.description}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div
                  className="shrink-0 font-display text-gold-accent"
                  style={{ fontSize: 22 }}
                >
                  ₪{service.price}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingService(service);
                      setShowModal(true);
                    }}
                    aria-label="ערוך"
                    className="font-label uppercase transition-all hover:bg-gold-accent hover:text-black"
                    style={{
                      border: "1px solid rgba(201,168,76,0.35)",
                      color: "#c9a84c",
                      background: "transparent",
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "8px 16px",
                      borderRadius: 0,
                      letterSpacing: "0.28em",
                    }}
                  >
                    ערוך
                  </button>
                  <button
                    onClick={() => setConfirmDelete(service.id)}
                    aria-label="מחק"
                    className="font-label uppercase transition-all hover:bg-red-500/10 hover:text-red-300"
                    style={{
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "rgba(239,68,68,0.85)",
                      background: "transparent",
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "8px 16px",
                      borderRadius: 0,
                      letterSpacing: "0.28em",
                    }}
                  >
                    מחק
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ServiceModal service={editingService} onClose={handleModalClose} />
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-6"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a0a] p-8 max-w-sm w-full"
              style={{ border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <h3
                className="font-display text-white mb-3"
                style={{ fontSize: 22 }}
              >
                מחיקת שירות
              </h3>
              <p
                className="font-body text-white/60 mb-6"
                style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
              >
                האם אתה בטוח? פעולה זו בלתי הפיכה.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 font-label uppercase hover:bg-white/5 transition-all"
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.85)",
                    background: "transparent",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "12px 16px",
                    borderRadius: 0,
                    letterSpacing: "0.24em",
                  }}
                >
                  ביטול
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 font-label uppercase transition-all hover:opacity-90"
                  style={{
                    border: "1px solid rgb(239,68,68)",
                    color: "#fff",
                    background: "rgb(220,38,38)",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "12px 16px",
                    borderRadius: 0,
                    letterSpacing: "0.24em",
                  }}
                >
                  מחק
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
