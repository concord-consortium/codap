import { curveLinear, line as d3Line, select } from "d3"
import { ICase } from "../../../models/data/data-set-types"
import { ID3Tip, transitionDuration } from "../data-display-types"
import { BackgroundPassThroughEvent } from "../renderer"

export interface ILineGroup {
  key: string                        // unique across all cells: `${cellKeyStr}::${groupKey}`
  plotNum: number                    // for fallback plot color
  primaryValue?: string              // parent-attribute value, for the tooltip
  caseIds: string[]                  // ordered
  coords: Array<[number, number]>    // ordered, parallel to caseIds
  firstCaseId?: string               // for legend color
  dirty: boolean                     // d needs regenerating this render
}

export interface IConnectingLinesClassify {
  parentAttrID?: string
  parentAttrName?: string
  yAttrCount: number
  cellKeys?: Array<Record<string, string>>
  isCaseInSubPlot?: (cellKey: Record<string, string>, caseData: Record<string, any>) => boolean
}

export interface IConnectingLinesStyle {
  getGroupColor: (group: ILineGroup) => string
  isCaseSelected: (caseID: string) => boolean
}

export interface IConnectingLinesHandlers {
  onClick: (event: MouseEvent, caseIds: string[]) => void
  onMouseOver: (args: { event: MouseEvent, caseIds: string[],
                        parentAttrName?: string, primaryAttrValue?: string }) => void
  onMouseOut: () => void
}

export interface IConnectingLinesRenderInput {
  svg: SVGGElement
  clientType: "graph" | "map"
  showConnectingLines: boolean
  animateChange: boolean
  caseList: Array<{ caseID: string }>  // ordered case-data-array entries (from getCaseDataArray)
  scaleSignature: string             // digest of scale + grouping inputs
  getLineForCase: (caseID: string, plotNum: number) =>
    { caseData: ICase, lineCoords: [number, number] } | undefined
  classify: IConnectingLinesClassify
  style: IConnectingLinesStyle
  handlers: IConnectingLinesHandlers
  // d3-v6-tip instance, attached to entering paths so the tooltip container exists.
  dataTip?: ID3Tip
}

type StyleInput = Pick<IConnectingLinesRenderInput, "svg" | "showConnectingLines" | "style">

export class ConnectingLines {
  private svg: SVGGElement | undefined
  private groups = new Map<string, ILineGroup>()
  private lastScaleSignature = ""
  private lastCaseCount = 0
  private lastTailCaseId: string | undefined

  render(input: IConnectingLinesRenderInput) {
    const svgChanged = input.svg !== this.svg
    this.svg = input.svg
    if (!input.showConnectingLines) {
      // Fade/remove any existing paths, then reset so the next show rebuilds from scratch.
      this.join(input, [])
      this.reset(input.svg)
      return
    }

    const sigUnchanged = input.scaleSignature === this.lastScaleSignature
    const newCases = this.detectAppend(input.caseList)
    const canIncremental = !svgChanged && sigUnchanged && newCases !== undefined

    if (canIncremental) {
      const numPlots = Math.max(input.classify.yAttrCount, 1)
      newCases.forEach(c => {
        for (let plotNum = 0; plotNum < numPlots; plotNum++) {
          this.addCase(c.caseID, plotNum, input)
        }
      })
    } else {
      this.rebuildAll(input)
    }

    this.lastScaleSignature = input.scaleSignature
    this.lastCaseCount = input.caseList.length
    this.lastTailCaseId = input.caseList[input.caseList.length - 1]?.caseID
    this.join(input, [...this.groups.values()])
    this.groups.forEach(g => { g.dirty = false })
  }

  // Returns the appended cases when caseList is the previous list plus a tail; otherwise undefined.
  // O(1): checks length growth and that the previous tail case is still at the previous last index.
  private detectAppend(caseList: Array<{ caseID: string }>): Array<{ caseID: string }> | undefined {
    const prev = this.lastCaseCount
    if (prev === 0) return undefined
    if (caseList.length <= prev) return undefined
    if (caseList[prev - 1]?.caseID !== this.lastTailCaseId) return undefined
    return caseList.slice(prev)
  }

  restyleSelection(_input: StyleInput) {
    // Implemented in Task 3.
  }

  destroy() {
    if (this.svg) {
      select(this.svg).selectAll("path.connecting-line").interrupt().remove()
    }
    this.reset(undefined)
    this.svg = undefined
  }

  // --- internals ---

  private reset(svg: SVGGElement | undefined) {
    this.groups.clear()
    this.lastScaleSignature = ""
    this.lastCaseCount = 0
    this.lastTailCaseId = undefined
    if (svg !== undefined) this.svg = svg
  }

  private rebuildAll(input: IConnectingLinesRenderInput) {
    this.groups.clear()
    const numPlots = Math.max(input.classify.yAttrCount, 1)
    input.caseList.forEach(c => {
      for (let plotNum = 0; plotNum < numPlots; plotNum++) {
        this.addCase(c.caseID, plotNum, input)
      }
    })
  }

  private addCase(caseID: string, plotNum: number, input: IConnectingLinesRenderInput) {
    const lineForCase = input.getLineForCase(caseID, plotNum)
    if (!lineForCase) return
    const { caseData, lineCoords } = lineForCase
    for (const g of this.classifyCase(caseData, plotNum, input.classify)) {
      let group = this.groups.get(g.key)
      if (!group) {
        group = { key: g.key, plotNum, primaryValue: g.primaryValue,
                  caseIds: [], coords: [], firstCaseId: caseID, dirty: true }
        this.groups.set(g.key, group)
      }
      group.caseIds.push(caseID)
      group.coords.push(lineCoords)
      group.dirty = true
    }
  }

  // Mirrors prepareConnectingLines: a case lands in each cell it belongs to (usually exactly one),
  // grouped by parent-attribute value, or by plotNum when there are multiple y-attrs within a cell.
  private classifyCase(caseData: ICase, plotNum: number, classify: IConnectingLinesClassify) {
    const { parentAttrID, yAttrCount, cellKeys, isCaseInSubPlot } = classify
    const parentValue = parentAttrID ? String(caseData[parentAttrID]) : undefined
    const cells: Array<Record<string, string> | undefined> = cellKeys ?? [undefined]
    const results: Array<{ key: string, primaryValue?: string }> = []
    for (const cellKey of cells) {
      const include = !cellKey || (isCaseInSubPlot?.(cellKey, caseData) ?? true)
      if (!include) continue
      let groupKey = parentValue ?? "0"
      if (cellKey && yAttrCount > 1) groupKey = String(plotNum)
      const cellStr = cellKey ? JSON.stringify(cellKey) : ""
      results.push({ key: `${cellStr}::${groupKey}`, primaryValue: parentValue })
    }
    return results
  }

  private allSelected(group: ILineGroup, style: IConnectingLinesStyle) {
    return group.caseIds.length > 0 && group.caseIds.every(id => style.isCaseSelected(id))
  }

  private join(input: IConnectingLinesRenderInput, data: ILineGroup[]) {
    const area = select(input.svg)
    const lineGen = d3Line().curve(curveLinear)
    // Interrupt any in-flight transitions to avoid overlapping fades during rapid updates.
    area.selectAll("path.connecting-line").interrupt()

    const sel = area.selectAll<SVGPathElement, ILineGroup>("path.connecting-line")
      .data(data, d => d.key)

    // exit
    const exit = sel.exit<ILineGroup>()
    if (input.animateChange) {
      exit.transition().duration(transitionDuration).style("opacity", 0).remove()
    } else {
      exit.remove()
    }

    // enter
    const enter = sel.enter().append("path")
      .classed("connecting-line", true)
      .classed(`interactive-${input.clientType}-element`, true)
      .attr("fill", "none")
      .attr("stroke-linejoin", "round")
      .style("cursor", "pointer")
    if (input.dataTip) enter.call(input.dataTip)

    const merged = enter.merge(sel)

    // geometry: only (re)generate d for dirty groups
    merged.filter(d => d.dirty).attr("d", d => lineGen(d.coords) ?? "")

    // style
    merged
      .attr("stroke", d => input.style.getGroupColor(d))
      .attr("stroke-width", d => this.allSelected(d, input.style) ? 4 : 2)
      .classed("selected", d => this.allSelected(d, input.style))

    // interaction (rebound each render so closures stay fresh; datum carries caseIds/primaryValue)
    merged
      .on(BackgroundPassThroughEvent.Click, (e: MouseEvent, d) => input.handlers.onClick(e, d.caseIds))
      .on(BackgroundPassThroughEvent.MouseOver, (e: MouseEvent, d) => input.handlers.onMouseOver({
        event: e, caseIds: d.caseIds,
        parentAttrName: input.classify.parentAttrName, primaryAttrValue: d.primaryValue
      }))
      .on(BackgroundPassThroughEvent.MouseOut, () => input.handlers.onMouseOut())

    // opacity / fade
    if (input.animateChange) {
      enter.style("opacity", 0)
      merged.transition().duration(transitionDuration).style("opacity", 1)
    } else {
      merged.style("opacity", 1)
    }
  }
}
