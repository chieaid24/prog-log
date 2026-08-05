import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DEMO_MODE (ADR-0016) reads these CSV fixtures at runtime via fs; pin them
  // into every function's trace so the read never ENOENTs on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./lib/demo/fixtures/**"],
  },
  // The monthly view became the Progress view (ADR-0023); the query string
  // (?month=) is forwarded automatically.
  async redirects() {
    return [{ source: "/monthly", destination: "/progress", permanent: true }];
  },
};

export default nextConfig;
