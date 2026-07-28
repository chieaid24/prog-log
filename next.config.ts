import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DEMO_MODE (ADR-0016) reads these CSV fixtures at runtime via fs; pin them
  // into every function's trace so the read never ENOENTs on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./lib/demo/fixtures/**"],
  },
};

export default nextConfig;
