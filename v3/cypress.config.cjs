const path = require('path')
const fs = require('fs');
const codeCoverageTask = require('@cypress/code-coverage/task');

module.exports = {
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
            // Tasks for checking, clearing downloaded files.
            on("task", {
                // This fails because of PnP isn't supported by Cypress, this might be fixed in Cypress 15
                fileExists(filePath) {
                    return fs.existsSync(filePath)
                }
            })
            on("task", {
                // This fails because of PnP isn't supported by Cypress, this might be fixed in Cypress 15
                clearFolder(folderPath) {
                    fs.rmdirSync(folderPath, { recursive: true });
                    fs.mkdirSync(folderPath);
                    return null;
                }
            })

            const env = config.env.testEnv || 'local'

            // Disable code coverage because of issues with PnP
            return codeCoverageTask(on, { ...config,
                // Hard code the local config for now to see if it works
                ...{
                    "baseUrl": "http://localhost:8080",
                    "index": "/",
                    "v3ActivityPlayerUrl": "https://activity-player.concord.org/branch/master/?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F1178.json"
                }
            });
        },
        baseUrl: 'http://localhost:8080',
        specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}'
    },
}
