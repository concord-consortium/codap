import { ScaleLinear } from "d3"
import * as PIXI from "pixi.js"
import { useRef, useState } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { appState } from "../../../models/app-state"
import { ICase } from "../../../models/data/data-set-types"
import { toNonEmptyValue } from "../../../utilities/math-utils"
import { handleClickOnCase } from "../../data-display/data-display-utils"
import { dataDisplayGetNumericValue } from "../../data-display/data-display-value-utils"
import { useDataDisplayAnimation } from "../../data-display/hooks/use-data-display-animation"
import { IPixiPointMetadata } from "../../data-display/pixi/pixi-points"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

export const useDotPlotDragDrop = () => {
  const layout = useGraphLayoutContext()
  const { startAnimation, stopAnimation } = useDataDisplayAnimation()
  const dataConfig = useGraphDataConfigurationContext()
  const dataset = useDataSetContext()
  const primaryAttrRole = dataConfig?.primaryRole ?? "x"
  const primaryIsBottom = primaryAttrRole === "x"
  const primaryPlace = primaryIsBottom ? "bottom" : "left"
  const primaryAxisScale = layout.getAxisScale(primaryPlace) as ScaleLinear<number, number>
  const primaryAttrID = dataConfig?.attributeID(primaryAttrRole) ?? ""
  const selectedDataObjects = useRef<Record<string, number>>({})
  const [dragID, setDragID] = useState('')
  const currPos = useRef(0)
  const didDrag = useRef(false)
  const draggingAllowed = !dataset?.getAttribute(primaryAttrID)?.hasFormula

  /*
   * Drag handling. Dots in a dot plot can be dragged to change their position along
   * the primary axis. Note: this does not permanently change their value. When they are
   * dropped, they return to their original value and position.
   */
  const onDragStart = (event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    dataset?.beginCaching()
    didDrag.current = false
    const tItsID: string = metadata.caseID
    stopAnimation() // We don't want to animate points until end of drag
    appState.beginPerformance()
    setDragID(() => tItsID)
    currPos.current = primaryIsBottom ? event.clientX : event.clientY
    handleClickOnCase(event, tItsID, dataset)
    // Record the current values, so we can change them during the drag and restore them when done
    const {selection} = dataConfig || {}
    selection?.forEach((anID: string) => {
      const itsValue = toNonEmptyValue(dataDisplayGetNumericValue(dataset, anID, primaryAttrID))
      if (itsValue != null) {
        selectedDataObjects.current[anID] = itsValue
      }
    })
  }

  const onDrag = (event: PointerEvent) => {
    if (primaryAxisScale && dragID) {
      const newPos = primaryIsBottom ? event.clientX : event.clientY
      const deltaPixels = draggingAllowed ? newPos - currPos.current : 0
      currPos.current = newPos
      if (deltaPixels !== 0) {
        didDrag.current = true
        const delta = Number(primaryAxisScale.invert(deltaPixels)) - Number(primaryAxisScale.invert(0))
        const caseValues: ICase[] = []
        const {selection} = dataConfig || {}
        selection?.forEach(anID => {
          const currValue = Number(dataDisplayGetNumericValue(dataset, anID, primaryAttrID))
          if (isFinite(currValue)) {
            caseValues.push({__id__: anID, [primaryAttrID]: currValue + delta})
          }
        })
        caseValues.length && dataset?.setCaseValues(caseValues, [primaryAttrID])
      }
    }
  }

  const onDragEnd = (event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    dataset?.endCaching()
    appState.endPerformance()

    if (dragID !== '') {
      setDragID('')
      if (didDrag.current) {
        const caseValues: ICase[] = []
        const {selection} = dataConfig || {}
        selection?.forEach(anID => {
          caseValues.push({
            __id__: anID,
            [dataConfig?.attributeID(primaryAttrRole) ?? '']: selectedDataObjects.current[anID]
          })
        })
        startAnimation() // So points will animate back to original positions
        caseValues.length && dataset?.setCaseValues(caseValues)
        didDrag.current = false
      }
    }
  }

  return { onDragStart, onDrag, onDragEnd }
}
