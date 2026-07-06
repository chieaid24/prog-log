import type { MetadataRoute } from "next";

// Web app manifest so add-to-home-screen installs look right: Ferdy icons,
// paper surfaces, standalone display. Icons are generated from the pixel
// sprite by `node scripts/generate-icons.mjs` (see components/ui/frog.tsx).
// Colors are the sRGB equivalents of the DESIGN.md oklch tokens.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "prog-log",
    short_name: "prog-log",
    description:
      "A daily work log: projects, time commitments, milestones and throwbacks.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f0",
    theme_color: "#f7f6f0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
