"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProduct,
  uploadProductImage,
} from "@/lib/actions";
import type { Product, ProductInput } from "@/types";

type EditState = null | { mode: "create" } | { mode: "edit"; product: Product };

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const r = await getProductsAdmin();
    setProducts(r.success && r.data ? r.data : []);
    setLoading(false);
  };

  const handleSave = (input: ProductInput, id?: string): void => {
    startTransition(async () => {
      const r = id
        ? await updateProduct(id, input)
        : await createProduct(input);
      if (r.success) {
        setEdit(null);
        await load();
      } else {
        setActionError(r.error ?? "הפעולה נכשלה");
      }
    });
  };

  const handleDelete = (id: string): void => {
    startTransition(async () => {
      const r = await deleteProduct(id);
      setConfirmDelete(null);
      if (r.success) await load();
      else setActionError(r.error ?? "מחיקה נכשלה");
    });
  };

  const handleReorder = (id: string, direction: 1 | -1): void => {
    startTransition(async () => {
      const r = await reorderProduct(id, direction);
      if (r.success) await load();
      else setActionError(r.error ?? "סידור נכשל");
    });
  };

  const handleToggleActive = (p: Product): void => {
    startTransition(async () => {
      const r = await updateProduct(p.id, { is_active: !p.is_active });
      if (r.success) await load();
      else setActionError(r.error ?? "עדכון נכשל");
    });
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
            Products · מוצרים
          </p>
          <h1
            className="font-display text-white mb-2"
            style={{ fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.05 }}
          >
            ניהול מוצרים
          </h1>
          <p
            className="font-body text-white/55"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            {products.filter((p) => p.is_active).length} פעילים ·{" "}
            {products.length} סה&quot;כ
          </p>
        </div>
        {!edit && (
          <button
            onClick={() => {
              setActionError(null);
              setEdit({ mode: "create" });
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
            + מוצר חדש
          </button>
        )}
      </div>

      {/* Error toast */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] max-w-md w-full px-4"
            role="alert"
          >
            <div
              className="px-4 py-3 font-body text-center cursor-pointer"
              onClick={() => setActionError(null)}
              style={{
                background: "rgba(248,113,113,0.12)",
                border: "1px solid rgba(248,113,113,0.4)",
                color: "#fca5a5",
                fontSize: 13,
              }}
            >
              {actionError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline form for create / edit */}
      <AnimatePresence>
        {edit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <ProductForm
              key={edit.mode === "edit" ? edit.product.id : "create"}
              initial={edit.mode === "edit" ? edit.product : null}
              onSave={(input) =>
                handleSave(input, edit.mode === "edit" ? edit.product.id : undefined)
              }
              onCancel={() => setEdit(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div
          className="py-16 text-center font-body text-white/40"
          style={{ fontSize: 13 }}
        >
          טוען…
        </div>
      ) : products.length === 0 ? (
        <div
          className="p-12 text-center"
          style={{
            background: "#080808",
            border: "1px solid rgba(201,168,76,0.12)",
          }}
        >
          <p
            className="font-body text-white/60"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            אין מוצרים עדיין
          </p>
        </div>
      ) : (
        <ul
          className="divide-y divide-white/5"
          style={{
            background: "#080808",
            border: "1px solid rgba(201,168,76,0.12)",
          }}
        >
          {products.map((product, idx) => (
            <li
              key={product.id}
              className="p-4 md:p-5 flex items-center gap-4 flex-wrap"
              style={{ opacity: product.is_active ? 1 : 0.55 }}
            >
              {/* Image thumbnail */}
              <div
                className="shrink-0 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center overflow-hidden"
                style={{
                  background: "#0d0d0d",
                  border: "1px solid rgba(201,168,76,0.18)",
                }}
              >
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="font-label uppercase text-white/20"
                    style={{ fontSize: 9, letterSpacing: "0.2em" }}
                  >
                    no image
                  </span>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-display text-white truncate"
                    style={{ fontSize: 18, lineHeight: 1.2 }}
                  >
                    {product.name}
                  </span>
                  {!product.is_active && (
                    <span
                      className="font-label uppercase shrink-0"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.22em",
                        padding: "3px 8px",
                        border: "1px solid rgba(255,255,255,0.18)",
                        color: "rgba(255,255,255,0.5)",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      מוסתר
                    </span>
                  )}
                </div>
                <div
                  className="flex items-center gap-3 mt-1.5 flex-wrap font-body"
                  style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}
                >
                  {product.price !== null && (
                    <span className="text-gold-accent">₪{product.price}</span>
                  )}
                  {product.description && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="truncate">{product.description}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <ReorderButton
                  direction={-1}
                  disabled={idx === 0}
                  onClick={() => handleReorder(product.id, -1)}
                />
                <ReorderButton
                  direction={1}
                  disabled={idx === products.length - 1}
                  onClick={() => handleReorder(product.id, 1)}
                />
                <button
                  type="button"
                  onClick={() => handleToggleActive(product)}
                  className="font-label uppercase transition-colors hover:bg-white/5"
                  style={{
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: product.is_active ? "rgba(255,255,255,0.7)" : "#c9a84c",
                    background: "transparent",
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "8px 12px",
                    letterSpacing: "0.22em",
                  }}
                >
                  {product.is_active ? "הסתר" : "הצג"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setEdit({ mode: "edit", product });
                  }}
                  className="font-label uppercase transition-colors hover:bg-gold-accent/10"
                  style={{
                    border: "1px solid rgba(201,168,76,0.4)",
                    color: "#c9a84c",
                    background: "transparent",
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "8px 12px",
                    letterSpacing: "0.22em",
                  }}
                >
                  ערוך
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(product.id)}
                  className="font-label uppercase transition-colors hover:bg-red-500/10"
                  style={{
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "rgba(239,68,68,0.8)",
                    background: "transparent",
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "8px 12px",
                    letterSpacing: "0.22em",
                  }}
                >
                  מחק
                </button>
              </div>
            </li>
          ))}
        </ul>
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
              dir="rtl"
            >
              <h3
                className="font-display text-white mb-3"
                style={{ fontSize: 22 }}
              >
                מחיקת מוצר
              </h3>
              <p
                className="font-body text-white/60 mb-6"
                style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
              >
                האם למחוק את המוצר? פעולה זו בלתי הפיכה. אם תרצה רק להסתיר —
                השתמש בכפתור &quot;הסתר&quot;.
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
                    letterSpacing: "0.24em",
                  }}
                >
                  ביטול
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 font-label uppercase hover:opacity-90 transition-all"
                  style={{
                    border: "1px solid rgb(239,68,68)",
                    color: "#fff",
                    background: "rgb(220,38,38)",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "12px 16px",
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

function ReorderButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 1 | -1;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={direction === -1 ? "הזז למעלה" : "הזז למטה"}
      className="font-label uppercase transition-colors hover:bg-white/5 disabled:opacity-25"
      style={{
        border: "1px solid rgba(255,255,255,0.18)",
        color: "rgba(255,255,255,0.7)",
        background: "transparent",
        fontSize: 12,
        fontWeight: 600,
        padding: "6px 10px",
        minWidth: 32,
      }}
    >
      {direction === -1 ? "↑" : "↓"}
    </button>
  );
}

function ProductForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Product | null;
  onSave: (input: ProductInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceStr, setPriceStr] = useState(
    initial?.price !== null && initial?.price !== undefined
      ? String(initial.price)
      : "",
  );
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        Array.from(new Uint8Array(buffer))
          .map((b) => String.fromCharCode(b))
          .join(""),
      );
      const r = await uploadProductImage(base64, file.name, file.type);
      if (r.success && r.data) {
        setImageUrl(r.data.publicUrl);
      } else {
        setFormError(r.error ?? "העלאה נכשלה");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("שם הוא שדה חובה");
      return;
    }
    let price: number | null = null;
    if (priceStr.trim()) {
      const parsed = Number(priceStr);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setFormError("מחיר לא תקין");
        return;
      }
      price = parsed;
    }
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      price,
      image_url: imageUrl || null,
      is_active: isActive,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      dir="rtl"
      className="p-6 md:p-8 space-y-5"
      style={{
        background: "#080808",
        border: "1px solid rgba(201,168,76,0.25)",
      }}
    >
      <h2
        className="font-display text-white"
        style={{ fontSize: 22, lineHeight: 1.1 }}
      >
        {initial ? "עריכת מוצר" : "מוצר חדש"}
      </h2>

      {/* Image preview + upload */}
      <div>
        <label
          className="font-label uppercase text-gold-accent mb-2 block"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.32em",
          }}
        >
          תמונה
        </label>
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="shrink-0 w-24 h-24 flex items-center justify-center overflow-hidden"
            style={{
              background: "#0d0d0d",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <span
                className="font-label uppercase text-white/25"
                style={{ fontSize: 9, letterSpacing: "0.2em" }}
              >
                no image
              </span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="font-body text-white/70"
            style={{ fontSize: 12 }}
          />
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="font-label uppercase hover:bg-white/5 transition-colors"
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.65)",
                background: "transparent",
                fontSize: 9,
                fontWeight: 600,
                padding: "6px 12px",
                letterSpacing: "0.22em",
              }}
            >
              הסר
            </button>
          )}
        </div>
        {uploading && (
          <p className="font-body text-white/40 mt-2" style={{ fontSize: 11 }}>
            מעלה…
          </p>
        )}
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor="product-name"
          className="font-label uppercase text-gold-accent mb-2 block"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.32em",
          }}
        >
          שם *
        </label>
        <input
          id="product-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 font-body text-white"
          style={{
            background: "#0d0d0d",
            border: "1px solid rgba(255,255,255,0.12)",
            fontSize: 14,
          }}
          placeholder="שמן זקן ספרדי"
        />
      </div>

      {/* Price */}
      <div>
        <label
          htmlFor="product-price"
          className="font-label uppercase text-gold-accent mb-2 block"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.32em",
          }}
        >
          מחיר (₪) — השאר ריק עבור &quot;שאל בסטודיו&quot;
        </label>
        <input
          id="product-price"
          type="number"
          step="0.01"
          min="0"
          value={priceStr}
          onChange={(e) => setPriceStr(e.target.value)}
          className="w-full px-3 py-2 font-body text-white"
          dir="ltr"
          style={{
            background: "#0d0d0d",
            border: "1px solid rgba(255,255,255,0.12)",
            fontSize: 14,
          }}
          placeholder="120"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="product-description"
          className="font-label uppercase text-gold-accent mb-2 block"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.32em",
          }}
        >
          תיאור
        </label>
        <textarea
          id="product-description"
          rows={3}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 font-body text-white resize-y"
          style={{
            background: "#0d0d0d",
            border: "1px solid rgba(255,255,255,0.12)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
          placeholder="תיאור קצר — תכונות עיקריות, ניחוח, גודל"
        />
      </div>

      {/* Active toggle */}
      <label className="flex items-center gap-3 font-body text-white/85 cursor-pointer" style={{ fontSize: 13 }}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-gold-accent"
        />
        מוצג באתר
      </label>

      {formError && (
        <div
          role="alert"
          className="px-4 py-3 font-body"
          style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.3)",
            color: "#fca5a5",
            fontSize: 12,
          }}
        >
          {formError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={uploading}
          className="flex-1 font-label uppercase transition-all duration-200 hover:bg-gold-light disabled:opacity-50"
          style={{
            border: "1px solid #c9a84c",
            color: "#000",
            background: "#c9a84c",
            fontSize: 11,
            fontWeight: 700,
            padding: "12px 16px",
            letterSpacing: "0.28em",
          }}
        >
          שמור
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 font-label uppercase transition-all hover:bg-white/5"
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.85)",
            background: "transparent",
            fontSize: 11,
            fontWeight: 600,
            padding: "12px 16px",
            letterSpacing: "0.24em",
          }}
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
