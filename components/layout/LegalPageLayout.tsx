import type { ReactNode } from "react";

interface LegalPageLayoutProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({
  eyebrow,
  title,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="bg-dark text-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-10 pt-32 md:pt-40 pb-24 md:pb-32">
        <header className="mb-12 md:mb-16 text-center">
          <p
            className="font-label uppercase text-white/40 mb-5"
            style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.36em" }}
          >
            {eyebrow}
          </p>
          <h1
            className="font-display text-white"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1.1 }}
          >
            {title}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="h-px w-10 bg-white/15" />
            <span className="w-1 h-1 rotate-45 bg-white/30" aria-hidden />
            <span className="h-px w-10 bg-white/15" />
          </div>
          <p
            className="font-label uppercase text-white/35 mt-6"
            style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.32em" }}
          >
            עודכן · {lastUpdated}
          </p>
        </header>

        <article className="legal-prose font-body text-white/80 space-y-6 leading-loose">
          {children}
        </article>
      </div>
    </main>
  );
}
