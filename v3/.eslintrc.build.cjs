// build/production configuration extends default/development configuration
module.exports = {
  extends: "./.eslintrc.cjs",
  rules: {
    "eslint-comments/no-unused-disable": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "error"
  },
  overrides: [
    { // rules specific to Jest tests
      files: ["src/**/*.test.*", "src/test/**"],
      rules: {
        "jest/no-focused-tests": "error"
      }
    },
    { // rules specific to Cypress tests
      files: ["cypress/**"],
      rules: {
        "mocha/no-exclusive-tests": "error"
      }
    }
  ]
}
