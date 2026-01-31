import { buildPathStr } from "./curved-spline-utils"

interface IProps {
  y1: number
  y2: number
  strokeColor: string
  strokeWidth: number
}
export function CurvedSplineStroke({ y1, y2, strokeColor, strokeWidth }: IProps) {
  const pathData = buildPathStr(y1, y2)
  return (
    <path d={pathData} fill="none" stroke={strokeColor} strokeWidth={strokeWidth}/>
  )
}
