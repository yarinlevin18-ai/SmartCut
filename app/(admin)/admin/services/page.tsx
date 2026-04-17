"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabase-browser";
import { deleteService, getServices } from "@/lib/actions";
import type { Service } from "@/types";
import { ServiceModal } from "./ServiceModal";

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const checkAuth = async (): Promise<void> => {
    const supabase = createClientBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/admin/login");
      return;
    }

    loadServices();
  };

  const loadServices = async (): Promise<void> => {
    const result = await getServices();
    setServices(result.success && result.data ? result.data : []);
    setLoading(false);
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const result = await deleteService(id);

      if (!result.success) {
        alert("Failed to delete service: " + result.error);
        return;
      }

      setServices(services.filter((s) => s.id !== id));
    } catch (err) {
      alert("Failed to delete service");
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingService(null);
    loadServices();
  };

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">Services</h1>
          <p className="text-muted">Manage your barber services</p>
        </div>
        <button
          onClick={() => {
            setEditingService(null);
            setShowModal(true);
          }}
          className="px-6 py-3 bg-gold text-dark font-semibold rounded hover:bg-gold-light transition-colors"
        >
          Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="bg-surface border border-white/10 rounded-lg p-8 text-center">
          <p className="text-muted mb-4">No services yet</p>
          <button
            onClick={() => {
              setEditingService(null);
              setShowModal(true);
            }}
            className="text-gold hover:text-gold-light transition-colors"
          >
            Create your first service
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto md:overflow-hidden">
            <table className="min-w-full">
            <thead className="bg-bg border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-sm font-medium text-muted">Name</th>
                <th className="px-6 py-4 text-sm font-medium text-muted">Price (ILS)</th>
                <th className="px-6 py-4 text-sm font-medium text-muted">Duration</th>
                <th className="px-6 py-4 text-sm font-medium text-muted">Order</th>
                <th className="px-6 py-4 text-sm font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4 text-text">{service.name}</td>
                  <td className="px-6 py-4 text-text">₪{service.price}</td>
                  <td className="px-6 py-4 text-text">{service.duration_minutes}m</td>
                  <td className="px-6 py-4 text-text">{service.display_order}</td>
                  <td className="px-6 py-4 text-sm space-x-3">
                    <button
                      onClick={() => {
                        setEditingService(service);
                        setShowModal(true);
                      }}
                      className="text-gold hover:text-gold-light transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <ServiceModal
          service={editingService}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
