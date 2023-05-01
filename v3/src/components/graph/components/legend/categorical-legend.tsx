import {reaction} from "mobx"
import {drag, range, select} from "d3"
import React, {memo, useCallback, useEffect, useMemo, useRef} from "react"
import {isSelectionAction} from "../../../../models/data/data-set-actions"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {Bounds, useGraphLayoutContext} from "../../models/graph-layout"
import {missingColor} from "../../../../utilities/color-utils"
import {onAnyAction} from "../../../../utilities/mst-utils"
import {measureText} from "../../../../hooks/use-measure-text"
import {kGraphFont, transitionDuration} from "../../graphing-types"
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
  numColumns: number
  numRows: number
  columnWidth: number
}

interface DragInfo {
  indexOfCategory: number
  initialOffset: { x: number, y: number }
  currentDragPosition: { x: number, y: number }
}

const keySize = 15,
  padding = 5

interface LayoutData {
  maxWidth: number
  fullWidth: number
  numColumns: number
  numRows: number
  columnWidth: number
}

const labelHeight = getStringBounds('Wy', graphVars.graphLabelFont).height

const coordinatesToCatIndex = (lod: LayoutData, numCategories: number, localPoint: { x: number, y: number }) => {
    const {x, y} = localPoint,
      col = Math.floor(x / lod.columnWidth),
      row = Math.floor(y / (keySize + padding)),
      catIndex = row * lod.numColumns + col
    return catIndex >= 0 && catIndex < numCategories ? catIndex : -1
  },
  catLocation = (lod: LayoutData, catData: Key[], index: number) => {
    return {
      x: axisGap + catData[index].column * lod.columnWidth,
      y: /*labelHeight + */catData[index].row * (keySize + padding)
    }
  }

export const CategoricalLegend = memo(function CategoricalLegend(
  {transform}: ICategoricalLegendProps) {
  const transformRef = useRef(transform),
    dataConfiguration = useDataConfigurationContext(),
    dataset = dataConfiguration?.dataset,
    layout = useGraphLayoutContext(),
    legendBoundsRef = useRef<Bounds>(layout?.getComputedBounds('legend')),
    categoriesRef = useRef<string[] | undefined>(),
    categoryData = useRef<Key[]>([]),
    layoutData = useRef<Layout>({
        maxWidth: 0,
        fullWidth: 0,
        numColumns: 0,
        numRows: 0,
        columnWidth: 0
      }
    ),
    dragInfo = useRef<DragInfo>({
      indexOfCategory: -1,
      initialOffset: {x: 0, y: 0},
      currentDragPosition: {x: 0, y: 0}
    }),
    duration = useRef(0)

  legendBoundsRef.current = layout?.getComputedBounds('legend')

  const // keyFunc = (index: number) => index,
    keysElt = useRef(null),


    computeLayout = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')
      const numCategories = categoriesRef.current?.length,
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
    }, [computeLayout, dataConfiguration]),

    refreshKeys = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')
      const numCategories = categoriesRef.current?.length,
        catData = categoryData.current
      select(keysElt.current)
        .selectAll('g')
        .data(range(0, numCategories ?? 0))
        .join(
          enter => enter,
          update => {
            update.select('rect')
              .classed('legend-rect-selected',
                (index) => {
                  return dataConfiguration?.allCasesForCategoryAreSelected(catData[index].category) ??
                    false
                })
              .style('fill', (index: number) => catData[index].color || 'white')
              .transition().duration(duration.current)
              .on('end', () => {
                duration.current = 0
              })
              .attr('transform', transformRef.current)
              .attr('x', (index: number) => {
                return dragInfo.current.indexOfCategory === index
                  ? dragInfo.current.currentDragPosition.x - dragInfo.current.initialOffset.x
                  : axisGap + catData[index].column * layoutData.current.columnWidth
              })
              .attr('y',
                (index: number) => {
                return labelHeight + (dragInfo.current.indexOfCategory === index
                  ? dragInfo.current.currentDragPosition.y - dragInfo.current.initialOffset.y
                  : catData[index].row * (keySize + padding))
                })
            return update.select('text')
              .text((index: number) => catData[index].category)
              .attr('transform', transformRef.current)
              .transition().duration(duration.current)
              .on('end', () => {
                duration.current = 0
              })
              .attr('x', (index: number) => {
                return keySize + 3 + (dragInfo.current.indexOfCategory === index
                  ? dragInfo.current.currentDragPosition.x - dragInfo.current.initialOffset.x
                  : axisGap + catData[index].column * layoutData.current.columnWidth)
              })
              .attr('y',
                (index: number) => {
                  return labelHeight + 0.8 * keySize + (dragInfo.current.indexOfCategory === index
                    ? dragInfo.current.currentDragPosition.y - dragInfo.current.initialOffset.y
                    : catData[index].row * (keySize + padding))
                })
          }
        )
/*  This causes flickering, so we leave it out for now until we assign data properly to the keys
      select(keysElt.current).selectAll('g').each(function (index) {
        dragInfo.current.indexOfCategory === index && select(this).raise()
      })
*/
    }, [dataConfiguration, transform]),  // eslint-disable-line react-hooks/exhaustive-deps

    onDragStart = useCallback((event: { x: number; y: number }) => {
      const dI = dragInfo.current,
        lod = layoutData.current,
        numCategories = categoriesRef.current?.length ?? 0,
        legendBounds = legendBoundsRef.current,
        localPt = {
          x: event.x - legendBounds?.left ?? 0,
          y: event.y - labelHeight - legendBounds?.top ?? 0
        },
        catIndex = coordinatesToCatIndex(lod, numCategories, localPt),
        keyLocation = catLocation(lod, categoryData.current, catIndex)
      dI.indexOfCategory = catIndex
      dI.initialOffset = {x: localPt.x - keyLocation.x, y: localPt.y - keyLocation.y}
      dI.currentDragPosition = localPt
      duration.current = 0
    }, []),

    onDrag = useCallback((event: { dx: number; dy: number }) => {
      if (event.dx !== 0 || event.dy !== 0) {
        const dI = dragInfo.current,
          lod = layoutData.current,
          numCategories = categoriesRef.current?.length ?? 0,
          newDragPosition = {
            x: dI.currentDragPosition.x + event.dx,
            y: dI.currentDragPosition.y + event.dy
          },
          newCatIndex = coordinatesToCatIndex(lod, numCategories, newDragPosition)
        if (newCatIndex >= 0 && newCatIndex !== dI.indexOfCategory) {
          // swap the two categories
          duration.current = transitionDuration / 2
          dataConfiguration?.swapCategoriesForAttrRole('legend', dI.indexOfCategory, newCatIndex)
          dI.indexOfCategory = newCatIndex
        }
        refreshKeys()
        dI.currentDragPosition = newDragPosition
      }
    }, [dataConfiguration, refreshKeys]),

    onDragEnd = useCallback(() => {
      duration.current = transitionDuration
      dragInfo.current.indexOfCategory = -1
      refreshKeys()
    }, [refreshKeys]),
    dragBehavior = useMemo(() => drag<SVGGElement, number>()
      .on("start", onDragStart)
      .on("drag", onDrag)
      .on("end", onDragEnd), [onDrag, onDragEnd, onDragStart]),
    setupKeys = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')
      const numCategories = categoriesRef.current?.length
      if (keysElt.current && categoryData.current) {
        select(keysElt.current).selectAll('legend-key').remove() // start fresh

        const keysSelection = select(keysElt.current)
          .selectAll<SVGGElement, number>('g')
          .data(range(0, numCategories ?? 0))
          .join(
            enter => enter
              .append('g')
              .attr('class', 'legend-key')
              .call(dragBehavior)
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
    }, [dataConfiguration, dragBehavior])

  useEffect(function respondToSelectionChange() {
    return onAnyAction(dataset, action => {
      if (isSelectionAction(action)) {
        refreshKeys()
      }
    })
  }, [refreshKeys, dataset, computeDesiredExtent])

  useEffect(function respondToCategorySetsChange() {
    return reaction(
      () => dataConfiguration?.categoryArrayForAttrRole('legend'),
      () => {
        layout.setDesiredExtent('legend', computeDesiredExtent())
        setupKeys()
        refreshKeys()
      })
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
    if (keysElt.current && categoryData.current) {
      setupKeys()
      refreshKeys()
    }
  }, [categoryData, setupKeys, refreshKeys, dataConfiguration])

  useEffect(function cleanup() {
    return () => {
      layout.setDesiredExtent('legend', 0)
    }
  }, [layout])

  transformRef.current = transform

  return (
    <svg className='legend-categories' ref={keysElt}></svg>
  )
})
CategoricalLegend.displayName = "CategoricalLegend"
