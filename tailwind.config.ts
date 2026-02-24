import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fdf2f2",
          100: "#fce4e4",
          200: "#f8cad0",
          300: "#f3a8b3",
          400: "#e87a92",
          500: "#d94f6b",
          600: "#ba3861",
          700: "#9b2f55",
          800: "#7d2847",
          900: "#a01f1f", // Logo main red
          950: "#5d1b25",
        },
        accent: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      fontFamily: {
        geist: ["var(--font-geist-sans)"],
      },
    },
  },
  plugins: [],
};
export default config;
