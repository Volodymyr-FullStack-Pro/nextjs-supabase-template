/** @type {import('prettier').Config} */
const config = {
  semi: false,
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'all',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/app/globals.css', // порядок классов Tailwind — автоматически
}

export default config
