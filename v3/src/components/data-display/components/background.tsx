import {select, color, range} from "d3"
import { comparer, reaction } from "mobx"
import {forwardRef, MutableRefObject, useCallback, useEffect, useRef} from "react"
import RTreeLib from "rtree"
import {useMemo} from "use-memo-one"
import { isKeyDown } from "../../../hooks/use-key-states"
import {appState} from "../../../models/app-state"
import {IDataSet} from "../../../models/data/data-set"
import {selectAllCases, selectAndDeselectCases} from "../../../models/data/data-set-utils"
import { getTileModel } from "../../../models/tiles/tile-model"
import {defaultBackgroundColor} from "../../../utilities/color-utils"
import { mstReaction } from "../../../utilities/mst-reaction"
import { useGraphLayoutContext } from "../../graph/hooks/use-graph-layout-context"
import { kZoomInFactor, kZoomOutFactor, zoomAxis } from "../../axis/axis-utils"
import { isAnyNumericAxisModel } from "../../axis/models/numeric-axis-models"
import {rTreeRect} from "../data-display-types"
import {rectangleSubtract, rectNormalize} from "../data-display-utils"
import {useDataDisplayLayout} from "../hooks/use-data-display-layout"
import {useDataDisplayModelContext} from "../hooks/use-data-display-model"
import {useRendererPointerDownDeselect} from "../hooks/use-renderer-pointer-down-deselect"
import {MarqueeState} from "../models/marquee-state"
import { BackgroundPassThroughEvent, PointRendererArray } from "../renderer"

interface IProps {
  marqueeState: MarqueeState
  rendererArray: PointRendererArray
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

const prepareTree = (rendererArray: PointRendererArray): RTree => {
  const selectionTree = RTreeLib(10)
  rendererArray.forEach(renderer => {
    // forEachPoint provides point metadata which includes x/y coordinates
    renderer?.forEachPoint((_point, metadata) => {
      if (!isFinite(metadata.x) || !isFinite(metadata.y)) return
      const rect = {
        x: metadata.x,
        y: metadata.y,
        w: 1, h: 1
      }
      selectionTree.insert(rect, { datasetID: metadata.datasetID, caseID: metadata.caseID })
    })
  })
  return selectionTree
}

const getCasesForDelta = (tree: RTree | null, newRect: rTreeRect, prevRect: rTreeRect) => {
  if (!tree) return []

  const diffRects = rectangleSubtract(newRect, prevRect)
  let caseObjects: caseObject[] = []
  diffRects.forEach(aRect => {
    const newlyFoundCaseObjects = tree.search(aRect)
    caseObjects = caseObjects.concat(newlyFoundCaseObjects)
  })
  return caseObjects
}

export const Background = forwardRef<SVGGElement | HTMLDivElement, IProps>((props, ref) => {
  const { marqueeState, rendererArray } = props,
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
    graphLayout = useGraphLayoutContext(),
    bgRef = ref as MutableRefObject<SVGGElement | null>,
    startX = useRef(0),
    startY = useRef(0),
    width = useRef(0),
    height = useRef(0),
    needsToClearSelection = useRef(false),
    selectionTree = useRef<RTree | null>(null),
    previousMarqueeRect = useRef<rTreeRect>(),
    isHoveredRef = useRef(false)

  const clearDatasetsMapArrays = useCallback(() => {
    Object.keys(datasetsMap).forEach((key) => {
      datasetsMap[key].caseIDsToSelect = []
      datasetsMap[key].caseIDsToDeselect = []
    })
  }, [datasetsMap])

  const onDragStart = useCallback((event: PointerEvent) => {
    appState.beginPerformance()
    selectionTree.current = prepareTree(rendererArray)
    // Event coordinates are window coordinates. To convert them to SVG coordinates, we need to subtract the
    // bounding rect of the SVG element.
    const bgRect = (bgRef.current as SVGGElement).getBoundingClientRect()
    startX.current = event.x - bgRect.left
    startY.current = event.y - bgRect.top
    width.current = 0
    height.current = 0
    marqueeState.setMarqueeRect({x: startX.current, y: startY.current, width: 0, height: 0})
    needsToClearSelection.current = !event.shiftKey
  }, [bgRef, marqueeState, rendererArray])

  const onDrag = useCallback((event: { dx: number; dy: number }) => {
    if ((event.dx === 0 && event.dy === 0) || datasetsArray.length === 0) return

    if (needsToClearSelection.current) {
      datasetsArray.forEach(data => {
        if (data.selection.size > 0) selectAllCases(data, false)
      })
      needsToClearSelection.current = false
    }

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
      selectAndDeselectCases(caseIDsToSelect, caseIDsToDeselect, dataset)
    })

    clearDatasetsMapArrays()
  }, [clearDatasetsMapArrays, datasetsArray, datasetsMap, marqueeState])

  const onDragEnd = useCallback(() => {
    marqueeState.setMarqueeRect({x: 0, y: 0, width: 0, height: 0})
    selectionTree.current = null
    dataDisplayModel.setMarqueeMode("unclicked")
    appState.endPerformance()
  }, [dataDisplayModel, marqueeState])

  useRendererPointerDownDeselect(rendererArray, dataDisplayModel)

  // Check if graph has at least one numeric axis that can be zoomed
  const hasNumericAxis = useCallback(() => {
    const xAxisModel = dataDisplayModel.getAxis('bottom')
    const yAxisModel = dataDisplayModel.getAxis('left')
    return isAnyNumericAxisModel(xAxisModel) || isAnyNumericAxisModel(yAxisModel)
  }, [dataDisplayModel])

  // Handle option-click zoom on plot background
  const handleOptionClickZoom = useCallback((event: PointerEvent) => {
    if (!event.altKey) return false
    if (!hasNumericAxis()) return false

    // Get plot bounds to convert coordinates
    const plotBounds = layout.computedBounds.plot
    if (!plotBounds) return false

    // Get the SVG bounding rect to convert from window coordinates to SVG coordinates
    if (!bgRef.current) return false
    const bgRect = bgRef.current.getBoundingClientRect()
    const svgX = event.x - bgRect.left - plotBounds.left
    const svgY = event.y - bgRect.top - plotBounds.top

    // Determine zoom factor
    const factor = event.shiftKey ? kZoomOutFactor : kZoomInFactor

    // Get tile model for undo/redo notifications
    const tileModel = getTileModel(dataDisplayModel)

    // Zoom the x-axis if numeric
    const xAxisModel = dataDisplayModel.getAxis('bottom')
    if (isAnyNumericAxisModel(xAxisModel)) {
      const xScale = graphLayout.getNumericScale('bottom')
      if (xScale) {
        const fixedValue = xScale.invert(svgX)
        zoomAxis(xAxisModel, fixedValue, factor, dataDisplayModel, tileModel)
      }
    }

    // Zoom the y-axis if numeric
    const yAxisModel = dataDisplayModel.getAxis('left')
    if (isAnyNumericAxisModel(yAxisModel)) {
      const yScale = graphLayout.getNumericScale('left')
      if (yScale) {
        const fixedValue = yScale.invert(svgY)
        zoomAxis(yAxisModel, fixedValue, factor, dataDisplayModel, tileModel)
      }
    }

    return true
  }, [bgRef, dataDisplayModel, graphLayout, hasNumericAxis, layout.computedBounds.plot])

  // Update cursor based on modifier keys
  const updateBackgroundCursor = useCallback((altKey: boolean, shiftKey: boolean) => {
    rendererArray.forEach(renderer => {
      if (!renderer?.canvas) return

      // Clear zoom classes first
      renderer.canvas.classList.remove('zoom-in', 'zoom-out')

      // Add appropriate zoom class if alt is held and there's a numeric axis
      if (altKey && hasNumericAxis()) {
        renderer.canvas.classList.add(shiftKey ? 'zoom-out' : 'zoom-in')
      }
    })
  }, [hasNumericAxis, rendererArray])

  // React to modifier key changes for immediate cursor feedback
  useEffect(() => {
    const disposer = reaction(
      () => [isKeyDown('Alt'), isKeyDown('Shift')] as const,
      ([altKey, shiftKey]) => {
        if (isHoveredRef.current) {
          updateBackgroundCursor(altKey, shiftKey)
        }
      }
    )
    return () => disposer()
  }, [updateBackgroundCursor])

  const renderBackground = useCallback(() => {
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
      groupElement = bgRef.current,
      fillOpacity = isTransparent ? 0
        : dataDisplayModel.plotBackgroundImage ? 0.001 : 1

    select(groupElement).selectAll('image').remove()
    select(groupElement).selectAll('rect').remove()
    if (dataDisplayModel.plotBackgroundImage) {
      let xCoord = left,
        imageWidth = plotWidth,
        yCoord = top,
        imageHeight = plotHeight
      if (dataDisplayModel.plotBackgroundImageLockInfo?.locked) {
        const xScale = graphLayout.getNumericScale('bottom'),
          yScale = graphLayout.getNumericScale('left')
        if (xScale) {
          xCoord = left + xScale(dataDisplayModel.plotBackgroundImageLockInfo.xAxisLowerBound)
          const right = left + xScale(dataDisplayModel.plotBackgroundImageLockInfo.xAxisUpperBound)
          imageWidth = right - xCoord
        }
        if (yScale) {
          yCoord = top + yScale(dataDisplayModel.plotBackgroundImageLockInfo.yAxisUpperBound)
          const bottom = top + yScale(dataDisplayModel.plotBackgroundImageLockInfo.yAxisLowerBound)
          imageHeight = bottom - yCoord
        }
      }
      select(groupElement).append('image')
        .attr("x", xCoord)
        .attr("y", yCoord)
        .attr("width", imageWidth)
        .attr("height", imageHeight)
        .attr("preserveAspectRatio", "none") // Stretch to fill the rectangle
        .attr("xlink:href", dataDisplayModel.plotBackgroundImage) // For older browsers
        .attr("href", dataDisplayModel.plotBackgroundImage) // For modern browsers
    }

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
      .style('fill-opacity', fillOpacity)
      .on(BackgroundPassThroughEvent.PointerDown, pointerDownEvent => {
        // Handle option-click zoom first
        if (handleOptionClickZoom(pointerDownEvent)) {
          return // Don't start marquee selection if we zoomed
        }

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
      // Add mousemove listener for cursor updates and hover tracking
      // The Pixi canvas intercepts mouse events and re-dispatches them
      .on(BackgroundPassThroughEvent.MouseMove, (event: MouseEvent) => {
        isHoveredRef.current = true
        updateBackgroundCursor(event.altKey, event.shiftKey)
      })
      // Add mouseout listener to clear zoom cursor and hover tracking
      .on(BackgroundPassThroughEvent.MouseOut, () => {
        isHoveredRef.current = false
        select(groupElement).selectAll<SVGRectElement, number>('.plot-cell-background')
          .classed('zoom-in', false)
          .classed('zoom-out', false)
      })
  }, [layout, dataDisplayModel, bgRef, graphLayout, onDragStart, onDrag, onDragEnd, handleOptionClickZoom,
      updateBackgroundCursor])

  useEffect(function respondToAxisBoundsChange() {
    mstReaction(() => {
      let axisBounds:(number | undefined)[] = []
      if (dataDisplayModel?.plotBackgroundImageLockInfo?.locked) {
        const xAxisModel = dataDisplayModel.getAxis('bottom')
        if (isAnyNumericAxisModel(xAxisModel)) {
          axisBounds = axisBounds.concat([xAxisModel.max, xAxisModel.dynamicMax, xAxisModel.min, xAxisModel.dynamicMin])
        }
        const yAxisModel = dataDisplayModel.getAxis('left')
        if (isAnyNumericAxisModel(yAxisModel)) {
          axisBounds = axisBounds.concat([yAxisModel.max, yAxisModel.dynamicMax, yAxisModel.min, yAxisModel.dynamicMin])
        }
      }
      return axisBounds
    },
      () => {
        renderBackground()
      }, {name: "renderBackground", equals: comparer.structural, fireImmediately: true}, dataDisplayModel
    )
  }, [renderBackground, dataDisplayModel])

  useEffect(function respondToBackgroundChange() {
    mstReaction(
      () => [
        dataDisplayModel?.plotBackgroundImage,
        dataDisplayModel?.plotBackgroundColor,
        dataDisplayModel?.isTransparent
      ],
      () => {
        renderBackground()
      }, {name: "renderBackground", equals: comparer.structural, fireImmediately: true}, dataDisplayModel
    )
  }, [dataDisplayModel, renderBackground])

  return (
    <g className='background-group-element' ref={bgRef}/>
  )
})
Background.displayName = "Background"
