import { Colord } from "colord"
import { buildFillPathStr } from "./curved-spline-utils"

interface IProps {
  y1: number
  y2: number
  even: boolean
  prevY1: number
  prevY2: number
  fillColor: string
}
export function CurvedSplineFill({ y1, y2, even, prevY1, prevY2, fillColor }: IProps) {
  const fillPath = buildFillPathStr(prevY1, prevY2, y1, y2)
  const finalFillColor = even ? new Colord(fillColor).darken(0.03).toHex() : fillColor
  return (
    <path d={fillPath} fill={finalFillColor} stroke="none"/>
  )
}
