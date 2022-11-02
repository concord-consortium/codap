import {reaction} from "mobx"
import {onAction} from "mobx-state-tree"
import {range, select, selection} from "d3"
import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {isSelectionAction} from "../../../../models/data/data-set-actions"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useGraphLayoutContext} from "../../models/graph-layout"
import {missingColor} from "../../../../utilities/color-utils"

import './legend.scss'

interface ICategoricalLegendProps {
  transform: string,
  legendLabelRef: React.RefObject<SVGGElement>
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
  {transform, legendLabelRef}: ICategoricalLegendProps) {
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
    // keyFunc = (index: number) => index,
    [keysElt, setKeysElt] = useState<SVGGElement | null>(null),

    computeLayout = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categorySetForPlace('legend')
      const numCategories = categoriesRef.current?.size,
        lod: Layout = layoutData.current
      lod.fullWidth = layout.axisLength('bottom')
      lod.maxWidth = 0
      categoriesRef.current?.forEach(cat => {
        const text = selection().append('text').attr('y', 500).text(cat),
          width = text.node()?.getBoundingClientRect()?.width
        lod.maxWidth = Math.max(lod.maxWidth, width ?? 0)
        text.remove()
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

    refreshKeys = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categorySetForPlace('legend')
      const numCategories = categoriesRef.current?.size,
        labelHeight = legendLabelRef.current?.getBoundingClientRect().height ?? 0
      select(keysElt)
        .selectAll('g')
        .data(range(0, numCategories ?? 0))
        .join(
          // @ts-expect-error void => Selection
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          () => {
          },
          update => {
            update.select('rect')
              .classed('legend-rect-selected',
                (index) => {
                return dataConfiguration?.allCasesForCategorySelected(categoryData.current[index].category) ?? false
                })
              .attr('transform', transform)
              .style('fill', (index: number) => categoryData.current[index].color || 'white')
              .attr('x', (index: number) => {
                return categoryData.current[index].column * layoutData.current.columnWidth
              })
              .attr('y',
                (index: number) => 10 + labelHeight + categoryData.current[index].row * (keySize + padding))
            update.select('text')
              .text((index: number) => categoryData.current[index].category)
              .attr('transform', transform)
              .attr('x', (index: number) => {
                return categoryData.current[index].column * layoutData.current.columnWidth + keySize + 3
              })
              .attr('y',
                (index: number) => labelHeight + 1.5 * keySize + categoryData.current[index].row * (keySize + padding))
          }
        )
    }, [dataConfiguration, keysElt, transform, legendLabelRef])

  useEffect( function respondToSelectionChange() {
    const disposer = onAction(dataset, action => {
      if (isSelectionAction(action)) {
        refreshKeys()
      }
    }, true)
    return disposer
  },[refreshKeys, dataset])

  useEffect(function respondToLayoutChange() {
    const disposer = reaction(
      () => {
        const {graphHeight, graphWidth} = layout
        return [graphHeight, graphWidth]
      },
      () => {
        computeLayout()
        refreshKeys()
      }, {fireImmediately: true}
    )
    return () => disposer()
  }, [layout, computeLayout, refreshKeys])

  useEffect(function setup() {
    categoriesRef.current = dataConfiguration?.categorySetForPlace('legend')
    const numCategories = categoriesRef.current?.size
    if (keysElt && categoryData.current) {
      select(keysElt).selectAll('key').remove() // start fresh

      const keysSelection = select(keysElt)
        .selectAll('g')
        .data(range(0, numCategories ?? 0))
        .join(
          enter => enter
            .append('g')
            .attr('class', 'key')
        )
      keysSelection.each(function(d, n, group) {
        const sel = select(this),
          size = sel.selectAll('rect').size()
        if(size === 0) {
          sel.append('rect')
            .attr('width', keySize)
            .attr('height', keySize)
            .on('click',
              (event, i: number) => {
                dataConfiguration?.selectCasesForLegendValue(categoryData.current[i].category, event.shiftKey)
              })
          sel.append('text')
            .on('click',
              (event, i: number) => {
                dataConfiguration?.selectCasesForLegendValue(categoryData.current[i].category, event.shiftKey)
              })
        }
      })
      refreshKeys()
    }
  }, [keysElt, categoryData, refreshKeys, dataConfiguration])

  return (
    <svg className='categories' ref={elt => setKeysElt(elt)}></svg>
  )
})
CategoricalLegend.displayName = "CategoricalLegend"
