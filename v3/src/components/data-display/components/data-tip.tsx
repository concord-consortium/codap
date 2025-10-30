import React, { Fragment, useCallback, useEffect, useRef, useState } from "react"
import * as PIXI from "pixi.js"
import { computePosition, flip, offset, shift, useFloating } from "@floating-ui/react"
import { useDataDisplayModelContext } from "../hooks/use-data-display-model"
import { IDataSet } from "../../../models/data/data-set"
import {IPixiPointMetadata, PixiPoints} from "../pixi/pixi-points"
import { urlParams } from "../../../utilities/url-params"
import { IDataConfigurationModel } from "../models/data-configuration-model"
import { IGetTipTextProps, IShowDataTipProps } from "../data-tip-types"

import "./data-tip.scss"

interface IDataTipBaseProps {
  dataConfiguration?: IDataConfigurationModel
  dataset?: IDataSet
  getTipAttrs: (plotNum: number) => string[]
  getTipText: (props: IGetTipTextProps) => string
}

interface IDataTipHelperProps extends IDataTipBaseProps {
  legendAttrID?: string
  caseID: string
  plotNum: number
}

export interface IDataTipProps extends IDataTipBaseProps {
  pixiPoints?: PixiPoints
}

const createVirtualElement = (event: PointerEvent) => {
  // The virtual element will be a single pixel positioned at the point of the mouse event.
  const pointLeft = event.x
  const pointTop = event.y
  return {
    getBoundingClientRect: () => ({
      left: pointLeft,
      top: pointTop,
      right: pointLeft + 1,
      bottom: pointTop + 1,
      width: 1,
      height: 1,
      x: pointLeft,
      y: pointTop,
    })
  }
}

const tipText = (props: IDataTipHelperProps) => {
  const {dataConfiguration, dataset, getTipAttrs, legendAttrID, caseID, plotNum, getTipText} = props
  const attributeIDs = getTipAttrs(plotNum)
  const caseTipText = getTipText({caseID, attributeIDs, legendAttrID, dataset, dataConfig: dataConfiguration})
  return caseTipText
}

export const DataTip = (props: IDataTipProps) => {
  const { dataConfiguration, dataset, getTipAttrs, pixiPoints, getTipText } = props
  const dataDisplayModel = useDataDisplayModelContext()
  const legendAttrID = dataConfiguration?.attributeID("legend")
  const tipTextLines = useRef<string[]>([])
  const [isTipOpen, setIsTipOpen] = useState(false)
  const { context, refs, floatingStyles } = useFloating({open: isTipOpen, onOpenChange: setIsTipOpen})

  const positionDataTip = useCallback(() => {
    if (refs.reference.current && refs.floating.current) {
      computePosition(refs.reference.current, refs.floating.current, {
        placement: "top",
        middleware: [
          offset({mainAxis: 10}),
          flip(),
          shift({padding: 5})
        ]
      }).then(({x, y}) => {
        refs.floating.current && Object.assign(refs.floating.current.style, {
          transform: `translate(${x}px, ${y}px)`
        })
      })
    }
  }, [refs.floating, refs.reference])

  const showDataTip = (showDataTipProps: IShowDataTipProps) => {
    const {event, caseID, plotNum} = showDataTipProps
    event.stopPropagation()
    // Get the text to display in the data tip
    const tipTextString = tipText({dataset, caseID, plotNum, getTipAttrs, legendAttrID, dataConfiguration, getTipText})
    tipTextLines.current = tipTextString.split("<br>")
    // Create the virtual element to use as a reference for positioning the data tip
    const virtualElement = createVirtualElement(event)
    refs.setPositionReference(virtualElement)
    // Open the data tip
    context.onOpenChange(true)
    // Reposition the tip immediately (important when moving between adjacent points)
    setTimeout(() => {
      positionDataTip()
    }, 0)
  }

  const showPixiDataTip = (event: PointerEvent, sprite: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    showDataTip({event, caseID: metadata.caseID, plotNum: metadata.plotNum})
  }

  const hideDataTip = (event: MouseEvent) => {
    event.stopPropagation()
    context.onOpenChange(false)
  }

  // support disabling data tips via url parameter for jest tests
  if (urlParams.noDataTips === undefined && pixiPoints && dataDisplayModel) {
    pixiPoints.onPointOver = showPixiDataTip
    pixiPoints.onPointLeave = hideDataTip
    dataDisplayModel.setShowDataTip(showDataTip)
    dataDisplayModel.setHideDataTip(hideDataTip)
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
