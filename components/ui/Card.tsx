import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "elevated";
}

export function Card({
  variant = "default",
  children,
  className = "",
  ...props
}: CardProps) {
  const variants = {
    default:
      "bg-[#141417] border border-white/7 rounded-lg",
    elevated:
      "bg-[#141417] border border-white/7 rounded-lg shadow-lg shadow-black/50",
  };

  return (
    <div className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
