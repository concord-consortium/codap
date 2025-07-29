import { createMultiStyleConfigHelpers } from '@chakra-ui/react'

// This function creates a set of function that helps us create multipart component styles.
const helpers = createMultiStyleConfigHelpers(["menu", "list", "item"])

export const Menu = helpers.defineMultiStyleConfig({
  baseStyle: {
    menu: {
      font: "Montserrat, sans-serif",
      boxShadow: "md",
      rounded: "md",
      flexDirection: "column",
      py: "2",
    },
    list: {
      minWidth: "100px",
      padding: "10px 15px"
    },
    item: {
      padding: "3px 10px 3px 0",
      fontWeight: "medium",
      _focus: {
        bg: "tealLight5"
      },
      _active: {
        bg: "tealLight3",
        color: "white"
      }
    }
  },
  sizes: {
    sm: {
      item: {
        fontSize: "10px",
        lineHeight: "12px",
        px: 2,
        py: 1,
      },
    },
    md: {
      item: {
        fontSize: "12px",
        lineHeight: "14px",
        px: 3,
        py: 2,
      },
    },
  },
  variants: {},
  defaultProps: {
    size: "md",
  },
})
