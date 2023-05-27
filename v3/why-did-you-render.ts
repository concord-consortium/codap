import whyDidYouRender from "@welldone-software/why-did-you-render"
import React from "react"

// Usage Instructions:
// To enable, uncomment the import statement for this file in index.tsx
// You will see output in the console immediately.
// As setup below, it will track all pure components.
// You can also zero in on particular components by setting the flag below to false and
// adding the following to the component you want to track:
//   MyComponent.whyDidYouRender = true
// Other configuration options, detailed at:
// https://github.com/welldone-software/why-did-you-render#readme

whyDidYouRender(React, { trackAllPureComponents: true })
