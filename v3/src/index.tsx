// https://www.npmjs.com/package/@welldone-software/why-did-you-render
// uncomment the line below to enable why-did-you-render (for development only)
// import "../wdyr.ts"
import { ChakraProvider } from '@chakra-ui/react'
import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./components/app"
import { theme } from "./theme"

import "./index.scss"

// https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis
const container = document.getElementById('app')
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!)
root.render(
  <ChakraProvider theme={theme}>
    <App />
  </ChakraProvider>
)
