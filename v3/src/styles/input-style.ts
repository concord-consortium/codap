import { createMultiStyleConfigHelpers } from '@chakra-ui/react'

// This function creates a set of functions that help us create multipart component styles.
const helpers = createMultiStyleConfigHelpers(["control", "label"])

export const Input = helpers.defineMultiStyleConfig({
  baseStyle: {
    label: {
      font: `"museo-sans", sans-serif`,
      fontSize: "12px"
    },
    input: {
      borderColor: "#CBD5E0",
      fontSize: "12px"
    },
  },
  variants: {},
  defaultProps: {
    size: "md"
  }
})
