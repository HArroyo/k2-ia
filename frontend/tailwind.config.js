/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        k2: {
          bg: '#000000',           // Color Principal Dark Background
          card: '#293d4a',         // Color Secundario Tarjetas / Paneles
          cardDark: '#1a2730',     // Fondo oscuro de tarjetas
          accent: '#00f4ed',       // Color Acento / Turquesa Neón
          teal: '#008d9b',         // Color Terciario / Bordes / Hover
          border: '#374e5e',       // Bordes sutiles
          red: '#ff3355',          // Alertas Críticas / Blacklist
          green: '#00e676',        // Estado OK / Whitelist
          yellow: '#ffb300',       // Advertencias
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'k2-neon': '0 0 15px rgba(0, 244, 237, 0.4)',
        'k2-glow': '0 0 25px rgba(0, 244, 237, 0.25)',
        'k2-red-glow': '0 0 20px rgba(255, 51, 85, 0.4)',
      }
    },
  },
  plugins: [],
}
