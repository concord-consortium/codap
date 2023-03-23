import { defineConfig } from 'cypress'
import fs from 'fs-extra';
import path from 'path';
import { addMatchImageSnapshotPlugin } from 'cypress-image-snapshot/plugin'

export default defineConfig({
    video: false,
    projectId: 'msrfxa',
    defaultCommandTimeout: 8000,
    viewportWidth: 1400,
    viewportHeight: 1000,
    modifyObstructiveCode: false,
    chromeWebSecurity: false,
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
        setupNodeEvents(on, config) {// promisified fs module

            function getConfigurationByFile(file) {
                const pathToConfigFile = path.resolve('.', 'cypress/config', `cypress.${file}.json`)

                return fs.readJson(pathToConfigFile)
            }

            const env = config.env.testEnv || 'local'

            return getConfigurationByFile(env)
                .then(envConfig => {
                    return require('@cypress/code-coverage/task')(on, { ...config, ...envConfig });
                });
        },
        baseUrl: 'http://localhost:8080',
        specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}'
    },
})
