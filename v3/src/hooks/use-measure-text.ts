import { useCallback } from "react"
import { defaultFont } from "../components/constants"

const canvas = document.createElement("canvas")
const cache: Record<string, Record<string, number>> = {}

export const measureText = (text:string, font = defaultFont) => {
  const context = canvas.getContext("2d")
  context && font && (context.font = font)
  cache[font] = cache[font] || {}
  cache[font][text] = cache[font][text] || (context ? Math.ceil(10 * context.measureText(text).width) / 10 : 0)
  return cache[font][text]
}

export const useMeasureText = (font = defaultFont) => {
  return useCallback((text: string) => {
    return measureText(text, font)
  }, [font])
}
