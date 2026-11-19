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
import "./commands"

// Alternatively you can use CommonJS syntax:
// require("./commands")

// add code coverage support
import "@cypress/code-coverage/support"

// add support for dispatching native events (https://github.com/dmtrKovalenko/cypress-real-events)
import "cypress-real-events"

// Some uncaught exceptions are ignored so they don't fail the test, but an ignored exception can
// still leave the app in a broken state (e.g. one thrown inside framer-motion's frame loop stops
// all of its animations). Log every exception so that a later failure can be traced back to it.
Cypress.on("uncaught:exception", err => {
  Cypress.log({ name: "uncaught exception", message: err.message })
  console.error("[cypress] uncaught exception:", err)
  // https://github.com/quasarframework/quasar/issues/2233#issuecomment-1006506083
  const isIgnored = err.message.includes("ResizeObserver") || err.message.includes("not a function")
  return !isIgnored
})

// Suppress the AnnouncementBanner during Cypress runs. The banner is fetched
// from S3 on mount and, if successful, adds a 50px top offset to the workspace.
// That offset can cause unrelated visibility/position assertions to fail (e.g.
// position: fixed elements get covered by shifted tool-shelf items). Returning
// 404 makes fetchBannerConfig fail silently and the banner doesn't render.
// eslint-disable-next-line mocha/no-top-level-hooks
beforeEach(() => {
  cy.intercept("GET", "**/notifications/v3-announcement-banner.json", { statusCode: 404 })
})

// Hide the About dialog's welcome view, which opens on every load and would cover what tests interact with.
// Tests of the welcome view set Cypress.env("showWelcome", true) first.
Cypress.on("window:before:load", (win) => {
  if (Cypress.env("showWelcome")) return
  const kPersistentStateKey = "persistentState"
  const stored = JSON.parse(win.localStorage.getItem(kPersistentStateKey) || "{}")
  win.localStorage.setItem(kPersistentStateKey, JSON.stringify({ ...stored, hideWelcome: true }))
})

// Capture console.log/warn/error from the application and display in Cypress command log
// This is useful for debugging CI-specific test failures
Cypress.on("window:before:load", (win) => {
  const originalConsoleLog = win.console.log
  const originalConsoleWarn = win.console.warn
  const originalConsoleError = win.console.error

  win.console.log = (...args) => {
    originalConsoleLog.apply(win.console, args)
    const message = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ")
    Cypress.log({ name: "console.log", message })
  }

  win.console.warn = (...args) => {
    originalConsoleWarn.apply(win.console, args)
    const message = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ")
    Cypress.log({ name: "console.warn", message })
  }

  win.console.error = (...args) => {
    originalConsoleError.apply(win.console, args)
    const message = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ")
    Cypress.log({ name: "console.error", message })
  }
})
