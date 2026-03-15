/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#16936F',
          dark: '#124B60',
          light: '#8DC796',
        },
        secondary: {
          DEFAULT: '#8DC796',
          light: '#C7DABF',
        },
        accent: {
          DEFAULT: '#F3E9D3',
        },
        brand: {
          'dark-petrol': '#124B60',
          'green': '#16936F',
          'green-light': '#8DC796',
          'green-pastel': '#C7DABF',
          'cream': '#F3E9D3',
        }
      },
    },
  },
  plugins: [],
};
