import js from "@eslint/js"
import stylisticEslintPlugin from "@stylistic/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import cypress from "eslint-plugin-cypress"
import importX from "eslint-plugin-import-x"
import jest from "eslint-plugin-jest"
import json from "eslint-plugin-json"
import mocha from "eslint-plugin-mocha"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import testingLibrary from "eslint-plugin-testing-library"
import globals from "globals"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tseslint from "typescript-eslint"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default [
  {
    ignores: ["**/dist/", "**/node_modules/", "src/models/formula/lezer"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  ...reactHooks.configs.recommended,
  {
    files: ["**/*.json"],
    plugins: { json },
    processor: json.processors[".json"],
    rules: json.configs.recommended.rules,
  },
  {
    plugins: {
      "@stylistic": stylisticEslintPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: "module",
      parserOptions: {
        project: ["./tsconfig.json", "./cypress/tsconfig.json"],
        tsconfigRootDir: __dirname
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off"
    },
    settings: {
      "import-x/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"]
      },
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "."
        }
      },
      react: {
        pragma: "React",
        version: "detect"
      },
      // The name of any function used to wrap components, e.g. Mobx `observer` function.
      // If this isn't set, components wrapped by these functions will be skipped.
      componentWrapperFunctions: ["observer"]
    },
    rules: {
      "@stylistic/block-spacing": ["off"],
      "@stylistic/comma-spacing": ["warn"],
      "@stylistic/eol-last": ["warn"],
      "@stylistic/function-call-spacing": ["warn"],
      "@stylistic/keyword-spacing": ["warn"],
      "@stylistic/max-len": ["warn", { code: 120, ignoreUrls: true }],
      "@stylistic/no-tabs": "error",
      "@stylistic/no-whitespace-before-property": "error",
      "@stylistic/operator-linebreak": "off",
      "@stylistic/semi": ["warn", "never", { beforeStatementContinuationChars: "always" }],
      "@stylistic/semi-style": ["warn", "first"],
      "@stylistic/space-before-blocks": ["warn"],
      "@stylistic/space-in-parens": ["warn"],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-confusing-non-null-assertion": "error",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-empty-object-type": ["error", { allowInterfaces: "always" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-shadow": ["error", { builtinGlobals: false, hoist: "all", allow: [] }],
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none", caughtErrors: "none", ignoreRestSiblings: true,
                                                      destructuredArrayIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/prefer-optional-chain": "warn",
      "curly": ["error", "multi-line", "consistent"],
      "dot-notation": "error",
      "eqeqeq": ["error", "smart"],
      "import-x/no-cycle": ["warn", { ignoreExternal: true }],
      "import-x/no-extraneous-dependencies": "warn",
      "import-x/no-named-as-default-member": "off",
      "import-x/no-useless-path-segments": "warn",
      "no-bitwise": "error",
      "no-constant-binary-expression": "error",
      "no-debugger": "off",
      "no-duplicate-imports": "error",
      "no-sequences": "error",
      "no-shadow": "off", // superseded by @typescript-eslint/no-shadow
      "no-unneeded-ternary": "error",
      "no-unused-expressions": "off", // superseded by @typescript-eslint/no-unused-expressions
      "no-unused-vars": "off", // superseded by @typescript-eslint/no-unused-vars
      "no-useless-call": "error",
      "no-useless-concat": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      "prefer-object-spread": "error",
      "prefer-regex-literals": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "prefer-template": "error",
      "radix": "error",
      "react/jsx-closing-tag-location": "error",
      "react/jsx-handler-names": "off",
      "react/jsx-no-useless-fragment": "off",
      "react/no-access-state-in-setstate": "error",
      "react/no-danger": "error",
      "react/no-unsafe": ["off", { checkAliases: true }],
      "react/no-unused-state": "error",
      "react/prop-types": "off"
    }
  },
  { // rules specific to CODAP v2 code ported to v3
    files: ["**/*.v2.js", "**/*.v2.ts", "**/*.v2.test.tsx"],
    rules: {
      "@stylistic/max-len": "off",
      "@typescript-eslint/no-shadow": "off",
      "@typescript-eslint/no-this-alias": "off",
      "no-prototype-builtins": "off",
      "no-var": "off",
      "import-x/no-named-as-default-member": "off",
      "no-useless-escape": "off",
      "prefer-const": "off",
      "react/no-deprecated": "off",
      "testing-library/no-container": "off",
      "testing-library/no-node-access": "off"
    }
  },
  {
    files: ["src/**/*.test.*", "src/test/**"],
    ...jest.configs["flat/recommended"],
  },
  {
    files: ["src/**/*.test.*", "src/test/**"],
    ...testingLibrary.configs["flat/react"],
  },
  {
    files: ["src/**/*.test.*", "src/test/**"],
    plugins: {
      jest,
      "testing-library": testingLibrary
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
    },
    rules: { // rules specific to Jest tests
      "@typescript-eslint/no-non-null-assertion": "off",
      // require() can be useful in mocking
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "jest/no-disabled-tests": "off",
      "jest/no-done-callback": "off",
      "jest/no-focused-tests": "warn" // error in .eslintrc.build.js
    },
  },
  {
    files: ["cypress/**"],
    plugins: {
      cypress,
      mocha
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...cypress.configs.globals.languageOptions.globals
      }
    },
    rules: {
      // Cypress recommended rules
      ...cypress.configs.recommended.rules,
      // Mocha recommended rules
      ...mocha.configs.recommended.rules,
      // rules specific to Cypress tests
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-var-requires": "off",
      "cypress/no-unnecessary-waiting": "off",
      "cypress/unsafe-to-chain-command": "off", // FIXME: multiple errors reported
      "mocha/consistent-spacing-between-blocks": "off",
      "mocha/max-top-level-suites": "off",
      "mocha/no-exclusive-tests": "warn", // error in .eslintrc.build.js
      "mocha/no-mocha-arrows": "off",
      "mocha/no-pending-tests": "off",
      "mocha/no-setup-in-describe": "off",
      "mocha/no-skipped-tests": "off"
    },
  },
  {
    // Lint configs in the base v3 directory
    // (Do not add cypress.config.ts, as that was autogenerated)
    files: ["./*.cjs", "./*.config.js", "**/why-did-you-render.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
  },
  {
    files: ["./*.cjs", "./postcss.config.js", "**/webpack.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off"
      // This can be used for more strict webpack config linting which matches the webpack examples
      // "quotes": ["error", "single", { allowTemplateLiterals: true, avoidEscape: true }],
    }
  }
]
