import { createMultiStyleConfigHelpers } from '@chakra-ui/react'

// This function creates a set of function that helps us create multipart component styles.
const helpers = createMultiStyleConfigHelpers(["modal", "header", "body", "button"])

export const Modal = helpers.defineMultiStyleConfig({
  baseStyle: {
    header: {
      font: "MuseoSans', sans-serif",
      boxShadow: "md",
      // rounded: "md",
      // flexDirection: "column",
      // py: "2",
    },
    button: {
      minWidth: "20px",
      // padding: "10px 15px"
    },
    body: {
      // padding: "3px 0",
      fontWeight: "medium",
      // _focus: {
      //   bg: "tealLight5"
      // },
      // _active: {
      //   bg: "tealLight3",
      //   color: "white"
      // }
    }
  },
  sizes: {
    sm: {
      button: {
        fontSize: "10px",
        lineHeight: "12px",
        px: 2,
        py: 1,
      },
    },
    md: {
      button: {
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
