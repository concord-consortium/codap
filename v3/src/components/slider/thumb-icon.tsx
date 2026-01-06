import React from "react"

interface ThumbIconProps {
  title?: string
  className?: string
  onPointerDown?: (e: React.PointerEvent) => void
  style?: React.CSSProperties
  "data-testid"?: string
}

export const ThumbIcon = function ThumbIcon({ title, ...otherProps }: ThumbIconProps) {
  return (
    <svg
      width="24px"
      height="12px"
      viewBox="0 0 16 9"
      xmlns="http://www.w3.org/2000/svg"
      {...otherProps}
    >
      {title && <title>{title}</title>}
      <path d="M8,8.58422852 L11,5 L5,5 L8,8.58422852 Z M0,0 L16,0 L16,5 L0,5 Z" fill="#545252"/>
    </svg>)
}
