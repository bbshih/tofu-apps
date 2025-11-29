/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          50: '#f0fdf4',   // Pale matrix green
          100: '#dcfce7',  // Light neon green
          200: '#bbf7d0',  // Soft matrix
          300: '#86efac',  // Medium matrix
          400: '#4ade80',  // Bright matrix
          500: '#00ff41',  // Matrix green (primary)
          600: '#16a34a',  // Deep matrix
          700: '#15803d',  // Dark matrix
          800: '#166534',  // Forest matrix
          900: '#14532d',  // Midnight matrix
        },
        neon: {
          400: '#ff10f0',  // Hot pink (accent)
          500: '#ff006e',  // Deep pink
        },
        electric: {
          100: '#e0e7ff',  // Light cyber blue
          200: '#c7d2fe',  // Soft electric
          300: '#a5b4fc',  // Medium electric
          400: '#818cf8',  // Bright electric
          500: '#6366f1',  // Electric blue
          600: '#4f46e5',  // Deep electric
        },
        chrome: {
          500: '#d4d4d8',  // Silver chrome
          600: '#a1a1aa',  // Dark chrome
        }
      },
      animation: {
        // Y2K digital animations
        'glitch': 'glitch 1s linear infinite',
        'matrix': 'matrix 20s linear infinite',
        'scan': 'scan 2s linear infinite',
        'pixel': 'pixel 0.6s linear',

        // Cyber experimental animations
        'blob': 'blob 7s infinite',
        'spin-slow': 'spin 8s linear infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'bounce-slow': 'bounce 3s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'slide-left': 'slide-left 0.5s ease-out',
        'slide-right': 'slide-right 0.5s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'scale-in': 'scale-in 0.5s ease-out',
        'rotate-in': 'rotate-in 0.5s ease-out',
        'gradient-x': 'gradient-x 3s ease infinite',
        'gradient-y': 'gradient-y 3s ease infinite',
        'gradient-xy': 'gradient-xy 3s ease infinite',
        'tilt': 'tilt 10s infinite linear',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'float-medium': 'float-medium 4s ease-in-out infinite',
        'float-fast': 'float-fast 2s ease-in-out infinite',
        'bubble': 'bubble 4s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'swing': 'swing 2s ease-in-out infinite',
        'flip': 'flip 0.6s ease-in-out',
        'flip-horizontal': 'flip-horizontal 0.6s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite',
        'rainbow': 'rainbow 3s linear infinite',
      },
      keyframes: {
        // Y2K digital keyframes
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        matrix: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        scan: {
          '0%, 100%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        pixel: {
          '0%': { transform: 'scale(0)', opacity: '1', filter: 'blur(0px)' },
          '100%': { transform: 'scale(4)', opacity: '0', filter: 'blur(4px)' },
        },

        // Cyber experimental keyframes
        blob: {
          '0%, 100%': {
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          },
          '50%': {
            borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%',
          },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(14, 165, 233, 0.8)',
            transform: 'scale(1.05)',
          },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-left': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-right': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'rotate-in': {
          '0%': { transform: 'rotate(-180deg) scale(0)', opacity: '0' },
          '100%': { transform: 'rotate(0) scale(1)', opacity: '1' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: 'left center' },
          '50%': { backgroundPosition: 'right center' },
        },
        'gradient-y': {
          '0%, 100%': { backgroundPosition: 'center top' },
          '50%': { backgroundPosition: 'center bottom' },
        },
        'gradient-xy': {
          '0%, 100%': { backgroundPosition: 'left center' },
          '25%': { backgroundPosition: 'center top' },
          '50%': { backgroundPosition: 'right center' },
          '75%': { backgroundPosition: 'center bottom' },
        },
        tilt: {
          '0%, 50%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(1deg)' },
          '75%': { transform: 'rotate(-1deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-30px)' },
        },
        'float-medium': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'float-fast': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bubble: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-100vh) scale(1.2)' },
          '100%': { transform: 'translateY(-100vh) scale(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
        },
        swing: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(15deg)' },
          '75%': { transform: 'rotate(-15deg)' },
        },
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        'flip-horizontal': {
          '0%': { transform: 'rotateX(0deg)' },
          '100%': { transform: 'rotateX(360deg)' },
        },
        glow: {
          '0%, 100%': {
            filter: 'brightness(1) drop-shadow(0 0 5px rgba(14, 165, 233, 0.5))',
          },
          '50%': {
            filter: 'brightness(1.2) drop-shadow(0 0 20px rgba(14, 165, 233, 0.8))',
          },
        },
        rainbow: {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
      },
      perspective: {
        '1000': '1000px',
        '2000': '2000px',
      },
      transformStyle: {
        '3d': 'preserve-3d',
      },
      backfaceVisibility: {
        'hidden': 'hidden',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
