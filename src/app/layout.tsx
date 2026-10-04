import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (OFL) so builds don't depend on Google Fonts being reachable.
const inter = localFont({
  variable: "--font-inter",
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
});
const serif = localFont({
  variable: "--font-serif-display",
  src: [
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600" },
  ],
});

export const metadata: Metadata = {
  title: "hiwo – hier wohne ich.",
  description: "Der digitale Raum für dein Zuhause.",
  appleWebApp: { capable: true, title: "hiwo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F7F6F2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${inter.variable} ${serif.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
