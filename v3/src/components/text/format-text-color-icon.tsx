import React from "react"

interface IProps {
  color?: string
}

/* eslint-disable @stylistic/max-len */

export function FormatTextColorIcon({ color = "#000000" }: IProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <g fill="none">
        <path d="M0 0h24v24H0z"/>
        <path d="m5.5 16 5.25-14h2.5l5.25 14h-2.4l-1.25-3.6H9.2L7.9 16H5.5zm4.4-5.6h4.2l-2.05-5.8h-.1L9.9 10.4z" fill="#006C8E"/>
        <path fillRule="nonzero" d="M2 23v-4h20v4z" fill={color}/>
      </g>
    </svg>
  )
}

/* eslint-enable @stylistic/max-len */
