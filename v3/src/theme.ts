import { extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  config: {
    cssVarPrefix: 'codap',
  },
  fonts: {
    // CODAP v2 default font stack
    body: "Montserrat, sans-serif",
  },
  fontSizes: {
    md: "12px"
  },
  colors: {
    darkTeal: "#01879E"
  },
  components: {
    Button: {
      baseStyle: {
        border: "1px solid gray"
      }
    }
  }
})
