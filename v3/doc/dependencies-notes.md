# Dependencies Notes

Notes on dependencies, particularly reasons for not updating to their latest versions.

## Development Dependencies

|Dependency                           |Current Version|Latest Version|Notes                                                                                          |
|-------------------------------------|---------------|--------------|-----------------------------------------------------------------------------------------------|
|@eslint/js                           |9.39.5         |10.0.1        |ESLint 10                                                                                      |
|@types/react                         |18.3.31        |19.3.0        |React 19                                                                                       |
|@types/react-dom                     |18.3.7         |19.3.0        |React 19                                                                                       |
|@typescript-eslint/eslint-plugin     |8.60.0         |8.73.0        |Pinned. 8.60.1+ `no-shadow` reports `const Foo = observer(function Foo() {...})` (145 errors)  |
|@typescript-eslint/parser            |8.60.0         |8.73.0        |Pinned with `@typescript-eslint/eslint-plugin`                                                 |
|@welldone-software/why-did-you-render|8.0.3          |10.0.1        |React 19                                                                                       |
|cypress                              |15.21.2        |16.3.0        |Removes `Cypress.env()` (used in specs); changes network interception, visibility, typing delay|
|eslint                               |9.39.5         |10.15.0       |ESLint 10                                                                                      |
|eslint-plugin-cypress                |6.4.4          |7.1.0         |Requires ESLint 10                                                                             |
|eslint-plugin-mocha                  |11.3.0         |12.0.2        |Requires ESLint 10.2+                                                                          |
|eslint-plugin-react-hooks            |6.1.1          |7.1.1         |`recommended` preset enables React Compiler rules (115 errors in 40 files)                     |
|typescript                           |5.9.3          |7.0.2         |TypeScript 7 (native compiler rewrite)                                                         |
|typescript-eslint                    |8.60.0         |8.73.0        |Pinned with `@typescript-eslint/eslint-plugin`                                                 |

## Runtime Dependencies

|Dependency          |Current Version|Latest Version|Notes                                                                                |
|--------------------|---------------|--------------|-------------------------------------------------------------------------------------|
|@chakra-ui/react    |2.8.2          |2.10.9/3.21.1 |2.9 performance degradation. 2.10 didn't entirely fix it. V3 requires React 19.      |
|mobx-state-tree     |6.0.0-cc.1     |7.0.1         |We need to update our fork to incorporate the latest published version.              |
|react               |18.3.1         |19.2.4        |React 19                                                                             |
|react-data-grid     |7.0.0-beta.44  |7.0.0-beta.59 |beta.45+ requires `Object.groupBy()` (ES2024), CSS `light-dark()`, etc.              |
|react-dom           |18.3.1         |19.2.4        |React 19                                                                             |
|react-leaflet       |4.2.1          |5.0.0         |5.0.0 requires React 19                                                              |
