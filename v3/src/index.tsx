// https://github.com/welldone-software/why-did-you-render#options
// uncomment the line below to enable why-did-you-render (for development only)
// import "../why-did-you-render"
import { ChakraProvider } from '@chakra-ui/react'
import { createRoot } from "react-dom/client"
import { App } from "./components/app"
import { kCodapAppElementId } from "./components/constants"
import { theme } from "./theme"

import "./index.scss"

// https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis
const container = document.getElementById(kCodapAppElementId)
const root = createRoot(container!)
root.render(
  <ChakraProvider theme={theme}>
    <App />
  </ChakraProvider>
)
