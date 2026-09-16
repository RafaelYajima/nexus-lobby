/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05060a',
          900: '#0a0d16',
          850: '#0d1120',
          800: '#121627',
        },
      },
      boxShadow: {
        'neon-violet': '0 0 28px rgba(168, 85, 247, 0.35)',
        'neon-cyan': '0 0 28px rgba(34, 211, 238, 0.30)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(46px, -34px) scale(1.12)' },
        },
        'float-reverse': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-46px, 30px) scale(1.06)' },
        },
      },
      animation: {
        float: 'float 14s ease-in-out infinite',
        'float-reverse': 'float-reverse 17s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
