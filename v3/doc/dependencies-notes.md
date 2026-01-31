# Dependencies Notes

Notes on dependencies, particularly reasons for not updating to their latest versions.

## Development Dependencies

|Dependency                            |Current Version|Latest Version|Notes                                                              |
|--------------------------------------|---------------|--------------|-------------------------------------------------------------------|
|@types/react                          |18.3.12        |19.2.29       |React 19                                                           |
|@types/react-dom                      |18.3.1         |19.2.3        |React 19                                                           |
|@welldone-software/why-did-you-render |8.0.3          |10.0.1        |React 19                                                           |
|eslint-plugin-react-hooks             |6.1.1          |7.0.1         |Many warnings/errors                                               |

## Runtime Dependencies

|Dependency          |Current Version|Latest Version|Notes                                                                                |
|--------------------|---------------|--------------|-------------------------------------------------------------------------------------|
|@chakra-ui/react    |2.8.2          |2.10.9/3.21.1 |2.9 performance degradation. 2.10 didn't entirely fix it. V3 requires React 19.      |
|mobx-state-tree     |6.0.0-cc.1     |7.0.1         |We need to update our fork to incorporate the latest published version.              |
|react               |18.3.1         |19.2.4        |React 19                                                                             |
|react-data-grid     |7.0.0-beta.44  |7.0.0-beta.59 |beta.45+ requires `Object.groupBy()` (ES2024), CSS `light-dark()`, etc.              |
|react-dom           |18.3.1         |19.2.4        |React 19                                                                             |
|react-leaflet       |4.2.1          |5.0.0         |5.0.0 requires React 19                                                              |
