import { ScaleBand, ScaleLinear } from "d3"
import { IGraphDataConfigurationModel } from "../models/graph-data-configuration-model"
import { GraphLayout } from "../models/graph-layout"
import { ILineDescription, ISquareOfResidual } from "../adornments/shared-adornment-types"
import { IConnectingLineDescription } from "../../data-display/data-display-types"
import { dataDisplayGetNumericValue } from "../../data-display/data-display-value-utils"

export function scatterPlotFuncs(layout: GraphLayout, dataConfiguration?: IGraphDataConfigurationModel) {
  const { dataset: data, yAttributeIDs: yAttrIDs = [], hasY2Attribute, numberOfPlots = 1 } = dataConfiguration || {}
  const numExtraPrimaryBands = dataConfiguration?.numRepetitionsForPlace('bottom') ?? 1
  const numExtraSecondaryBands = dataConfiguration?.numRepetitionsForPlace('left') ?? 1
  const topSplitID = dataConfiguration?.attributeID("topSplit") ?? ""
  const rightSplitID = dataConfiguration?.attributeID("rightSplit") ?? ""
  const xAttrID = dataConfiguration?.attributeID("x") ?? ""
  const xScale = layout.getAxisScale("bottom") as ScaleLinear<number, number>
  const y1Scale = layout.getAxisScale("left") as ScaleLinear<number, number>
  const y2Scale = hasY2Attribute ? layout.getAxisScale("rightNumeric") as ScaleLinear<number, number> : undefined
  const rightScale = layout.getAxisScale('rightCat') as ScaleBand<string> | undefined
  const topScale = layout.getAxisScale('top') as ScaleBand<string> | undefined

  function getXCoord(caseID: string) {
    const xValue = dataDisplayGetNumericValue(data, caseID, xAttrID) ?? NaN
    const topValue = data?.getStrValue(caseID, topSplitID) ?? ''
    const topCoord = (topValue && topScale?.(topValue)) || 0
    return xScale(xValue) / numExtraPrimaryBands + topCoord
  }

  function getYCoord(caseID: string, plotNum = 0) {
    const yAttrID = yAttrIDs[plotNum]
    const yValue = dataDisplayGetNumericValue(data, caseID, yAttrID) ?? NaN
    const yScale = y2Scale && plotNum === numberOfPlots - 1 ? y2Scale : y1Scale
    const rightValue = data?.getStrValue(caseID, rightSplitID) ?? ''
    const rightCoord = ((rightValue && rightScale?.(rightValue)) || 0)
    return yScale(yValue) / numExtraSecondaryBands + rightCoord
  }

  function getCaseCoords(caseID: string, plotNum = 0) {
    const xValue = dataDisplayGetNumericValue(data, caseID, xAttrID) ?? NaN
    const yAttrID = yAttrIDs[plotNum]
    const yValue = dataDisplayGetNumericValue(data, caseID, yAttrID) ?? NaN
    const rightValue = data?.getStrValue(caseID, rightSplitID) ?? ""
    const rightCoord = (rightValue && rightScale?.(rightValue)) || 0
    const xCoord = getXCoord(caseID)
    const yCoord = getYCoord(caseID, plotNum)
    const color = dataConfiguration?.getLegendColorForCase(caseID)
    return { xValue, yValue, xCoord, yCoord, rightCoord, color }
  }

  function connectingLine(caseID: string, plotNum: number) {
    const dataset = dataConfiguration?.dataset
    const xValue = getXCoord(caseID)
    const yValue = getYCoord(caseID, plotNum)
    if (isFinite(xValue) && isFinite(yValue)) {
      const caseData = dataset?.getItem(caseID, { numeric: false })
      if (caseData) {
        const lineCoords: [number, number] = [xValue, yValue]
        return { caseData, lineCoords, plotNum }
      }
    }
  }

  function connectingLinesForCases() {
    const lineDescriptions: IConnectingLineDescription[] = []
    const dataset = dataConfiguration?.dataset
    dataset?.items.forEach(c => {
      yAttrIDs.forEach((_yAttrID, plotNum) => {
        const line = connectingLine(c.__id__, plotNum)
        line && lineDescriptions.push(line)
      })
    })
    return lineDescriptions
  }

  function residualSquare(slope: number, intercept: number, caseID: string, plotNum = 0): ISquareOfResidual {
    const { xValue, xCoord, yCoord, rightCoord, color } = getCaseCoords(caseID)
    const yScale = y2Scale && plotNum === numberOfPlots - 1 ? y2Scale : y1Scale
    const lineYCoord = yScale(slope * xValue + intercept) / numExtraSecondaryBands + rightCoord
    const residualCoord = yCoord - lineYCoord
    const lineXCoord = xCoord + residualCoord
    const x = Math.min(xCoord, lineXCoord)
    const y = Math.min(yCoord, lineYCoord)
    const side = Math.abs(residualCoord)
    return { caseID, color, side, x, y }
  }

  function residualSquaresForLines(lineDescriptions: ILineDescription[]) {
    const squares: ISquareOfResidual[] = []
    const dataset = dataConfiguration?.dataset
    lineDescriptions.forEach((lineDescription: ILineDescription) => {
      const { category, cellKey, intercept, slope } = lineDescription
      dataset?.items.forEach(caseData => {
        const legendID = dataConfiguration?.attributeID("legend")
        const legendType = dataConfiguration?.attributeType("legend")
        const legendValue = caseData.__id__ && legendID ? dataset?.getStrValue(caseData.__id__, legendID) : null
        // If the line has a category and it does not match the categorical legend value,
        // do not render squares.
        if (category && legendValue !== category && legendType === "categorical") return
        const fullCaseData = dataset?.getItem(caseData.__id__, { numeric: false })
        if (fullCaseData && dataConfiguration?.isCaseInSubPlot(cellKey, fullCaseData)) {
          const square = residualSquare(slope, intercept, caseData.__id__)
          if (!isFinite(square.x) || !isFinite(square.y)) return
          squares.push(square)
        }
      })
    })
    return squares
  }

  return { getXCoord, getYCoord, getCaseCoords, residualSquare, residualSquaresForLines, connectingLinesForCases }
}
