import { Colord } from "colord"
import React from "react"

interface IProps {
  y1: number
  y2: number
  even: boolean
  prevY1: number
  prevY2: number
  fillColor?: string
  strokeColor?: string
  lastSelectedCase?: boolean
  renderFill?: boolean
}
export function CurvedSpline({ y1, y2, even, prevY1, prevY2, fillColor, strokeColor, lastSelectedCase,
                                renderFill }: IProps) {
  const kDividerWidth = 48,
        kRelationParentMargin = 12,
        kRelationChildMargin = 4,
        // The color of the lines bounding the relationship regions
        kRelationStrokeColor = '#808080', // middle gray
        // The color of the shaded area of the relationship regions
        kRelationFillColor = '#EEEEEE'    // pale gray

  /**
    Builds the SVG path string which renders from the specified Y coordinate
    on the left table (iStartY) to the specified Y coordinate on the right
    table (iEndY). The path consists of a short horizontal segment (width
    specified by RDV_RELATION_MARGINs) on each side and a Bezier curve
    which connects them.
    @param    {Number}  iStartY   The Y coordinate on the left table where the path should start
    @param    {Number}  iEndY     The Y coordinate on the right table where the path should end
    @returns  {String}            The SVG path string
  */
    const buildPathStr = (iStartY: number, iEndY: number) => {
      // All we need is a horizontal line
      if (iStartY === iEndY) {
        return `M0,${iStartY} h${kDividerWidth}`
      }
      // startPoint, endPoint, midPoint, controlPoint relate to the Bezier portion of the path
      const startPoint = { x: kRelationParentMargin, y: iStartY },
          endPoint = { x: kDividerWidth - kRelationChildMargin, y: iEndY },
          midPoint = { x: (startPoint.x + endPoint.x) / 2, y: (startPoint.y + endPoint.y) / 2 },
          controlPoint = { x: midPoint.x, y: startPoint.y }
      // startPoint.y: Start point,
      // kRelationParentMargin: Horizontal segment,
      // controlPoint.x, controlPoint.y: Bezier control point,
      // midPoint.x, midPoint.y: Midpoint of curve (endpoint of first Bezier curve),
      // endPoint.x, endPoint.y: Endpoint of second Bezier curve (assumes reflected control point),
      // kRelationChildMargin: Horizontal segment
      return [
        `M0,${startPoint.y}`,
        `h${kRelationParentMargin}`,
        `Q${controlPoint.x},${controlPoint.y} ${midPoint.x},${midPoint.y}`,
        `T${endPoint.x},${endPoint.y}`,
        `h${kRelationChildMargin}`
      ].join(" ")
    }

    /**
      Builds the SVG path string which defines the boundary of the area to be
      shaded when shading the area between a parent row in the left table and
      its child rows in the right table. The area is bounded on the top and
      bottom by the same Bezier curves used to draw the paths and on the left
      and right by the edge of the corresponding table.
      @param    {Number}  iStartY1  The Y coordinate on the left table where the path should start
      @param    {Number}  iEndY1    The Y coordinate on the right table where the path should end
      @param    {Number}  iStartY2  The Y coordinate on the left table where the path should start
      @param    {Number}  iEndY2    The Y coordinate on the right table where the path should end
      @returns  {String}            The SVG path string
      */
    const  buildFillPathStr = (iStartY1: number, iEndY1: number, iStartY2: number, iEndY2: number) => {
          // startPoint, endPoint relate to the Bezier portion of the path
      const startPoint2 = { x: kRelationParentMargin, y: iStartY2 },
            endPoint2 = { x: kDividerWidth - kRelationChildMargin, y: iEndY2 },
            midPoint2 = { x: (startPoint2.x + endPoint2.x) / 2,
                          y: (startPoint2.y + endPoint2.y) / 2 },
            controlPoint2 = { x: midPoint2.x, y: endPoint2.y }
      // Use existing function for the first section buildPathStr( iStartY1, iEndY1),
      // vertical line (V) endPoint2.y,
      // horizontal line (h) - kRelationChildMargin,
      // Quadratic Bezier curve (Q) controlPoint2.x, controlPoint2.y,
      // Midpoint midPoint2.x, midPoint2.y,
      // Shorthand quadratic Bezier curve (T) (assumes reflected control point) startPoint2.x, startPoint2.y,
      // horizontal line (h) - kRelationParentMargin
      // close path (Z)
      return [
        `${buildPathStr(iStartY1, iEndY1)}`,
        `V${endPoint2.y}`,
        `h${- kRelationChildMargin}`,
        `Q${controlPoint2.x},${controlPoint2.y} ${midPoint2.x},${midPoint2.y}`,
        `T${startPoint2.x},${startPoint2.y}`,
        `h${- kRelationParentMargin}`,
        `Z`
      ].join(" ")
    }

  const pathData = buildPathStr(y1, y2)
  const prevPathData = buildPathStr(prevY1, prevY2)
  const fillData = buildFillPathStr(prevY1, prevY2, y1, y2)
  const finalFillColor = fillColor
                          ? even ? new Colord(fillColor).darken(0.05).toHex() : fillColor
                          : even ? kRelationFillColor : "none"
  return (
    <>
      {renderFill && <path d={fillData} fill={finalFillColor} stroke="none"/>}
      {!fillColor && (lastSelectedCase
            ? <>
                {strokeColor && <path d={prevPathData} fill="none" stroke={strokeColor}
                  strokeWidth={strokeColor ? 1.5 : "none"}/>}
                <path d={pathData} fill="none" stroke={strokeColor ?? kRelationStrokeColor}
                    strokeWidth={(strokeColor && lastSelectedCase) ? 3 : strokeColor ? 1.5 : "none"}/>
              </>
            : <path d={pathData} fill="none" stroke={strokeColor ?? kRelationStrokeColor}
                strokeWidth={strokeColor ? 1.5 : "none"}/>
      )}
    </>
  )
}
