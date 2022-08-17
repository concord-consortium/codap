import { ChakraProvider } from '@chakra-ui/react'
import React from "react"
import { render } from "react-dom"
import { App } from "./components/app"
import { theme } from "./theme"

import "./index.scss"

render(
  <ChakraProvider theme={theme}>
    <App />
  </ChakraProvider>,
  document.getElementById("app")
)
