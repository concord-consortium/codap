import { createMultiStyleConfigHelpers } from '@chakra-ui/react'

// This function creates a set of functions that help us create multipart component styles.
const helpers = createMultiStyleConfigHelpers(["modal", "header", "body", "button"])

export const Modal = helpers.defineMultiStyleConfig({
  baseStyle: {
    header: {
      font: `"museo-sans", sans-serif`,
      boxShadow: "md",
    },
    button: {
      minWidth: "20px",
    },
    body: {
      fontWeight: "medium",
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
