import { CaseDataWithSubPlot } from "../d3-types"
import { IPointStyle } from "./point-renderer-types"
import { caseDataKey, generatePointId, PointsState } from "./points-state"

describe("caseDataKey", () => {
  it("generates a unique key from plotNum and caseID", () => {
    expect(caseDataKey({ plotNum: 0, caseID: "case1" })).toBe("0:case1")
    expect(caseDataKey({ plotNum: 1, caseID: "case2" })).toBe("1:case2")
    expect(caseDataKey({ plotNum: 10, caseID: "abc-123" })).toBe("10:abc-123")
  })
})

describe("generatePointId", () => {
  it("generates unique incrementing point IDs", () => {
    const id1 = generatePointId()
    const id2 = generatePointId()
    const id3 = generatePointId()

    expect(id1).toMatch(/^point-\d+$/)
    expect(id2).toMatch(/^point-\d+$/)
    expect(id3).toMatch(/^point-\d+$/)

    // IDs should be unique
    expect(id1).not.toBe(id2)
    expect(id2).not.toBe(id3)
  })
})

describe("PointsState", () => {
  const defaultStyle: IPointStyle = {
    radius: 6,
    fill: "#ff0000",
    stroke: "#000000",
    strokeWidth: 1
  }

  const createCaseData = (plotNum: number, caseID: string, subPlotNum?: number): CaseDataWithSubPlot => ({
    plotNum,
    caseID,
    subPlotNum
  })

  let state: PointsState

  beforeEach(() => {
    state = new PointsState()
  })

  describe("initial state", () => {
    it("starts with no points", () => {
      expect(state.size).toBe(0)
      expect(state.getPointIds()).toEqual([])
    })

    it("starts with empty datasetID", () => {
      expect(state.getDatasetID()).toBe("")
    })
  })

  describe("setDatasetID / getDatasetID", () => {
    it("sets and gets the dataset ID", () => {
      state.setDatasetID("dataset1")
      expect(state.getDatasetID()).toBe("dataset1")

      state.setDatasetID("dataset2")
      expect(state.getDatasetID()).toBe("dataset2")
    })
  })

  describe("addPoint", () => {
    it("adds a point and returns its ID", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      expect(pointId).toMatch(/^point-\d+$/)
      expect(state.size).toBe(1)
    })

    it("initializes point with correct default values", () => {
      state.setDatasetID("ds1")
      const caseData = createCaseData(1, "case2", 3)
      const pointId = state.addPoint(caseData, defaultStyle)

      const point = state.getPoint(pointId)
      expect(point).toBeDefined()
      expect(point?.caseID).toBe("case2")
      expect(point?.plotNum).toBe(1)
      expect(point?.subPlotNum).toBe(3)
      expect(point?.datasetID).toBe("ds1")
      expect(point?.x).toBe(0)
      expect(point?.y).toBe(0)
      expect(point?.scale).toBe(1)
      expect(point?.isRaised).toBe(false)
      expect(point?.isVisible).toBe(true)
      expect(point?.style).toEqual(defaultStyle)
    })

    it("creates a copy of the style object", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      const point = state.getPoint(pointId)
      expect(point?.style).toEqual(defaultStyle)
      expect(point?.style).not.toBe(defaultStyle)
    })
  })

  describe("removePoint", () => {
    it("removes a point by ID", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)
      expect(state.size).toBe(1)

      state.removePoint(pointId)
      expect(state.size).toBe(0)
      expect(state.getPoint(pointId)).toBeUndefined()
    })

    it("removes the case data mapping", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)
      expect(state.hasPointForCaseData(caseData)).toBe(true)

      state.removePoint(pointId)
      expect(state.hasPointForCaseData(caseData)).toBe(false)
    })

    it("does nothing for non-existent point ID", () => {
      state.removePoint("non-existent")
      expect(state.size).toBe(0)
    })
  })

  describe("getPoint", () => {
    it("returns point state for valid ID", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      const point = state.getPoint(pointId)
      expect(point).toBeDefined()
      expect(point?.id).toBe(pointId)
    })

    it("returns undefined for invalid ID", () => {
      expect(state.getPoint("non-existent")).toBeUndefined()
    })
  })

  describe("getPointIdForCaseData / getPointForCaseData", () => {
    it("returns point ID for case data", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      expect(state.getPointIdForCaseData(caseData)).toBe(pointId)
    })

    it("returns point for case data", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      const point = state.getPointForCaseData(caseData)
      expect(point).toBeDefined()
      expect(point?.id).toBe(pointId)
    })

    it("returns undefined for non-existent case data", () => {
      const caseData = createCaseData(0, "nonexistent")
      expect(state.getPointIdForCaseData(caseData)).toBeUndefined()
      expect(state.getPointForCaseData(caseData)).toBeUndefined()
    })
  })

  describe("hasPointForCaseData", () => {
    it("returns true when point exists", () => {
      const caseData = createCaseData(0, "case1")
      state.addPoint(caseData, defaultStyle)

      expect(state.hasPointForCaseData(caseData)).toBe(true)
    })

    it("returns false when point does not exist", () => {
      expect(state.hasPointForCaseData(createCaseData(0, "case1"))).toBe(false)
    })
  })

  describe("updatePointPosition", () => {
    it("updates point position", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      state.updatePointPosition(pointId, 100, 200)

      const point = state.getPoint(pointId)
      expect(point?.x).toBe(100)
      expect(point?.y).toBe(200)
    })

    it("does nothing for non-existent point", () => {
      state.updatePointPosition("non-existent", 100, 200)
      expect(state.size).toBe(0)
    })
  })

  describe("updatePointScale", () => {
    it("updates point scale", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      state.updatePointScale(pointId, 2.5)

      const point = state.getPoint(pointId)
      expect(point?.scale).toBe(2.5)
    })
  })

  describe("updatePointStyle", () => {
    it("updates point style with partial update", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      state.updatePointStyle(pointId, { fill: "#00ff00" })

      const point = state.getPoint(pointId)
      expect(point?.style.fill).toBe("#00ff00")
      expect(point?.style.radius).toBe(6)
      expect(point?.style.stroke).toBe("#000000")
    })

    it("updates multiple style properties", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      state.updatePointStyle(pointId, { fill: "#00ff00", radius: 10, strokeWidth: 2 })

      const point = state.getPoint(pointId)
      expect(point?.style.fill).toBe("#00ff00")
      expect(point?.style.radius).toBe(10)
      expect(point?.style.strokeWidth).toBe(2)
    })
  })

  describe("updatePointRaised", () => {
    it("updates point raised state", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      expect(state.getPoint(pointId)?.isRaised).toBe(false)

      state.updatePointRaised(pointId, true)
      expect(state.getPoint(pointId)?.isRaised).toBe(true)

      state.updatePointRaised(pointId, false)
      expect(state.getPoint(pointId)?.isRaised).toBe(false)
    })
  })

  describe("updatePointVisibility", () => {
    it("updates point visibility", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      expect(state.getPoint(pointId)?.isVisible).toBe(true)

      state.updatePointVisibility(pointId, false)
      expect(state.getPoint(pointId)?.isVisible).toBe(false)
    })
  })

  describe("updatePointSubPlot", () => {
    it("updates point subplot number", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      state.updatePointSubPlot(pointId, 5)
      expect(state.getPoint(pointId)?.subPlotNum).toBe(5)
    })
  })

  describe("forEach", () => {
    it("iterates over all points", () => {
      const case1 = createCaseData(0, "case1")
      const case2 = createCaseData(0, "case2")
      const case3 = createCaseData(1, "case3")

      state.addPoint(case1, defaultStyle)
      state.addPoint(case2, defaultStyle)
      state.addPoint(case3, defaultStyle)

      const visited: string[] = []
      state.forEach(point => {
        visited.push(point.caseID)
      })

      expect(visited).toHaveLength(3)
      expect(visited).toContain("case1")
      expect(visited).toContain("case2")
      expect(visited).toContain("case3")
    })
  })

  describe("clear", () => {
    it("removes all points", () => {
      state.addPoint(createCaseData(0, "case1"), defaultStyle)
      state.addPoint(createCaseData(0, "case2"), defaultStyle)
      expect(state.size).toBe(2)

      state.clear()

      expect(state.size).toBe(0)
      expect(state.getPointIds()).toEqual([])
    })
  })

  describe("getPointIds", () => {
    it("returns all point IDs", () => {
      const id1 = state.addPoint(createCaseData(0, "case1"), defaultStyle)
      const id2 = state.addPoint(createCaseData(0, "case2"), defaultStyle)

      const ids = state.getPointIds()
      expect(ids).toHaveLength(2)
      expect(ids).toContain(id1)
      expect(ids).toContain(id2)
    })
  })

  describe("getMetadata", () => {
    it("returns metadata for a point", () => {
      state.setDatasetID("ds1")
      const caseData = createCaseData(2, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      // Update position to verify x/y are included
      state.updatePointPosition(pointId, 50, 100)

      const metadata = state.getMetadata(pointId)
      expect(metadata).toBeDefined()
      expect(metadata?.caseID).toBe("case1")
      expect(metadata?.plotNum).toBe(2)
      expect(metadata?.datasetID).toBe("ds1")
      expect(metadata?.style).toEqual(defaultStyle)
      expect(metadata?.x).toBe(50)
      expect(metadata?.y).toBe(100)
    })

    it("returns a copy of the style in metadata", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)

      const metadata = state.getMetadata(pointId)
      const point = state.getPoint(pointId)

      expect(metadata?.style).toEqual(point?.style)
      expect(metadata?.style).not.toBe(point?.style)
    })

    it("returns undefined for non-existent point", () => {
      expect(state.getMetadata("non-existent")).toBeUndefined()
    })
  })

  describe("getSnapshot / restoreFromSnapshot", () => {
    it("creates a snapshot of all points", () => {
      state.setDatasetID("ds1")
      const id1 = state.addPoint(createCaseData(0, "case1"), defaultStyle)
      const id2 = state.addPoint(createCaseData(1, "case2"), { ...defaultStyle, fill: "#00ff00" })

      state.updatePointPosition(id1, 10, 20)
      state.updatePointScale(id2, 1.5)

      const snapshot = state.getSnapshot()

      expect(snapshot).toHaveLength(2)
      expect(snapshot.find(p => p.id === id1)?.x).toBe(10)
      expect(snapshot.find(p => p.id === id2)?.scale).toBe(1.5)
    })

    it("creates deep copies in snapshot", () => {
      const pointId = state.addPoint(createCaseData(0, "case1"), defaultStyle)
      const snapshot = state.getSnapshot()

      const point = state.getPoint(pointId)
      expect(snapshot[0].style).toEqual(point?.style)
      expect(snapshot[0].style).not.toBe(point?.style)
    })

    it("restores state from snapshot", () => {
      state.setDatasetID("ds1")
      const id1 = state.addPoint(createCaseData(0, "case1"), defaultStyle)
      state.updatePointPosition(id1, 10, 20)
      state.updatePointRaised(id1, true)

      const snapshot = state.getSnapshot()

      // Clear and restore
      state.clear()
      expect(state.size).toBe(0)

      state.restoreFromSnapshot(snapshot)

      expect(state.size).toBe(1)
      const restoredPoint = state.getPoint(id1)
      expect(restoredPoint?.x).toBe(10)
      expect(restoredPoint?.y).toBe(20)
      expect(restoredPoint?.isRaised).toBe(true)
    })

    it("restores case data mapping from snapshot", () => {
      const caseData = createCaseData(0, "case1")
      const pointId = state.addPoint(caseData, defaultStyle)
      const snapshot = state.getSnapshot()

      state.clear()
      state.restoreFromSnapshot(snapshot)

      expect(state.getPointIdForCaseData(caseData)).toBe(pointId)
    })
  })

  describe("syncWithCaseData", () => {
    it("adds points for new case data", () => {
      const caseDataArray: CaseDataWithSubPlot[] = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]

      const { added, removed } = state.syncWithCaseData(caseDataArray, defaultStyle)

      expect(added).toHaveLength(3)
      expect(removed).toHaveLength(0)
      expect(state.size).toBe(3)
    })

    it("removes points not in case data array", () => {
      const id1 = state.addPoint(createCaseData(0, "case1"), defaultStyle)
      const id2 = state.addPoint(createCaseData(0, "case2"), defaultStyle)
      state.addPoint(createCaseData(0, "case3"), defaultStyle)

      const newCaseData: CaseDataWithSubPlot[] = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2")
      ]

      const { added, removed } = state.syncWithCaseData(newCaseData, defaultStyle)

      expect(added).toHaveLength(0)
      expect(removed).toHaveLength(1)
      expect(state.size).toBe(2)
      expect(state.getPoint(id1)).toBeDefined()
      expect(state.getPoint(id2)).toBeDefined()
    })

    it("updates subPlotNum for existing points", () => {
      const caseData = createCaseData(0, "case1", 0)
      const pointId = state.addPoint(caseData, defaultStyle)
      expect(state.getPoint(pointId)?.subPlotNum).toBe(0)

      const updatedCaseData: CaseDataWithSubPlot[] = [
        createCaseData(0, "case1", 5)
      ]

      state.syncWithCaseData(updatedCaseData, defaultStyle)

      expect(state.getPoint(pointId)?.subPlotNum).toBe(5)
    })

    it("handles mixed add and remove operations", () => {
      state.addPoint(createCaseData(0, "case1"), defaultStyle)
      state.addPoint(createCaseData(0, "case2"), defaultStyle)

      const newCaseData: CaseDataWithSubPlot[] = [
        createCaseData(0, "case2"),
        createCaseData(0, "case3"),
        createCaseData(0, "case4")
      ]

      const { added, removed } = state.syncWithCaseData(newCaseData, defaultStyle)

      expect(added).toHaveLength(2)
      expect(removed).toHaveLength(1)
      expect(state.size).toBe(3)
      expect(state.hasPointForCaseData(createCaseData(0, "case1"))).toBe(false)
      expect(state.hasPointForCaseData(createCaseData(0, "case2"))).toBe(true)
      expect(state.hasPointForCaseData(createCaseData(0, "case3"))).toBe(true)
      expect(state.hasPointForCaseData(createCaseData(0, "case4"))).toBe(true)
    })

    it("handles empty case data array", () => {
      state.addPoint(createCaseData(0, "case1"), defaultStyle)
      state.addPoint(createCaseData(0, "case2"), defaultStyle)

      const { added, removed } = state.syncWithCaseData([], defaultStyle)

      expect(added).toHaveLength(0)
      expect(removed).toHaveLength(2)
      expect(state.size).toBe(0)
    })
  })
})
