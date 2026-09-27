/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E1526',
        paper: '#FAFAF8',
        // Driven by CSS custom properties set from the admin Theme page
        // (see app/layout.js) — editing the theme updates every use of
        // `signal`/`amber` across the site with no code changes.
        signal: 'var(--color-primary)',
        amber: 'var(--color-secondary)',
        slate: '#4B5566',
        hairline: '#E4E1D8',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      maxWidth: {
        content: '1180px',
      },
    },
  },
  plugins: [],
};
