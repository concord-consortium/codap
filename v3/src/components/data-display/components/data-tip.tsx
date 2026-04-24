import { Fragment, useRef, useState } from "react"
import { flip, FloatingPortal, offset, shift, useFloating } from "@floating-ui/react"
import { useDataDisplayModelContext } from "../hooks/use-data-display-model"
import { IDataSet } from "../../../models/data/data-set"
import { IPoint, IPointMetadata, PointRendererBase } from "../renderer"
import { urlParams } from "../../../utilities/url-params"
import { IDataConfigurationModel } from "../models/data-configuration-model"
import { Rect } from "../data-display-types"
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
  renderer?: PointRendererBase
}

const createVirtualElement = (rect: Rect) => {
  const { x, y, width, height } = rect
  return {
    getBoundingClientRect: () => ({
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
      width,
      height,
      x,
      y,
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
  const { dataConfiguration, dataset, getTipAttrs, renderer, getTipText } = props
  const dataDisplayModel = useDataDisplayModelContext()
  const legendAttrID = dataConfiguration?.attributeID("legend")
  const tipTextLines = useRef<string[]>([])
  const [isTipOpen, setIsTipOpen] = useState(false)
  // Let useFloating drive positioning. When setPositionReference is called, it re-runs the
  // middleware and updates floatingStyles. This avoids the cross-browser timing issues of
  // computing position manually via setTimeout/rAF after commit.
  const { context, refs, floatingStyles } = useFloating({
    open: isTipOpen,
    onOpenChange: setIsTipOpen,
    placement: "top",
    middleware: [offset({mainAxis: 5}), flip(), shift({padding: 5})]
  })

  const showDataTip = (showDataTipProps: IShowDataTipProps) => {
    const {event, caseID, plotNum, anchorRect} = showDataTipProps
    event.stopPropagation()
    const tipTextString = tipText({dataset, caseID, plotNum, getTipAttrs, legendAttrID, dataConfiguration, getTipText})
    if (!tipTextString) {
      // Can happen when there are no attributes and when only attribute is qualitative
      return
    }
    tipTextLines.current = tipTextString.split("<br>")
    // Prefer the caller-supplied anchor rect (e.g. the hovered point's bounds) over the
    // pointer location, so the tip's placement doesn't depend on the cursor's visual size.
    const referenceRect = anchorRect ?? { x: event.x, y: event.y, width: 1, height: 1 }
    refs.setPositionReference(createVirtualElement(referenceRect))
    context.onOpenChange(true)
  }

  const handlePointerOver = (event: PointerEvent, _point: IPoint, metadata: IPointMetadata) => {
    const canvasRect = renderer?.canvas?.getBoundingClientRect()
    const radius = metadata.style?.radius ?? 0
    const anchorRect = canvasRect && radius > 0
      ? {
          x: canvasRect.left + metadata.x - radius,
          y: canvasRect.top + metadata.y - radius,
          width: radius * 2,
          height: radius * 2
        }
      : undefined
    showDataTip({event, caseID: metadata.caseID, plotNum: metadata.plotNum, anchorRect})
  }

  const handlePointerLeave = (event: PointerEvent) => {
    event.stopPropagation()
    context.onOpenChange(false)
  }

  // support disabling data tips via url parameter for jest tests
  if (urlParams.noDataTips === undefined && renderer && dataDisplayModel) {
    renderer.onPointerOver = handlePointerOver
    renderer.onPointerLeave = handlePointerLeave
    dataDisplayModel.setShowDataTip(showDataTip)
    dataDisplayModel.setHideDataTip(handlePointerLeave)
  }

  return (
    isTipOpen &&
      <FloatingPortal>
        <div ref={refs.setFloating} style={floatingStyles} className="data-tip" data-testid="data-tip">
          {tipTextLines.current.map((line: string, i: number) => (
            <Fragment key={`dt-line-${i}`}>
              {line}{i < tipTextLines.current.length - 1 && <br />}
            </Fragment>
          ))}
        </div>
      </FloatingPortal>
  )
}
