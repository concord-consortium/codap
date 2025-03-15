# Dependencies Notes

Notes on dependencies, particularly reasons for not updating to their latest versions.

## Development Dependencies

|Dependency                            |Current Version|Latest Version|Notes                                                              |
|--------------------------------------|---------------|--------------|-------------------------------------------------------------------|
|@types/react                          |18.3.12        |19.0.10       |React 19                                                           |
|@types/react-dom                      |18.3.1         |19.0.4        |React 19                                                           |
|@welldone-software/why-did-you-render |8.0.3          |10.0.1        |React 19                                                           |
|eslint-plugin-json                    |3.1.0          |4.0.1         |Errors -- probably related to flat config format/compatibility.    |

## Runtime Dependencies

|Dependency          |Current Version|Latest Version|Notes                                                                                |
|--------------------|---------------|--------------|-------------------------------------------------------------------------------------|
|@chakra-ui/react    |2.8.2          |2.10.7/3.13.0 |2.9 introduced performance degradation; 2.10 was supposed to fix it, but fell short. |
|mathjs              |12.4.3         |14.2.1        |13 requires ES2020 browsers; would require polyfills.                                |
|mob-state-tree      |6.0.0-cc.1     |7.0.1         |We need to update our fork to incorporate the latest published version.              |
|react               |18.3.1         |19.0.0        |React 19                                                                             |
|react-data-grid     |7.0.0-beta.44  |7.0.0-beta.47 |beta.45 requires recently introduced JS/CSS features; would require polyfills.       |
|react-dom           |18.3.1         |19.0.0        |React 19                                                                             |
|react-leaflet       |4.2.1          |5.0.0         |5.0.0 requires React 19                                                              |
