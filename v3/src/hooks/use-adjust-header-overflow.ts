import { useEffect, useRef, useState } from 'react'
import { measureText } from './use-measure-text'

// Hook to adjust headers for overflow
export function useAdjustHeaderForOverflow(attrbuteHeaderButtonEl: HTMLButtonElement | null,
                                            attrName: string, attrUnits?: string) {
  const attributeName = attrName.replace(/_/g, ' ')
  const candidateAttributeLabel = `${attributeName}${attrUnits}`.trim()
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [isOverflowed, setIsOverflowed] = useState(false)
  const [line2Truncated, setLine2Truncated] = useState(false)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const reverse = (str: string) => {
    const rMap: Record<string, string> = {'[': ']', ']': '[', '{': '}', '}': '{', '(': ')', ')': '('}
    if (!str) return str
    const s = str.split('')
    let c = ""
    const n = []
    for (let ix = s.length - 1; ix >= 0; ix -= 1) {
      c = s[ix]
      if (rMap[c]) c = rMap[c]
      n.push(c)
    }
    return n.join('')
  }

  const calculateSplit = () => {
    if (!attrbuteHeaderButtonEl) {
      setLine1('')
      setLine2('')
      setIsOverflowed(false)
      return
    }

    const attributeButtonWidth = attrbuteHeaderButtonEl.clientWidth
    const computedStyle = getComputedStyle(attrbuteHeaderButtonEl)
    const style = [
      `font-style:${computedStyle.fontStyle}`,
      `font-variant:${computedStyle.fontVariant}`,
      `font-weight:${computedStyle.fontWeight}`,
      `font-size:${computedStyle.fontSize}`,
      `font-family:${computedStyle.fontFamily}`,
      `width:${attrbuteHeaderButtonEl.clientWidth}px`,
      `height:${attrbuteHeaderButtonEl.clientHeight}px`
    ].join('')
    const fullTextWidth = measureText(candidateAttributeLabel, style)

    if (fullTextWidth <= attributeButtonWidth) {
      setLine1(candidateAttributeLabel)
      setLine2('')
      setIsOverflowed(false)
    } else {
      const words = candidateAttributeLabel.split(' ')
      let i = 0
      let currentLine1 = ''
      // Build line1 word by word without exceeding the button width
      while (i < words.length && measureText(currentLine1 + words[i], style) < attributeButtonWidth) {
        currentLine1 = currentLine1 ? `${currentLine1} ${words[i]}` : words[i]
        i++
      }
      setLine1(currentLine1)

      const remainingWords = words.slice(i).join(' ')
      const remainingTextWidth = measureText(remainingWords, style)
      if (remainingTextWidth <= attributeButtonWidth) {
        // Remaining text fits in line2
        setLine2(remainingWords)
        setLine2Truncated(false)
      } else {
        // Remaining text doesn't fit in line2
        // We reverse the text so that the ellipsis is at the beginning of the text and
        // line2 has style of direction: rtl, text-align: left, unicode-bidi: bidi-override
        setLine2Truncated(true)
        setLine2(reverse(candidateAttributeLabel))
      }
      setIsOverflowed(true)
    }
  }

  useEffect(() => {
    if (!attrbuteHeaderButtonEl) return
    resizeObserverRef.current = new ResizeObserver(() => {
      calculateSplit()
    })
    resizeObserverRef.current.observe(attrbuteHeaderButtonEl)
    return () => {
      resizeObserverRef.current?.disconnect()
    }
  }, [candidateAttributeLabel, attrbuteHeaderButtonEl])

  return { line1, line2, isOverflowed, line2Truncated }
}
