"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useState } from "react";

export default function OrderProductImage({ src, alt, sizes, className }: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return <Package className="h-6 w-6 text-slate-300" aria-hidden="true" />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} unoptimized className={className ?? "object-contain p-1"} onError={() => setFailedSrc(src)} />;
}
