import React, {useEffect, useRef} from "react"
import {select} from "d3"


export const Marquee = (props: {
  marqueeRect: {x: number, y: number, width: number, height: number}
}) => {
  const marqueeRef = useRef() as React.RefObject<SVGSVGElement>

  useEffect(() => {
    const dragRect = props.marqueeRect
    select(marqueeRef.current).selectAll('rect')
      .data([1,2])
      .join(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (enter) => {
          enter.append('rect')
            .attr('class', (d:number)=> d === 1 ? 'marqueeBack' : 'marquee')
        },
        (update) => {
          update.attr('x', dragRect.width < 0 ? dragRect.x + dragRect.width : dragRect.x)
            .attr('y', dragRect.height < 0 ? dragRect.y + dragRect.height : dragRect.y)
            .attr('width', Math.abs(dragRect.width))
            .attr('height', Math.abs(dragRect.height))
        }
      )
  }, [props.marqueeRect])

  return (
    <g>
      <g ref={marqueeRef}/>
    </g>
  )
}

