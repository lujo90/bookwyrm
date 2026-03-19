import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets:  ["latin"],
  weight:   ["700", "800"],
  variable: "--font-display",
  display:  "swap",
});

const dmSans = DM_Sans({
  subsets:  ["latin"],
  weight:   ["400", "500", "600", "700"],
  variable: "--font-body",
  display:  "swap",
});

export const metadata: Metadata = {
  title: {
    default:  "FoodComply",
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
    <html lang="en" className={`${outfit.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
