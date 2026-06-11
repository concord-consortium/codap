/* eslint-disable testing-library/render-result-naming-convention */
import { scaleQuantile, scaleQuantize, scaleThreshold } from "d3"
import { choroplethLegend } from "./choropleth-legend"

// jest-canvas-mock's measureText returns 0-width, which defeats the label-collision logic; mock the
// text measurer with a simple proportional width (~7px/char) so the layout decisions are testable.
jest.mock("../../../../../hooks/use-measure-text", () => ({
  measureTextExtent: (text: string) => ({ width: text.length * 7, height: 12 })
}))

const colors = ["#a", "#b", "#c", "#d", "#e"]

function renderLegend(domain: [number, number], width: number, useGrouping = false) {
  // The <g> stays detached: d3 renders into it and we read it via querySelectorAll, neither of which
  // needs it in the document (measureTextExtent is mocked), so nothing leaks into document.body.
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
  choroplethLegend(scaleQuantize(domain, colors), g, {
    width, marginLeft: 6, marginRight: 6, marginTop: 20, ticks: 5, useGrouping,
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
    // Every bin (including the first and last) is shown as a plain [low - high] range. Out-of-range
    // values are now treated as missing rather than clamped into the end bins (CODAP-1409), so the
    // end bins cover only [min, t1] and [t_last, max].
    const { tooltips } = renderLegend([100, 110], 400)
    expect(tooltips).toEqual([
      "100 - 102", "102 - 104", "104 - 106", "106 - 108", "108 - 110"
    ])
  })

  it("shows the first and last bin tooltips as plain ranges bounded by the legend min/max", () => {
    const { tooltips } = renderLegend([0, 10], 400)
    expect(tooltips[0]).toBe("0 - 2")
    expect(tooltips[tooltips.length - 1]).toBe("8 - 10")
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

  it("groups thousands in all labels when grouping is enabled (e.g. large quantities)", () => {
    const { tickLabels, endpointLabels, tooltips } = renderLegend([0, 10000], 500, true)
    expect(tickLabels).toEqual(["2,000", "4,000", "6,000", "8,000"])
    expect(endpointLabels.map(t => t.textContent)).toEqual(["0", "10,000"])
    expect(tooltips[tooltips.length - 1]).toBe("8,000 - 10,000") // plain range, grouped
  })

  it("suppresses thousands grouping for year-like values when grouping is disabled", () => {
    // Years are typed numeric (not date), so isDate is false; the caller disables grouping via the
    // attribute's year-type inference so "1996" does not render as "1,996".
    const { tickLabels, endpointLabels } = renderLegend([1990, 2020], 500, false)
    expect(tickLabels).toEqual(["1996", "2002", "2008", "2014"])
    expect(endpointLabels.map(t => t.textContent)).toEqual(["1990", "2020"])
  })

  it("uses the provided legend min/max for endpoint labels instead of the scale-domain extent", () => {
    // A quantile scale's domain is its training samples, whose extent (101.1..107.2) differs from the
    // user-set legend range (101..108). The endpoints should reflect the provided range, not the data
    // extent, so the legend matches the Min/Max inputs (CODAP-1292).
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    const scale = scaleQuantile([101.1, 103, 105, 107.2], colors)
    choroplethLegend(scale, g, {
      width: 400, marginLeft: 6, marginRight: 6, marginTop: 20, ticks: 5,
      legendMin: 101, legendMax: 108,
      clickHandler: () => undefined, casesInBinSelectedHandler: () => false
    })
    const endpoints = Array.from(g.querySelectorAll<SVGTextElement>(".legend-axis-label text"))
      .map(t => parseFloat(t.textContent ?? ""))
    expect(endpoints).toEqual([101, 108])
  })

  it("formats logarithmic legend labels with uniform significant figures", () => {
    // A scaleThreshold with log-spaced (equal-ratio) boundaries is the logarithmic legend's scale.
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    // range [100, 10000], 4 bins -> 3 equal-ratio thresholds (~316, 1000, ~3162)
    const logMin = 100, logMax = 10000, n = 4
    const thresholds = Array.from({ length: n - 1 }, (_, i) => logMin * Math.pow(logMax / logMin, (i + 1) / n))
    const scale = scaleThreshold<number, string>().domain(thresholds).range(colors.slice(0, n))
    choroplethLegend(scale, g, {
      width: 600, marginLeft: 6, marginRight: 6, marginTop: 20, ticks: 5,
      legendMin: logMin, legendMax: logMax, logarithmic: true,
      clickHandler: () => undefined, casesInBinSelectedHandler: () => false
    })
    const tickLabels = Array.from(g.querySelectorAll(".legend-axis .tick text")).map(t => t.textContent)
    const endpoints = Array.from(g.querySelectorAll<SVGTextElement>(".legend-axis-label text"))
      .map(t => t.textContent)
    // 1 sig fig already distinguishes every boundary; labels round to uniform significant figures
    // ("300", "3000") rather than the decimal-place rounding a linear legend would use ("316", "3162").
    expect(tickLabels).toEqual(["300", "1000", "3000"])
    expect(endpoints).toEqual(["100", "10000"])
  })

  it("shows logarithmic bin tooltips as plain ranges bounded by the log domain", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    const logMin = 100, logMax = 10000, n = 4
    const thresholds = Array.from({ length: n - 1 }, (_, i) => logMin * Math.pow(logMax / logMin, (i + 1) / n))
    const scale = scaleThreshold<number, string>().domain(thresholds).range(colors.slice(0, n))
    choroplethLegend(scale, g, {
      width: 600, marginLeft: 6, marginRight: 6, marginTop: 20, ticks: 5,
      legendMin: logMin, legendMax: logMax, logarithmic: true,
      clickHandler: () => undefined, casesInBinSelectedHandler: () => false
    })
    const tooltips = Array.from(g.querySelectorAll("title")).map(t => t.textContent)
    // Out-of-domain values (including <= 0) are missing, so the end bins are plain ranges bounded by
    // the positive log domain.
    expect(tooltips[0]).toBe("100 - 300")
    expect(tooltips[tooltips.length - 1]).toBe("3000 - 10000")
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

  it("labels degenerate bins from per-bin data extents", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    // three single-value bins {1}{2}{3}: thresholds at the group mins [2, 3]
    const scale = scaleThreshold<number, string>().domain([2, 3]).range(colors.slice(0, 3))
    choroplethLegend(scale, g, {
      width: 400, marginLeft: 6, marginRight: 6, marginTop: 20, ticks: 5,
      legendMin: 1, legendMax: 3,
      binDataExtents: [{ min: 1, max: 1 }, { min: 2, max: 2 }, { min: 3, max: 3 }],
      clickHandler: () => undefined, casesInBinSelectedHandler: () => false
    })
    const tooltips = Array.from(g.querySelectorAll("title")).map(t => t.textContent)
    // single-value bins read as a bare value, not a "1 - 1" range
    expect(tooltips).toEqual(["1", "2", "3"])
  })

  it("uses the bin index (not color lookup) so duplicate colors map to the right bin", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    // all bins share one color (lowColor === highColor); indexOf(color) would return 0 for every rect
    const scale = scaleThreshold<number, string>().domain([2, 3]).range(["#x", "#x", "#x"])
    choroplethLegend(scale, g, {
      width: 400, marginLeft: 6, marginRight: 6, marginTop: 20, ticks: 5,
      legendMin: 1, legendMax: 3,
      binDataExtents: [{ min: 1, max: 1 }, { min: 2, max: 2 }, { min: 3, max: 3 }],
      clickHandler: () => undefined, casesInBinSelectedHandler: () => false
    })
    const tooltips = Array.from(g.querySelectorAll("title")).map(t => t.textContent)
    expect(tooltips).toEqual(["1", "2", "3"]) // not ["1", "1", "1"]
  })

  it("labels a multi-value degenerate bin as a range", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    // {1}{2,3}{4,5}: thresholds at [2, 4]
    const scale = scaleThreshold<number, string>().domain([2, 4]).range(colors.slice(0, 3))
    choroplethLegend(scale, g, {
      width: 400, marginLeft: 6, marginRight: 6, marginTop: 20, ticks: 5,
      legendMin: 1, legendMax: 5,
      binDataExtents: [{ min: 1, max: 1 }, { min: 2, max: 3 }, { min: 4, max: 5 }],
      clickHandler: () => undefined, casesInBinSelectedHandler: () => false
    })
    const tooltips = Array.from(g.querySelectorAll("title")).map(t => t.textContent)
    expect(tooltips).toEqual(["1", "2 - 3", "4 - 5"])
  })
})
/* eslint-enable testing-library/render-result-naming-convention */
