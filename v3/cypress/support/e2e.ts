// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// "supportFile" configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Alternatively you can use CommonJS syntax:
// require("./commands")

// add code coverage support
import "@cypress/code-coverage/support"

// https://github.com/quasarframework/quasar/issues/2233#issuecomment-1006506083
Cypress.on("uncaught:exception", err => !err.message.includes("ResizeObserver"))


Cypress.on("uncaught:exception", (err, runnable) => {
    // we expect a 3rd party library error with message "list not defined"
    // and don"t want to fail the test so we return false
    return false;
    // we still want to ensure there are no other unexpected
    // errors, so we let them fail the test
});
