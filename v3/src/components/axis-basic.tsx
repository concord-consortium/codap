import React, { useEffect, useRef, useState} from "react"
import { select, scaleOrdinal } from "d3"
import { IAxisModel, INumericAxisModel } from "./graph/models/axis-model"
import { AxisDragRects } from "./graph/components/axis-drag-rects"

import "./graph/components/axis.scss"

interface IProps {
  getAxisModel: () => IAxisModel | undefined
}

export const AxisBasic = ({ getAxisModel }: IProps) => {
  const
    axisModel = getAxisModel(),
    place = axisModel?.place || 'bottom',
    scale = scaleOrdinal(),
    axisWrapperRef = useRef<SVGGElement | null>(null),
    axisRef = useRef<SVGGElement | null>(null)


  const [xMin, xMax] = scale.range() || [0, 100]

  return (
    <>
      <hr />
      <g className='axis-wrapper' ref={axisWrapperRef}>
        <g className='axis' ref={axisRef} data-testid={`axis-${place}`}/>
      </g>
    <hr />
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
