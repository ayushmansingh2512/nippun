/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        peiko: ['Ppeiko', 'serif'],
        montreal: ['Ppneuemontreal', 'sans-serif'],
        museum: ['Ppmuseum', 'sans-serif'],
      },
      colors: {
        a24White: '#f2f2f2',
        a24Black: '#000000',
        a24Grey: '#d6d3d1',
        a24Red: '#891a20',
      },
    },
  },
  plugins: [],
}
