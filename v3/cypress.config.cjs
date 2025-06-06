const { defineConfig } = require('cypress')
const fs = require('fs-extra')
const path = require('path')

module.exports = defineConfig({
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

            // Tasks for checking, clearing downloaded files.
            on("task", {
                fileExists(filePath) {
                    return fs.existsSync(filePath)
                }
            })
            on("task", {
                clearFolder(folderPath) {
                    fs.rmdirSync(folderPath, { recursive: true });
                    fs.mkdirSync(folderPath);
                    return null;
                }
            })

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
