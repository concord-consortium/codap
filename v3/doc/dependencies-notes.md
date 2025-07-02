# Dependencies Notes

Notes on dependencies, particularly reasons for not updating to their latest versions.

## Development Dependencies

|Dependency                            |Current Version|Latest Version|Notes                                                              |
|--------------------------------------|---------------|--------------|-------------------------------------------------------------------|
|@types/jest                           |29.5.14        |30.0.0        |Issues with mocking `window.location`.                             |
|@types/react                          |18.3.12        |19.1.18       |React 19                                                           |
|@types/react-dom                      |18.3.1         |19.1.6        |React 19                                                           |
|@welldone-software/why-did-you-render |8.0.3          |10.0.1        |React 19                                                           |
|eslint-plugin-cypress                 |4.3.0          |5.1.0         |Errors -- probably related to flat config format/compatibility.    |
|eslint-plugin-json                    |3.1.0          |4.0.1         |Errors -- probably related to flat config format/compatibility.    |
|eslint-plugin-mocha                   |10.5.0         |11.1.0        |Errors -- probably related to flat config format/compatibility.    |
|jest                                  |29.7.0         |30.0.4        |Issues with mocking `window.location`.                             |
|jest-environment-jsdom                |29.7.0         |30.0.4        |Issues with mocking `window.location`.                             |

## Runtime Dependencies

|Dependency          |Current Version|Latest Version|Notes                                                                                |
|--------------------|---------------|--------------|-------------------------------------------------------------------------------------|
|@chakra-ui/react    |2.8.2          |2.10.9/3.21.1 |2.9 introduced performance degradation; 2.10 was supposed to fix it, but fell short. |
|mob-state-tree      |6.0.0-cc.1     |7.0.1         |We need to update our fork to incorporate the latest published version.              |
|react               |18.3.1         |19.0.0        |React 19                                                                             |
|react-data-grid     |7.0.0-beta.44  |7.0.0-beta.56 |beta.45+ requires `Object.groupBy()` (ES2024), CSS `light-dark()`, etc.              |
|react-dom           |18.3.1         |19.0.0        |React 19                                                                             |
|react-leaflet       |4.2.1          |5.0.0         |5.0.0 requires React 19                                                              |
