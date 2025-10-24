/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./App.tsx",
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                background: "#353535",
                foreground: "#FFFFFF",

                primary: {
                    DEFAULT: "#8A897C",
                    foreground: "#FFFFFF",
                },
                secondary: {
                    DEFAULT: "#BDBBB0",
                    foreground: "#FFFFFF",
                },
                destructive: {
                    DEFAULT: "#FCA311",
                    foreground: "#FFFFFF",
                },
                muted: {
                    DEFAULT: "#D2D7DF",
                    foreground: "#D2D7DF",
                },
            },
        },
    },
    plugins: [],
};
