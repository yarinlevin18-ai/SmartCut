"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <div className="min-h-screen bg-bg">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 right-4 z-40 flex flex-col justify-center items-center gap-1 w-12 h-12 rounded bg-surface border border-white/10 hover:bg-white/5"
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        <motion.div
          animate={{ rotate: sidebarOpen ? 45 : 0, y: sidebarOpen ? 6 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-6 h-0.5 bg-gold-accent"
        />
        <motion.div
          animate={{ opacity: sidebarOpen ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="w-6 h-0.5 bg-gold-accent"
        />
        <motion.div
          animate={{ rotate: sidebarOpen ? -45 : 0, y: sidebarOpen ? -6 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-6 h-0.5 bg-gold-accent"
        />
      </button>

      {/* Sidebar - hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar - shown when sidebarOpen */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="mobile-sidebar"
            initial={{ opacity: 0, x: 264 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 264 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-64 h-full"
            >
              <AdminSidebar />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto px-4 md:px-8 py-4 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
