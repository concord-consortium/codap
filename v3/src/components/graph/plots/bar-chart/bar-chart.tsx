import { useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { numericSortComparator } from "../../../../utilities/data-utils"
import { t } from "../../../../utilities/translation/translate"
import { useTileModelContext } from "../../../../hooks/use-tile-model-context"
import { tileNotification } from "../../../../models/tiles/tile-notifications"
import { EditFormulaModal } from "../../../common/edit-formula-modal"
import { kMain } from "../../../data-display/data-display-types"
import { circleAnchor } from "../../../data-display/pixi/pixi-points"
import { IBarCover, IPlotProps } from "../../graphing-types"
import { useChartDots } from "../../hooks/use-chart-dots"
import { useGraphLayoutContext } from "../../hooks/use-graph-layout-context"
import { usePlotResponders } from "../../hooks/use-plot"
import { setPointCoordinates } from "../../utilities/graph-utils"
import { barCompressionFactorForCase, barCoverDimensions, renderBarCovers } from "../bar-utils"
import { isBarChartModel } from "./bar-chart-model"

export const BarChart = observer(function BarChart({ abovePointsGroupRef, pixiPoints }: IPlotProps) {
  const { dataset, graphModel, isAnimating, layout, primaryScreenCoord, secondaryScreenCoord,
          refreshPointSelection, subPlotCells } = useChartDots(pixiPoints)
  const graphLayout = useGraphLayoutContext()
  const { tile } = useTileModelContext()
  const barChartModel = graphModel.plot
  const barCoversRef = useRef<SVGGElement>(null)
  const [, setModalIsOpen] = useState(false)
  const { onClose } = useDisclosure()

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (!isBarChartModel(barChartModel)) return
    const {
      dataConfig, primaryAttrRole, primaryCellWidth, primaryCellHeight, primaryIsBottom,
      primarySplitAttrRole, secondarySplitAttrRole, secondaryNumericUnitLength } = subPlotCells
    const { catMap, numPointsInRow } = graphModel.cellParams(primaryCellWidth, primaryCellHeight)
    const cellIndices = graphModel.mapOfIndicesByCase(catMap, numPointsInRow)
    const {pointColor, pointStrokeColor} = graphModel.pointDescription
    const pointRadius = graphModel.getPointRadius()
    const legendAttrID = dataConfig?.attributeID('legend')
    const getLegendColor = legendAttrID ? dataConfig?.getLegendColorForCase : undefined
    const pointDisplayType = "bars"
    const isFormulaDriven = barChartModel.breakdownType === "formula"

    const getPrimaryScreenCoord = (anID: string) => primaryScreenCoord({cellIndices, numPointsInRow}, anID)
    const getSecondaryScreenCoord = (anID: string) => secondaryScreenCoord({cellIndices}, anID)
    const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
    const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord

    const getWidth = (anID:string) => {
      return primaryIsBottom
        ? primaryCellWidth / 2
        : Math.abs(secondaryNumericUnitLength * barCompressionFactorForCase(anID, graphModel))
    }
    const getHeight = (anID:string) => {
      return primaryIsBottom
        ? Math.abs(secondaryNumericUnitLength * barCompressionFactorForCase(anID, graphModel))
        : primaryCellWidth / 2
    }

    const adjustCoverForBar = (cover:IBarCover) => {
      // When there is a formula we have to compute the length of the bar using that formula. And we have to
      // adjust the position coordinate depending on whether the formula value is positive or negative.
      if (!isFormulaDriven || !isBarChartModel(barChartModel) || !dataConfig) return cover

      const barSpec = barChartModel.getBarSpec(dataConfig.graphCellKeyFromCaseID(cover.caseIDs[0]))
      const value = barSpec?.value ?? 0
      const numericScale = graphLayout.getNumericScale(primaryIsBottom ? 'left' : 'bottom')
      const zeroCoord = numericScale?.(0) ?? 0
      const valueCoord = numericScale?.(value) ?? 0
      if (primaryIsBottom) {
        cover.y = `${value > 0 ? valueCoord : zeroCoord}`
        cover.height = `${Math.abs(zeroCoord - valueCoord)}`
      }
      else {
        cover.x = `${value > 0 ? zeroCoord : valueCoord}`
        cover.width = `${Math.abs(zeroCoord - valueCoord)}`
      }
      return cover
    }

    // build and render bar cover elements that will handle click events for the fused points
    if (dataConfig && abovePointsGroupRef?.current) {
      const barCovers: IBarCover[] = []
      const bins = dataConfig?.cellMap(primarySplitAttrRole, secondarySplitAttrRole) ?? {}
      const primCatsArray = primaryAttrRole
        ? Array.from(dataConfig.categoryArrayForAttrRole(primaryAttrRole))
        : []
      const primCatsCount = primCatsArray.length
      const legendCats = dataConfig.categorySetForAttrRole("legend")?.values ?? []
      Object.entries(catMap).forEach(([primeCat, secCats]) => {
        Object.entries(secCats).forEach(([secCat, primSplitCats]) => {
          Object.entries(primSplitCats).forEach(([primeSplitCat, secSplitCats]) => {
            Object.entries(secSplitCats).forEach(([secSplitCat, cellData]) => {
              const secCatKey = secCat === kMain ? "" : secCat
              const exPrimeCatKey = primeSplitCat === kMain ? "" : primeSplitCat
              const exSecCatKey = secSplitCat === kMain ? "" : secSplitCat
              if (legendAttrID && legendCats?.length > 0 && !isFormulaDriven) {
                let minInCell = 0

                // Create a map of cases grouped by legend value, so we don't need to filter all cases per value when
                // creating the bar covers.
                const caseGroups = new Map()
                dataConfig.getCaseDataArray(0).forEach(aCase => {
                  const legendValue = dataset?.getStrValue(aCase.caseID, legendAttrID)
                  const primaryValue = dataset?.getStrValue(aCase.caseID, dataConfig.attributeID(primaryAttrRole))
                  const primarySplitValue =
                    dataset?.getStrValue(aCase.caseID, dataConfig.attributeID(primarySplitAttrRole))
                  const secondarySplitValue =
                    dataset?.getStrValue(aCase.caseID, dataConfig.attributeID(secondarySplitAttrRole))
                  const caseGroupKey =
                    `${legendValue}-${primaryValue}-${primarySplitValue}-${secondarySplitValue}`
                  if (!caseGroups.has(caseGroupKey)) {
                    caseGroups.set(caseGroupKey, [])
                  }
                  caseGroups.get(caseGroupKey).push(aCase)
                })

                // If the legend attribute is numeric, sort legendCats in descending order making sure to handle any NaN
                // values for cases that don't have a numeric value for the legend attribute.
                if (dataConfig.attributeType("legend") === "numeric") {
                  legendCats.sort((cat1: string, cat2: string) => {
                    return numericSortComparator({a: Number(cat1), b: Number(cat2), order: "desc"})
                  })
                }
                const cellMap = dataConfig.cellMap(primarySplitAttrRole, secondarySplitAttrRole)

                // For each legend value, create a bar cover
                legendCats.forEach((legendCat: string) => {
                  const matchingCases =
                    caseGroups.get(`${legendCat}-${primeCat}-${exPrimeCatKey}-${exSecCatKey}`) ?? []
                  const maxInCell = minInCell + matchingCases.length
                  if (maxInCell !== minInCell) {
                    const numInBar = cellMap[primeSplitCat]?.[secSplitCat]?.[primeCat]?.[secCat] ?? 1
                    const { x, y, barWidth, barHeight } = barCoverDimensions({
                      subPlotCells, cellIndices: cellData.cell, layout, primCatsCount, maxInCell, minInCell,
                      denominator: numInBar, isPercentAxis: graphModel.secondaryAxisIsPercent
                    })
                    const caseIDs = dataConfig.getCasesForCategoryValues(
                      primaryAttrRole, primeCat, secCat, primeSplitCat, secSplitCat, legendCat
                    )
                    barCovers.push({
                      caseIDs,
                      class: `bar-cover ${primeCat} ${secCatKey} ${exPrimeCatKey} ${exSecCatKey} ${legendCat}`,
                      primeCat, secCat, primeSplitCat, secSplitCat, legendCat,
                      x: x.toString(), y: y.toString(),
                      width: barWidth.toString(), height: barHeight.toString()
                    })
                  }
                  minInCell = maxInCell
                })
              } else {
                const maxInCell = bins[primeSplitCat]?.[secSplitCat]?.[primeCat]?.[secCat] ?? 0
                const { x, y, barWidth, barHeight } = barCoverDimensions({
                  subPlotCells, cellIndices: cellData.cell, layout, primCatsCount, maxInCell,
                  denominator: dataConfig.numCasesInSubPlotGivenCategories(primeSplitCat, secSplitCat),
                  isPercentAxis: graphModel.secondaryAxisIsPercent
                })
                const caseIDs = dataConfig.getCasesForCategoryValues(
                  primaryAttrRole, primeCat, secCat, primeSplitCat, secSplitCat
                )
                barCovers.push(adjustCoverForBar({
                  caseIDs,
                  class: `bar-cover ${primeCat} ${secCatKey} ${exPrimeCatKey} ${exSecCatKey}`,
                  primeCat, secCat, primeSplitCat, secSplitCat,
                  x: x.toString(), y: y.toString(),
                  width: barWidth.toString(), height: barHeight.toString()
                }))
              }
            })
          })
        })
      })
      renderBarCovers({ barCovers, barCoversRef, graphModel, primaryAttrRole })
    }

    const anchor = circleAnchor
    setPointCoordinates({
      anchor, dataset, pointRadius, selectedPointRadius: graphModel.getPointRadius('select'),
      pixiPoints, selectedOnly, pointColor, pointStrokeColor, pointDisplayType,
      getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating, getWidth, getHeight,
      pointsFusedIntoBars: graphModel?.pointsFusedIntoBars
    })
  }, [abovePointsGroupRef, barChartModel, dataset, graphLayout, graphModel, isAnimating, layout,
    pixiPoints, primaryScreenCoord, secondaryScreenCoord, subPlotCells])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})

  useEffect(() => {
    if (pixiPoints) {
      pixiPoints.pointsFusedIntoBars = graphModel.pointsFusedIntoBars
    }
  }, [pixiPoints, graphModel.pointsFusedIntoBars])

  if (!isBarChartModel(barChartModel))  return null

  const handleModalOpen = (open: boolean) => {
    setModalIsOpen(open)
  }

  const handleCloseModal = () => {
    onClose()
    handleModalOpen(false)
    barChartModel.setFormulaEditorIsOpen(false)
  }

  const handleEditExpressionClose = (newExpression: string) => {
    handleCloseModal()
    const expression = barChartModel.formula?.display ?? ""
    const notification = tile && tileNotification("change formula", {}, tile)
    if (newExpression !== expression) {
      barChartModel.applyModelChange(
        () => barChartModel.setExpression(newExpression),
        {
          undoStringKey: "DG.Undo.graph.showAsComputedBarChart",
          redoStringKey: "DG.Redo.graph.showAsComputedBarChart",
          log: logStringifiedObjectMessage("Change computed bar length function: %@",
            {from: expression, to: newExpression}),
          notify: notification
        }
      )
    }
    else if (barChartModel.breakdownType !== "formula") {
      barChartModel.applyModelChange(
        () => barChartModel.setBreakdownType("formula"),
        {
          undoStringKey: "DG.Undo.graph.showAsComputedBarChart",
          redoStringKey: "DG.Redo.graph.showAsComputedBarChart",
          log: 'Change bar chart to computed by pre-existing formula',
          notify: notification
        }
      )
    }
  }

  return (
    <>
      {abovePointsGroupRef?.current && createPortal(
        <g ref={barCoversRef}/>,
        abovePointsGroupRef.current
      )}
      {barChartModel.formulaEditorIsOpen &&
         <EditFormulaModal
            applyFormula={handleEditExpressionClose}
            formulaPrompt={t("DG.BarChartFunction.formulaPrompt")}
            isOpen={barChartModel.formulaEditorIsOpen}
            onClose={handleCloseModal}
            titleLabel={t("DG.BarChartFunction.namePrompt")}
            value={barChartModel.formula?.display}
         />
      }
    </>
  )
})
