import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1c385f',
        'primary-hover': '#162d4d',
        'background-light': '#f6f7f8',
        // Dark mode design tokens from "Digital Monolith"
        'dm-surface': '#131313',
        'dm-surface-low': '#1C1B1B',
        'dm-surface-high': '#2A2A2A',
        'dm-surface-bright': '#393939',
        'dm-primary': '#A2C9FF',
        'dm-primary-container': '#005494',
        'dm-secondary': '#B4CAD6',
        'dm-on-surface': '#E5E2E1',
        'dm-on-surface-variant': '#C2C6D3',
      },
      fontFamily: {
        display: ['Public Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      spacing: {
        '18': '4.5rem',
      },
      transitionDuration: {
        '180': '180ms',
      },
    },
  },
  plugins: [typography],
};

export default config;
