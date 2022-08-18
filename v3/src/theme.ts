import { extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  fonts: {
    // CODAP v2 default font stack
    body: "Montserrat, sans-serif"
  },
  components: {
    Button: {
      baseStyle: {
        border: "1px solid gray"
      }
    }
  }
})
