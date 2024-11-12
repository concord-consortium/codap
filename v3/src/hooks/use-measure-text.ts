import { useCallback } from "react"
import { defaultFont } from "../components/constants"

const canvas = document.createElement("canvas")
const cache: Record<string, Record<string, number>> = {}

export const measureTextExtent = (text: string, font = defaultFont) => {
  const context = canvas.getContext("2d")
  context && font && (context.font = font)
  const metrics = context?.measureText(text) ?? { width: 0, fontBoundingBoxAscent: 0, fontBoundingBoxDescent: 0 }
  return { width: metrics.width, height: metrics.fontBoundingBoxDescent + metrics.fontBoundingBoxAscent }
}

export const measureText = (text:string, font = defaultFont) => {
  cache[font] = cache[font] || {}
  cache[font][text] = cache[font][text] || Math.ceil(10 * measureTextExtent(text, font).width) / 10
  return cache[font][text]
}

export const useMeasureText = (font = defaultFont) => {
  return useCallback((text: string) => {
    return measureText(text, font)
  }, [font])
}
