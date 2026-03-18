import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB",
          light:   "#EFF6FF",
          mid:     "#BFDBFE",
        },
        success: {
          DEFAULT: "#16A34A",
          light:   "#F0FDF4",
        },
        warning: {
          DEFAULT: "#D97706",
          light:   "#FFFBEB",
        },
        danger: {
          DEFAULT: "#DC2626",
          light:   "#FEF2F2",
        },
        dark:   "#1E293B",
        mid:    "#475569",
        light:  "#64748B",
        pale:   "#94A3B8",
        border: "#E2E8F0",
        bg:     "#F8FAFC",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body:    ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
