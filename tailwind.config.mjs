import type { Config } from 'tailwindcss';

const config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
