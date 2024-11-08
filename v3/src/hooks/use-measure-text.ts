import { useCallback } from "react"
import { defaultFont } from "../components/constants"
import { kCaseTableBodyFont, kCaseTableHeaderFont, kMaxAutoColumnWidth, kMinAutoColumnWidth }
    from "../components/case-table/case-table-types"
import { IAttribute } from "../models/data/attribute"
import { renderAttributeValue } from "../components/case-tile-common/render-attribute-value"

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

export const findLongestContentWidth = (attr: IAttribute) => {
  // include attribute name in content width calculation
  let longestWidth = Math.max(kMinAutoColumnWidth,
                              Math.min(kMaxAutoColumnWidth, measureText(attr.name, kCaseTableHeaderFont)))
  for (let i = 0; i < attr.length; ++i) {
    // use the formatted attribute value in content width calculation
    const { value } = renderAttributeValue(attr.strValues[i], attr.numValues[i], attr)
    longestWidth = Math.max(longestWidth, Math.min(kMaxAutoColumnWidth, measureText(value, kCaseTableBodyFont)))
  }
  return longestWidth
}
