import { extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  fonts: {
    body: "Lato, sans-serif"
  },
  components: {
    Button: {
      baseStyle: {
        border: "1px solid gray"
      }
    }
  }
})
