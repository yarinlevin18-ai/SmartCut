"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  deleteGalleryItem,
  updateGalleryCaption,
  getGallery,
  uploadGalleryPhoto,
  addGalleryItem,
} from "@/lib/actions";
import type { GalleryPhoto } from "@/types";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async (): Promise<void> => {
    const result = await getGallery();
    setPhotos(result.success && result.data ? result.data : []);
    setLoading(false);
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError(
        `הקובץ גדול מדי. מקסימום 50MB, הקובץ שלך ${(file.size / 1024 / 1024).toFixed(1)}MB`
      );
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("הקובץ חייב להיות תמונה (JPG, PNG, WebP)");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
      });

      const uploadResult = await uploadGalleryPhoto(
        base64Data,
        file.name,
        file.type
      );
      if (!uploadResult.success || !uploadResult.data) {
        setError(`העלאה נכשלה: ${uploadResult.error || "שגיאה לא ידועה"}`);
        setUploading(false);
        return;
      }

      const { storagePath, publicUrl } = uploadResult.data;
      const addResult = await addGalleryItem(storagePath, "");
      if (!addResult.success || !addResult.data) {
        setError(
          `התמונה הועלתה אך שמירה נכשלה: ${addResult.error || "שגיאה לא ידועה"}`
        );
        setUploading(false);
        return;
      }

      const newPhoto: GalleryPhoto = {
        id: addResult.data.id,
        storage_path: addResult.data.storage_path,
        caption: addResult.data.caption || "",
        display_order: addResult.data.display_order,
        created_at: addResult.data.created_at,
        public_url: publicUrl,
      };

      setPhotos([...photos, newPhoto]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError("העלאה נכשלה: " + msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const result = await deleteGalleryItem(id);
    setConfirmDelete(null);
    if (!result.success) {
      setError("מחיקה נכשלה: " + result.error);
      return;
    }
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleUpdateCaption = async (
    id: string,
    caption: string
  ): Promise<void> => {
    const result = await updateGalleryCaption(id, caption);
    if (!result.success) {
      setError("עדכון כיתוב נכשל");
      return;
    }
    setPhotos(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
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
            Gallery · גלריה
          </p>
          <h1
            className="font-display text-white mb-2"
            style={{ fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.05 }}
          >
            ניהול גלריה
          </h1>
          <p
            className="font-body text-white/55"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            {photos.length} תמונות
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="font-label uppercase transition-all duration-200 hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed"
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
          {uploading ? "מעלה…" : "+ העלה תמונה"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <div
          className="px-4 py-3 font-body text-red-300 mb-6"
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

      {loading ? (
        <div
          className="py-16 text-center font-body text-white/40"
          style={{ fontSize: 13 }}
        >
          טוען…
        </div>
      ) : photos.length === 0 ? (
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
            אין תמונות עדיין
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="font-label uppercase text-gold-accent hover:text-gold-light transition-colors"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.28em",
            }}
          >
            העלה תמונה ראשונה ←
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="group overflow-hidden"
              style={{
                background: "#080808",
                border: "1px solid rgba(201,168,76,0.12)",
              }}
            >
              <div className="aspect-square bg-black relative overflow-hidden">
                {photo.public_url && (
                  <Image
                    src={photo.public_url}
                    alt={photo.caption || "Gallery photo"}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={photo.caption || ""}
                  onChange={(e) =>
                    handleUpdateCaption(photo.id, e.target.value)
                  }
                  placeholder="הוסף כיתוב…"
                  className="w-full px-3 py-2 bg-black text-white placeholder-white/30 font-body focus:outline-none focus:border-gold-accent transition-colors"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 12,
                    fontWeight: 300,
                    borderRadius: 0,
                  }}
                />
                <button
                  onClick={() => setConfirmDelete(photo.id)}
                  className="w-full font-label uppercase transition-all hover:bg-red-500/10 hover:text-red-300"
                  style={{
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "rgba(239,68,68,0.85)",
                    background: "transparent",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "8px 12px",
                    borderRadius: 0,
                    letterSpacing: "0.28em",
                  }}
                >
                  מחק
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirm delete modal */}
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
                מחיקת תמונה
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
