"use client";

import type { ComponentProps } from "react";
import { usePathname } from "next/navigation";
import Header from "@/sections/Header";

export default function StorefrontHeaderVisibility(
  props: ComponentProps<typeof Header>,
) {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return <Header {...props} currentPath={pathname} />;
}
