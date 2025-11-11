// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        normal: '#00FF7F',        // neon green
        interference: '#FFD700',  // yellow-gold
        critical: '#FF3131',      // red alert
        panel: '#1a1a1a',
        accent: '#00FFFF',
      },
      boxShadow: {
        glow: '0 0 10px rgba(0,255,127,0.5)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace']
      },
    },
  },
  plugins: [],
};
