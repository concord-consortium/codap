module.exports = {
  extends: "./.eslintrc.cjs",
  rules: {
    "array-bracket-spacing": ["error", "never"],
    "object-curly-spacing": ["error", "always"],
    "react/jsx-curly-spacing": ["error", { "when": "never", "children": { "when": "always" } }],
  }
}
