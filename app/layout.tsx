import type { Metadata, Viewport } from "next";
import { Geist_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Sans for language, mono for measurement (DESIGN.md): Hanken Grotesk carries
// all prose and labels; Geist Mono carries every logged number, date and count.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "prog-log",
    template: "%s · prog-log",
  },
  description: "A daily work log: projects, time commitments, milestones and throwbacks.",
  applicationName: "prog-log",
  appleWebApp: {
    capable: true,
    title: "prog-log",
    statusBarStyle: "default",
  },
};

// Mobile viewport: zoom stays enabled (accessibility), viewport-fit=cover so
// safe-area insets are exposed for the notch/home indicator, theme-color
// matches the paper surface (#f7f6f0 = oklch(0.972 0.008 95)).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f6f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${hankenGrotesk.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
