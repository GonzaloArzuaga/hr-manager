/** @type {import('tailwindcss').Config} */
// Tokens tomados del diseño de Figma (valores aproximados a partir de las capturas;
// reemplazar por los hexadecimales exactos cuando estén disponibles).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',          // texto principal
        muted: '#64748B',        // texto secundario
        surface: '#F5F7FB',      // fondo general de la aplicación
        soft: '#EEF2F9',         // fondo de inputs y bloques internos
        line: '#E2E8F0',         // bordes
        sidebar: '#1E293B',      // menú lateral
        primary: {
          DEFAULT: '#0B2A7F',    // botones principales, logo
          light: '#1D3FAE',
          dark: '#081F5C',
          50: '#E8EEFB'
        },
        info: {
          DEFAULT: '#1D4ED8',    // enlaces y acentos
          light: '#DBE6FE'
        },
        // Se mantienen los nombres usados por las páginas existentes
        accent: { DEFAULT: '#15803D', light: '#DCFCE7' },  // éxito / aprobado
        warn: { DEFAULT: '#B45309', light: '#FEF3C7' },    // pendiente
        danger: { DEFAULT: '#B91C1C', light: '#FEE2E2' }   // rechazado / error
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)'
      }
    }
  },
  plugins: []
}
