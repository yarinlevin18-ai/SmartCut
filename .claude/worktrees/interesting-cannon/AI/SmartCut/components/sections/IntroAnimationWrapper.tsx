"use client";

import { useState, useEffect } from "react";
import { IntroAnimation } from "./IntroAnimation";

export function IntroAnimationWrapper() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const introShown = localStorage.getItem("introShown") === "true";
    setShowIntro(!introShown);
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    localStorage.setItem("introShown", "true");
  };

  return showIntro ? <IntroAnimation onComplete={handleIntroComplete} /> : null;
}
