import baseConfig from "./eslint.config.mjs"

export default [
  ...baseConfig, // Include the base/default configuration
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error"
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error"
    },
  },
  { // Rules specific to Jest tests
    files: ["src/**/*.test.*", "src/test/**/*.ts"],
    rules: {
      "jest/no-focused-tests": "error"
    }
  },
  { // Rules specific to Cypress tests
    files: ["cypress/**/*.ts"],
    rules: {
      "mocha/no-exclusive-tests": "error"
    }
  }
]
