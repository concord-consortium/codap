import {drag, select} from "d3"
import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import {mstReaction} from "../../../../utilities/mst-reaction"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { kDefaultPointShape } from "../../../../utilities/point-shape-utils"
import { setSelectedCases, selectCases } from "../../../../models/data/data-set-utils"
import { hasSelectionModifier } from "../../../../utilities/platform-utils"
import { getTileModel } from "../../../../models/tiles/tile-model"
import {axisGap} from "../../../axis/axis-types"
import { swapCategoriesNotification } from "../../data-display-notifications"
import { transitionDuration } from "../../data-display-types"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import { useDataDisplayModelContextMaybe } from "../../hooks/use-data-display-model"
import {useDataDisplayLayout} from "../../hooks/use-data-display-layout"
import {
  pointShapeBoxCenter, pointShapePathData, pointShapeRadiusWithinExtent
} from "../../renderer/point-shapes"
import { IBaseLegendProps } from "./legend-common"
import { CategoricalLegendModel, keySize, padding, labelHeight, Key } from "./categorical-legend-model"

import './legend.scss'

// This is not an observing component because all of its real rendering happens in
// a mstAutorun.
export const CategoricalLegend =
  function CategoricalLegend({layerIndex, setDesiredExtent}: IBaseLegendProps) {

    const dataConfiguration = useDataConfigurationContext()
    const displayModel = useDataDisplayModelContextMaybe()
    const dataDisplayLayout = useDataDisplayLayout()
    const duration = useRef(0)
    const keysElt = useRef(null)

    // useState guarantees the model will only be created once
    // useMemo doesn't have that guarantee
    const [legendModel] = useState(
      () => new CategoricalLegendModel(dataConfiguration, dataDisplayLayout)
    )

    // This is outside of the main autorun because it only needs to run when
    // the number of categories changes or the max width of a category changes.
    // Also the setDesiredExtent might cause extra re-renders, so it only
    // runs when the desiredExtent actually changes
    useEffect(function updateDesiredExtent() {
      return mstReaction(
        () => {
          if (dataConfiguration?.placeCanHaveZeroExtent('legend')) {
            return 0
          }
          return legendModel.layoutData.numRows * (keySize + padding) + labelHeight + axisGap
        },
        (desiredExtent) => {
          setDesiredExtent(layerIndex, desiredExtent)
        },
        {name: 'CategoricalLegend updateDesiredExtent', fireImmediately: true},
        dataConfiguration
      )
    }, [dataConfiguration, setDesiredExtent, layerIndex, legendModel])

    // These variables should not change, but theoretically it is possible
    useEffect(function updateContextVariables() {
      legendModel.setDataConfiguration(dataConfiguration)
      legendModel.setDataDisplayLayout(dataDisplayLayout)
    }, [dataConfiguration, dataDisplayLayout, legendModel])

    useEffect(() => {
      return function cleanup() {
        setDesiredExtent(layerIndex, 0)
      }
    }, [layerIndex, setDesiredExtent])

    const handleLegendKeyClick = useCallback((event: any, d: Key) => {
      const caseIds = dataConfiguration?.getCasesForLegendValue(d.category)
      if (!caseIds) return
      if (hasSelectionModifier(event)) {
        // Reuses the predicate behind the key's selected styling, so the gesture always matches what
        // the key shows. getCasesForLegendValue returns parent cases when the legend attribute lives
        // in a parent collection; selectCases expands those to their child items in both directions,
        // so deselecting reaches the same cases selecting did.
        const isSelected = dataConfiguration?.allCasesForCategoryAreSelected(d.category)
        selectCases(caseIds, dataConfiguration?.dataset, !isSelected)
      } else {
        setSelectedCases(caseIds, dataConfiguration?.dataset)
      }
    }, [dataConfiguration])

    // The dragBehavior is created first, so d3Render can add this to all new elements.
    const dragBehavior = useMemo(() => {
      const onDragStart = (event: { x: number; y: number }, d: Key) => {
        legendModel.onDragStart(event, d)
        duration.current = 0
      }

      const onDrag = (event: { dx: number; dy: number }, d: Key) => {
        legendModel.onDrag(event, d)
      }

      const onDragEnd = (event: any, d: Key) => {
        duration.current = transitionDuration
        const tile = displayModel ? getTileModel(displayModel) : undefined
        legendModel.onDragEnd(dataConfiguration, d, {
          notify: () => swapCategoriesNotification(tile, "legend")
        })
      }

      return drag<SVGGElement, Key>()
        .on("start", onDragStart)
        .on("drag", onDrag)
        .on("end", onDragEnd)
    }, [dataConfiguration, displayModel, legendModel])

    useEffect(() => { return mstAutorun(function d3Render() {
      if (!keysElt.current) return

      const keysSelection = select(keysElt.current)
        .selectAll<SVGGElement, Key>('g')
        .data(legendModel.categoryData, d => d.category)
        .join(
          enter => {
            const group = enter.append('g')
              .attr('class', 'legend-key')
              .attr('data-testid', 'legend-key')
              .on('click', handleLegendKeyClick)
              .call(dragBehavior)
            // An invisible full-box target under the key. A path takes pointer events on its ink
            // alone, which for a star leaves a core under 8px across to click or start a drag from.
            group.append('rect')
              .attr('class', 'legend-key-target')
              .attr('width', keySize)
              .attr('height', keySize)
            group.append('path')
              .attr('class', 'legend-key-shape')
            group.append('text')

            return group
          }
        )

      const dI = legendModel.dragInfo

      // A display drawing no shaped point -- boundaries, or points fused into bars -- gets a plain
      // square, since a category's assigned shape would describe something that isn't drawn. The
      // shape lives on the shared CategorySet, so without this a star chosen in a graph would
      // appear on a map's boundary legend for the same attribute.
      const keysAreShaped = displayModel?.drawsShapedItemsFor(dataConfiguration) ?? true

      // Asked of the display rather than read off it: a map keeps a description per layer, so the
      // shape a key falls back to has to be the one its own layer draws points with.
      const keyShape = (category: string) => keysAreShaped
        ? dataConfiguration?.getLegendShapeForCategory(
            category,
            displayModel?.displayItemDescriptionFor(dataConfiguration).pointShape) ?? kDefaultPointShape
        : "square"

      // The box is what gets centered in the key, so its own offset comes out of the placement.
      const keyOffset = (category: string) => {
        const shape = keyShape(category)
        const center = pointShapeBoxCenter(shape, pointShapeRadiusWithinExtent(shape, keySize))
        return { x: keySize / 2 - center.x, y: keySize / 2 - center.y }
      }

      // Where the key's box sits. The drawn shape is offset within the box, but the box itself is
      // what the label sits beside and what the pointer target covers.
      const cellPosition = (d: Key) => {
        const isDragging = dI.category === d.category
        const x = isDragging
          ? dI.currentDragPosition.x - dI.initialOffset.x
          : axisGap + (d.column || 0) * legendModel.layoutData.columnWidth
        const y = labelHeight + (isDragging
          ? dI.currentDragPosition.y - dI.initialOffset.y
          : (d.row || 0) * (keySize + padding))
        return { x, y }
      }

      keysSelection.select('rect')
        .transition().duration(duration.current)
        .attr('transform', (d) => {
          const { x, y } = cellPosition(d)
          return `translate(${x}, ${y})`
        })

      keysSelection.select('path')
        .classed('legend-rect-selected', (d) => {
          return dataConfiguration?.allCasesForCategoryAreSelected(d.category) ??
              false
        })
        .style('fill', (d) => d.color)
        // Set outside the transition: interpolating one outline into another matches their points up
        // in order, which turns a change of shape into a scramble rather than a change of shape.
        .attr('d', (d) => {
          const shape = keyShape(d.category)
          return pointShapePathData(shape, pointShapeRadiusWithinExtent(shape, keySize))
        })
        .transition().duration(duration.current)
        .on('end', () => {
          duration.current = 0
        })
        .attr('transform', (d) => {
          const { x, y } = cellPosition(d)
          const offset = keyOffset(d.category)
          return `translate(${x + offset.x}, ${y + offset.y})`
        })
      keysSelection.select('text')
        .text((d) => d.category)
        .transition().duration(duration.current)
        .on('end', () => {
          duration.current = 0
        })
        .attr('x', (d) => keySize + 3 + cellPosition(d).x)
        .attr('y', (d) => 0.8 * keySize + cellPosition(d).y)
    }, {name: "CategoricalLegend d3 render"}, dataConfiguration) },
      // The display's own shape is read inside the autorun, which tracks it itself. Listing it here
      // would tear the autorun down and rebuild it every time a shape changed, which is both wasted
      // work and a lost transition.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [dataConfiguration, dragBehavior, handleLegendKeyClick, legendModel]
    )

    return (
      <g className='legend-categories' ref={keysElt} data-testid='legend-categories'></g>
    )
  }
