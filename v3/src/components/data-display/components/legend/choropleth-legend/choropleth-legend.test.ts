/* eslint-disable testing-library/render-result-naming-convention */
import { scaleQuantize } from "d3"
import { choroplethLegend } from "./choropleth-legend"

// jest-canvas-mock's measureText returns 0-width, which defeats the label-collision logic; mock the
// text measurer with a simple proportional width (~7px/char) so the layout decisions are testable.
jest.mock("../../../../../hooks/use-measure-text", () => ({
  measureTextExtent: (text: string) => ({ width: text.length * 7, height: 12 })
}))

const colors = ["#a", "#b", "#c", "#d", "#e"]

function renderLegend(domain: [number, number], width: number) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
  document.body.appendChild(g)
  choroplethLegend(scaleQuantize(domain, colors), g, {
    width, marginLeft: 6, marginRight: 6, marginTop: 20, ticks: 5,
    clickHandler: () => undefined, casesInBinSelectedHandler: () => false
  })
  const texts = (selector: string) =>
    Array.from(g.querySelectorAll(selector)).map(t => t.textContent)
  return {
    tickLabels: texts(".legend-axis .tick text"),
    endpointLabels: Array.from(g.querySelectorAll<SVGTextElement>(".legend-axis-label text")),
    tooltips: Array.from(g.querySelectorAll("title")).map(t => t.textContent),
    tickMarkCount: g.querySelectorAll(".legend-axis .tick line").length,
    hasAxisDomain: !!g.querySelector(".legend-axis .domain")
  }
}

describe("choroplethLegend", () => {
  it("formats threshold tick labels with enough precision for a narrow range", () => {
    // wide enough that interior ticks render
    const { tickLabels } = renderLegend([100, 110], 400)
    expect(tickLabels).toEqual(["102", "104", "106", "108"])
  })

  it("formats bin tooltips with enough precision for a narrow range", () => {
    const { tooltips } = renderLegend([100, 110], 400)
    expect(tooltips).toEqual([
      "100 - 102", "102 - 104", "104 - 106", "106 - 108", "108 - 110"
    ])
  })

  it("renders endpoint labels with an explicit fill so they are visible alongside axis ticks", () => {
    const { endpointLabels } = renderLegend([100, 110], 400)
    expect(endpointLabels.map(t => t.textContent)).toEqual(["100", "110"])
    endpointLabels.forEach(t => expect(t.getAttribute("fill")).toBe("currentColor"))
  })

  it("justifies endpoint labels to the bar edges so they stay within the legend bounds", () => {
    // marginLeft and marginRight are both 6 in renderLegend
    const { endpointLabels } = renderLegend([100, 110], 400)
    const [minLabel, maxLabel] = endpointLabels
    expect(minLabel.getAttribute("x")).toBe("6")                          // marginLeft
    expect(minLabel.style.getPropertyValue("text-anchor")).toBe("start")
    expect(maxLabel.getAttribute("x")).toBe("394")                        // width - marginRight
    expect(maxLabel.style.getPropertyValue("text-anchor")).toBe("end")
  })

  it("uses a uniform number of decimal places across all labels", () => {
    const { tickLabels, endpointLabels } = renderLegend([0, 1], 400)
    expect(tickLabels).toEqual(["0.2", "0.4", "0.6", "0.8"])
    expect(endpointLabels.map(t => t.textContent)).toEqual(["0.0", "1.0"])
  })

  it("still shows endpoint labels when the legend is too narrow for interior ticks", () => {
    const { tickLabels, endpointLabels } = renderLegend([100, 110], 60)
    expect(tickLabels).toEqual([])
    expect(endpointLabels.map(t => t.textContent)).toEqual(["100", "110"])
  })

  it("hides interior labels when they would collide with the justified endpoint labels", () => {
    // A tiny min ("1") and a wide max ("110"): at this width the interior labels fit on their own,
    // but the right-justified max endpoint would overlap the last interior label, so show endpoints
    // only. (The old heuristic gated on the min-label width and showed interior labels here.)
    const { tickLabels, endpointLabels } = renderLegend([1, 110], 150)
    expect(tickLabels).toEqual([])
    expect(endpointLabels.map(t => t.textContent)).toEqual(["1", "110"])
  })

  it("shows interior labels once there is room beside the endpoints", () => {
    const { tickLabels } = renderLegend([1, 110], 500)
    expect(tickLabels.length).toBe(4)
  })

  it("renders interior tick labels without any tick marks (matching the markless narrow case)", () => {
    const wide = renderLegend([100, 110], 400)
    expect(wide.tickLabels).toEqual(["102", "104", "106", "108"]) // interior labels kept
    expect(wide.tickMarkCount).toBe(0)                            // no tick-line marks
    expect(wide.hasAxisDomain).toBe(false)                        // no domain path / endpoint end-caps

    const narrow = renderLegend([100, 110], 60)
    expect(narrow.tickMarkCount).toBe(0)
    expect(narrow.hasAxisDomain).toBe(false)
  })
})
/* eslint-enable testing-library/render-result-naming-convention */
