import { applySnapshot, getSnapshot } from "mobx-state-tree"
import { diComponentHandler } from "../../../data-interactive/handlers/component-handler"
import { DIComponentInfo } from "../../../data-interactive/data-interactive-types"
import { appState } from "../../../models/app-state"
import { setupTestDataset, testCases } from "../../../test/dataset-test-utils"
import { toV3Id } from "../../../utilities/codap-utils"
import { isInquirySpaceMode } from "../../../utilities/url-params"
import { IBaseNumericAxisModel } from "../../axis/models/base-numeric-axis-model"
import { kGraphIdPrefix } from "../graph-defs"
import { GraphContentModel, IGraphContentModel } from "./graph-content-model"

import "../graph-registration"

jest.mock("../../../utilities/url-params", () => {
  const originalModule = jest.requireActual("../../../utilities/url-params")
  return {
    __esModule: true,
    ...originalModule,
    isInquirySpaceMode: jest.fn(),
  }
})

describe("GraphContentModel", () => {
  it("should auto-enable parent toggles in Inquiry Space mode", () => {
    (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
    const graphModel1 = GraphContentModel.create({})
    expect(graphModel1.showParentToggles).toBe(false)
    ;(isInquirySpaceMode as jest.Mock).mockReturnValue(true)
    const graphModel2 = GraphContentModel.create({})
    expect(graphModel2.showParentToggles).toBe(true)
  })

  // CODAP-1281: when cases are added to a dataset (including the initial replay on attach),
  // the addCases reaction in afterAttachToDocument used to call setNiceDomain on every numeric
  // axis, including the binned plot's primary, which widened the domain past the bin extent
  // and produced half-bin slivers at the top/bottom of the plot. The fix calls
  // respondToPlotChange for binned plots and skips setNiceDomain on the binned primary axis.
  describe("addCases reaction with binned dot plot", () => {
    it("keeps the primary axis at [minBinEdge, maxBinEdge] when cases are added", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const documentContent = appState.document.content!
      const { dataset: _dataset } = setupTestDataset({ datasetName: "binnedTestData" })
      const dataset = documentContent.createDataSet(getSnapshot(_dataset)).sharedDataSet.dataSet
      dataset.addCases(testCases, { canonicalize: true })
      dataset.validateCases()

      // Create a graph with a3 (numeric, values 1..6) on the x axis
      const result = diComponentHandler.create!(
        {}, { type: "graph", dataContext: "binnedTestData", xAttributeName: "a3" }
      )
      expect(result.success).toBe(true)
      const tile = documentContent.tileMap.get(
        toV3Id(kGraphIdPrefix, (result.values as DIComponentInfo).id!)
      )!
      const content = tile.content as IGraphContentModel

      // Let afterAttachToDocument's awaits resolve so the addCases reaction is wired up.
      await new Promise(resolve => setTimeout(resolve, 0))

      // Switch to a binned dot plot. setPlot calls respondToPlotChange, which initializes
      // bin width/alignment and sets the primary axis to [minBinEdge, maxBinEdge].
      content.setPlotType("binnedDotPlot")

      const xAxis = content.getAxis("bottom") as IBaseNumericAxisModel
      const { binDetails } = content.plot as any
      const { minBinEdge: initialMinBinEdge, maxBinEdge: initialMaxBinEdge } = binDetails()
      expect(xAxis.min).toBe(initialMinBinEdge)
      expect(xAxis.max).toBe(initialMaxBinEdge)

      // Add another case that extends the data range past the existing bins.
      dataset.addCases([{ a3: 9 }], { canonicalize: true })

      // Without the fix, setNiceDomain would have widened the domain past the new bin extent
      // (e.g., niceBounds(1, 9) ≈ [-0.5, 10.5]). With the fix, the domain tracks the bin edges
      // recomputed from the new data extent.
      const { minBinEdge: newMinBinEdge, maxBinEdge: newMaxBinEdge } = binDetails()
      expect(xAxis.min).toBe(newMinBinEdge)
      expect(xAxis.max).toBe(newMaxBinEdge)
      expect(newMaxBinEdge).toBeGreaterThanOrEqual(9)

      // Clean up
      diComponentHandler.delete!({ component: tile })
    })

    // The asymmetric behavior — extend on add/show, leave alone on remove/hide — mirrors
    // the established addCases/removeCases asymmetry. On hide the bin extent shrinks but
    // the axis stays put (so the user sees the same axis they saw before hiding); on show
    // the axis grows to keep newly-visible outliers from falling outside the plot.
    it("leaves the primary axis alone when cases are hidden (no shrink)", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const documentContent = appState.document.content!
      const { dataset: _dataset } = setupTestDataset({ datasetName: "binnedHideTestData" })
      const dataset = documentContent.createDataSet(getSnapshot(_dataset)).sharedDataSet.dataSet
      dataset.addCases(testCases, { canonicalize: true })
      dataset.validateCases()

      const result = diComponentHandler.create!(
        {}, { type: "graph", dataContext: "binnedHideTestData", xAttributeName: "a3" }
      )
      const tile = documentContent.tileMap.get(
        toV3Id(kGraphIdPrefix, (result.values as DIComponentInfo).id!)
      )!
      const content = tile.content as IGraphContentModel
      await new Promise(resolve => setTimeout(resolve, 0))
      content.setPlotType("binnedDotPlot")

      // Add an outlier; axis extends to fit it.
      dataset.addCases([{ a3: 9 }], { canonicalize: true })
      const xAxis = content.getAxis("bottom") as IBaseNumericAxisModel
      const { binDetails } = content.plot as any
      const wideMax = xAxis.max
      expect(wideMax).toBe(binDetails().maxBinEdge)
      expect(wideMax).toBeGreaterThanOrEqual(9)

      // Hide the outlier — bin extent shrinks, but the axis stays put.
      const dataConfig = content.graphPointLayerModel.dataConfiguration
      const a3 = dataset.getAttributeByName("a3")!
      const outlierCaseId = dataConfig.getCaseDataArray(0)
        .map(c => c.caseID)
        .find(id => Number(dataset.getValue(id, a3.id)) === 9)!
      dataConfig.setHiddenCases([outlierCaseId])
      // In the live app, mobx reactions flush the hiddenCases → invalidateCases →
      // filteredCases → caseDataHash chain before render. In jest, trigger the
      // invalidation explicitly so subsequent reads of binDetails see the new visible set.
      dataConfig.invalidateCases()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(binDetails().maxBinEdge).toBeLessThan(wideMax) // bins shrank
      expect(xAxis.max).toBe(wideMax)                       // but the axis didn't

      // Unhide — bins regrow to the previous extent. Axis was already wide enough,
      // so no change here.
      dataConfig.setHiddenCases([])
      dataConfig.invalidateCases()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(xAxis.max).toBe(wideMax)
      expect(binDetails().maxBinEdge).toBe(wideMax)

      diComponentHandler.delete!({ component: tile })
    })

    // The Copilot-flagged scenario: previously-hidden outliers, when shown, can extend
    // the bin extent past the current axis. Without the caseDataHash extend-only reaction,
    // the unhidden outliers would render outside the axis range.
    it("extends the primary axis when previously-hidden cases unhide past the current bin edge",
       async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const documentContent = appState.document.content!
      const { dataset: _dataset } = setupTestDataset({ datasetName: "binnedShowTestData" })
      const dataset = documentContent.createDataSet(getSnapshot(_dataset)).sharedDataSet.dataSet
      dataset.addCases(testCases, { canonicalize: true })
      dataset.addCases([{ a3: 9 }], { canonicalize: true })
      dataset.validateCases()

      const result = diComponentHandler.create!(
        {}, { type: "graph", dataContext: "binnedShowTestData", xAttributeName: "a3" }
      )
      const tile = documentContent.tileMap.get(
        toV3Id(kGraphIdPrefix, (result.values as DIComponentInfo).id!)
      )!
      const content = tile.content as IGraphContentModel
      const dataConfig = content.graphPointLayerModel.dataConfiguration
      const a3 = dataset.getAttributeByName("a3")!
      const outlierCaseId = dataConfig.getCaseDataArray(0)
        .map(c => c.caseID)
        .find(id => Number(dataset.getValue(id, a3.id)) === 9)!

      // Hide the outlier BEFORE switching to binned. setPlot's respondToPlotChange will
      // initialize the axis against the visible cases only (1..6).
      dataConfig.setHiddenCases([outlierCaseId])
      dataConfig.invalidateCases()
      await new Promise(resolve => setTimeout(resolve, 0))
      content.setPlotType("binnedDotPlot")

      const xAxis = content.getAxis("bottom") as IBaseNumericAxisModel
      const { binDetails } = content.plot as any
      const narrowMax = xAxis.max
      expect(narrowMax).toBe(binDetails().maxBinEdge)
      expect(narrowMax).toBeLessThan(9) // outlier is outside the initial axis

      // Unhide — bin extent grows past narrowMax. The axis must extend to follow.
      dataConfig.setHiddenCases([])
      dataConfig.invalidateCases()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(xAxis.max).toBe(binDetails().maxBinEdge)
      expect(xAxis.max).toBeGreaterThanOrEqual(9)

      diComponentHandler.delete!({ component: tile })
    })

    // The setGraphContext mstReaction with fireImmediately: true is the load-time repair —
    // it resets a binned plot's primary axis to [minBinEdge, maxBinEdge] when the plotType
    // changes (which happens at construction time and on snapshot rehydration). Without
    // this fix, a doc saved with a stale niced primary-axis domain would rehydrate with
    // the wrong domain. We can't easily reproduce a full document rehydration in a unit
    // test, but applySnapshot replicates the relevant mechanism: replacing the plot via
    // a snapshot bypasses setPlot's explicit respondToPlotChange call, so only the
    // mstReaction can reset the axis.
    it("resets the primary axis to bin edges when plot type rehydrates as binned via applySnapshot", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const documentContent = appState.document.content!
      const { dataset: _dataset } = setupTestDataset({ datasetName: "binnedLoadTestData" })
      const dataset = documentContent.createDataSet(getSnapshot(_dataset)).sharedDataSet.dataSet
      dataset.addCases(testCases, { canonicalize: true })
      dataset.validateCases()

      const result = diComponentHandler.create!(
        {}, { type: "graph", dataContext: "binnedLoadTestData", xAttributeName: "a3" }
      )
      const tile = documentContent.tileMap.get(
        toV3Id(kGraphIdPrefix, (result.values as DIComponentInfo).id!)
      )!
      const content = tile.content as IGraphContentModel
      await new Promise(resolve => setTimeout(resolve, 0))

      // Start with a regular dotPlot — the primary axis settles at niced bounds
      // (e.g., [0.5, 7.5]) which are wider than the bin extent (1..7) for this data.
      content.setPlotType("dotPlot")
      const dotPlotXAxis = content.getAxis("bottom") as IBaseNumericAxisModel
      const stalePlotMax = dotPlotXAxis.max // niced wider value

      // Take a snapshot, switch the plot type to binnedDotPlot in the snapshot, but
      // KEEP the dotPlot's wider niced axis. Applying this snapshot is analogous to
      // rehydrating a saved doc whose binned graph had a stale niced domain.
      const snap = getSnapshot(content) as any
      const corruptedSnap = {
        ...snap,
        plot: { type: "binnedDotPlot" } // bin width/alignment defaulted from data
      }
      applySnapshot(content, corruptedSnap)
      await new Promise(resolve => setTimeout(resolve, 0))

      // After the snapshot is applied, plotType change fires the setGraphContext
      // mstReaction, which calls respondToPlotChange — resetting the primary axis to
      // the current bin extent.
      const xAxis = content.getAxis("bottom") as IBaseNumericAxisModel
      const { binDetails } = content.plot as any
      const correctMax = binDetails().maxBinEdge
      expect(xAxis.max).toBe(correctMax)
      expect(correctMax).toBeLessThan(stalePlotMax) // confirms the axis was reset, not preserved

      diComponentHandler.delete!({ component: tile })
    })
  })
})
