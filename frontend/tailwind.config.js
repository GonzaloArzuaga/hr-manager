/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B1E28',
        surface: '#F6F7F9',
        primary: {
          DEFAULT: '#1D3557',
          light: '#2A466F',
          dark: '#13233D'
        },
        accent: {
          DEFAULT: '#2A9D8F',
          light: '#E3F3F1'
        },
        warn: {
          DEFAULT: '#E9C46A',
          light: '#FBF1DA'
        },
        danger: {
          DEFAULT: '#E15554',
          light: '#FBE4E4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
