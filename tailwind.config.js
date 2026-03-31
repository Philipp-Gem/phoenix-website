// tailwind.config.js (ESM)
export default {
  darkMode: "class",
  // Vite-Root ist src/frontend → relativ dazu:
  content: [
    "./src/frontend/index.html",
    "./src/frontend/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:    { DEFAULT: "#0f1115", soft: "#12151c" },
        panel: { DEFAULT: "#171a21" },
      },
      boxShadow: {
        soft: "0 8px 20px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
