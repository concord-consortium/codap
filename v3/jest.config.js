/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest/presets/js-with-ts",
  resolver: "<rootDir>/src/test/jest-resolver.js",
  transform: {
    "^.+\\.json5$": "@talabes/json5-jest",
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        isolatedModules: true
      }
    ]
  },
  transformIgnorePatterns: [
    "/comments/ESM-only (https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) modules that should not be transformed by ts-jest",
    "/node_modules/(?!(d3|d3-(.+)|decode-uri-component|delaunator|escape-string-regexp|filter-obj|internmap|mime|nanoid|query-string|random|@?react-leaflet|robust-predicates|split-on-first)/)"
  ],
  setupFilesAfterEnv: [
    "<rootDir>/src/test/setupTests.ts"
  ],
  testEnvironment: "jsdom",
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  testPathIgnorePatterns: [
    "/node_modules/",
    "/cypress/"
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "src/test/"
  ],
  moduleNameMapper: {
    "\\.(csv|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    "^mobx-state-tree$": "@concord-consortium/mobx-state-tree"
  },
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json"
  ],
  // Enhanced settings below
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/test/**/*",
    "!src/**/*.stories.{ts,tsx}",
    "!src/index.tsx",
    "!src/v2/**/*"
  ],
  coverageReporters: [
    "text",
    "html",
    "lcov",
    "json-summary"
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 40,
      functions: 50,
      lines: 50
    },
    "src/models/": {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    },
    "src/utilities/": {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  },
  verbose: true,
  testTimeout: 30000,
  maxWorkers: "50%",
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname"
  ]
};

module.exports = config; 