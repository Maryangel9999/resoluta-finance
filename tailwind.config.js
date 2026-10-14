/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        resoluta: {
          navy: '#071D49',
          gold: '#D4A52B',
          blue: '#1B56B8',
          background: '#F6F8FB',
          white: '#FFFFFF',
          border: '#E5E7EB',
          muted: '#6B7280',
        },
      },
      boxShadow: {
        card: '0 8px 30px rgba(7, 29, 73, 0.08)',
      },
      fontFamily: {
        sans: ['Montserrat', 'Arial', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
