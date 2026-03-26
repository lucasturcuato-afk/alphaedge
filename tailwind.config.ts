import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'IBM Plex Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        bg: {
          primary: "#080B10",
          secondary: "#0D1117",
          tertiary: "#131920",
          card: "#0F1419",
          border: "#1C2330",
          hover: "#162030",
        },
        accent: {
          green: "#00FF87",
          red: "#FF3B5C",
          blue: "#0EA5E9",
          amber: "#F59E0B",
          purple: "#A855F7",
          cyan: "#22D3EE",
        },
        text: {
          primary: "#E8EEF4",
          secondary: "#7B8FA6",
          muted: "#4A5D6E",
          accent: "#00FF87",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "grid-pattern":
          "linear-gradient(rgba(0,255,135,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,135,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        "glow-green": "0 0 20px rgba(0,255,135,0.15)",
        "glow-red": "0 0 20px rgba(255,59,92,0.15)",
        "glow-blue": "0 0 20px rgba(14,165,233,0.15)",
        card: "0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
