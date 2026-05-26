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
        // CODAP-1323 conformance suite (R28/R29) -- the spec targets the pre-flip temp
        // subdomain. Override on the CLI with --env redirectBaseUrl=https://<host>.
        redirectBaseUrl: 'https://codap2to3.concord.org',
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
        // Excludes the CODAP-1323 v2-v3-redirect conformance spec from the default /
        // regression specPattern (its temp subdomain exists only pre-flip; running it
        // outside that window would always fail). Run on demand with
        //   npx cypress run --spec cypress/e2e/v2-v3-redirect.spec.ts --env redirectBaseUrl=...
        specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
        excludeSpecPattern: ['**/v2-v3-redirect.spec.ts']
    },
})
