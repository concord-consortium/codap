module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    project: ["./tsconfig.json", "./cypress/tsconfig.json"]
  },
  plugins: ["@typescript-eslint", "json", "react", "react-hooks"],
  env: {
    browser: true,
    es6: true
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"]
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "."
      }
    },
    react: {
      pragma: "React",
      version: "detect"
    }
  },
  ignorePatterns: [
    "dist/", "node_modules/"
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:eslint-comments/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:json/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/func-call-spacing": ["warn"],
    "@typescript-eslint/no-confusing-non-null-assertion": "error",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-require-imports": "error",
    "@typescript-eslint/no-shadow": ["error", { builtinGlobals: false, hoist: "all", allow: [] }],
    "@typescript-eslint/no-unnecessary-type-assertion": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
    "@typescript-eslint/prefer-optional-chain": "warn",
    "@typescript-eslint/semi": ["warn", "never", { "beforeStatementContinuationChars": "always" }],
    "block-spacing": ["warn"],
    "comma-spacing": ["warn"],
    "curly": ["error", "multi-line", "consistent"],
    "dot-notation": "error",
    "eol-last": "warn",
    "eqeqeq": ["error", "smart"],
    "eslint-comments/no-unused-disable": "off",   // enabled in .eslintrc.build.js
    "func-call-spacing": "off", // superseded by @typescript-eslint/func-call-spacing
    "import/no-cycle": "warn",
    "import/no-extraneous-dependencies": "warn",
    "import/no-useless-path-segments": "warn",
    // "jsx-quotes": ["error", "prefer-double"],
    "keyword-spacing": ["warn"],
    "max-len": ["warn", { code: 120, ignoreUrls: true }],
    "no-bitwise": "error",
    "no-debugger": "off",
    "no-duplicate-imports": "error",
    "no-sequences": "error",
    "no-shadow": "off", // superseded by @typescript-eslint/no-shadow
    "no-tabs": "error",
    "no-unneeded-ternary": "error",
    "no-unused-expressions": ["error", { allowShortCircuit: true }],
    "no-unused-vars": "off",  // superseded by @typescript-eslint/no-unused-vars
    "no-useless-call": "error",
    "no-useless-concat": "error",
    "no-useless-rename": "error",
    "no-useless-return": "error",
    "no-var": "error",
    "no-whitespace-before-property": "error",
    "object-shorthand": "error",
    "operator-linebreak": "warn",
    "prefer-const": ["error", { destructuring: "all" }],
    "prefer-object-spread": "error",
    "prefer-regex-literals": "error",
    "prefer-rest-params": "error",
    "prefer-spread": "error",
    "prefer-template": "error",
    // "quotes": ["error", "double", { allowTemplateLiterals: true, avoidEscape: true }],
    "radix": "error",
    "react/jsx-closing-tag-location": "error",
    "react/jsx-handler-names": "off",
    "react/jsx-no-useless-fragment": "off",
    "react/no-access-state-in-setstate": "error",
    "react/no-danger": "error",
    "react/no-unsafe": ["off", { checkAliases: true }],
    "react/no-unused-state": "error",
    "react/prop-types": "off",
    "semi": "off", // superseded by @typescript-eslint/semi
    "semi-style": ["warn", "first"],
    "space-before-blocks": ["warn"],
    "space-in-parens": ["warn"]
  },
  overrides: [
    { // rules specific to Jest tests
      files: ["src/**/*.test.*", "src/test/**"],
      env: {
        node: true,
        jest: true
      },
      plugins: ["jest", "testing-library"],
      extends: ["plugin:jest/recommended", "plugin:testing-library/react"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        // require() can be useful in mocking
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-var-requires": "off",
        "jest/no-disabled-tests": "off",
        "jest/no-done-callback": "off",
        "jest/no-focused-tests": "off"  // enabled in .eslintrc.build.js
      }
    },
    { // rules specific to Cypress tests
      files: ["cypress/**"],
      env: {
        node: true,
        "cypress/globals": true
      },
      plugins: ["cypress"],
      extends: ["plugin:cypress/recommended"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-var-requires": "off",
        "cypress/no-unnecessary-waiting": "off"
      }
    },
    { // eslint configs
      files: [".eslintrc*.js"],
      env: {
        node: true
      }
    },
    { // webpack configs
      files: ["**/webpack.config.js"],
      env: {
        node: true
      },
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-var-requires": "off",
        // "quotes": ["error", "single", { allowTemplateLiterals: true, avoidEscape: true }],
      }
    }
  ]
}
