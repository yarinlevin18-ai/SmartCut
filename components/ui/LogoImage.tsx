import Image from "next/image";
import { memo } from "react";

interface LogoImageProps {
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  alt?: string;
}

const LOGO_URL = "https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png";

export const LogoImage = memo(function LogoImage({
  width,
  height,
  priority = false,
  className = "",
  alt = "Carmeli's Studio Logo",
}: LogoImageProps) {
  return (
    <Image
      src={LOGO_URL}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
});
