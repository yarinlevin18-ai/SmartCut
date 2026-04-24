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
    return <div className="min-h-screen bg-black">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-black" dir="rtl">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-40 flex flex-col justify-center items-center gap-1.5 w-11 h-11"
        style={{
          background: "#080808",
          border: "1px solid rgba(201,168,76,0.25)",
        }}
        aria-label={sidebarOpen ? "סגור תפריט" : "פתח תפריט"}
      >
        <motion.span
          animate={{ rotate: sidebarOpen ? 45 : 0, y: sidebarOpen ? 6 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-px bg-gold-accent"
        />
        <motion.span
          animate={{ opacity: sidebarOpen ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-px bg-gold-accent"
        />
        <motion.span
          animate={{ rotate: sidebarOpen ? -45 : 0, y: sidebarOpen ? -6 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-px bg-gold-accent"
        />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="mobile-sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          >
            <motion.div
              key="mobile-sidebar-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 h-full"
            >
              <AdminSidebar />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto px-5 md:px-10 py-8 md:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
