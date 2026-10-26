/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        courtborder: 'var(--border-line)',
        app: 'var(--bg-app)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          soft: 'var(--bg-surface-soft)',
          elevated: 'var(--bg-surface-elevated)',
        },
        ink: {
          DEFAULT: 'var(--text-main)',
          muted: 'var(--text-muted)',
          heading: 'var(--text-heading)',
        },
        brand: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          text: 'var(--accent-primary-text)',
        },
        alert: {
          DEFAULT: 'var(--accent-alert)',
          soft: 'var(--accent-alert-soft)',
        },
        scorebox: 'var(--score-box-bg)',
      },
    },
  },
  plugins: [],
}
