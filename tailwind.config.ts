import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "ink-black": "#0a0705",
        "deep-brown": "#1a0f08",
        walnut: "#2d1a0e",
        mahogany: "#3d2010",
        amber: "#c97c2a",
        "amber-bright": "#e8a84a",
        "amber-pale": "#f5d49a",
        "candle-white": "#fef8e8",
        parchment: "#f2e4c4",
        "parchment-dark": "#d4bc8a",
        "parchment-aged": "#c8a96e",
        "ink-sepia": "#2c1810",
        "flame-orange": "#ff6b1a",
        "flame-yellow": "#ffd700",
        "wax-red": "#8b1a1a",
      },
      fontFamily: {
        pinyon: ["Pinyon Script", "cursive"],
        cormorant: ["Cormorant Garamond", "serif"],
        fell: ["IM Fell English", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
