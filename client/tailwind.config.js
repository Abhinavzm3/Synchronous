/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/index.html",      // <-- include if you have any HTML
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      // add custom colors, spacing, etc., here
    },
  },
  plugins: [
    // e.g. require('@tailwindcss/forms'),
  ],
}
