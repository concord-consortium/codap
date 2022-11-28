import React, { useEffect, useRef, useState} from "react"
import { select, ScaleOrdinal, scaleOrdinal } from "d3"
import { IAxisModel, INumericAxisModel } from "./graph/models/axis-model"
import { useAxis } from "./graph/hooks/use-axis"
import { AxisDragRects } from "./graph/components/axis-drag-rects"
import { ScaleType } from "./graph/models/graph-layout"
import t from "../utilities/translation/translate"

import "./graph/components/axis.scss"

interface IProps {
  getAxisModel: () => IAxisModel | undefined
  transform: string
  showGridLines: boolean
  elt: Element
}

export const AxisBasic = ({ getAxisModel, transform, showGridLines, elt }: IProps) => {
  const
    axisModel = getAxisModel(),
    place = axisModel?.place || 'bottom',
    scale = scaleOrdinal(),
    [axisElt, setAxisElt] = useState<SVGGElement | null>(null),
    axisWrapperRef = useRef<SVGGElement | null>(null),
    axisRef = useRef<SVGGElement | null>(null)

  useAxis({axisModel, axisElt, showGridLines})

  useEffect(function setupTransform() {
    axisElt && select(axisElt)
      .attr("transform", transform)
  }, [axisElt, transform])

  const [xMin, xMax] = scale.range() || [0, 100]

  return (
    <>
      <g className='axis-wrapper' ref={axisWrapperRef}>
        <g className='axis' ref={axisRef} data-testid={`axis-${place}`}/>
      </g>

      {axisModel?.type === 'numeric'
        ? <AxisDragRects
          axisModel={axisModel as INumericAxisModel}
          axisWrapperElt={axisWrapperRef.current as SVGGElement}
        />
        : null
      }
    </>
  )
}
