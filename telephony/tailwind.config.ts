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
        background: "#000000",
        foreground: "#c9d1d9",
        gray: {
          900: "#161b22",
          800: "#21262d",
          700: "#30363d",
          400: "#8b949e",
        },
        navy: {
          900: "#001f3f",
          800: "#003366",
        },
      },
    },
  },
  plugins: [],
};

export default config;
