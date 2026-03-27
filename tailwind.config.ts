const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                pmpink: { 500: '#fffffc' },
                pmpink2: { 500: '#FFC8E3' },
                retropink: { 200: '#FFC8E3', 500: '#FF328F' },
                pmred: { 500: '#f30020' },
                pmblue: { 500: '#24438d' },
                pmorange: { 500: '#FF7E55' },
                pmblue2: { 500: '#C5E1EF', 800: '#07154b' },
            },
            fontFamily: {
                'dela-gothic': ['"Dela Gothic One"', 'sans-serif'],
                'work-sans': ['"Work Sans"', 'sans-serif'],
                'dm-sans': ['"DM Sans"', 'sans-serif'],
            },
            keyframes: {
                jiggle: {
                    '0%, 100%': { transform: 'rotate(0deg)' },
                    '25%': { transform: 'rotate(-5deg)' },
                    '75%': { transform: 'rotate(5deg)' },
                },
                flash: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                flip: {
                    '0%': { transform: 'rotateY(0)' },
                    '100%': { transform: 'rotateY(0.5turn)' },
                },
                'pulse-glow': {
                    '0%': { boxShadow: '0 0 0 0px rgba(250, 67, 95, 0.7)' },
                    '100%': { boxShadow: '0 0 0 60px rgba(0, 0, 0, 0)' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'vertical-marquee': {
                    '0%': { transform: 'translateY(0)' },
                    '100%': { transform: 'translateY(-50%)' },
                },
                starburst: {
                    '0%': { opacity: '1', transform: 'translate(0, 0) scale(1) rotate(0deg)' },
                    '100%': { opacity: '0', transform: 'translate(var(--x), var(--y)) scale(1.5) rotate(var(--rotation))' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
            animation: {
                jiggle: 'jiggle 0.3s ease-in-out infinite',
                flash: 'flash 1s steps(1, end) infinite',
                flip: 'flip 1s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 1s infinite alternate',
                'fade-in': 'fade-in 1s ease-in-out forwards',
                'vertical-marquee': 'vertical-marquee var(--marquee-duration) linear infinite',
                starburst: 'starburst 0.8s ease-out forwards',
                marquee: 'marquee var(--marquee-duration, 45s) linear infinite',
            },
        },
    },
    plugins: [
        plugin(function ({ addUtilities }: { addUtilities: Function }) {
            const newUtilities = {
                '.perspective-400': { perspective: '400px' },
                '.transform-3d': { 'transform-style': 'preserve-3d' },
                '.rotate-y-0': { transform: 'rotateY(0turn)' },
                '.rotate-y-half': { transform: 'rotateY(0.5turn) translateZ(1px)' },
                '.backface-hidden': { 'backface-visibility': 'hidden' },
                '.bg-linear-to-b': { 'background-image': 'linear-gradient(to bottom, var(--tw-gradient-stops))' },
                '.bg-linear-to-t': { 'background-image': 'linear-gradient(to top, var(--tw-gradient-stops))' },
            };
            addUtilities(newUtilities, ['responsive']);
        }),
    ],
};
