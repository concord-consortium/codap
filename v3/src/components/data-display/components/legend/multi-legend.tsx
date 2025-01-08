import {observer} from "mobx-react-lite"
import React, {createRef, RefObject, useCallback, useRef} from "react"
import {Active} from "@dnd-kit/core"
import {DroppableSvg} from "../droppable-svg"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import {useBaseDataDisplayModelContext} from "../../hooks/use-base-data-display-model"
import {getDragAttributeInfo, useDropHandler} from "../../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../../hooks/use-drop-hint-string"
import {IDataSet} from "../../../../models/data/data-set"
import {DataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useDataDisplayLayout} from "../../hooks/use-data-display-layout"
import {GraphAttrRole} from "../../data-display-types"
import {GraphPlace} from "../../../axis-graph-shared"
import {Legend} from "./legend"

interface IMultiLegendProps {
  divElt: HTMLDivElement | null
  onDropAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
}

export const MultiLegend = observer(function MultiLegend({divElt, onDropAttribute}: IMultiLegendProps) {
  const dataDisplayModel = useBaseDataDisplayModelContext(),
    layout = useDataDisplayLayout(),
    legendRef = useRef() as React.RefObject<HTMLDivElement>,
    instanceId = useInstanceIdContext(),
    droppableId = `${instanceId}-legend-area-drop`,
    role = 'legend' as GraphAttrRole,
    hintString = useDropHintString({role}),
    isDropAllowed = dataDisplayModel?.placeCanAcceptAttributeIDDrop ?? (() => false),
    divRefs =
      useRef([] as RefObject<HTMLDivElement>[] & { [key: number]: RefObject<HTMLDivElement> }),
    extentsRef = useRef([] as number[])

  const legendBoundsTop = layout?.computedBounds?.legend?.top ?? 0

  const handleIsActive = (active: Active) => {
      const {dataSet, attributeId: droppedAttrId} = getDragAttributeInfo(active) || {}
        return isDropAllowed('legend', dataSet, droppedAttrId)
    },

    setDesiredExtent = useCallback((layerIndex: number, extent: number) => {
      extentsRef.current[layerIndex] = extent
      layout.setDesiredExtent('legend', extentsRef.current.reduce((a, b) => a + b, 0))
      const theDivElt = Array.from(divRefs.current)[layerIndex].current
      if (theDivElt) {
        theDivElt.style.height = `${extent}px`
      }
    }, [layout])

  useDropHandler(droppableId, active => {
    const {dataSet, attributeId: dragAttributeID} = getDragAttributeInfo(active) || {}
    dataSet && dragAttributeID && isDropAllowed('legend', dataSet, dragAttributeID) &&
    onDropAttribute('legend', dataSet, dragAttributeID)
  })

  const renderLegends = () => {
    return (
      Array.from(dataDisplayModel.layers).filter(aLayer => !!aLayer.dataConfiguration.attributeID('legend'))
        .map(layer => {
            const
              index = layer.layerIndex,
              divRef = divRefs.current[index] || createRef<HTMLDivElement>()
            divRefs.current[index] = divRef
            return (
              <div className='legend' key={layer.id} ref={divRef} style={{height: `${extentsRef.current[index]}px`}}>
                <DataConfigurationContext.Provider value={layer.dataConfiguration}>
                  <Legend layerIndex={index}
                          setDesiredExtent={setDesiredExtent}
                          onDropAttribute={onDropAttribute}
                  />
                </DataConfigurationContext.Provider>
              </div>
            )
          }
        ))
  }

  return (
    <div ref={legendRef} className='multi-legend'
         style={{top: legendBoundsTop}}>
      {renderLegends()}
      <DroppableSvg
        className="droppable-legend"
        portal={divElt}
        target={legendRef.current}
        dropId={droppableId}
        onIsActive={handleIsActive}
        hintString={hintString}
      />
    </div>
  )
})

MultiLegend.displayName = "MultiLegend"
