/** @type {import('tailwindcss').Config} */
// Design tokens live as CSS variables in src/renderer/styles/index.css;
// Tailwind maps semantic names onto them so every component shares one palette.
// Lets opacity modifiers like bg-ink/80 work with CSS-variable colours
const c = (v) => `color-mix(in srgb, var(--${v}) calc(<alpha-value> * 100%), transparent)`

module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       c('bg'),
        surface:  c('surface'),
        muted:    c('muted'),
        line:     c('line'),
        'line-strong': c('line-strong'),
        ink:      c('ink'),
        'ink-2':  c('ink-2'),
        'ink-3':  c('ink-3'),
        // Brand accent — set live from Settings via settingsStore
        accent:        c('accent'),
        'accent-hover':c('accent-hover'),
        'accent-ink':  c('accent-text'),
      },
      fontFamily: {
        sans: ['Inter', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(16,24,40,0.05)',
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        pop: '0 12px 32px -8px rgba(16,24,40,0.18), 0 4px 8px -4px rgba(16,24,40,0.08)',
      },
      screens: {
        xs: '420px',
      },
    },
  },
  plugins: [],
}
