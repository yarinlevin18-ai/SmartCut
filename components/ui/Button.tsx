"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const springX = useSpring(motionX, { stiffness: 200, damping: 20 });
  const springY = useSpring(motionY, { stiffness: 200, damping: 20 });

  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const isMagnetic = variant === "primary" && !isTouch;

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isMagnetic || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = Math.max(-20, Math.min(20, (e.clientX - (rect.left + rect.width / 2)) * 0.4));
    const offsetY = Math.max(-20, Math.min(20, (e.clientY - (rect.top + rect.height / 2)) * 0.4));
    motionX.set(offsetX);
    motionY.set(offsetY);
  }

  function handleMouseLeave() {
    motionX.set(0);
    motionY.set(0);
  }

  const baseStyles = "font-semibold rounded transition-all duration-300 disabled:opacity-50";

  const variants = {
    primary:
      "bg-gold-accent text-dark hover:bg-gold-light shadow-lg shadow-gold-accent/20 hover:shadow-gold-accent/40",
    secondary:
      "border-2 border-gold-accent text-gold-accent hover:bg-gold-accent hover:text-dark",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-10 py-4 text-lg",
  };

  // Filter out Framer Motion drag props that don't exist on HTML button
  const propsWithMotion = props as Record<string, unknown>;
  const {
    onDrag: _onDrag,
    onDragStart: _onDragStart,
    onDragEnd: _onDragEnd,
    onDirectionLock: _onDirectionLock,
    onDragTransition: _onDragTransition,
    ...buttonProps
  } = propsWithMotion;

  return (
    <motion.button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} focus:outline-none focus:ring-2 focus:ring-gold-accent focus:ring-offset-2 focus:ring-offset-dark`}
      style={isMagnetic ? { x: springX, y: springY } : undefined}
      onMouseMove={isMagnetic ? handleMouseMove : undefined}
      onMouseLeave={isMagnetic ? handleMouseLeave : undefined}
      {...buttonProps}
    >
      {children}
    </motion.button>
  );
}
