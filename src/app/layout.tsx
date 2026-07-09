import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Clinica Plata",
    template: "%s · Clinica Plata",
  },
  description:
    "Platformă internă de gestiune a tichetelor și încasărilor pentru clinică.",
  authors: [{ name: "GxA Solutions", url: "https://gxasolutions.com" }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2591a9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className={inter.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
