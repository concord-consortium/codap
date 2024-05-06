import {autorun} from "mobx"
import React, {forwardRef, MutableRefObject, useCallback, useEffect, useRef} from "react"
import {useMemo} from "use-memo-one"
import {select, color, range} from "d3"
import RTreeLib from 'rtree'
import * as PIXI from "pixi.js"
import { selectCasesNotification } from "../../../models/data/data-set-notifications"
import {defaultBackgroundColor} from "../../../utilities/color-utils"
import {rTreeRect} from "../data-display-types"
import {rectangleSubtract, rectNormalize} from "../data-display-utils"
import {IPixiPointMetadata, IPixiPointsArrayRef, PixiBackgroundPassThroughEvent, PixiPoints}
  from "../pixi/pixi-points"
import {IDataSet} from "../../../models/data/data-set"
import {MarqueeState} from "../models/marquee-state"
import {appState} from "../../../models/app-state"
import {useDataDisplayModelContext} from "../hooks/use-data-display-model"
import {useDataDisplayLayout} from "../hooks/use-data-display-layout"

interface IProps {
  marqueeState: MarqueeState
  pixiPointsArrayRef: IPixiPointsArrayRef
}

type RTree = ReturnType<typeof RTreeLib>

interface caseObject {
  datasetID: string
  caseID: string
}

interface SelectionSpec {
  dataset: IDataSet
  caseIDsToSelect: string[]
  caseIDsToDeselect: string[]
}

interface SelectionMap {
  [key: string]: SelectionSpec
}

const prepareTree = (pixiPointsArray: PixiPoints[]): RTree => {
    const selectionTree = RTreeLib(10)
    pixiPointsArray.forEach(pixiPoints => {
      pixiPoints.forEachPoint((point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
        const rect = {
          x: point.x,
          y: point.y,
          w: 1, h: 1
        }
        selectionTree.insert(rect, {datasetID: metadata.datasetID, caseID: metadata.caseID})
      })
    })
    return selectionTree
  },

  getCasesForDelta = (tree: any, newRect: rTreeRect, prevRect: rTreeRect) => {
    const diffRects = rectangleSubtract(newRect, prevRect)
    let caseObjects: caseObject[] = []
    diffRects.forEach(aRect => {
      const newlyFoundCaseObjects = tree.search(aRect)
      caseObjects = caseObjects.concat(newlyFoundCaseObjects)
    })
    return caseObjects
  }

export const Background = forwardRef<SVGGElement | HTMLDivElement, IProps>((props, ref) => {
  const {marqueeState, pixiPointsArrayRef} = props,
    dataDisplayModel = useDataDisplayModelContext(),
    datasetsArray = dataDisplayModel.datasetsArray,
    datasetsMap: SelectionMap = useMemo(() => {
      const map: SelectionMap = {}
      datasetsArray.forEach((dataset) => {
        map[dataset.id] = {dataset, caseIDsToSelect: [], caseIDsToDeselect: []}
      })
      return map
    }, [datasetsArray]),
    layout = useDataDisplayLayout(),
    bgRef = ref as MutableRefObject<SVGGElement | null>,
    startX = useRef(0),
    startY = useRef(0),
    width = useRef(0),
    height = useRef(0),
    selectionTree = useRef<RTree | null>(null),
    previousMarqueeRect = useRef<rTreeRect>()

  const clearDatasetsMapArrays = useCallback(() => {
    Object.keys(datasetsMap).forEach((key) => {
      datasetsMap[key].caseIDsToSelect = []
      datasetsMap[key].caseIDsToDeselect = []
    })
  }, [datasetsMap]),

    onDragStart = useCallback((event: PointerEvent) => {
      // plotBounds.left and plotBounds.top used to be subtracted from startX and startY. But it seems to be no longer
      // necessary after dragging is reimplemented without D3. Leaving these lines here just in case some bugs appear.
      // const {computedBounds} = layout
      // const plotBounds = computedBounds.plot
      appState.beginPerformance()
      selectionTree.current = prepareTree(pixiPointsArrayRef.current)
      const targetRect = (event.target as HTMLElement).getBoundingClientRect()
      startX.current = event.x - targetRect.left
      startY.current = event.y - targetRect.top
      width.current = 0
      height.current = 0
      if (!event.shiftKey) {
        datasetsArray.forEach(dataset => {
          // This is breaking the graph-legend cypress test
          // dataset.applyModelChange(() => {
            dataset.setSelectedCases([])
          // }, {
          //   notifications: selectCasesNotification(dataset)
          // })
        })
      }
      marqueeState.setMarqueeRect({x: startX.current, y: startY.current, width: 0, height: 0})
    }, [datasetsArray, marqueeState, pixiPointsArrayRef]),

    onDrag = useCallback((event: { dx: number; dy: number }) => {
      if (event.dx !== 0 || event.dy !== 0 && datasetsArray.length) {
        previousMarqueeRect.current = rectNormalize(
          {x: startX.current, y: startY.current, w: width.current, h: height.current})
        width.current = width.current + event.dx
        height.current = height.current + event.dy
        const marqueeRect = marqueeState.marqueeRect
        marqueeState.setMarqueeRect({
          x: marqueeRect.x, y: marqueeRect.y,
          width: marqueeRect.width + event.dx,
          height: marqueeRect.height + event.dy
        })
        const currentRect = rectNormalize({
            x: startX.current, y: startY.current,
            w: width.current,
            h: height.current
          }),
          newSelection = getCasesForDelta(selectionTree.current, currentRect, previousMarqueeRect.current),
          newDeselection = getCasesForDelta(selectionTree.current, previousMarqueeRect.current, currentRect)
        // Stash the caseIDs to select and deselect for each dataset
        newSelection.forEach((caseObject: caseObject) => {
          datasetsMap[caseObject.datasetID].caseIDsToSelect.push(caseObject.caseID)
        })
        newDeselection.forEach((caseObject: caseObject) => {
          datasetsMap[caseObject.datasetID].caseIDsToDeselect.push(caseObject.caseID)
        })
        // Apply the selections and de-selections for each dataset
        Object.values(datasetsMap).forEach((selectionSpec) => {
          const {dataset, caseIDsToSelect, caseIDsToDeselect} = selectionSpec
          dataset.applyModelChange(() => {
            dataset.selectCases(caseIDsToSelect, true)
            dataset.selectCases(caseIDsToDeselect, false)
          }, {
            notifications: selectCasesNotification(dataset)
          })
        })
      }
      clearDatasetsMapArrays()
    }, [clearDatasetsMapArrays, datasetsArray.length, datasetsMap, marqueeState]),

    onDragEnd = useCallback(() => {
      marqueeState.setMarqueeRect({x: 0, y: 0, width: 0, height: 0})
      selectionTree.current = null
      dataDisplayModel.setMarqueeMode("unclicked")
      appState.endPerformance()
    }, [dataDisplayModel, marqueeState])

  useEffect(() => {
    return autorun(() => {
      if (!layout.computedBounds.plot) {
        return
      }
      const {left, top, width: plotWidth, height: plotHeight} = layout.computedBounds.plot,
        transform = `translate(${left}, ${top})`,
        {isTransparent, plotBackgroundColor = defaultBackgroundColor} = dataDisplayModel,
        bgColor = String(color(plotBackgroundColor)),
        darkBgColor = String(color(plotBackgroundColor)?.darker(0.2)),
        {numRows, numColumns} = layout,
        cellWidth = Math.max(0, plotWidth / numColumns),
        cellHeight = Math.max(0, plotHeight / numRows),
        row = (index: number) => Math.floor(index / numColumns),
        col = (index: number) => index % numColumns,
        groupElement = bgRef.current
      select(groupElement)
        .selectAll<SVGRectElement, number>('rect')
        .data(range(numRows * numColumns))
        .join('rect')
        .attr('class', 'plot-cell-background')
        .attr('data-testid', 'plot-cell-background')
        .attr('transform', transform)
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('x', d => cellWidth * col(d))
        .attr('y', d => cellHeight * row(d))
        .style('fill', d => (row(d) + col(d)) % 2 === 0 ? bgColor : darkBgColor)
        .style('fill-opacity', isTransparent ? 0 : 1)
        .on(PixiBackgroundPassThroughEvent.PointerDown, pointerDownEvent => {
          // Custom dragging implementation to avoid D3. Unfortunately, since we need to deal with events manually
          // dispatched from PixiJS canvas, we need to be very careful about the event handling. This implementation
          // allows us just to deal with pointerdown event being passed from canvas. pointermove and pointerup events
          // are attached to window directly (recommended way anyway).
          let draggingActive = true
          const prevXY = {x: pointerDownEvent.x, y: pointerDownEvent.y}
          onDragStart(pointerDownEvent)
          const onDragHandler = (onDragEvent: PointerEvent) => {
            if (draggingActive) {
              onDrag({dx: onDragEvent.x - prevXY.x, dy: onDragEvent.y - prevXY.y})
              prevXY.x = onDragEvent.x
              prevXY.y = onDragEvent.y
            }
          }
          const onDragEndHandler = () => {
            if (draggingActive) {
              draggingActive = false
              onDragEnd()
              window.removeEventListener("pointermove", onDragHandler)
              window.removeEventListener("pointerup", onDragEndHandler)
            }
          }
          window.addEventListener("pointermove", onDragHandler)
          window.addEventListener("pointerup", onDragEndHandler)
        })
    }, {name: "Background.autorun"})
  }, [bgRef, datasetsArray, dataDisplayModel, layout, onDrag, onDragEnd, onDragStart])

  return (
    <g className='background-group-element' ref={bgRef}/>
  )
})
Background.displayName = "Background"
