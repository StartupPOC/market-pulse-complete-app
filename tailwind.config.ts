import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pulse: {
          green: "#0b6b3f",
          deep: "#15573a",
          pale: "#eaf5ee",
          ink: "#101315",
          muted: "#5f6969",
          border: "#dfe3e1",
          red: "#ef3734",
          orange: "#f59a13",
          yellow: "#f5c50b"
        }
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 45px rgba(18, 35, 27, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
