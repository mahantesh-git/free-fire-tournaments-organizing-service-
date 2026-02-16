/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'rajdhani': ['Rajdhani', 'sans-serif'],
                'russo': ['Russo One', 'sans-serif'],
                'exo': ['Exo 2', 'sans-serif'],
                'inter': ['Inter', 'sans-serif'],
                'oswald': ['Oswald', 'sans-serif'],
                'bebas': ['Bebas Neue', 'sans-serif'],
            },
            colors: {
                'gaming': {
                    dark: '#0a0e27',
                    darker: '#0b0e17',
                    blue: '#00d9ff',
                    orange: '#ff4400',
                    purple: '#8b5cf6',
                    'neon-green': '#39ff14',
                },
                'cyber': {
                    black: '#0F0F0F',
                    charcoal: '#1A1A1A',
                    card: '#1E1E1E',
                    border: '#2A2A2A',
                    red: '#FF3B3B',
                    pink: '#FF006E',
                    purple: '#8B5CF6',
                    neon: '#00f0ff',
                    yellow: '#FAFF00',
                    green: '#39ff14',
                    muted: '#A0A0A0',
                },
            },
            animation: {
                'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
                'slide-up': 'slideUp 0.8s ease-out forwards',
                'fade-in': 'fadeIn 1s ease-out forwards',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { filter: 'drop-shadow(0 0 20px rgba(0, 217, 255, 0.3))' },
                    '50%': { filter: 'drop-shadow(0 0 40px rgba(0, 217, 255, 0.6))' },
                },
                slideUp: {
                    'from': { opacity: '0', transform: 'translateY(30px)' },
                    'to': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    'from': { opacity: '0' },
                    'to': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
