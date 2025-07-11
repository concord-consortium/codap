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
    body: "Roboto, sans-serif",
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
    tealLight5: "#e2f4f8",
    tealLightHover: "#d3f4ff",
    tealLightActive: "#eaf9ff",
    appHeader: "#a5e3f6",
    focusOutlineColor: "#0957d0",
    labelText: "#222"
  },
  components: {
    Button: {
      baseStyle: {
        border: "none"
      },
      _hover: {
        backgroundColor: "tealLightHover",
        color: "labelText"
      },
      _active: {
        backgroundColor: "tealLightActive",
        color: "labelText"
      },
      variants: {
        unstyled: {
          border: "none",
          borderRadius: 4,
          display: "flex",
          height: "auto",
          outline: "none",
          padding: 0
        },
        default: {
          backgroundColor: "tealLight2",
          color: "white",
          _hover: {
            backgroundColor: "tealLight1",
            color: "white"
          },
          _active: {
            backgroundColor: "tealLight1",
            color: "white"
          },
        },
      }
    },
    FormLabel: {
      baseStyle: {
        marginInlineEnd: "0px"
      }
    },
    Checkbox,
    Input,
    Menu,
    Modal
  }
})
