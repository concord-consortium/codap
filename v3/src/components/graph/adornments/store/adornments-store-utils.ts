import { logMessageWithReplacement } from "../../../../lib/log-message"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { updateTileNotification } from "../../../../models/tiles/tile-notifications"
import { PlotType } from "../../graphing-types"
import { getAdornmentComponentInfo, IAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo, IAdornmentContentInfo } from "../adornment-content-info"
import { getMeasuresForPlot, IMeasure, RulerStateKey } from "../adornment-ui-types"
import { kCountType } from "../count/count-adornment-types"
import { kLSRLType } from "../lsrl/lsrl-adornment-types"
import { kMovableLineType } from "../movable-line/movable-line-adornment-types"
import { kPlottedFunctionType } from "../plotted-function/plotted-function-adornment-types"
import { IAdornmentsBaseStore } from "./adornments-base-store"

export interface IMeasureMenuItem {
  checked: boolean
  componentContentInfo?: IAdornmentContentInfo
  componentInfo?: IAdornmentComponentInfo
  disabled?: boolean
  title: string
  type: string
  clickHandler?: () => void
}

export interface IGroupItem {
  title: string
  type: string
  rulerStateKey: RulerStateKey | undefined
  menuItems: IMeasureMenuItem[]
}

export type MeasureMenuItemArray = Array<IMeasureMenuItem | IGroupItem>

function updateGraphAdornmentNotification(updateType: string, isChecked: boolean, tileModel: ITileModel) {
  if (!tileModel) return

  return updateTileNotification(updateType, { isChecked }, tileModel)
}

export function isGroupItem(item: IMeasureMenuItem | IGroupItem): item is IGroupItem {
  return item.type === 'Group'
}

export function isMeasureMenuItem(item: IMeasureMenuItem | IGroupItem): item is IMeasureMenuItem {
  return item.type !== 'Group'
}

export function getAdornmentsMenuItemsFromTheStore(theStore: IAdornmentsBaseStore,
                                                   tile: ITileModel | undefined, plotType: PlotType,
                                                   useGaussianOptions: boolean) {
  const measureMenuItems: MeasureMenuItemArray = []

  function constructMeasureItem(measure: IMeasure): IMeasureMenuItem {
    const isGaussianFit = measure.title === "DG.Inspector.graphPlottedNormal" && useGaussianOptions,
      measureTitle = isGaussianFit ? "DG.Inspector.graphPlottedGaussianFit" : measure.title

    return {
      title: measureTitle,
      type: measure.type,
      checked: theStore.isShowingAdornment(measure.type),
      componentInfo: getAdornmentComponentInfo(measure.type),
      componentContentInfo: getAdornmentContentInfo(measure.type),
    }
  }

  function constructGroupItem(group: IMeasure): IGroupItem {
    const groupTitle = (group.title === "DG.Inspector.graphBoxPlotNormalCurveOptions" && useGaussianOptions)
      ? "DG.Inspector.graphBoxPlotGaussianFitOptions"
      : group.title
    return {
      title: groupTitle,
      type: group.type,
      rulerStateKey: group.rulerStateKey,
      menuItems: group.items?.map(constructMeasureItem) || []
    }
  }

  const addItemIfCondition = (condition: boolean, itemDetails: IMeasureMenuItem) => {
    if (condition && !measureMenuItems.some(item => item.title === itemDetails.title)) {
      measureMenuItems.push(itemDetails)
    }
  }

  // Populate the menu list from the items in `measures`. In addition to the adornments in `measures`, we separately add
  // items that either augment/adjust other adornments' behavior (e.g. Show Measure Labels, Intercept Locked), or need
  // special handling outside the realm of adornments (e.g. Connecting Lines, Squares of Residuals).
  getMeasuresForPlot(plotType).map((measureOrGroup: IMeasure) => {
    // const tileModel = displayModel && getTileModel(displayModel)

    // Add the Show Measure Labels option checkbox immediately before the first group item. Note that group items only
    // appear in the univariate plot's ruler.
    addItemIfCondition(measureOrGroup.type === "Group", {
      checked: theStore.showMeasureLabels,
      title: "DG.Inspector.showLabels",
      type: "control",
      clickHandler: () => {
        theStore.applyModelChange(() => {
          theStore.toggleShowLabels()
        }, {
          notify: tile
            ? updateGraphAdornmentNotification("toggle showing labels",
              (theStore.showMeasureLabels), tile)
            : undefined,
          undoStringKey: theStore.showMeasureLabels ? "DG.Undo.graph.hideMeasureLabels"
            : "DG.Undo.graph.showMeasureLabels",
          redoStringKey: theStore.showMeasureLabels ? "DG.Redo.graph.hideMeasureLabels"
            : "DG.Redo.graph.showMeasureLabels",
          log: logMessageWithReplacement("%@ measure labels",
            {action: theStore.showMeasureLabels ? "Hide" : "Show"}, "plot")
        })
      }
    })

    // Add the adornment or group item from `measures` to the menu.
    if (measureOrGroup.type === "Group") {
      measureMenuItems.push(constructGroupItem(measureOrGroup))
    } else {
      measureMenuItems.push(constructMeasureItem(measureOrGroup))
    }

    // Add the Connecting Lines checkbox immediately after the Count/Percent checkbox(es). This setting will be used
    // by the ScatterDots component to determine whether to show connecting lines.
    if (plotType === "scatterPlot" && measureOrGroup.type === kCountType) {
      addItemIfCondition(true, {
        checked: theStore.showConnectingLines,
        title: "DG.Inspector.graphConnectingLine",
        type: "control",
        clickHandler: () => {
          theStore.applyModelChange(() => {
            theStore.toggleShowConnectingLines()
          }, {
            notify: tile
              ? updateGraphAdornmentNotification("toggle show connecting lines",
                (theStore.showConnectingLines), tile)
              : undefined,
            undoStringKey: theStore.showConnectingLines ? "DG.Undo.graph.hideConnectingLine"
              : "DG.Undo.graph.showConnectingLine",
            redoStringKey: theStore.showConnectingLines ? "DG.Redo.graph.hideConnectingLine"
              : "DG.Redo.graph.showConnectingLine",
            log: logMessageWithReplacement("%@ connecting lines",
              {action: theStore.showConnectingLines ? "Hide" : "Show"}, "plot")
          })
        }
      })
    }

    // Add the Intercept Locked option checkbox immediately after the LSRL checkbox. When present, this option will
    // only be enabled if either the Movable Line or LSRL is visible.
    if (plotType === "scatterPlot" && measureOrGroup.type === kLSRLType) {
      const movableLineVisible = theStore.isShowingAdornment(kMovableLineType)
      const lsrlVisible = theStore.isShowingAdornment(kLSRLType)
      addItemIfCondition(true, {
        checked: theStore.interceptLocked,
        disabled: !movableLineVisible && !lsrlVisible,
        title: "DG.Inspector.graphInterceptLocked",
        type: "control",
        clickHandler: () => {
          theStore.applyModelChange(() => {
            theStore.toggleInterceptLocked()
          }, {
            notify: tile
              ? updateGraphAdornmentNotification("toggle intercept locked",
                (theStore.interceptLocked), tile)
              : undefined,
            undoStringKey: theStore.interceptLocked ? "DG.Undo.graph.unlockIntercept"
              : "DG.Undo.graph.lockIntercept",
            redoStringKey: theStore.interceptLocked ? "DG.Redo.graph.unlockIntercept"
              : "DG.Redo.graph.lockIntercept",
            log: logMessageWithReplacement("%@ line intercept",
              {action: theStore.interceptLocked ? "Unlock" : "Lock"}, "plot")
          })
        }
      })
    }
  })

  // The Squares of Residuals option is only shown for scatter plots, and will be the last item in the menu. This
  // setting will be used by the ScatterDots component to determine whether to show the squares of residuals. When
  // present, it will only be enabled if either the Movable Line or LSRL is visible.
  if (plotType === "scatterPlot") {
    const movableLineVisible = theStore.isShowingAdornment(kMovableLineType)
    const lsrlVisible = theStore.isShowingAdornment(kLSRLType)
    const plottedFunctionVisible = theStore.isShowingAdornment(kPlottedFunctionType)
    addItemIfCondition(true, {
      checked: theStore.showSquaresOfResiduals,
      disabled: !movableLineVisible && !lsrlVisible && !plottedFunctionVisible,
      title: "DG.Inspector.graphSquares",
      type: "control",
      clickHandler: () => {
        theStore.applyModelChange(() => {
          theStore.toggleShowSquaresOfResiduals()
        }, {
          notify: tile
            ? updateGraphAdornmentNotification("toggle showSquares",
              (theStore.showSquaresOfResiduals), tile)
            : undefined,
          undoStringKey: theStore.showSquaresOfResiduals ? "DG.Undo.graph.hideSquares"
            : "DG.Undo.graph.showSquares",
          redoStringKey: theStore.showSquaresOfResiduals ? "DG.Redo.graph.hideSquares"
            : "DG.Redo.graph.showSquares",
          log: logMessageWithReplacement("%@ squares of residuals",
            {action: theStore.showSquaresOfResiduals ? "Hide" : "Show"}, "plot")
        })
      }
    })
  }

  return measureMenuItems
}
