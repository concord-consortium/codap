import { defineConfig } from 'cypress'

export default defineConfig({
  video: false,
  fixturesFolder: false,
  projectId: 'msrfxa',
  defaultCommandTimeout: 8000,
  viewportWidth: 1400,
  viewportHeight: 1000,
  modifyObstructiveCode: false,
  chromeWebSecurity:false,
  retries: {
    runMode: 2,
    openMode: 0
  },
  env: {
    coverage: false,
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.js')(on, config)
    },
    baseUrl: 'http://localhost:8080',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
  },
})
