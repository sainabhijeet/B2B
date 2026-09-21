import type { NextConfig } from "next";
import {
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from "next/constants";

const distDirByPhase: Record<string, string> = {
  [PHASE_PRODUCTION_BUILD]: ".next-build",
  [PHASE_PRODUCTION_SERVER]: ".next-build",
};

export default function nextConfig(phase: string): NextConfig {
  return {
    distDir: distDirByPhase[phase] ?? ".next",
  };
}
