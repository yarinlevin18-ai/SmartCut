"use client";

import { useState, useEffect } from "react";
import { createService, updateService } from "@/lib/actions";
import type { Service } from "@/types";

interface ServiceModalProps {
  service: Service | null;
  onClose: () => void;
}

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

      let result;
      if (service) {
        result = await updateService(service.id, serviceData);
      } else {
        result = await createService(serviceData);
      }

      if (!result.success) {
        setError("Failed to save service: " + result.error);
        setLoading(false);
        return;
      }

      onClose();
    } catch (err) {
      setError("Failed to save service");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-white/10 rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-text mb-6">
          {service ? "Edit Service" : "Add Service"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-bg border border-white/10 rounded text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-bg border border-white/10 rounded text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Price (ILS) *
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 bg-bg border border-white/10 rounded text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Duration (min) *
              </label>
              <input
                type="number"
                value={duration_minutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-4 py-2 bg-bg border border-white/10 rounded text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Icon (emoji)
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-4 py-2 bg-bg border border-white/10 rounded text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
              placeholder="✂️"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={display_order}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="w-full px-4 py-2 bg-bg border border-white/10 rounded text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/10 rounded text-text hover:bg-white/5 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gold text-dark font-semibold rounded hover:bg-gold-light transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
