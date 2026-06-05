import { scaleLinear } from "d3"
import { act, renderHook } from "@testing-library/react"
import { DataSet, IDataSet, toCanonical } from "../../../models/data/data-set"
import { IPoint, IPointMetadata } from "../../data-display/renderer"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { useDataDisplayAnimation } from "../../data-display/hooks/use-data-display-animation"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"
import { useDotPlotDragDrop } from "./use-dot-plot-drag-drop"

jest.mock("../../../hooks/use-data-set-context")
jest.mock("../../data-display/hooks/use-data-display-animation")
jest.mock("./use-graph-data-configuration-context")
jest.mock("./use-graph-layout-context")
// Selection is supplied through the mocked data configuration, so stub the click handler
// to avoid the renderer registry it would otherwise consult.
jest.mock("../../data-display/data-display-utils", () => ({
  handleClickOnCase: jest.fn()
}))

const mockUseDataSetContext = useDataSetContext as jest.Mock
const mockUseDataDisplayAnimation = useDataDisplayAnimation as jest.Mock
const mockUseGraphDataConfig = useGraphDataConfigurationContext as jest.Mock
const mockUseGraphLayout = useGraphLayoutContext as jest.Mock

// A pointer event only needs the fields the hook reads.
const pointerEvent = (clientX: number) =>
  ({ clientX, clientY: 0, shiftKey: false }) as unknown as PointerEvent

// Simulate a full start -> drag -> end gesture on the primary (x) axis.
function dragRoundTrip(dataset: IDataSet, attrID: string, selection: string[], dragCaseID: string) {
  mockUseDataSetContext.mockReturnValue(dataset)
  mockUseDataDisplayAnimation.mockReturnValue({ startAnimation: jest.fn(), stopAnimation: jest.fn() })
  mockUseGraphDataConfig.mockReturnValue({
    primaryRole: "x",
    attributeID: () => attrID,
    numRepetitionsForPlace: () => 1,
    selection
  })
  mockUseGraphLayout.mockReturnValue({
    getAxisScale: () => scaleLinear().domain([0, 100]).range([0, 200])
  })

  const { result } = renderHook(() => useDotPlotDragDrop())
  const point = {} as IPoint
  const metadata = { caseID: dragCaseID } as IPointMetadata
  act(() => result.current.onDragStart(pointerEvent(50), point, metadata))
  act(() => result.current.onDrag(pointerEvent(120)))
  act(() => result.current.onDragEnd(pointerEvent(120), point, metadata))
}

describe("useDotPlotDragDrop", () => {
  it("preserves a date attribute's inferred type and value after a drag round-trip (CODAP-1388)", () => {
    const dataset = DataSet.create({})
    dataset.addAttribute({ id: "wId", name: "when" })
    dataset.addCases(toCanonical(dataset, [
      { __id__: "c1", when: "2020-01-01" },
      { __id__: "c2", when: "2021-06-15" },
      { __id__: "c3", when: "2022-12-31" }
    ]))
    expect(dataset.getAttribute("wId")!.type).toBe("date")

    dragRoundTrip(dataset, "wId", ["c1"], "c1")

    // Restoring the original *string* keeps the attribute a date (a numeric restore
    // would serialize epoch-seconds and flip the inferred type to categorical).
    expect(dataset.getAttribute("wId")!.type).toBe("date")
    expect(dataset.getStrValue("c1", "wId")).toBe("2020-01-01")
  })

  it("restores every selected case when multiple points are dragged", () => {
    const dataset = DataSet.create({})
    dataset.addAttribute({ id: "wId", name: "when" })
    dataset.addCases(toCanonical(dataset, [
      { __id__: "c1", when: "2020-01-01" },
      { __id__: "c2", when: "2021-06-15" },
      { __id__: "c3", when: "2022-12-31" }
    ]))

    dragRoundTrip(dataset, "wId", ["c1", "c2", "c3"], "c1")

    expect(dataset.getAttribute("wId")!.type).toBe("date")
    expect(dataset.getStrValue("c1", "wId")).toBe("2020-01-01")
    expect(dataset.getStrValue("c2", "wId")).toBe("2021-06-15")
    expect(dataset.getStrValue("c3", "wId")).toBe("2022-12-31")
  })

  it("restores a numeric attribute's value unchanged after a drag round-trip", () => {
    const dataset = DataSet.create({})
    dataset.addAttribute({ id: "xId", name: "x" })
    dataset.addCases(toCanonical(dataset, [
      { __id__: "c1", x: 10 },
      { __id__: "c2", x: 20 },
      { __id__: "c3", x: 30 }
    ]))
    expect(dataset.getAttribute("xId")!.type).toBe("numeric")

    dragRoundTrip(dataset, "xId", ["c1"], "c1")

    expect(dataset.getAttribute("xId")!.type).toBe("numeric")
    expect(dataset.getStrValue("c1", "xId")).toBe("10")
  })
})
