import {reaction} from "mobx"
import {onAction} from "mobx-state-tree"
import {range, select} from "d3"
import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {isSelectionAction} from "../../../../models/data/data-set-actions"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useGraphLayoutContext} from "../../models/graph-layout"
import {missingColor} from "../../../../utilities/color-utils"
import {measureText} from "../../../../hooks/use-measure-text"
import {kGraphFont} from "../../graphing-types"
import {getStringBounds} from "../../../axis/axis-utils"
import {axisGap} from "../../../axis/axis-types"

import './legend.scss'
import graphVars from "../graph.scss"

interface ICategoricalLegendProps {
  transform: string,
}

interface Key {
  category: string
  color: string
  index: number
  column: number,
  row: number
}

interface Layout {
  maxWidth: number
  fullWidth: number
  numColumns: number,
  numRows: number,
  columnWidth: number
}

const keySize = 15,
  padding = 5

export const CategoricalLegend = memo(function CategoricalLegend(
  {transform}: ICategoricalLegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    dataset = dataConfiguration?.dataset,
    layout = useGraphLayoutContext(),
    categoriesRef = useRef<Set<string> | undefined>(),
    categoryData = useRef<Key[]>([]),
    layoutData = useRef<Layout>({
        maxWidth: 0,
        fullWidth: 0,
        numColumns: 0,
        numRows: 0,
        columnWidth: 0
      }
    ),
    labelHeight = getStringBounds('Wy', graphVars.graphLabelFont).height,
    // keyFunc = (index: number) => index,
    [keysElt, setKeysElt] = useState<SVGGElement | null>(null),

    computeLayout = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categorySetForAttrRole('legend')
      const numCategories = categoriesRef.current?.size,
        lod: Layout = layoutData.current
      lod.fullWidth = layout.getAxisLength('bottom')
      lod.maxWidth = 0
      categoriesRef.current?.forEach(cat => {
        lod.maxWidth = Math.max(lod.maxWidth, measureText(cat, kGraphFont))
      })
      lod.maxWidth += keySize + padding
      lod.numColumns = Math.floor(lod.fullWidth / lod.maxWidth)
      lod.columnWidth = lod.fullWidth / lod.numColumns
      lod.numRows = Math.ceil((numCategories ?? 0) / lod.numColumns)
      categoryData.current.length = 0
      categoriesRef.current && Array.from(categoriesRef.current).forEach((cat: string, index) => {
        categoryData.current.push({
          category: cat,
          color: dataConfiguration?.getLegendColorForCategory(cat) || missingColor,
          index,
          row: Math.floor(index / lod.numColumns),
          column: index % lod.numColumns
        })
      })
      layoutData.current = lod
    }, [layout, dataConfiguration]),

    computeDesiredExtent = useCallback(() => {
      if (dataConfiguration?.placeCanHaveZeroExtent('legend')) {
        return 0
      }
      computeLayout()
      const lod = layoutData.current
      return lod.numRows * (keySize + padding) + labelHeight + axisGap
    }, [computeLayout, dataConfiguration, labelHeight]),

    setupKeys = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categorySetForAttrRole('legend')
      const numCategories = categoriesRef.current?.size
      if (keysElt && categoryData.current) {
        select(keysElt).selectAll('key').remove() // start fresh

        const keysSelection = select(keysElt)
          .selectAll<SVGGElement, number>('g')
          .data(range(0, numCategories ?? 0))
          .join(
            enter => enter
              .append('g')
              .attr('class', 'key')
          )
        keysSelection.each(function () {
          const sel = select<SVGGElement, number>(this),
            size = sel.selectAll<SVGRectElement, number>('rect').size()
          if (size === 0) {
            sel.append('rect')
              .attr('width', keySize)
              .attr('height', keySize)
              .on('click', (event, i: number) => {
                  dataConfiguration?.selectCasesForLegendValue(categoryData.current[i].category, event.shiftKey)
                })
            sel.append('text')
              .on('click', (event, i: number) => {
                  dataConfiguration?.selectCasesForLegendValue(categoryData.current[i].category, event.shiftKey)
                })
          }
        })
      }
    }, [dataConfiguration, keysElt]),

    refreshKeys = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categorySetForAttrRole('legend')
      const numCategories = categoriesRef.current?.size
      select(keysElt)
        .selectAll('g')
        .data(range(0, numCategories ?? 0))
        .join(
          enter => enter,
          update => {
            update.select('rect')
              .classed('legend-rect-selected',
                (index) => {
                  return dataConfiguration?.allCasesForCategoryAreSelected(categoryData.current[index].category) ??
                    false
                })
              .attr('transform', transform)
              .style('fill', (index: number) => categoryData.current[index].color || 'white')
              .attr('x', (index: number) => {
                return axisGap + categoryData.current[index].column * layoutData.current.columnWidth
              })
              .attr('y',
                (index: number) => labelHeight + categoryData.current[index].row * (keySize + padding))
            return update.select('text')
              .text((index: number) => categoryData.current[index].category)
              .attr('transform', transform)
              .attr('x', (index: number) => {
                return axisGap +categoryData.current[index].column * layoutData.current.columnWidth + keySize + 3
              })
              .attr('y',
                (index: number) =>
                  labelHeight + 0.8 * keySize + categoryData.current[index].row * (keySize + padding))
          }
        )
    }, [dataConfiguration, keysElt, transform, labelHeight])

  useEffect(function respondToSelectionChange() {
    return onAction(dataset, action => {
      if (isSelectionAction(action)) {
        refreshKeys()
      }
    }, true)
  }, [refreshKeys, dataset, computeDesiredExtent])

  useEffect(function respondToCategorySetsChange() {
    const disposer = reaction(
      () => dataConfiguration?.categorySetForAttrRole('legend'),
      () => {
        layout.setDesiredExtent('legend', computeDesiredExtent())
        setupKeys()
        refreshKeys()
      })
    return disposer
  }, [setupKeys, refreshKeys, dataConfiguration, layout, computeDesiredExtent])

  useEffect(function respondToLayoutChange() {
    const disposer = reaction(
      () => {
        const {graphHeight, graphWidth} = layout,
          legendAttrID = dataConfiguration?.attributeID('legend')
        return [graphHeight, graphWidth, legendAttrID]
      },
      () => {
        layout.setDesiredExtent('legend', computeDesiredExtent())
        refreshKeys()
      }, {fireImmediately: true}
    )
    return () => disposer()
  }, [layout, refreshKeys, computeDesiredExtent, dataConfiguration])

  useEffect(function setup() {
    if (keysElt && categoryData.current) {
      setupKeys()
      refreshKeys()
    }
  }, [keysElt, categoryData, setupKeys, refreshKeys, dataConfiguration])

  useEffect(function cleanup () {
    return () => {
      layout.setDesiredExtent('legend', 0)
    }
  }, [layout])

  return (
    <svg className='legend-categories' ref={elt => setKeysElt(elt)}></svg>
  )
})
CategoricalLegend.displayName = "CategoricalLegend"
