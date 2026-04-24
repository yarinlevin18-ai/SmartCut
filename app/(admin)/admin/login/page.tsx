"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { createClientBrowser } from "@/lib/supabase-browser";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClientBrowser();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/admin");
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full flex items-center justify-center min-h-screen bg-black px-6"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.08) 0%, transparent 60%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="w-full max-w-md"
      >
        <div
          className="bg-[#080808] p-10 md:p-12"
          style={{ border: "1px solid rgba(201,168,76,0.2)" }}
        >
          {/* Brand */}
          <div className="text-center mb-10">
            <div
              className="font-display text-gold-accent mb-2"
              style={{ fontSize: 32, letterSpacing: "0.02em" }}
              dir="ltr"
            >
              CARMELI&apos;S
            </div>
            <div
              className="font-label uppercase text-white/55"
              style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.42em" }}
            >
              Admin Studio
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <span className="h-px w-8 bg-gold-accent/60" />
              <span
                className="w-1.5 h-1.5 rotate-45 bg-gold-accent"
                aria-hidden
              />
              <span className="h-px w-8 bg-gold-accent/60" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block font-label uppercase text-gold-accent mb-3"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.32em",
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-black text-white placeholder-white/30 font-body transition-colors focus:outline-none"
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontSize: 14,
                  fontWeight: 400,
                  borderRadius: 0,
                }}
                placeholder="admin@example.com"
                required
                disabled={loading}
                dir="ltr"
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#c9a84c")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")
                }
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-label uppercase text-gold-accent mb-3"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.32em",
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black text-white placeholder-white/30 font-body transition-colors focus:outline-none"
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontSize: 14,
                  fontWeight: 400,
                  borderRadius: 0,
                }}
                placeholder="••••••••"
                required
                disabled={loading}
                dir="ltr"
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#c9a84c")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")
                }
              />
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

            <button
              type="submit"
              disabled={loading}
              className="w-full font-label uppercase transition-all duration-200 hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                border: "1px solid #c9a84c",
                color: "#000",
                background: "#c9a84c",
                fontSize: 12,
                fontWeight: 700,
                padding: "14px 24px",
                borderRadius: 0,
                letterSpacing: "0.28em",
              }}
            >
              {loading ? "…" : "Sign In"}
            </button>
          </form>

          <div
            className="flex items-center justify-center gap-3 mt-10 pt-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Link
              href="/"
              className="font-label uppercase text-white/40 hover:text-gold-accent transition-colors"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.28em",
              }}
            >
              ← חזרה לאתר
            </Link>
          </div>
        </div>

        <p
          className="text-center font-label uppercase text-white/30 mt-8"
          style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.32em" }}
        >
          Carmeli&apos;s Studio · Tel Aviv
        </p>
      </motion.div>
    </div>
  );
}
