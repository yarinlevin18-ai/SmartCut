"use client";

import { useState, useEffect } from "react";
import { IntroAnimation } from "./IntroAnimation";

export function IntroAnimationWrapper() {
  const [showIntro, setShowIntro] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const introShown = localStorage.getItem("introShown") === "true";
    setShowIntro(!introShown);
  }, []);

  if (!mounted) return null;

  const handleIntroComplete = () => {
    setShowIntro(false);
    localStorage.setItem("introShown", "true");
  };

  return showIntro ? <IntroAnimation onComplete={handleIntroComplete} /> : null;
}
