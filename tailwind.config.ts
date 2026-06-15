import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Watermelon palette — actual watermelon flesh + rind.
        melon: {
          50: "#fef2f3",
          100: "#fdddE1",
          200: "#fab7c1",
          300: "#f48c9c",
          400: "#ea6378",
          500: "#dd4a62",
          600: "#c1364e",
          700: "#9e2b40",
          800: "#7d2334",
          900: "#561624",
        },
        rind: {
          50: "#f0f8f1",
          100: "#d8eedb",
          200: "#b1dcb8",
          300: "#82c489",
          400: "#5cad65",
          500: "#449151",
          600: "#347342",
          700: "#2a5c37",
          800: "#22482d",
          900: "#173220",
        },
        // Cool soft grey neutrals.
        seed: {
          50: "#f6f7f9",
          100: "#eef0f4",
          200: "#dee1e7",
          300: "#c1c6d0",
          400: "#8d94a2",
          500: "#5d6575",
          600: "#444b5a",
          700: "#363c48",
          800: "#22262e",
          900: "#151820",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: [
          "var(--font-fraunces)",
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
      },
      borderRadius: {
        xl: "10px",
        "2xl": "14px",
        "3xl": "22px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 24, 40, 0.04), 0 1px 3px rgba(20, 24, 40, 0.06)",
        lift: "0 6px 24px rgba(20, 24, 40, 0.08), 0 2px 8px rgba(20, 24, 40, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
