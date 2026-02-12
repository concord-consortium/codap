import { useEffect, useRef, useState } from 'react'

const kPaddingBuffer = 5 // Button width is 5px smaller because of parent padding

export type OverflowMode = 'single-line' | 'wrap' | 'truncated'

// Hook to detect header overflow and determine display mode:
// - 'single-line': text fits on one line
// - 'wrap': text wraps naturally to 2 lines via CSS word-breaking/hyphenation
// - 'truncated': text overflows even 2 lines; show first line + reversed end with RTL trick
export function useAdjustHeaderForOverflow(attributeHeaderButtonEl: HTMLButtonElement | null,
                                            attrName: string, attrUnits?: string) {
  const attributeName = attrName.replace(/_/g, ' ')
  const fullText = `${attributeName}${attrUnits}`.trim()
  const [overflowMode, setOverflowMode] = useState<OverflowMode>('single-line')
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

  const calculateOverflow = () => {
    if (!attributeHeaderButtonEl) {
      setOverflowMode('single-line')
      return
    }

    const buttonWidth = attributeHeaderButtonEl.clientWidth - kPaddingBuffer
    const computedStyle = getComputedStyle(attributeHeaderButtonEl)
    const lineHeight = parseFloat(computedStyle.lineHeight)

    // Use DOM-based measurement with word-breaking CSS to accurately detect overflow.
    // This matches V2 behavior where the browser handles natural word-breaking/hyphenation.
    const measureEl = document.createElement('div')
    measureEl.style.cssText = [
      `font-style:${computedStyle.fontStyle}`,
      `font-variant:${computedStyle.fontVariant}`,
      `font-weight:${computedStyle.fontWeight}`,
      `font-size:${computedStyle.fontSize}`,
      `font-family:${computedStyle.fontFamily}`,
      `line-height:${computedStyle.lineHeight}`,
      `width:${buttonWidth}px`,
      'position:absolute',
      'visibility:hidden',
      'white-space:normal',
      'hyphens:auto',
      'overflow-wrap:break-word'
    ].join(';')
    measureEl.textContent = fullText
    document.body.appendChild(measureEl)
    const textHeight = measureEl.scrollHeight
    document.body.removeChild(measureEl)

    if (textHeight <= lineHeight + 1) {
      setOverflowMode('single-line')
    } else if (textHeight <= lineHeight * 2 + 1) {
      setOverflowMode('wrap')
    } else {
      setOverflowMode('truncated')
    }
  }

  useEffect(() => {
    if (!attributeHeaderButtonEl) return
    resizeObserverRef.current = new ResizeObserver(() => {
      calculateOverflow()
    })
    resizeObserverRef.current.observe(attributeHeaderButtonEl)
    return () => {
      resizeObserverRef.current?.disconnect()
    }
  // Adding calculateOverflow to dependencies causes rerender problems on attribute rename
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText, attributeHeaderButtonEl])

  useEffect(()=> {
    calculateOverflow()
  // Adding calculateOverflow to dependencies causes rerender problems on attribute rename
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText])

  const reversedText = overflowMode === 'truncated' ? reverse(fullText) : ''

  return { fullText, reversedText, overflowMode }
}
