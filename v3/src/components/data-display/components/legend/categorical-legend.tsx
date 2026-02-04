import {drag, select} from "d3"
import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import {mstReaction} from "../../../../utilities/mst-reaction"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { setSelectedCases, selectCases } from "../../../../models/data/data-set-utils"
import {axisGap} from "../../../axis/axis-types"
import { transitionDuration } from "../../data-display-types"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useDataDisplayLayout} from "../../hooks/use-data-display-layout"
import { IBaseLegendProps } from "./legend-common"
import { CategoricalLegendModel, keySize, padding, labelHeight, Key } from "./categorical-legend-model"

import './legend.scss'

// This is not an observing component because all of its real rendering happens in
// a mstAutorun.
export const CategoricalLegend =
  function CategoricalLegend({layerIndex, setDesiredExtent}: IBaseLegendProps) {

    const dataConfiguration = useDataConfigurationContext()
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
      if (caseIds) {
        // This is breaking the graph-legend cypress test
        // setOrExtendSelection(caseIds, dataConfiguration?.dataset, event.shiftKey)
        if (event.shiftKey) selectCases(caseIds, dataConfiguration?.dataset)
        else setSelectedCases(caseIds, dataConfiguration?.dataset)
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
        legendModel.onDragEnd(dataConfiguration, d)
      }

      return drag<SVGGElement, Key>()
        .on("start", onDragStart)
        .on("drag", onDrag)
        .on("end", onDragEnd)
    }, [dataConfiguration, legendModel])

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
            group.append('rect')
              .attr('width', keySize)
              .attr('height', keySize)
            group.append('text')

            return group
          }
        )

      const dI = legendModel.dragInfo

      keysSelection.select('rect')
        .classed('legend-rect-selected', (d) => {
          return dataConfiguration?.allCasesForCategoryAreSelected(d.category) ??
              false
        })
        .style('fill', (d) => d.color)
        .transition().duration(duration.current)
        .on('end', () => {
          duration.current = 0
        })
        .attr('x', (d) => {
          return dI.category === d.category
            ? dI.currentDragPosition.x - dI.initialOffset.x
            : axisGap + (d.column || 0) * legendModel.layoutData.columnWidth
        })
        .attr('y', (d) => {
          return labelHeight + (dI.category === d.category
            ? dI.currentDragPosition.y - dI.initialOffset.y
            : (d.row || 0) * (keySize + padding))
        })
      keysSelection.select('text')
        .text((d) => d.category)
        .transition().duration(duration.current)
        .on('end', () => {
          duration.current = 0
        })
        .attr('x', (d) => {
          return keySize + 3 + (dI.category === d.category
            ? dI.currentDragPosition.x - dI.initialOffset.x
            : axisGap + (d.column || 0) * legendModel.layoutData.columnWidth)
        })
        .attr('y', (d) => {
          return labelHeight + 0.8 * keySize + (dI.category === d.category
            ? dI.currentDragPosition.y - dI.initialOffset.y
            : (d.row || 0)* (keySize + padding))
        })
    }, {name: "CategoricalLegend d3 render"}, dataConfiguration) },
      [dataConfiguration, dragBehavior, handleLegendKeyClick, legendModel]
    )

    return (
      <g className='legend-categories' ref={keysElt} data-testid='legend-categories'></g>
    )
  }
