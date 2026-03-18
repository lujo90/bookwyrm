import type { Metadata } from "next";
import "./globals.css";

/*
 * Fonts are loaded via CSS variable fallbacks defined in globals.css.
 * When the build environment has internet access, replace this with
 * next/font/google imports for Outfit (700, 800) and DM Sans (400–700).
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
