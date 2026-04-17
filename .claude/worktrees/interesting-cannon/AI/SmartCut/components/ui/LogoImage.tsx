import Image from "next/image";
import { memo } from "react";

interface LogoImageProps {
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  alt?: string;
}

const LOGO_URL = "/logo.jpg";

export const LogoImage = memo(function LogoImage({
  width,
  height,
  priority = false,
  className = "",
  alt = "Carmeli's Studio Logo",
}: LogoImageProps) {
  return (
    <div style={{ borderRadius: "50%", overflow: "hidden", width, height, flexShrink: 0 }}>
      <Image
        src={LOGO_URL}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`object-cover w-full h-full ${className}`}
      />
    </div>
  );
});
