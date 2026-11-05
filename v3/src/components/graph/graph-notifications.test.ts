import {
  add2ndAxisAttributeNotification, addAxisAttributeNotification, addMovableValueNotification,
  changeBackgroundColorNotification, displayOnlySelectedNotification, dragBinBoundaryNotification,
  dragMovableLineNotification, dragMovablePointNotification, dragMovableValueNotification,
  editPlotFormulaNotification, graphAttributeChangeNotification, legendAttributeChangeNotification,
  removeMovableValueNotification, repositionEquationNotification,
  setNumStdErrsNotification, showAllCasesNotification,
  toggleBackgroundTransparencyNotification, toggleMeasuresForSelectionNotification,
  toggleNumberToggleNotification, toggleShowICINotification, toggleShowOutliersNotification
} from "./graph-notifications"
import { attrChangeNotificationValues } from "./models/graph-notification-utils"

const v2Id = 77001
// V2 component-resource notifications carry the SC class name (`DG.GraphView`) in
// `values.type`; V3 adds the DI-convention name as `values.diType`.
const v2SCType = "DG.GraphView"
const diType = "graph"

jest.mock("../../models/tiles/tile-notifications", () => ({
  updateTileNotification: jest.fn((updateType: string, values: any, tileModel: any) => {
    if (!tileModel) return undefined
    return {
      message: {
        action: "notify",
        resource: "component",
        values: { operation: updateType, ...values, id: v2Id, type: v2SCType, diType }
      }
    }
  })
}))

describe("changeBackgroundColorNotification", () => {
  it("emits 'change background color' with the resulting color", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = changeBackgroundColorNotification(tile, "#ff8800")
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("change background color")
    expect(notification?.message.values.to).toBe("#ff8800")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles (e.g. calculator)", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(changeBackgroundColorNotification(calcTile, "#ff8800")).toBeUndefined()
  })

  it("returns undefined when the graph tile is missing", () => {
    expect(changeBackgroundColorNotification(undefined, "#ff8800")).toBeUndefined()
  })
})

describe("addAxisAttributeNotification", () => {
  const sampleValues: any = {
    attributeId: 4242, attributeName: "MPG", plotType: "scatterPlot",
    primaryAxis: "x", axisOrientation: "vertical"
  }

  it("emits 'add axis attribute' with the given attribute-change values", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = addAxisAttributeNotification(tile, sampleValues)
    expect(notification?.message.values.operation).toBe("add axis attribute")
    expect(notification?.message.values.attributeId).toBe(4242)
    expect(notification?.message.values.attributeName).toBe("MPG")
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("falls back to an empty payload when values are undefined", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = addAxisAttributeNotification(tile, undefined)
    expect(notification?.message.values.operation).toBe("add axis attribute")
    expect(notification?.message.values.attributeId).toBeUndefined()
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(addAxisAttributeNotification(calcTile, sampleValues)).toBeUndefined()
  })

  it("returns undefined when the graph tile is missing", () => {
    expect(addAxisAttributeNotification(undefined, sampleValues)).toBeUndefined()
  })
})

describe("add2ndAxisAttributeNotification", () => {
  const sampleValues: any = {
    attributeId: 5151, attributeName: "Horsepower", plotType: "scatterPlot",
    primaryAxis: "x", axisOrientation: "vertical"
  }

  it("emits 'add 2nd axis attribute' with the given attribute-change values", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = add2ndAxisAttributeNotification(tile, sampleValues)
    expect(notification?.message.values.operation).toBe("add 2nd axis attribute")
    expect(notification?.message.values.attributeId).toBe(5151)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(add2ndAxisAttributeNotification(calcTile, sampleValues)).toBeUndefined()
  })

  it("returns undefined when the graph tile is missing", () => {
    expect(add2ndAxisAttributeNotification(undefined, sampleValues)).toBeUndefined()
  })
})

describe("toggleNumberToggleNotification", () => {
  it("emits 'toggle NumberToggle' with the resulting enabled state", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = toggleNumberToggleNotification(tile, true)
    expect(notification?.message.values.operation).toBe("toggle NumberToggle")
    expect(notification?.message.values.to).toBe(true)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(toggleNumberToggleNotification(calcTile, true)).toBeUndefined()
  })

  it("returns undefined when the tile is missing", () => {
    expect(toggleNumberToggleNotification(undefined, false)).toBeUndefined()
  })
})

describe("toggleMeasuresForSelectionNotification", () => {
  it("emits 'toggle MeasuresForSelection' with the resulting enabled state", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = toggleMeasuresForSelectionNotification(tile, false)
    expect(notification?.message.values.operation).toBe("toggle MeasuresForSelection")
    expect(notification?.message.values.to).toBe(false)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(toggleMeasuresForSelectionNotification(calcTile, true)).toBeUndefined()
  })

  it("returns undefined when the tile is missing", () => {
    expect(toggleMeasuresForSelectionNotification(undefined, true)).toBeUndefined()
  })
})

describe("dragMovablePointNotification", () => {
  it("emits 'drag movable point' on the graph component resource", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = dragMovablePointNotification(tile)
    expect(notification?.message.values.operation).toBe("drag movable point")
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(dragMovablePointNotification(calcTile)).toBeUndefined()
  })
})

describe("dragMovableValueNotification", () => {
  it("emits the V3-clarified 'drag movable value' op (not V2's confusingly-named 'drag movable line')", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = dragMovableValueNotification(tile)
    expect(notification?.message.values.operation).toBe("drag movable value")
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(dragMovableValueNotification(calcTile)).toBeUndefined()
  })
})

describe("dragMovableLineNotification", () => {
  it("emits 'drag movable line' for scatterplot movable-line drag (fills V2 gap)", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = dragMovableLineNotification(tile)
    expect(notification?.message.values.operation).toBe("drag movable line")
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(dragMovableLineNotification(calcTile)).toBeUndefined()
  })
})

describe("showAllCasesNotification", () => {
  it("emits 'showAllCases' on the graph component resource", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = showAllCasesNotification(tile)
    expect(notification?.message.values.operation).toBe("showAllCases")
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-graph tiles (map gets its own helper in CODAP-1352)", () => {
    const mapTile = { id: "MAP1", content: { type: "Map" } } as any
    expect(showAllCasesNotification(mapTile)).toBeUndefined()
  })
})

describe("displayOnlySelectedNotification", () => {
  it("emits 'displayOnlySelected' on the graph component resource", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = displayOnlySelectedNotification(tile)
    expect(notification?.message.values.operation).toBe("displayOnlySelected")
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-graph tiles", () => {
    const mapTile = { id: "MAP1", content: { type: "Map" } } as any
    expect(displayOnlySelectedNotification(mapTile)).toBeUndefined()
  })
})

describe("editPlotFormulaNotification", () => {
  it("emits 'edit plot formula' with adornment + from + to", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = editPlotFormulaNotification(tile, "plottedValue", "mean(x)", "median(x)")
    expect(notification?.message.values.operation).toBe("edit plot formula")
    expect(notification?.message.values.adornment).toBe("plottedValue")
    expect(notification?.message.values.from).toBe("mean(x)")
    expect(notification?.message.values.to).toBe("median(x)")
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(editPlotFormulaNotification(calcTile, "plottedFunction", "", "x")).toBeUndefined()
  })
})

describe("setNumStdErrsNotification", () => {
  it("emits 'setNumStdErrs' with the new value in `to`", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = setNumStdErrsNotification(tile, 2.5)
    expect(notification?.message.values.operation).toBe("setNumStdErrs")
    expect(notification?.message.values.to).toBe(2.5)
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(setNumStdErrsNotification(calcTile, 1)).toBeUndefined()
  })
})

describe("toggleShowOutliersNotification", () => {
  it("emits 'toggle show outliers' with isChecked", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = toggleShowOutliersNotification(tile, true)
    expect(notification?.message.values.operation).toBe("toggle show outliers")
    expect(notification?.message.values.isChecked).toBe(true)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(toggleShowOutliersNotification(calcTile, true)).toBeUndefined()
  })
})

describe("toggleShowICINotification", () => {
  it("emits the V3-only `toggle show ICI` op (not V2's wrong-op `toggle show outliers`)", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = toggleShowICINotification(tile, true)
    expect(notification?.message.values.operation).toBe("toggle show ICI")
    expect(notification?.message.values.isChecked).toBe(true)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(toggleShowICINotification(calcTile, true)).toBeUndefined()
  })
})

describe("addMovableValueNotification", () => {
  it("emits 'add movable value' on the graph component resource", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = addMovableValueNotification(tile)
    expect(notification?.message.values.operation).toBe("add movable value")
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(addMovableValueNotification(calcTile)).toBeUndefined()
  })
})

describe("removeMovableValueNotification", () => {
  it("emits 'remove movable value' on the graph component resource", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = removeMovableValueNotification(tile)
    expect(notification?.message.values.operation).toBe("remove movable value")
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(removeMovableValueNotification(calcTile)).toBeUndefined()
  })
})

describe("dragBinBoundaryNotification", () => {
  it("emits 'drag bin boundary' with the resulting alignment and width", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = dragBinBoundaryNotification(tile, { alignment: 2.5, width: 7 })
    expect(notification?.message.values.operation).toBe("drag bin boundary")
    expect(notification?.message.values.alignment).toBe(2.5)
    expect(notification?.message.values.width).toBe(7)
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("omits alignment/width when undefined", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = dragBinBoundaryNotification(tile, {})
    expect(notification?.message.values.alignment).toBeUndefined()
    expect(notification?.message.values.width).toBeUndefined()
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(dragBinBoundaryNotification(calcTile, { alignment: 1, width: 1 })).toBeUndefined()
  })
})

describe("repositionEquationNotification", () => {
  it("emits 'reposition equation' with the adornment type", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = repositionEquationNotification(tile, "movableLine")
    expect(notification?.message.values.operation).toBe("reposition equation")
    expect(notification?.message.values.adornment).toBe("movableLine")
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(repositionEquationNotification(calcTile, "lsrl")).toBeUndefined()
  })
})

describe("toggleBackgroundTransparencyNotification", () => {
  it("emits 'toggle background transparency' with the resulting state", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = toggleBackgroundTransparencyNotification(tile, true)
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("toggle background transparency")
    expect(notification?.message.values.to).toBe(true)
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(toggleBackgroundTransparencyNotification(calcTile, true)).toBeUndefined()
  })

  it("returns undefined when the graph tile is missing", () => {
    expect(toggleBackgroundTransparencyNotification(undefined, false)).toBeUndefined()
  })
})

describe("graphAttributeChangeNotification", () => {
  const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
  const values = { attributeId: 12, attributeName: "Height" }
  const notice = (place: any, options: any = {}) =>
    graphAttributeChangeNotification(tile, place, values, { attrId: "ATTR12", attrName: "Height", ...options })
      ?.message.values

  it("sends V2's operation for each way of changing a graph's attributes", () => {
    const withTile = (operation: string, type = v2SCType) => ({ operation, ...values, id: v2Id, type, diType })
    // axis drops and axis-menu changes
    expect(notice("bottom")).toEqual(withTile("attributeChange"))
    expect(notice("bottom", { fromMenu: true })).toEqual(withTile("attributeChange"))
    // a legend drop (a plot-area drop on a graph with attributes arrives as one), with the display model's type
    expect(notice("legend")).toEqual(withTile("legendAttributeChange", "DG.GraphModel"))
    // a change from the legend's menu
    expect(notice("legend", { fromMenu: true })).toEqual({
      operation: "attributeChange", attributeId: 12, attributeName: "Height", axisOrientation: "none",
      id: v2Id, type: "DG.GraphView", diType
    })
    // drops on the y-axis "+" target and the Y2 axis
    expect(notice("yPlus")).toEqual(withTile("add axis attribute"))
    expect(notice("rightNumeric")).toEqual(withTile("add 2nd axis attribute"))
    // a removal from the legend's menu
    expect(notice("legend", { attrId: "", attrIdToRemove: "ATTR12" })).toEqual({
      operation: "attributeChange", attributeId: 12, attributeName: "Remove Legend: Height", axisOrientation: "none",
      id: v2Id, type: "DG.GraphView", diType
    })
    // a change from the Y2 axis's menu
    expect(notice("rightNumeric", { fromMenu: true })).toEqual(withTile("attributeChange"))
  })

  it("sends attributeChange for a removal from an axis's menu, the Y2 axis's included", () => {
    const graphTile = {
      id: "GRAPH1", content: { type: "Graph", plotType: "scatterPlot", dataConfiguration: { primaryRole: "x" } }
    } as any
    // graph.tsx passes "" as the attribute id for a removal, and the removed attribute's id separately
    const removalValues = attrChangeNotificationValues("rightNumeric", "", "Height", "ATTR12", graphTile)
    expect(graphAttributeChangeNotification(graphTile, "rightNumeric", removalValues,
      { attrId: "", attrName: "Height", attrIdToRemove: "ATTR12" })?.message.values).toEqual({
      operation: "attributeChange", attributeId: 12, attributeName: "Remove Y: Height", axisOrientation: "vertical2",
      plotType: "scatterPlot", primaryAxis: "x", id: v2Id, type: v2SCType, diType
    })
  })

  it("is a no-op for non-graph tiles", () => {
    expect(graphAttributeChangeNotification({ content: { type: "Map" } } as any, "legend", values,
      { attrId: "ATTR12" })).toBeUndefined()
    expect(legendAttributeChangeNotification(undefined, values)).toBeUndefined()
  })
})
