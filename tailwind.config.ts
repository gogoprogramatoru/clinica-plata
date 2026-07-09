import type { Config } from "tailwindcss";

/**
 * Design tokens for a calm, clinical aesthetic: near-white surfaces, a
 * restrained neutral scale and a single teal/blue accent. Spacing and radii
 * are intentionally generous ("aerisit" / airy) for touch-friendly UI.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral surface scale
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f7f9fb",
          muted: "#eef2f6",
        },
        // Primary accent — a discreet medical teal-blue
        brand: {
          50: "#eff9fb",
          100: "#d6f0f5",
          200: "#b0e2eb",
          300: "#7bccdb",
          400: "#41adc3",
          500: "#2591a9",
          600: "#20748d",
          700: "#205e73",
          800: "#224e5f",
          900: "#204251",
          950: "#0f2a37",
        },
        // Secondary supportive green for "paid / success" states
        mint: {
          50: "#effaf3",
          100: "#d8f2e1",
          500: "#1f9d55",
          600: "#188049",
          700: "#16653c",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 42 55 / 0.04), 0 1px 3px 0 rgb(16 42 55 / 0.06)",
        "card-hover":
          "0 4px 12px -2px rgb(16 42 55 / 0.10), 0 2px 6px -2px rgb(16 42 55 / 0.06)",
        focus: "0 0 0 3px rgb(37 145 169 / 0.30)",
      },
      keyframes: {
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgb(37 145 169 / 0.45)" },
          "70%": { boxShadow: "0 0 0 10px rgb(37 145 169 / 0)" },
          "100%": { boxShadow: "0 0 0 0 rgb(37 145 169 / 0)" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.25s ease-out",
        "pulse-ring": "pulse-ring 1.6s ease-out 2",
      },
    },
  },
  plugins: [],
};

export default config;
