import {useEffect, useRef} from "react"
import {observer} from "mobx-react-lite"
import {select} from "d3"
import {MarqueeState} from "../models/marquee-state"
import "./marquee.scss"

export const Marquee = observer(function Marquee(props:{marqueeState: MarqueeState}) {
  const marqueeRef = useRef<SVGSVGElement>(null),
    marqueeRect = props.marqueeState.marqueeRect

  useEffect(() => {
    const { x, y, width, height } = marqueeRect
    select(marqueeRef.current).selectAll('rect')
      .data([1, 2])
      .join(
        (enter) =>
          enter.append('rect')
            .attr('class', (d: number) => d === 1 ? 'marquee-back' : 'marquee'),
        (update) =>
          update.attr('x', width < 0 ? x + width : x)
            .attr('y', height < 0 ? y + height : y)
            .attr('width', Math.abs(width))
            .attr('height', Math.abs(height))
      )
  }, [marqueeRect])

  return (
    <g ref={marqueeRef}/>
  )
})
