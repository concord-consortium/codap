import whyDidYouRender from "@welldone-software/why-did-you-render";
import React from "react";

// Usage Instructions:
// To enable, uncomment the import statement for this file in index.ts
// You will see output in the console immediately.
// As setup below, it will track all pure components.
// You can also zero in on particular components, and use other configuration options, detailed below:
// https://github.com/welldone-software/why-did-you-render#readme

whyDidYouRender(React, { trackAllPureComponents: true });
