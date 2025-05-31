/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Noto Sans', 'system-ui', 'sans-serif'],
        'mono': ['Space Grotesk', 'monospace'],
      },
      colors: {
        'cyber-cyan': '#00ffcc',
        'cyber-blue': '#0066ff',
        'cyber-purple': '#6600ff',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
} 