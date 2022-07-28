import React, {useEffect, useRef} from "react"
import {select} from "d3"

interface IProps {
  marqueeRect: {
    x: number
    y: number
    width: number
    height: number
  }
}
export const Marquee = ({marqueeRect: {x, y, width, height}}: IProps) => {
  const marqueeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    select(marqueeRef.current).selectAll('rect')
      .data([1,2])
      .join(
        // @ts-expect-error void => Selection
        (enter) => {
          enter.append('rect')
            .attr('class', (d:number)=> d === 1 ? 'marqueeBack' : 'marquee')
        },
        (update) => {
          update.attr('x', width < 0 ? x + width : x)
            .attr('y', height < 0 ? y + height : y)
            .attr('width', Math.abs(width))
            .attr('height', Math.abs(height))
        }
      )
  }, [height, width, x, y])

  return (
    /**
     * Todo: Is the nesting necessary or could it just be:
     *  <g ref={marqueeRef}/>
     */
    <g>
      <g ref={marqueeRef}/>
    </g>
  )
}
