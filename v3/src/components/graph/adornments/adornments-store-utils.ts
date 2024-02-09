import {getAdornmentContentInfo, getAdornmentTypes, IAdornmentContentInfo} from "./adornment-content-info"
import {getAdornmentComponentInfo, IAdornmentComponentInfo} from "./adornment-component-info"
import {PlotTypes} from "./adornment-types"
import {IMeasure, measures, RulerStateKey} from "./adornment-ui-types"
import {kMovableLineType} from "./movable-line/movable-line-adornment-types"
import {kLSRLType} from "./lsrl/lsrl-adornment-types"
import {IAdornmentsBaseStore} from "./adornments-base-store"

export interface IMeasureMenuItem {
  checked: boolean
  componentContentInfo?: IAdornmentContentInfo
  componentInfo?: IAdornmentComponentInfo
  disabled?: boolean
  title: string
  type: string
  clickHandler?: () => void
}

export function isMeasureMenuItem(item: IMeasureMenuItem | IGroupItem): item is IMeasureMenuItem {
  return item.type !== 'Group'
}

export interface IGroupItem {
  title: string
  type: string
  rulerStateKey: RulerStateKey | undefined
  menuItems: IMeasureMenuItem[]
}

export function isGroupItem(item: IMeasureMenuItem | IGroupItem): item is IGroupItem {
  return item.type === 'Group'
}

export type MeasureMenuItemArray = Array<IMeasureMenuItem | IGroupItem>

export function getAdornmentsMenuItemsFromTheStore(theStore:IAdornmentsBaseStore, plotType: PlotTypes) {

  function constructMeasureItem(measure: IMeasure): IMeasureMenuItem {
    return {
      title: measure.title,
      type: measure.type,
      checked: theStore.isShowingAdornment(measure.type),
      componentInfo: getAdornmentComponentInfo(measure.type),
      componentContentInfo: getAdornmentContentInfo(measure.type),
    }
  }

  function constructGroupItem(group: IMeasure): IGroupItem {
    return {
      title: group.title,
      type: group.type,
      rulerStateKey: group.rulerStateKey,
      menuItems: group.items?.map(constructMeasureItem) || []
    }
  }

  // Add the Show Measure Labels option checkbox immediately before the first group item. Note that group
  // items only appear in the univariate plot's ruler.
  // Since the Show Measure Labels option isn't for activating an adornment, but rather for
  // modifying the behavior of other adornments, it doesn't have an associated registeredAdornment. So we need
  //  to add it like this.
  function guaranteeShowMeasureLabels(measureOrGroup: IMeasure, alreadyAdded: boolean) {
    if (measureOrGroup.type === "Group" && !alreadyAdded) {
      measureMenuItems.push({
        checked: theStore.showMeasureLabels,
        title: "DG.Inspector.showLabels",
        type: "control",
        clickHandler: theStore.toggleShowLabels
      })
      return true
    }
    return alreadyAdded
  }

  // Add the Connecting Lines checkbox immediately after the Count/Percent checkbox(es). That setting will be used
  // by the ScatterDots component to determine whether to show connecting lines.
  function guaranteeAddedConnectingLinesIfScatterplot(thePlotType: PlotTypes, measureOrGroup: IMeasure,
                                                      alreadyAdded: boolean) {
    const registeredAdornment = registeredAdornments.find(a => a.type === measureOrGroup.type)
    if (plotType === "scatterPlot" && registeredAdornment?.type === "Count" && !alreadyAdded) {
      measureMenuItems.push({
        checked: theStore.showConnectingLines,
        title: "DG.Inspector.graphConnectingLine",
        type: "control",
        clickHandler: theStore.toggleShowConnectingLines
      })
    }
    return true // The Connecting Lines checkbox was either already added or just added
  }

  // Add the Intercept Locked option checkbox immediately after the LSRL checkbox. Since the Intercept Locked
  // option isn't for activating an adornment, but rather for modifying the behavior of other adornments, it
  // doesn't have an associated registeredAdornment. So we need to add it like this.
  function guaranteeAddedLockInterceptIfScatterplot(thePlotType: PlotTypes, measureOrGroup: IMeasure,
                                                      alreadyAdded: boolean) {
    if (
      registeredAdornments.find(a => a.type === measureOrGroup.type)?.type === "LSRL" &&
      plotType === "scatterPlot" && !alreadyAdded
    ) {
      const movableLineVisible = theStore.isShowingAdornment(kMovableLineType)
      const lsrlVisible = theStore.isShowingAdornment(kLSRLType)
      const disabled = !movableLineVisible && !lsrlVisible
      measureMenuItems.push({
        checked: theStore.interceptLocked,
        disabled,
        title: "DG.Inspector.graphInterceptLocked",
        type: "control",
        clickHandler: theStore.toggleInterceptLocked
      })
    }
    return true // The Connecting Lines checkbox was either already added or just added
  }

  // The sum of squares of residuals is only shown for scatter plots, and only when the LSRL or Movable Line is
  function addSumOfSquaresIfAppropriate(thePlotType: PlotTypes) {
    if (plotType === "scatterPlot") {
      const movableLineVisible = !!theStore.adornments.find(a => a.type === "Movable Line")?.isVisible
      const lsrlVisible = !!theStore.adornments.find(a => a.type === "LSRL")?.isVisible
      const disabled = !movableLineVisible && !lsrlVisible
      measureMenuItems.push({
        checked: theStore.showSquaresOfResiduals,
        disabled,
        title: "DG.Inspector.graphSquares",
        type: "control",
        clickHandler: theStore.toggleShowSquaresOfResiduals
      })
    }
  }

  const registeredAdornments = getAdornmentTypes()
  const measureMenuItems: MeasureMenuItemArray = []
  let addedConnectingLines = false
  let addedInterceptLocked = false
  let addedShowMeasureLabels = false
  measures[plotType].map((measureOrGroup: IMeasure) => {
    const {type} = measureOrGroup

    addedShowMeasureLabels = guaranteeShowMeasureLabels(measureOrGroup, addedShowMeasureLabels)

    if (type === 'Group') {
      measureMenuItems.push(constructGroupItem(measureOrGroup))
    } else {
      measureMenuItems.push(constructMeasureItem(measureOrGroup))
    }

    addedConnectingLines = guaranteeAddedConnectingLinesIfScatterplot(plotType, measureOrGroup, addedConnectingLines)

    addedInterceptLocked = guaranteeAddedLockInterceptIfScatterplot(plotType, measureOrGroup, addedInterceptLocked)
  })

  addSumOfSquaresIfAppropriate(plotType)

  return measureMenuItems
}
