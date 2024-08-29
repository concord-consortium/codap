module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.v2.json", "./cypress/tsconfig.json"]
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
    },
    "componentWrapperFunctions": [
      // The name of any function used to wrap components, e.g. Mobx `observer` function.
      // If this isn't set, components wrapped by these functions will be skipped.
      "observer"
    ]
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
    "no-constant-binary-expression": "error",
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
    { // rules specific to CODAP v2 code ported to v3
      files: ["**/*.v2.js", "**/*.v2.ts", "**/*.v2.test.tsx"],
      rules: {
        "@typescript-eslint/no-shadow": "off",
        "@typescript-eslint/no-this-alias": "off",
        "no-prototype-builtins": "off",
        "no-var": "off",
        "import/no-named-as-default-member": "off",
        "max-len": "off",
        "no-useless-escape": "off",
        "prefer-const": "off",
        "react/no-deprecated": "off",
        "testing-library/no-container": "off",
        "testing-library/no-node-access": "off"
      }
    },
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
        "jest/no-focused-tests": "warn" // error in .eslintrc.build.js
      }
    },
    { // rules specific to Cypress tests
      files: ["cypress/**"],
      env: {
        node: true,
        "cypress/globals": true
      },
      plugins: ["cypress", "mocha"],
      extends: ["plugin:cypress/recommended", "plugin:mocha/recommended"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-var-requires": "off",
        "cypress/no-unnecessary-waiting": "off",
        "cypress/unsafe-to-chain-command": "off", // FIXME: multiple errors reported
        "mocha/consistent-spacing-between-blocks": "off",
        "mocha/max-top-level-suites": "off",
        "mocha/no-exclusive-tests": "warn", // error in .eslintrc.build.js
        "mocha/no-mocha-arrows": "off",
        "mocha/no-setup-in-describe": "off",
        "mocha/no-skipped-tests": "off",
      }
    },
    { // Lint configs in the base v3 directory
      // (Do not add cypress.config.ts, as that was autogenerated)
      files: [".eslintrc*.cjs", "./*.config.js", "why-did-you-render.ts"],
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
