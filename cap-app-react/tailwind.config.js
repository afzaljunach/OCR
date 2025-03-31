// module.exports = {
//   theme: {
//     extend: {
//       colors: {
//         primary: {
//           50: '#ffece5',
//           100: '#ffd6c2',
//           200: '#ffba94',
//           300: '#ff9c63',
//           400: '#ff833c',
//           500: '#f36f21', // Your base color
//           600: '#d65e1a',
//           700: '#b24a14',
//           800: '#8d390e',
//           900: '#5b2409',
//         },
//       },
//     },
//   },
//   content: ['./src/**/*.{html,js,jsx,ts,tsx}'], // Ensure Tailwind scans all relevant files
//   plugins: [],
// };


// tailwind.config.js
const { heroui } = require("@heroui/react");

// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export const content = [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",,
];
export const theme = {
    extend: {
        height: {
            'cvh': 'calc(100vh - 6rem)',
            'cvh-2': 'calc(100vh - 12rem)',
            'cvh-3': 'calc(100vh - 20rem)',
        }
    },
    fontFamily: {
        sans: ['"Inter"', 'sans-serif']
    }
};
export const darkMode = "class";
export const plugins = [
    heroui({
        themes: {
            light: {
                colors: {
                    primary: {
                        DEFAULT: "#F57121",
                        '50': '#fff6ed',
                        '100': '#feecd6',
                        '200': '#fcd4ac',
                        '300': '#fab677',
                        '400': '#f78c40',
                        '500': '#f57121',
                        '600': '#e65210',
                        '700': '#bf3c0f',
                        '800': '#973115',
                        '900': '#7a2b14',
                        '950': '#421308',
                    },
                    secondary: {
                        DEFAULT: "#2A2A86",
                        '50': '#edf3ff',
                        '100': '#dee7ff',
                        '200': '#c4d2ff',
                        '300': '#a1b4ff',
                        '400': '#7b8cfe',
                        '500': '#5c65f8',
                        '600': '#423eed',
                        '700': '#3731d1',
                        '800': '#2d2aa9',
                        '900': '#2a2a86',
                        '950': '#1a194d',
                    },
                },
            }
        },
    }),
    require('postcss-import'),
    require('tailwindcss'),
    require('autoprefixer'),
];