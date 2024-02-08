import React, { Fragment, useCallback, useEffect, useRef, useState } from "react"
import * as PIXI from "pixi.js"
import { computePosition, offset, useFloating } from "@floating-ui/react"
import { IDataSet } from "../../../models/data/data-set"
import { IPixiPointMetadata, IPixiPointsRef } from "../../graph/utilities/pixi-points"
import { getCaseTipText } from "../data-display-utils"
import { urlParams } from "../../../utilities/url-params"

import "./data-tip.scss"

export interface IDataTipProps {
  dataset?: IDataSet
  getTipAttrs: (plotNum: number) => string[]
  pixiPointsRef: IPixiPointsRef
}

interface IDataTipHelperProps {
  dataset?: IDataSet
  getTipAttrs: (plotNum: number) => string[]
  metadata: IPixiPointMetadata
}

const createVirtualElement = (pixiPointsRef: IPixiPointsRef, sprite: PIXI.Sprite) => {
  const canvas = pixiPointsRef.current?.canvas
  const canvasLeft = canvas?.getBoundingClientRect().left ?? 0
  const canvasTop = canvas?.getBoundingClientRect().top ?? 0
  const pointLeft = sprite.position.x + canvasLeft
  const pointTop = sprite.position.y + canvasTop
  return {
    getBoundingClientRect: () => ({
      left: pointLeft,
      top: pointTop,
      right: pointLeft + sprite.width,
      bottom: pointTop + sprite.height,
      width: sprite.width,
      height: sprite.height,
      x: pointLeft,
      y: pointTop,
    })
  }
}

const tipText = (props: IDataTipHelperProps) => {
  const {dataset, getTipAttrs, metadata} = props
  const caseID = metadata.caseID
  return getCaseTipText(caseID, getTipAttrs(metadata.plotNum), dataset)
}

export const DataTip = ({ dataset, getTipAttrs, pixiPointsRef }: IDataTipProps) => {
  const tipTextLines = useRef<string[]>([])
  const [isTipOpen, setIsTipOpen] = useState(false)
  const { context, refs, floatingStyles } = useFloating({open: isTipOpen, onOpenChange: setIsTipOpen})

  const positionDataTip = useCallback(() => {
    if (refs.reference.current && refs.floating.current) {
      computePosition(refs.reference.current, refs.floating.current, {
        placement: "top",
        middleware: [offset({mainAxis: 10})]
      }).then(({x, y}) => {
        refs.floating.current && Object.assign(refs.floating.current.style, {
          transform: `translate(${x}px, ${y}px)`
        })
      })
    }
  }, [refs.floating, refs.reference])

  const showDataTip = (event: PointerEvent, sprite: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    event.stopPropagation()
    // Get the text to display in the data tip
    const tipTextString = tipText({dataset, metadata, getTipAttrs})
    tipTextLines.current = tipTextString.split("<br>")
    // Create the virtual element to use as a reference for positioning the data tip
    const virtualElement = createVirtualElement(pixiPointsRef, sprite)
    refs.setPositionReference(virtualElement)
    // Open the data tip
    context.onOpenChange(true)
  }

  const hideDataTip = (event: MouseEvent) => {
    event.stopPropagation()
    context.onOpenChange(false)
  }

  useEffect(() => {
    isTipOpen && positionDataTip()
  }, [isTipOpen, positionDataTip])

  // support disabling data tips via url parameter for jest tests
  if (urlParams.noDataTips === undefined && pixiPointsRef?.current) {
    pixiPointsRef.current.onPointOver = showDataTip
    pixiPointsRef.current.onPointLeave = hideDataTip
  }

  return (
    isTipOpen &&
      <div ref={refs.setFloating} style={floatingStyles} className="data-tip" data-testid="data-tip">
        {tipTextLines.current.map((line: string, i: number) => (
          <Fragment key={`dt-line-${i}`}>
            {line}{i < tipTextLines.current.length && <br />}
          </Fragment>
        ))}
      </div>
  )
}
