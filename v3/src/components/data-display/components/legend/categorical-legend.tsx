import {observer} from "mobx-react-lite"
import {mstReaction} from "../../../../utilities/mst-reaction"
import {comparer, reaction} from "mobx"
import {drag, range, select} from "d3"
import React, {useCallback, useEffect, useMemo, useRef} from "react"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import {missingColor} from "../../../../utilities/color-utils"
import {measureText} from "../../../../hooks/use-measure-text"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useDataDisplayLayout} from "../../hooks/use-data-display-layout"
import {getStringBounds} from "../../../axis/axis-utils"
import { kDataDisplayFont, kMain, transitionDuration } from "../../data-display-types"
import {axisGap} from "../../../axis/axis-types"
import { IBaseLegendProps } from "./legend-common"

import './legend.scss'
import vars from "../../../vars.scss"

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

const labelHeight = getStringBounds('Wy', vars.labelFont).height + axisGap

const coordinatesToCatIndex = (lod: Layout, numCategories: number, localPoint: { x: number, y: number }) => {
    const {x, y} = localPoint,
      col = Math.floor(x / lod.columnWidth),
      row = Math.floor(y / (keySize + padding)),
      catIndex = row * lod.numColumns + col
    return catIndex >= 0 && catIndex < numCategories ? catIndex : -1
  },
  catLocation = (lod: Layout, catData: Key[], index: number) => {
    return {
      x: axisGap + catData[index].column * lod.columnWidth,
      y: /*labelHeight + */catData[index].row * (keySize + padding)
    }
  }

export const CategoricalLegend = observer(
  function CategoricalLegend({layerIndex, setDesiredExtent}: IBaseLegendProps) {
    const dataConfiguration = useDataConfigurationContext(),
      tileWidth = useDataDisplayLayout().tileWidth,
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
    const prevCategoryIndex = useRef(0)
    const
      keysElt = useRef(null)

    const setCategoryData = useCallback(() => {
      if (categoriesRef.current) {
        const newCategoryData = categoriesRef.current.map((cat: string, index) => {
          return (
          {
            category: cat,
            color: dataConfiguration?.getLegendColorForCategory(cat) || missingColor,
            column: index % layoutData.current.numColumns,
            index,
            row: Math.floor(index / layoutData.current.numColumns)
          })
        })
        categoryData.current = newCategoryData
      }
    }, [dataConfiguration])

    const computeLayout = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')
      const numCategories = categoriesRef.current?.length,
        lod: Layout = layoutData.current
      lod.fullWidth = tileWidth
      lod.maxWidth = 0
      categoriesRef.current?.forEach(cat => {
        lod.maxWidth = Math.max(lod.maxWidth, measureText(cat, kDataDisplayFont))
      })
      lod.maxWidth += keySize + padding
      lod.numColumns = Math.max(Math.floor(lod.fullWidth / lod.maxWidth), 1)
      lod.columnWidth = lod.fullWidth / lod.numColumns
      lod.numRows = Math.ceil((numCategories ?? 0) / lod.numColumns)
      setCategoryData()
      layoutData.current = lod
    }, [dataConfiguration, setCategoryData, tileWidth])

    const computeDesiredExtent = useCallback(() => {
      if (dataConfiguration?.placeCanHaveZeroExtent('legend')) {
        return 0
      }
      computeLayout()
      const lod = layoutData.current
      return lod.numRows * (keySize + padding) + labelHeight + axisGap
    }, [computeLayout, dataConfiguration])

    const refreshKeys = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')
      const numCategories = categoriesRef.current?.length,
        hasCategories = !(numCategories === 1 && categoriesRef.current?.[0] === kMain),
        catData = categoryData.current
      if (!hasCategories) {
        select(keysElt.current).selectAll('g').remove()
        return
      }
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
              .style('fill', (index: number) =>
                                dataConfiguration?.getLegendColorForCategory(catData[index].category) || 'white')
              .transition().duration(duration.current)
              .on('end', () => {
                duration.current = 0
              })
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
    }, [dataConfiguration])

    const onDragStart = useCallback((event: { x: number; y: number }) => {
      const dI = dragInfo.current,
        lod = layoutData.current,
        numCategories = categoriesRef.current?.length ?? 0,
        localPt = {
          x: event.x,
          y: event.y - labelHeight
        },
        catIndex = coordinatesToCatIndex(lod, numCategories, localPt),
        keyLocation = catLocation(lod, categoryData.current, catIndex)
      dI.indexOfCategory = catIndex
      dI.initialOffset = {x: localPt.x - keyLocation.x, y: localPt.y - keyLocation.y}
      dI.currentDragPosition = localPt
      duration.current = 0
    }, [])

    const onDrag = useCallback((event: { dx: number; dy: number }) => {
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
          dataConfiguration?.storeAllCurrentColorsForAttrRole('legend')
          dataConfiguration?.swapCategoriesForAttrRole('legend', dI.indexOfCategory, newCatIndex)
          categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')
          setCategoryData()
          prevCategoryIndex.current = dI.indexOfCategory
          dI.indexOfCategory = newCatIndex
        } else {
          refreshKeys()
        }
        dI.currentDragPosition = newDragPosition
      }
    }, [dataConfiguration, setCategoryData, refreshKeys])

    const onDragEnd = useCallback(() => {
      duration.current = transitionDuration
      dragInfo.current.indexOfCategory = -1
      refreshKeys()

      dataConfiguration?.applyModelChange(() => {}, {
        undoStringKey: 'DG.Undo.graph.swapCategories',
        redoStringKey: 'DG.Redo.graph.swapCategories',
        log: logMessageWithReplacement(
              "Moved category %@ into position of %@",
              { movedCategory: categoriesRef.current?.[dragInfo.current.indexOfCategory],
                targetCategory: categoriesRef.current?.[prevCategoryIndex.current] })
      })
    }, [dataConfiguration, refreshKeys])

    const dragBehavior = useMemo(() => drag<SVGGElement, number>()
      .on("start", onDragStart)
      .on("drag", onDrag)
      .on("end", onDragEnd), [onDrag, onDragEnd, onDragStart])
    const setupKeys = useCallback(() => {
      categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')
      const numCategories = categoriesRef.current?.length
      const hasCategories = !(numCategories === 1 && categoriesRef.current?.[0] === kMain)
      if (keysElt.current && categoryData.current) {
        select(keysElt.current).selectAll('legend-key').remove() // start fresh

        if (hasCategories) {
          const keysSelection = select(keysElt.current)
            .selectAll<SVGGElement, number>('g')
            .data(range(0, numCategories ?? 0))
            .join(
              enter => enter
                .append('g')
                .attr('class', 'legend-key')
                .attr('data-testid', 'legend-key')
                .call(dragBehavior)
            )
          keysSelection.each(function () {
            const sel = select<SVGGElement, number>(this),
              size = sel.selectAll<SVGRectElement, number>('rect').size()
            if (size === 0) {
              const handleClick = (event: any, i: number) => {
                const caseIds = dataConfiguration?.getCasesForLegendValue(categoryData.current[i].category)
                if (caseIds) {
                  // This is breaking the graph-legend cypress test
                  // setOrExtendSelection(caseIds, dataConfiguration?.dataset, event.shiftKey)
                  if (event.shiftKey) dataConfiguration?.dataset?.selectCases(caseIds)
                  else dataConfiguration?.dataset?.setSelectedCases(caseIds)
                }
              }
              sel.append('rect')
                .attr('width', keySize)
                .attr('height', keySize)
                .on('click', handleClick)
              sel.append('text')
                .on('click', handleClick)
            }
          })
        }
      }
    }, [dataConfiguration, dragBehavior])

    useEffect(function respondToSelectionChange() {
      return mstReaction(
        () => dataConfiguration?.selection,
        () => {
          refreshKeys()
        }, {name: 'CategoricalLegend respondToSelectionChange'}, dataConfiguration)
    }, [refreshKeys, dataConfiguration])

    useEffect(function respondToChangeCount() {
      return mstReaction(
        () => dataConfiguration?.casesChangeCount,
        () => {
          setDesiredExtent(layerIndex, computeDesiredExtent())
          setupKeys()
          refreshKeys()
        }, {name: 'CategoricalLegend respondToChangeCount',
          equals: comparer.structural}, dataConfiguration)
    }, [setupKeys, refreshKeys, dataConfiguration, computeDesiredExtent, setDesiredExtent, layerIndex])

    useEffect(function respondToAttributeIDChange() {
      const disposer = reaction(
        () => {
          return [dataConfiguration?.attributeID('legend')]
        },
        () => {
          setDesiredExtent(layerIndex, computeDesiredExtent())
          // todo: Figure out whether this is cause extra calls to setupKeys and refreshKeys
          setupKeys()
          refreshKeys()
        }, {fireImmediately: true}
      )
      return () => disposer()
    }, [refreshKeys, computeDesiredExtent, dataConfiguration, setupKeys, setDesiredExtent, layerIndex])

    useEffect(function respondToLegendColorChange() {
      const disposer = reaction(
        () => {
          return dataConfiguration?.categorySetForAttrRole('legend')?.colorHash
        },
        () => {
          refreshKeys()
        }, {fireImmediately: true}
      )
      return () => disposer()
    }, [dataConfiguration, refreshKeys])

    useEffect(function setup() {
      if (keysElt.current && categoryData.current) {
        setupKeys()
        refreshKeys()
      }
    }, [categoryData, setupKeys, refreshKeys, dataConfiguration])

    useEffect(function cleanup() {
      return () => {
        setDesiredExtent(layerIndex, 0)
      }
    }, [setDesiredExtent, layerIndex])

    return (
      <g className='legend-categories' ref={keysElt} data-testid='legend-categories'></g>
    )
  })
CategoricalLegend.displayName = "CategoricalLegend"
