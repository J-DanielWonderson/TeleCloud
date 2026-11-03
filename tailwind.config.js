/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        vault: {
          950: "#06090e",
          900: "#0b111a",
          850: "#101926",
          800: "#162234",
          700: "#1e3048",
          600: "#2d4566",
          accent: "#00d2ff",
          cyan: "#06b6d4",
          blue: "#3b82f6",
        }
      }
    },
  },
  plugins: [],
}
