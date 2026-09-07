import { defineConfig } from 'vitest/config'

// Tests unitaires : `npm test`. Environnement Node par défaut (libs pures) ;
// un test de composant peut demander jsdom avec `// @vitest-environment jsdom`.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{js,jsx}', 'scripts/**/*.test.mjs', 'worker/**/*.test.js'],
    environment: 'node',
    globals: false,
  },
})
