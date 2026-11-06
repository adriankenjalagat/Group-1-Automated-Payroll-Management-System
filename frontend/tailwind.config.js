/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2a276e',
        'primary-hover': '#35318a',
        deep: '#0f0e2e',
        accent: '#f6e70b',
        'accent-hover': '#ffef3d',
        surface: '#ffffff',
        canvas: '#f4f4fa',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
