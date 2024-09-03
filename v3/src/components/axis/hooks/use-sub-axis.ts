import { BaseType, drag, select, Selection } from "d3"
import { comparer, reaction } from "mobx"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { mstReaction } from "../../../utilities/mst-reaction"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { axisPlaceToAttrRole } from "../../data-display/data-display-types"
import { useDataDisplayAnimation } from "../../data-display/hooks/use-data-display-animation"
import { AxisPlace } from "../axis-types"
import { useAxisLayoutContext } from "../models/axis-layout-context"
import {
  IAxisModel,
  isBaseNumericAxisModel,
  isCategoricalAxisModel,
  isNumericAxisModel
} from "../models/axis-model"
import { isVertical } from "../../axis-graph-shared"
import { isAliveSafe } from "../../../utilities/mst-utils"
import { setNiceDomain } from "../../graph/utilities/graph-utils"
import { DragInfo } from "../axis-utils"
import { useAxisProviderContext } from "./use-axis-provider-context"
import { useDataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"
import { AxisHelper, EmptyAxisHelper } from "../helper-models/axis-helper"
import { NumericAxisHelper } from "../helper-models/numeric-axis-helper"
import { CatObject, CategoricalAxisHelper } from "../helper-models/categorical-axis-helper"
import { DateAxisHelper } from "../helper-models/date-axis-helper"
import { logMessageWithReplacement } from "../../../lib/log-message"

export interface IUseSubAxis {
  subAxisIndex: number
  axisPlace: AxisPlace
  subAxisElt: SVGGElement | null
  showScatterPlotGridLines: boolean
  centerCategoryLabels: boolean
}

// associate axis helpers with axis models
const sAxisHelpers = new WeakMap<IAxisModel, AxisHelper[]>()

function getAxisHelper(axisModel: IAxisModel, subAxisIndex: number) {
  return sAxisHelpers.get(axisModel)?.[subAxisIndex]
}

function setAxisHelper(axisModel: IAxisModel, subAxisIndex: number, axisHelper: AxisHelper) {
  let axisHelpers = sAxisHelpers.get(axisModel)
  if (axisHelpers) {
    axisHelpers[subAxisIndex] = axisHelper
  }
  else {
    axisHelpers = []
    axisHelpers[subAxisIndex] = axisHelper
    sAxisHelpers.set(axisModel, axisHelpers)
  }
}

export const useSubAxis = ({
                             subAxisIndex, axisPlace, subAxisElt, showScatterPlotGridLines, centerCategoryLabels
                           }: IUseSubAxis) => {
  const layout = useAxisLayoutContext(),
    displayModel = useDataDisplayModelContext(),
    dataConfig = displayModel.dataConfiguration,
    {isAnimating, stopAnimation} = useDataDisplayAnimation(),
    axisProvider = useAxisProviderContext(),
    axisModel = axisProvider.getAxis?.(axisPlace) as IAxisModel,
    isNumeric = isNumericAxisModel(axisModel),
    isCategorical = isCategoricalAxisModel(axisModel),
    multiScaleChangeCount = layout.getAxisMultiScale(axisModel?.place ?? 'bottom')?.changeCount ?? 0,
    savedCategorySetValuesRef = useRef<string[]>([]),
    dragInfo = useRef<DragInfo>({
      indexOfCategory: -1,
      catName: '',
      initialOffset: 0,
      currentOffset: 0,
      currentDragPosition: 0,
      currentDragPositionCatName: '',
      categories: [],
      bandwidth: 0,
      axisOrientation: 'horizontal',
      labelOrientation: 'horizontal'
    }),
    swapInProgress = useRef(false),
    subAxisSelectionRef = useRef<Selection<SVGGElement, any, any, any>>(),
    categoriesSelectionRef = useRef<Selection<SVGGElement | BaseType, CatObject, SVGGElement, any>>(),

    renderSubAxis = useCallback(() => {
      const _axisModel = axisProvider.getAxis?.(axisPlace)
      if (!isAliveSafe(_axisModel)) {
        console.warn("useSubAxis.renderSubAxis skipping rendering of defunct axis model:", axisPlace)
        return
      }
      const multiScale = layout.getAxisMultiScale(axisPlace)
      if (!multiScale) return // no scale, no axis (But this shouldn't happen)

      _axisModel && getAxisHelper(_axisModel, subAxisIndex)?.render()
    }, [axisPlace, axisProvider, layout, subAxisIndex]),

    onDragStart = useCallback((event: any) => {
      const dI = dragInfo.current
      dI.currentDragPosition = dI.axisOrientation === 'horizontal' ? event.x : event.y
      dI.indexOfCategory = dI.axisOrientation === 'horizontal'
        ? Math.floor(dI.currentDragPosition / dI.bandwidth)
        : dI.categories.length - 1 - Math.floor(dI.currentDragPosition / dI.bandwidth)
      dI.catName = dI.categories[dI.indexOfCategory]
      dI.currentOffset = 0
      dI.initialOffset = dI.currentDragPosition - (dI.indexOfCategory + 0.5) * dI.bandwidth
    }, []),

    /**
     * Note: The event actually includes 'dx' and 'dy' properties, but they are not
     * used here because there was an episode during which they didn't work reliably
     * and the current less straightforward approach was adopted. It may be worth
     * revisiting this at some point.
     */
    onDrag = useCallback((event: any) => {
      const dI = dragInfo.current,
        delta = dI.axisOrientation === 'horizontal' ? event.dx : event.dy
      if (delta !== 0) {
        const
          numCategories = dI.categories.length,
          newDragPosition = dI.currentDragPosition + delta,
          cellIndex = Math.floor(newDragPosition / dI.bandwidth),
          newCatIndex = dI.axisOrientation === 'horizontal' ? cellIndex
            : dI.categories.length - cellIndex - 1
        dI.currentOffset += delta
        if (newCatIndex >= 0 && newCatIndex !== dI.indexOfCategory && newCatIndex < dI.categories.length) {
          dI.currentOffset = newDragPosition - (cellIndex + 0.5) * dI.bandwidth - dI.initialOffset

          // Figure out the label of the category before which the dragged category should be placed
          const moveToGreater = newCatIndex > dI.indexOfCategory,
            catToMoveBefore = moveToGreater
              ? (newCatIndex === numCategories - 1 ? '' : dI.categories[newCatIndex + 1])
              : dI.categories[newCatIndex]
          dI.indexOfCategory = newCatIndex
          dI.categorySet?.move(dI.catName, catToMoveBefore)
          dI.currentDragPositionCatName = catToMoveBefore
        } else {
          renderSubAxis()
        }
        dI.currentDragPosition = newDragPosition
      }
    }, [renderSubAxis]),

    onDragEnd = useCallback(() => {
      const dI = dragInfo.current
      dI.indexOfCategory = -1 // so dragInfo won't influence category placement
      stopAnimation() // disable animation for final placement
      renderSubAxis()
      displayModel.applyModelChange(() => {},
        { undoStringKey: "DG.Undo.graph.swapCategories",
          redoStringKey: "DG.Redo.graph.swapCategories",
          log: logMessageWithReplacement(
                "Moved category %@ into position of %@",
                {movedCategory: dI.catName, targetCategory: dI.currentDragPositionCatName})
        }
      )
    }, [stopAnimation, renderSubAxis, displayModel]),

    dragBehavior = useMemo(() => drag()
      .on("start", onDragStart)
      .on("drag", onDrag)
      .on("end", onDragEnd), [onDragStart, onDrag, onDragEnd]),

    /**
     * Make sure there is a group element for each category and that the text elements have drag behavior
     */
    setupCategories = useCallback(() => {
      if (!subAxisElt) return
      const role = axisPlaceToAttrRole[axisPlace],
        categories = dataConfig?.categoryArrayForAttrRole(role) ?? [],
        categoryData: CatObject[] = categories.map((cat, index) =>
          ({cat, index: isVertical(axisPlace) ? categories.length - index - 1 : index}))

      subAxisSelectionRef.current = select(subAxisElt)
      const sAS = subAxisSelectionRef.current

      select(subAxisElt).selectAll('*').remove()  // start over

      sAS.attr('class', 'axis').append('line')
      categoriesSelectionRef.current = sAS.selectAll('g')
        .data(categoryData)
        .join(
          (enter) => {
            return enter
              .append('g')
              .attr('class', 'category-group')
              .attr('data-testid', 'category-on-axis')
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              .call(dragBehavior)
          }
        )
      categoriesSelectionRef.current.each(function () {
        const catGroup = select(this)
        // ticks
        catGroup.append('line')
          .attr('class', 'tick')
          .attr('data-testid', 'tick')
        // divider between groups
        catGroup.append('line')
          .attr('class', 'divider')
          .attr('data-testid', 'divider')
        // labels
        catGroup.append('text')
          .attr('class', 'category-label')
          .attr('data-testid', 'category-label')
          .attr('x', 0)
          .attr('y', 0)
      })

    }, [axisPlace, dataConfig, dragBehavior, subAxisElt])

  // update axis helper
  useEffect(() => {
    let helper: Maybe<AxisHelper>
    const helperProps =
      {displayModel, subAxisIndex, subAxisElt, axisModel, layout, isAnimating}
    if (axisModel) {
      switch (axisModel.type) {
        case 'empty':
          helper = new EmptyAxisHelper(helperProps)
          break
        case 'numeric':
          helper = new NumericAxisHelper(
            { ...helperProps, showScatterPlotGridLines })
          break
        case 'categorical':
          helper = new CategoricalAxisHelper(
            { ...helperProps, centerCategoryLabels, dragInfo,
              subAxisSelectionRef, categoriesSelectionRef, swapInProgress })
          break
        case 'date':
          subAxisSelectionRef.current = subAxisElt ? select(subAxisElt) : undefined
          helper = new DateAxisHelper({ ...helperProps, showScatterPlotGridLines, subAxisSelectionRef })
      }
    }
    if (helper) setAxisHelper(axisModel, subAxisIndex, helper)
  }, [axisModel, centerCategoryLabels, displayModel, isAnimating, layout,
      showScatterPlotGridLines, subAxisElt, subAxisIndex])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    const disposer = reaction(
      () => axisModel?.scale,
      (scaleType) => {
        scaleType && layout.getAxisMultiScale(axisPlace)?.setScaleType(scaleType)
        renderSubAxis()
      }, {name: "useSubAxis [scaleType]"}
    )
    return () => disposer()
  }, [axisModel, axisPlace, isNumeric, layout, renderSubAxis])

  // Install reaction to bring about rerender when layout's computedBounds changes
  useEffect(() => {
    const disposer = reaction(
      () => layout.getComputedBounds(axisPlace),
      () => renderSubAxis(),
      {name: "useSubAxis [layout.getComputedBounds()"}
    )
    return () => disposer()
  }, [axisPlace, layout, renderSubAxis])

  // update d3 scale and axis when axis domain changes
  useEffect(function installDomainSync() {
    return mstAutorun(() => {
      const _axisModel = axisProvider?.getAxis?.(axisPlace)
      if (isAliveSafe(_axisModel)) {
        if (isBaseNumericAxisModel(_axisModel)) {
          const {domain} = _axisModel || {},
            multiScale = layout.getAxisMultiScale(axisPlace)
          multiScale?.setScaleType('linear')  // Make sure it's linear
          multiScale?.setNumericDomain(domain)
          renderSubAxis()
        }
      } else if (_axisModel) {
        console.warn("useSubAxis.installDomainSync skipping sync of defunct axis model")
      }
    }, {name: "useSubAxis.installDomainSync"}, axisProvider)
  }, [axisPlace, axisProvider, layout, renderSubAxis])

  // Refresh when category set, if any, changes
  useEffect(function installCategorySetSync() {
    if (isCategorical) {
      const disposer = reaction(() => {
        const multiScale = layout.getAxisMultiScale(axisModel.place),
          categoryValues = multiScale?.categoryValues
        return Array.from(categoryValues ?? [])
      }, (values) => {
        // todo: The above reaction is detecting changes to the set of values even when they haven't changed. Why?
        if (JSON.stringify(values) !== JSON.stringify(savedCategorySetValuesRef.current)) {
          setupCategories()
          swapInProgress.current = true
          renderSubAxis()
          savedCategorySetValuesRef.current = values
          swapInProgress.current = false
        }
      }, {name: "useSubAxis [categories]"})
      return () => disposer()
    }
  }, [axisModel, renderSubAxis, layout, isCategorical, setupCategories])

  const updateDomainAndRenderSubAxis = useCallback(() => {
    const role = axisPlaceToAttrRole[axisPlace]
    if (isCategoricalAxisModel(axisModel)) {
      const categoryValues = dataConfig?.categoryArrayForAttrRole(role) ?? []
      layout.getAxisMultiScale(axisPlace)?.setCategoricalDomain(categoryValues)
      setupCategories()
    } else if (isBaseNumericAxisModel(axisModel)) {
      const numericValues = dataConfig?.numericValuesForAttrRole(role) ?? []
      layout.getAxisMultiScale(axisPlace)?.setNumericDomain(numericValues)
      isBaseNumericAxisModel(axisModel) && setNiceDomain(numericValues, axisModel)
    }
    renderSubAxis()
  }, [axisModel, axisPlace, dataConfig, layout, renderSubAxis, setupCategories])

  useEffect(function respondToSelectionChanges() {
    if (dataConfig?.dataset) {
      return mstReaction(
        () => dataConfig.displayOnlySelectedCases && dataConfig?.dataset?.selectionChanges,
        () => updateDomainAndRenderSubAxis(),
        {name: "useSubAxis.respondToSelectionChanges"}, dataConfig
      )
    }
  }, [dataConfig, updateDomainAndRenderSubAxis])

  useEffect(function respondToHiddenCasesChange() {
    if (dataConfig) {
      return mstReaction(
        () => dataConfig.hiddenCases.length,
        () => updateDomainAndRenderSubAxis(),
        {name: "useSubAxis.respondToHiddenCasesChange"}, dataConfig
      )
    }
  }, [dataConfig, updateDomainAndRenderSubAxis])

  // Render when axis length or number of sub-axes changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        return [layout.getAxisLength(axisPlace),
          layout.getAxisMultiScale(axisPlace)?.repetitions]
      },
      () => {
        renderSubAxis()
      }, {name: "useSubAxis [axisLength]", equals: comparer.structural}
    )
    return () => disposer()
  }, [axisPlace, layout, renderSubAxis])

  // update on multiScaleChangeCount change
  useEffect(() => {
    isCategorical && setupCategories()
    renderSubAxis()
  }, [renderSubAxis, multiScaleChangeCount, isCategorical, setupCategories])

  // We only need to do this for categorical axes
  useEffect(function setup() {
    if (subAxisElt && isCategorical) {
      setupCategories()
      renderSubAxis()
    }
  }, [subAxisElt, isCategorical, setupCategories, renderSubAxis])

}
