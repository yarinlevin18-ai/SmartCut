"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClientBrowser } from "@/lib/supabase-browser";
import { deleteGalleryItem, updateGalleryCaption, getGallery, uploadGalleryPhoto, addGalleryItem } from "@/lib/actions";
import type { GalleryPhoto } from "@/types";

export default function GalleryPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    loadPhotos();
  };

  const loadPhotos = async (): Promise<void> => {
    const result = await getGallery();
    setPhotos(result.success && result.data ? result.data : []);
    setLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File too large. Maximum size is 50MB, your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`
      );
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("File must be an image (JPG, PNG, WebP, etc.)");
      return;
    }

    setUploading(true);
    setError("");

    try {
      console.log(`[Gallery Admin] Selected file: ${file.name}, size: ${(file.size / 1024).toFixed(1)}KB, type: ${file.type}`);

      // Convert File to Base64 (serializable format for Server Action)
      const reader = new FileReader();
      reader.readAsDataURL(file);

      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1]; // Remove "data:image/png;base64," prefix
          console.log(`[Gallery Admin] Base64 conversion complete: ${base64.length} characters`);
          resolve(base64);
        };
        reader.onerror = () => {
          console.error(`[Gallery Admin] FileReader error`);
          reject(new Error("Failed to read file"));
        };
      });

      console.log(`[Gallery Admin] Calling uploadGalleryPhoto...`);
      const uploadResult = await uploadGalleryPhoto(base64Data, file.name, file.type);

      if (!uploadResult.success || !uploadResult.data) {
        const errorMsg = uploadResult.error || "Unknown error during upload";
        console.error(`[Gallery Admin] Upload failed: ${errorMsg}`);
        setError(`Failed to upload photo to storage: ${errorMsg}`);
        setUploading(false);
        return;
      }

      const { storagePath, publicUrl } = uploadResult.data;
      console.log(`[Gallery Admin] Upload succeeded, calling addGalleryItem...`);

      // Now add to gallery using addGalleryItem server action
      const addResult = await addGalleryItem(storagePath, "");

      if (!addResult.success || !addResult.data) {
        const errorMsg = addResult.error || "Unknown error during database save";
        console.error(`[Gallery Admin] Database save failed: ${errorMsg}`);
        setError(
          `Photo uploaded to storage but failed to save to gallery: ${errorMsg}. Please contact support.`
        );
        setUploading(false);
        return;
      }

      console.log(`[Gallery Admin] Gallery item created successfully: ${addResult.data.id}`);

      const newPhoto: GalleryPhoto = {
        id: addResult.data.id,
        storage_path: addResult.data.storage_path,
        caption: addResult.data.caption || "",
        display_order: addResult.data.display_order,
        created_at: addResult.data.created_at,
        public_url: publicUrl,
      };

      console.log(`[Gallery Admin] Upload complete! Photo added to gallery: ${newPhoto.id}`);
      setPhotos([...photos, newPhoto]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Gallery Admin] Exception during upload:`, errorMsg);
      setError("Failed to upload photo: " + errorMsg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      const result = await deleteGalleryItem(id);

      if (!result.success) {
        setError("Failed to delete photo: " + result.error);
        return;
      }

      setPhotos(photos.filter((p) => p.id !== id));
    } catch (err) {
      setError("Failed to delete photo");
    }
  };

  const handleUpdateCaption = async (id: string, caption: string): Promise<void> => {
    try {
      const result = await updateGalleryCaption(id, caption);

      if (!result.success) {
        setError("Failed to update photo caption");
        return;
      }

      setPhotos(
        photos.map((p) =>
          p.id === id ? { ...p, caption } : p
        )
      );
    } catch (err) {
      setError("Failed to update photo caption");
    }
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
          <h1 className="text-4xl font-bold text-text mb-2">Gallery</h1>
          <p className="text-muted">Upload and manage your photos</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-6 py-3 bg-gold text-dark font-semibold rounded hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload Photo"}
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
        <div className="bg-red-500/10 border border-red-500/20 rounded px-4 py-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="bg-surface border border-white/10 rounded-lg p-8 text-center">
          <p className="text-muted mb-4">No photos yet</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gold hover:text-gold-light transition-colors"
          >
            Upload your first photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-surface border border-white/10 rounded-lg overflow-hidden"
            >
              <div className="aspect-square bg-bg overflow-hidden relative">
                {photo.public_url && (
                  <Image
                    src={photo.public_url}
                    alt={photo.caption || "Gallery photo"}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <input
                  type="text"
                  value={photo.caption}
                  onChange={(e) => handleUpdateCaption(photo.id, e.target.value)}
                  placeholder="Add caption..."
                  className="w-full px-2 py-2 bg-bg border border-white/10 rounded text-text placeholder-muted focus:outline-none focus:border-gold transition-colors text-sm mb-4"
                />
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="w-full px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
