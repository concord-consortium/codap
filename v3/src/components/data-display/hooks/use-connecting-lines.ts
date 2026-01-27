import { curveLinear, line, select } from "d3"
import { tip as d3tip } from "d3-v6-tip"
import { useCallback } from "react"
import { selectCases, setSelectedCases } from "../../../models/data/data-set-utils"
import { t } from "../../../utilities/translation/translate"
import { IConnectingLineDescription, transitionDuration } from "../data-display-types"
import { PixiBackgroundPassThroughEvent, PixiPoints } from "../pixi/pixi-points"
import { useDataConfigurationContext } from "./use-data-configuration-context"

interface IMouseOverProps {
  caseIDs: string[]
  event: MouseEvent
  parentAttrName?: string
  primaryAttrValue?: string
}

interface IDrawLines {
  allLineCaseIds: Record<string, string[]>
  getLegendColor?: (caseID: string) => string | undefined
  lineGroups: Record<string, IConnectingLineDescription[]>
  parentAttrID?: string
  parentAttrName?: string
  pointColorAtIndex: (index: number) => string
  showConnectingLines: boolean
}

interface IPrepareLineProps {
  cellKey?: Record<string, string>
  connectingLines: IConnectingLineDescription[]
  getLegendColor?: (caseID: string) => string | undefined
  parentAttrID?: string
  parentAttrName?: string
  pointColorAtIndex: (index: number) => string
  showConnectingLines: boolean
}

interface IProps {
  clientType: "graph" | "map"
  connectingLinesActivatedRef: React.MutableRefObject<boolean>
  connectingLinesSvg: SVGGElement | null
  pixiPoints?: PixiPoints
  yAttrCount?: number
  isCaseInSubPlot?: (cellKey: Record<string, string>, caseData: Record<string, any>) => void
  onConnectingLinesClick?: (event: MouseEvent) => void
}

export const useConnectingLines = (props: IProps) => {
  const {
    clientType, connectingLinesSvg, connectingLinesActivatedRef, pixiPoints, yAttrCount = 0,
    isCaseInSubPlot, onConnectingLinesClick
  } = props
  const dataConfig = useDataConfigurationContext()
  const dataset = dataConfig?.dataset
  const connectingLinesArea = select(connectingLinesSvg)

  const dataTip = d3tip().attr("class", `${clientType}-d3-tip`)
    .attr("data-testid", `${clientType}-connecting-lines-data-tip`)
    .html((d: string) => {
      return `<p>${d}</p>`
    })

  const handleConnectingLinesClick = useCallback((event: MouseEvent, caseIDs: string[]) => {
    onConnectingLinesClick?.(event)

    const linesPath = event.target && select(event.target as HTMLElement)
    if (linesPath) {
      const areLineCasesSelected = caseIDs.every(caseID => dataset?.isCaseSelected(caseID))
      if (areLineCasesSelected || event.shiftKey) {
        selectCases(caseIDs, dataset, !areLineCasesSelected)
      } else {
        setSelectedCases(caseIDs, dataset)
      }
    }
  }, [dataset, onConnectingLinesClick])

  const handleConnectingLinesMouseOver = useCallback((mouseOverProps: IMouseOverProps) => {
    const { caseIDs, event, parentAttrName, primaryAttrValue } = mouseOverProps
    if (pixiPoints?.canvas) pixiPoints.canvas.style.cursor = "pointer"
    // TODO: In V2, the tool tip is only shown when there is a parent attribute. V3 should always show the tool tip,
    // but the text needs to be different when there is no parent attribute. We'll need to work out how to handle the
    // localization for this. When a parent attribute is present, the tool tip should look like:
    //   <category attribute name>: <category>
    //   with <number of points> points (<collection name>) on this line
    // And when a parent attribute is not present, the tool tip should look like:
    //   <number of points> points (<collection name>) on this line
    if (!parentAttrName || !primaryAttrValue) return // For now, do nothing if these are undefined
    const caseIdCount = caseIDs?.length ?? 0
    const datasetName = dataset?.name ?? ""
    const vars = [parentAttrName, primaryAttrValue, caseIdCount, datasetName]
    const dataTipContent = t("DG.DataTip.connectingLine", {vars})
    dataTip.show(dataTipContent, event.target)
  }, [dataTip, dataset?.name, pixiPoints])

  const handleConnectingLinesMouseOut = useCallback(() => {
    if (pixiPoints?.canvas) pixiPoints.canvas.style.cursor = ""
    dataTip.hide()
  }, [dataTip, pixiPoints])

  const drawConnectingLines = useCallback((drawLinesProps: IDrawLines) => {
    if (!connectingLinesSvg) return

    const { allLineCaseIds, getLegendColor, lineGroups, parentAttrName, pointColorAtIndex,
            showConnectingLines } = drawLinesProps
    const curve = line().curve(curveLinear)
    // For each group of lines, draw a path using the lines' coordinates
    for (const [_linesIndex, [primaryAttrValue, cases]] of Object.entries(lineGroups).entries()) {
      const allLineCoords = cases.map((l: IConnectingLineDescription) => l.lineCoords)
      const lineCaseIds = allLineCaseIds[primaryAttrValue]
      const allCasesSelected = lineCaseIds?.every((caseID: string) => dataset?.isCaseSelected(caseID))
      // Use legend color if available (based on first case in the group), otherwise fall back to plot color
      const firstCaseId = cases[0]?.caseData?.__id__
      const legendColor = firstCaseId ? getLegendColor?.(firstCaseId) : undefined
      const color = legendColor ?? pointColorAtIndex(cases[0].plotNum || 0)

      connectingLinesArea
        .append("path")
        .data([allLineCoords])
        .attr("d", (d: any) => curve(d))
        .classed(`interactive-${clientType}-element`, true) // for dots canvas event passing
        .classed("selected", allCasesSelected)
        .on(PixiBackgroundPassThroughEvent.Click, (e) => handleConnectingLinesClick(e, lineCaseIds))
        .on(PixiBackgroundPassThroughEvent.MouseOver, (e) =>
          handleConnectingLinesMouseOver({ event: e, caseIDs: lineCaseIds, parentAttrName, primaryAttrValue })
        )
        .on(PixiBackgroundPassThroughEvent.MouseOut, handleConnectingLinesMouseOut)
        .call(dataTip)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", allCasesSelected ? 4 : 2)
        .attr("stroke-linejoin", "round")
        .style("cursor", "pointer")
        .style("opacity", connectingLinesActivatedRef.current ? 1 : 0)
        .transition()
        .duration(transitionDuration)
        .style("opacity", showConnectingLines ? 1 : 0)
        .on("end", () => {
          connectingLinesActivatedRef.current = showConnectingLines
          !showConnectingLines && connectingLinesArea.selectAll("path").remove()
        })
    }
  }, [clientType, connectingLinesActivatedRef, connectingLinesArea, connectingLinesSvg,
      dataTip, dataset, handleConnectingLinesClick, handleConnectingLinesMouseOut, handleConnectingLinesMouseOver])

  const prepareConnectingLines = useCallback((prepareLineProps: IPrepareLineProps) => {
    const { connectingLines, parentAttrID, cellKey, parentAttrName, showConnectingLines } = prepareLineProps
    if (!dataConfig) return

    // In a graph, each plot can have multiple groups of connecting lines. The number of groups is determined by the
    // number of Y attributes or the presence of a parent attribute and the number of unique values for that attribute.
    // If there are multiple Y attributes, the number of groups matches the number of Y attributes. Otherwise, if
    // there's a parent attribute, the number of groups matches the number of unique values for that attribute. If
    // there's only one Y attribute and no parent attribute, then there's only a single group. The code below builds
    // lists of connecting lines and case IDs for each group.
    const lineGroups: Record<string, IConnectingLineDescription[]> = {}
    const allLineCaseIds: Record<string, string[]> = {}

    connectingLines.forEach((lineDescription: IConnectingLineDescription) => {
      const parentAttrValue = parentAttrID ? String(lineDescription.caseData[parentAttrID]) : undefined
      // Set default groupKey for both graph and map, then adjust as needed for graph cases with multiple Y attributes
      let groupKey: string | number | undefined = parentAttrValue ? parentAttrValue : 0
      if (cellKey && yAttrCount > 1) {
        groupKey = lineDescription.plotNum
      }
      if (groupKey === undefined && groupKey !== 0) return

      // Include the line if there is no cellKey specified (we're not connecting points on a graph), or if the line is
      // in the graph's sub plot that corresponds to the specified cellKey.
      const includeLine = !cellKey || isCaseInSubPlot?.(cellKey, lineDescription.caseData)
      if (includeLine) {
        lineGroups[groupKey] ||= []
        allLineCaseIds[groupKey] ||= []
        lineGroups[groupKey].push(lineDescription)
        allLineCaseIds[groupKey].push(lineDescription.caseData.__id__)
      }
    })

    return { allLineCaseIds, lineGroups, parentAttrID, parentAttrName, showConnectingLines }
  }, [dataConfig, isCaseInSubPlot, yAttrCount])

  const renderConnectingLines = useCallback((renderLineProps: IPrepareLineProps) => {
    const { getLegendColor, pointColorAtIndex } = renderLineProps
    const lineData = prepareConnectingLines(renderLineProps)
    lineData && drawConnectingLines({...lineData, getLegendColor, pointColorAtIndex})
  }, [drawConnectingLines, prepareConnectingLines])

  return { renderConnectingLines }
}
