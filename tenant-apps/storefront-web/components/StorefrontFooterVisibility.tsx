"use client";

import type { ComponentProps } from "react";
import { usePathname } from "next/navigation";
import FooterColumns from "@/sections/FooterColumns";

export default function StorefrontFooterVisibility(
  props: ComponentProps<typeof FooterColumns>,
) {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return <FooterColumns {...props} />;
}
