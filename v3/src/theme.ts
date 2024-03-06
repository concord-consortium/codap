import { extendTheme } from '@chakra-ui/react'
import { Checkbox } from './styles/checkbox-style'
import { Menu } from './styles/menu-style'
import { Modal } from './styles/modal-style'
import { Input } from './styles/input-style'

export const theme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
    cssVarPrefix: "codap",
  },
  fonts: {
    // CODAP v2 default font stack
    body: "Montserrat, sans-serif",
  },
  fontSizes: {
    md: "12px"
  },
  colors: {
    tealDark: "#01879E",
    tealLight1: "#2ba5c1",
    tealLight2: "#72bfca",
    tealLight3: "#93d5e4",
    tealLight4: "#b7e2ec",
    tealLight5: "#e2f4f8"
  },
  components: {
    Button: {
      baseStyle: {
        border: "1px solid gray"
      },
      variants: {
        unstyled: {
          border: "none",
          borderRadius: 0,
          display: "flex",
          height: "auto",
          outline: "none",
          padding: 0
        }
      }
    },
    Menu,
    Modal,
    Checkbox,
    Input
  }
})
