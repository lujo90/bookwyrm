import type { Metadata } from "next";
import "./globals.css";

/*
 * FONT NOTE
 * ---------
 * DM Sans is defined as a CSS variable in globals.css using a system-font
 * fallback so the build works offline.
 *
 * In production (where outbound network is available), replace this with:
 *
 *   import { DM_Sans } from "next/font/google";
 *   const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
 *   <html lang="en" className={dmSans.variable}>
 *
 * That will load the real DM Sans typeface from Google Fonts at build time.
 */

export const metadata: Metadata = {
  title: {
    default: "FoodComply",
    template: "%s | FoodComply",
  },
  description:
    "EU food compliance made simple for small manufacturers and producers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
