import { MutableRefObject, useCallback, useEffect, useMemo, useRef } from "react"
import { BaseType, drag, extent, select, Selection } from "d3"
import { comparer, reaction } from "mobx"
import { logMessageWithReplacement } from "../../../lib/log-message"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { mstReaction } from "../../../utilities/mst-reaction"
import { isAliveSafe } from "../../../utilities/mst-utils"
import { translate } from "../../../utilities/translation/translate"
import { isVertical } from "../../axis-graph-shared"
import { axisPlaceToAttrRole, kOther } from "../../data-display/data-display-types"
import { useDataDisplayAnimation } from "../../data-display/hooks/use-data-display-animation"
import { useDataDisplayModelContextMaybe } from "../../data-display/hooks/use-data-display-model"
import { kDefaultFontHeight } from "../axis-constants"
import { computeNiceNumericBounds, setNiceDomain } from "../axis-domain-utils"
import { AxisPlace } from "../axis-types"
import { DragInfo } from "../axis-utils"
import { AxisHelper, EmptyAxisHelper, IAxisHelperArgs } from "../helper-models/axis-helper"
import { CatObject, CategoricalAxisHelper } from "../helper-models/categorical-axis-helper"
import { DateAxisHelper } from "../helper-models/date-axis-helper"
import { NumericAxisHelper } from "../helper-models/numeric-axis-helper"
import { useAxisLayoutContext } from "../models/axis-layout-context"
import {IAxisModel} from "../models/axis-model"
import { isAnyCategoricalAxisModel, isColorAxisModel } from "../models/categorical-axis-models"
import { isAnyNumericAxisModel } from "../models/numeric-axis-models"
import { useAxisProviderContext } from "./use-axis-provider-context"

export interface IUseSubAxis {
  subAxisIndex: number
  axisPlace: AxisPlace
  subAxisEltRef: MutableRefObject<SVGGElement | null>
  showScatterPlotGridLines: boolean
  showZeroAxisLine: boolean
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
                             subAxisIndex, axisPlace, subAxisEltRef, showScatterPlotGridLines, centerCategoryLabels,
                             showZeroAxisLine
                           }: IUseSubAxis) => {
  const layout = useAxisLayoutContext(),
    displayModel = useDataDisplayModelContextMaybe(),
    dataConfig = displayModel?.dataConfiguration,
    attrId = dataConfig?.attributeID(axisPlaceToAttrRole[axisPlace]) || "",
    axisAttribute = dataConfig?.dataset?.getAttribute(attrId),
    axisAttributeType = axisAttribute?.type,
    {isAnimating, stopAnimation} = useDataDisplayAnimation(),
    axisProvider = useAxisProviderContext(),
    axisModel = axisProvider.getAxis(axisPlace),
    isCategorical = isAnyCategoricalAxisModel(axisModel),
    isColorAxis = isColorAxisModel(axisModel) || (axisModel?.type === "categorical" && axisAttributeType === "color"),
    multiScaleChangeCount = layout.getAxisMultiScale(axisModel?.place ?? 'bottom')?.changeCount ?? 0,
    dragInfo = useRef<DragInfo>({
      initialIndexOfCategory: -1,
      indexOfCategory: -1,
      catName: '',
      initialOffset: 0,
      currentOffset: 0,
      currentDragPosition: 0,
      currentDragPositionCatName: '',
      categories: [],
      bandwidth: 0,
      axisOrientation: 'horizontal',
      labelOrientation: 'horizontal',
      isOther: false
    }),
    swapInProgress = useRef(false),
    subAxisSelectionRef = useRef<Selection<SVGGElement, any, any, any>>(),
    categoriesSelectionRef = useRef<Selection<SVGGElement | BaseType, CatObject, SVGGElement, any>>(),
    categoriesRef = useRef<string[]>([]),

    getCategoryArray = useCallback(() => {
      const catArray = dataConfig?.categoryArrayForAttrRole(axisPlaceToAttrRole[axisPlace]).slice() ?? []
      if (catArray[catArray.length - 1] === kOther) {
        catArray[catArray.length - 1] = translate("DG.CellAxis.other")
      }
      return catArray
    }, [axisPlace, dataConfig]),

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
      dI.initialIndexOfCategory = dI.indexOfCategory
      dI.catName = dI.categories[dI.indexOfCategory]
      // Todo: There is a slight possibility that the category name is "OTHER" in the data and it is the last category
      // We could prevent by recording the translation of kOther as a flag to be checked here.
      dI.isOther = dI.catName === translate("DG.CellAxis.other") && dI.indexOfCategory === dI.categories.length - 1
      dI.currentOffset = 0
      dI.initialOffset = dI.currentDragPosition - (dI.indexOfCategory + 0.5) * dI.bandwidth
    }, []),

    onDrag = useCallback((event: any) => {
      const dI = dragInfo.current,
        delta = dI.axisOrientation === 'horizontal' ? event.dx : event.dy
      if (delta !== 0 && !dI.isOther) {
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
          // Get the category set dynamically to avoid confusion between provisional and actual categorySet
          const categorySet = dataConfig?.categorySetForAttrRole(axisPlaceToAttrRole[axisPlace])
          categorySet?.setDragCategory(dI.catName, newCatIndex)
          dI.currentDragPositionCatName = catToMoveBefore
          categoriesRef.current = getCategoryArray()
        } else {
          renderSubAxis()
        }
        dI.currentDragPosition = newDragPosition
      }
    }, [dataConfig, axisPlace, getCategoryArray, renderSubAxis]),

    onDragEnd = useCallback(() => {
      const dI = dragInfo.current
      const indexDidChange = dI.indexOfCategory >= 0 && dI.indexOfCategory !== dI.initialIndexOfCategory
      dI.initialIndexOfCategory = -1
      dI.indexOfCategory = -1 // so dragInfo won't influence category placement
      // Get the category set dynamically to avoid confusion between provisional and actual categorySet
      const categorySet = dataConfig?.categorySetForAttrRole(axisPlaceToAttrRole[axisPlace])
      categorySet?.setDragCategory() // reset drag category

      if (indexDidChange) {
        stopAnimation() // disable animation for final placement

        displayModel?.applyModelChange(() => {
          categorySet?.move(dI.catName, dI.currentDragPositionCatName)
        }, {
          undoStringKey: "DG.Undo.graph.swapCategories",
          redoStringKey: "DG.Redo.graph.swapCategories",
          log: logMessageWithReplacement(
                  "Moved category %@ into position of %@",
                  {movedCategory: dI.catName, targetCategory: dI.currentDragPositionCatName}, "plot")
        })
      }

      renderSubAxis()
    }, [axisPlace, dataConfig, displayModel, renderSubAxis, stopAnimation]),

    dragBehavior = useMemo(() => drag()
      .on("start", onDragStart)
      .on("drag", onDrag)
      .on("end", onDragEnd), [onDragStart, onDrag, onDragEnd]),

    /**
     * Make sure there is a group element for each category and that the text elements have drag behavior
     */
    setupCategories = useCallback(() => {
      const subAxisElt = subAxisEltRef.current,
        axisLength = layout.getAxisLength(axisPlace),
        numCategoriesLimit = Math.floor(axisLength / kDefaultFontHeight)
      dataConfig?.setNumberOfCategoriesLimitForRole(axisPlaceToAttrRole[axisPlace], numCategoriesLimit)
      const catArray = getCategoryArray()
      const categories = catArray,
        categoryData: CatObject[] = categories.map((cat, index) =>
          ({cat, index: isVertical(axisPlace) ? categories.length - index - 1 : index}))

      if (!subAxisElt) return
      subAxisSelectionRef.current = select(subAxisElt)
      const sAS = subAxisSelectionRef.current
      if (sAS.classed('numeric-axis') || sAS.classed('date-axis')) {
        sAS.selectAll('*').remove()
        sAS.classed('numeric-axis', false)
        sAS.classed('date-axis', false)
      }

      if (sAS.select('line').empty()) {
        sAS.append('line').attr('class', 'axis')
      }
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
        if (catGroup.select('.tick').empty()) {
          catGroup.append('line')
            .attr('class', 'tick')
            .attr('data-testid', 'tick')
        }
        // divider between groups
        if (catGroup.select('.divider').empty()) {
          catGroup.append('line')
            .attr('class', 'divider')
            .attr('data-testid', 'divider')
        }
        // labels
        if (catGroup.select('.category-label').empty()) {
          if (isColorAxis) {
            catGroup.append('rect')
              .attr('class', 'category-label')
              .attr('data-testid', 'color-label')
              .attr('x', 0)
              .attr('y', 0)
          } else {
            catGroup.append('text')
              .attr('class', 'category-label')
              .attr('data-testid', 'category-label')
              .attr('x', 0)
              .attr('y', 0)
          }
        }
      })

      const multiScale = layout.getAxisMultiScale(axisPlace),
        existingCategoryDomain = multiScale?.categoricalScale?.domain() ?? []
      if (JSON.stringify(categories) !== JSON.stringify(existingCategoryDomain)) {
        multiScale?.setCategoricalDomain(categories)
      }
      categoriesRef.current = catArray
    }, [axisPlace, dataConfig, dragBehavior, getCategoryArray, isColorAxis, layout, subAxisEltRef])

  // update axis helper
  useEffect(() => {
    let helper: Maybe<AxisHelper>
    let shouldRenderSubAxis = true
    const subAxisElt = subAxisEltRef.current
    if (axisModel) {
      const helperProps: IAxisHelperArgs =
        {displayModel, axisProvider, subAxisIndex, subAxisElt, axisModel, layout, isAnimating}

      switch (axisModel.type) {
        case 'empty':
          helper = new EmptyAxisHelper(helperProps)
          break
        case 'count':
        case 'percent':
        case 'numeric':
          helper = new NumericAxisHelper(
            { ...helperProps, showScatterPlotGridLines, showZeroAxisLine })
          break
        case 'categorical':
        case 'color':
          // It is necessary to call renderSubAxis in most cases, but doing so for a categorical axis causes
          // a crash on redo. So we only do it for non-categorical axes.
          shouldRenderSubAxis = false
          helper = new CategoricalAxisHelper(
            { ...helperProps, centerCategoryLabels, dragInfo,
              subAxisSelectionRef, categoriesSelectionRef, categoriesRef, swapInProgress, isColorAxis })
          break
        case 'date':
          subAxisSelectionRef.current = subAxisElt ? select(subAxisElt) : undefined
          helper = new DateAxisHelper({ ...helperProps, showScatterPlotGridLines, subAxisSelectionRef })
      }
      if (helper) {
        setAxisHelper(axisModel, subAxisIndex, helper)
        shouldRenderSubAxis && renderSubAxis()
      }
    }
  }, [axisModel, axisProvider, centerCategoryLabels, displayModel, isAnimating, isColorAxis, layout,
      renderSubAxis, showScatterPlotGridLines, showZeroAxisLine, subAxisEltRef, subAxisIndex])

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
  }, [axisModel, axisPlace, layout, renderSubAxis])

  // Install reaction to bring about rerender when layout's computedBounds changes
  useEffect(() => {
    const disposer = reaction(
      () => layout.getComputedBounds(axisPlace),
      () => {
        isCategorical && setupCategories()
        renderSubAxis()
      },
      {name: "useSubAxis [layout.getComputedBounds()"}
    )
    return () => disposer()
  }, [axisPlace, layout, isCategorical, renderSubAxis, setupCategories])

  // update d3 scale and axis when axis domain changes
  useEffect(function installDomainSync() {
    return mstAutorun(() => {
      const _axisModel = axisProvider?.getAxis?.(axisPlace)
      if (isAliveSafe(_axisModel)) {
        if (isAnyNumericAxisModel(_axisModel)) {
          const {domain} = _axisModel || {},
            multiScale = layout.getAxisMultiScale(axisPlace)
          multiScale?.setScaleType('linear')  // Make sure it's linear
          if (JSON.stringify(domain) !== JSON.stringify(multiScale?.numericScale?.domain())) {
            multiScale?.setNumericDomain(domain)
          }
          // Render regardless because otherwise only the "master" subAxis renders
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
      const disposer = mstReaction(() => {
        return (dataConfig?.categorySetForAttrRole(axisPlaceToAttrRole[axisPlace]))?.valuesArray
      }, () => {
        setupCategories()
        swapInProgress.current = true
        renderSubAxis()
        swapInProgress.current = false
      }, {name: "useSubAxis [categories]", equals: comparer.structural}, dataConfig)
      return () => disposer()
    }
  }, [renderSubAxis, isCategorical, setupCategories, dataConfig, axisPlace])

  const updateDomainAndRenderSubAxis = useCallback(() => {
    const role = axisPlaceToAttrRole[axisPlace],
      attrID = dataConfig?.attributeID(role)
    if (!attrID) {
      return // We don't have an attribute. We're a count axis, so we rely on other methods for domain updates
    }
    const domainsAreDifferent = (domain1: readonly [number, number], domain2: readonly [number, number]) => {
      return domain1[0] !== domain2[0] || domain1[1] !== domain2[1]
    }

    if (isAnyCategoricalAxisModel(axisModel)) {
      setupCategories()
      const categoryValues = categoriesRef.current,
        multiScale = layout.getAxisMultiScale(axisPlace),
        existingCategoryDomain = multiScale?.categoricalScale?.domain() ?? []
      if (JSON.stringify(categoryValues) === JSON.stringify(existingCategoryDomain)) return
      multiScale?.setCategoricalDomain(categoryValues)
      renderSubAxis()
    } else if (isAnyNumericAxisModel(axisModel)) {
      const currentAxisDomain = axisModel.domain
      const multiScale = layout.getAxisMultiScale(axisPlace)
      const allowToShrink = axisModel.allowRangeToShrink
      const numericValues = dataConfig?.numericValuesForAttrRole(role) ?? []
      const [minValue, maxValue] = extent(numericValues, d => d) as [number, number]
      const niceBounds = computeNiceNumericBounds(minValue, maxValue)
      if (!allowToShrink) {
        niceBounds.min = Math.min(niceBounds.min, currentAxisDomain[0])
        niceBounds.max = Math.max(niceBounds.max, currentAxisDomain[1])
      }
      if (domainsAreDifferent(currentAxisDomain, [niceBounds.min, niceBounds.max]) ||
        domainsAreDifferent(multiScale?.numericDomain ?? [NaN, NaN], [niceBounds.min, niceBounds.max])) {
        multiScale?.setNumericDomain([niceBounds.min, niceBounds.max])
        setNiceDomain(numericValues, axisModel)
        renderSubAxis()
      }
    }
  }, [axisModel, axisPlace, dataConfig, layout, renderSubAxis, setupCategories])

  useEffect(function respondToHiddenCasesChange() {
    if (dataConfig) {
      return mstReaction(
        () => dataConfig.caseDataHash,
        () => updateDomainAndRenderSubAxis(),
        {name: "useSubAxis.respondToHiddenCasesChange"}, [axisModel, dataConfig]
      )
    }
  }, [axisModel, dataConfig, updateDomainAndRenderSubAxis])

  useEffect(function respondToAttributeTypeChange() {
    const disposer = reaction(
      () => dataConfig?.dataset?.getAttribute(attrId)?.type, // Observe the attribute type
      () => {
        setupCategories()
        renderSubAxis()
      },
      { name: "useSubAxis [attributeTypeChange]" }
    )
    return () => disposer()
  }, [attrId, dataConfig, setupCategories, renderSubAxis])

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
    if (isCategorical) {
      setupCategories()
      renderSubAxis()
    }
  }, [isCategorical, setupCategories, renderSubAxis])

}
