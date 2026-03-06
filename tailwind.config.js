/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lcars-orange': '#ff9900',
        'lcars-blue': '#6699cc',
        'lcars-purple': '#9933cc',
        'lcars-yellow': '#ffcc33',
        'lcars-red': '#cc6666',
        'lcars-green': '#99cc99',
      },
      fontFamily: {
        'lcars': ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
