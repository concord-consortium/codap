import { when } from "mobx"
import { applySnapshot, getSnapshot, Instance } from "mobx-state-tree"
import { diComponentHandler } from "../../../data-interactive/handlers/component-handler"
import { DIComponentInfo } from "../../../data-interactive/data-interactive-types"
import { appState } from "../../../models/app-state"
import { TreeManager } from "../../../models/history/tree-manager"
import { setupTestDataset, testCases } from "../../../test/dataset-test-utils"
import { toV3Id } from "../../../utilities/codap-utils"
import { isInquirySpaceMode } from "../../../utilities/url-params"
import { IBaseNumericAxisModel } from "../../axis/models/base-numeric-axis-model"
import { MovableLineAdornmentModel } from "../adornments/movable-line/movable-line-adornment-model"
import { kMovableLineType } from "../adornments/movable-line/movable-line-adornment-types"
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

  // These tests write values via setComputedCaseValues (the attribute-formula path) and rely on the
  // casesChangeCount reaction to rescale — they don't call rescaleNumericAxesForValueChange directly.
  describe("rescale on value change", () => {
    // Builds a scatter graph over testCases (a3 on x, a4 on first y) plus an extra numeric attribute
    // "yr" (values 11..16) that callers can assign to a role via extraValues (e.g. y2AttributeName).
    const createGraph = async (datasetName: string, extraValues: Record<string, any> = {}) => {
      const documentContent = appState.document.content!
      const { dataset: _dataset } = setupTestDataset({ datasetName })
      const dataset = documentContent.createDataSet(getSnapshot(_dataset)).sharedDataSet.dataSet
      dataset.addAttribute({ name: "yr" })
      dataset.addCases(testCases.map((c, i) => ({ ...c, yr: 11 + i })), { canonicalize: true })
      dataset.validateCases()
      const result = diComponentHandler.create!(
        {}, { type: "graph", dataContext: datasetName, xAttributeName: "a3", yAttributeName: "a4", ...extraValues }
      )
      const tile = documentContent.tileMap.get(
        toV3Id(kGraphIdPrefix, (result.values as DIComponentInfo).id!)
      )!
      const content = tile.content as IGraphContentModel
      // Let afterAttachToDocument's awaits resolve so axes are set up.
      await new Promise(resolve => setTimeout(resolve, 0))
      const firstCaseId = content.graphPointLayerModel.dataConfiguration.getCaseDataArray(0)[0].caseID
      return { dataset, tile, content, firstCaseId }
    }

    it("grows the left y axis to fit a first-y value that moved outside the current domain", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const { dataset, tile, content, firstCaseId } = await createGraph("rescaleLeftData")
      const yAxis = content.getAxis("left") as IBaseNumericAxisModel
      const initialMax = yAxis.max
      const a4 = dataset.getAttributeByName("a4")!
      dataset.setComputedCaseValues([{ __id__: firstCaseId, [a4.id]: 100 }], [a4.id])

      expect(yAxis.max).toBeGreaterThan(initialMax)
      expect(yAxis.max).toBeGreaterThanOrEqual(100)

      diComponentHandler.delete!({ component: tile })
    })

    it("is grow-only: leaves the domain unchanged when values stay within it", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const { dataset, tile, content, firstCaseId } = await createGraph("rescaleGrowOnlyData")
      const yAxis = content.getAxis("left") as IBaseNumericAxisModel
      const initialMin = yAxis.min
      const initialMax = yAxis.max
      const a4 = dataset.getAttributeByName("a4")!
      // a4 values are -1..-6; set one to -3, still well within the existing domain
      dataset.setComputedCaseValues([{ __id__: firstCaseId, [a4.id]: -3 }], [a4.id])

      expect(yAxis.min).toBe(initialMin)
      expect(yAxis.max).toBe(initialMax)

      diComponentHandler.delete!({ component: tile })
    })

    // A numeric attribute assigned only to the y2/rightNumeric axis (not to x or first-y).
    it("grows the right (y2) axis when a y2-only attribute's values move outside the domain", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const { dataset, tile, content, firstCaseId } = await createGraph("rescaleY2Data", { y2AttributeName: "yr" })
      const y2Axis = content.getAxis("rightNumeric") as IBaseNumericAxisModel
      expect(y2Axis).toBeDefined()
      const initialMax = y2Axis.max
      expect(initialMax).toBeLessThan(100)
      // Read the values first, as the live app does while rendering, so the cache holds pre-change
      // values that the rescale must see invalidated in order to grow.
      const dataConfig = content.graphPointLayerModel.dataConfiguration
      expect(dataConfig.numericValuesForAttrRole("rightNumeric")).not.toContain(100)
      const yr = dataset.getAttributeByName("yr")!
      dataset.setComputedCaseValues([{ __id__: firstCaseId, [yr.id]: 100 }], [yr.id])

      expect(y2Axis.max).toBeGreaterThan(initialMax)
      expect(y2Axis.max).toBeGreaterThanOrEqual(100)

      diComponentHandler.delete!({ component: tile })
    })

    // A bar chart's count axis is a clamped (clampPosMinAtZero) axis, which refits tightly to the
    // data. The value-change rescale must still be grow-only for it, or a user/plugin-set count-axis
    // max would be silently discarded whenever a plotted value changes (e.g. a formula recalculates).
    it("does not shrink a bar chart's count axis (grow-only) when a value changes", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const documentContent = appState.document.content!
      const { dataset: _dataset } = setupTestDataset({ datasetName: "barChartCountData" })
      const dataset = documentContent.createDataSet(getSnapshot(_dataset)).sharedDataSet.dataSet
      dataset.addCases(testCases, { canonicalize: true })
      dataset.validateCases()
      const result = diComponentHandler.create!(
        {}, { type: "graph", dataContext: "barChartCountData", xAttributeName: "a1" }
      )
      const tile = documentContent.tileMap.get(
        toV3Id(kGraphIdPrefix, (result.values as DIComponentInfo).id!)
      )!
      const content = tile.content as IGraphContentModel
      await new Promise(resolve => setTimeout(resolve, 0))
      // Fuse points into bars to make a bar chart; this establishes a count axis on the secondary
      // (left) place.
      content.fusePointsIntoBars(true)
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(content.plotType).toBe("barChart")

      // The tallest bar is 3 cases, so the count axis auto-fits to a small max. Simulate the user
      // dragging it well above that.
      const countAxis = content.getAxis("left") as IBaseNumericAxisModel
      expect(countAxis.type).toBe("count")
      expect(countAxis.max).toBeLessThan(20)
      countAxis.setDomain(0, 20)
      expect(countAxis.max).toBe(20)

      // Change a value to bump casesChangeCount and fire the rescale reaction.
      const firstCaseId = content.graphPointLayerModel.dataConfiguration.getCaseDataArray(0)[0].caseID
      const a3 = dataset.getAttributeByName("a3")!
      dataset.setComputedCaseValues([{ __id__: firstCaseId, [a3.id]: 2 }], [a3.id])

      // Grow-only: the user's larger max survives; it is not snapped back to fit the bars.
      expect(countAxis.min).toBe(0)
      expect(countAxis.max).toBe(20)

      diComponentHandler.delete!({ component: tile })
    })
  })

  // CODAP-1459: V2 parity — the Squares of Residuals and Residual Plot booleans must not
  // linger checked-but-disabled. When the possibility of showing squares disappears (no
  // visible line/curve adornment), both flags are cleared; when the Residual Plot's stricter
  // applicability lapses (e.g. legend attribute added), the Residual Plot flag is cleared.
  describe("Squares of Residuals / Residual Plot reactive gates", () => {
    const createScatter = async (datasetName: string, extra: Record<string, any> = {}) => {
      const documentContent = appState.document.content!
      const { dataset: _dataset } = setupTestDataset({ datasetName })
      const dataset = documentContent.createDataSet(getSnapshot(_dataset)).sharedDataSet.dataSet
      dataset.addCases(testCases, { canonicalize: true })
      dataset.validateCases()
      const result = diComponentHandler.create!(
        {}, { type: "graph", dataContext: datasetName, xAttributeName: "a3", yAttributeName: "a4", ...extra }
      )
      const tile = documentContent.tileMap.get(
        toV3Id(kGraphIdPrefix, (result.values as DIComponentInfo).id!)
      )!
      const content = tile.content as IGraphContentModel
      await new Promise(resolve => setTimeout(resolve, 0))
      return { dataset, tile, content }
    }

    it("clears showSquaresOfResiduals when the last visible line adornment is hidden", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const { tile, content } = await createScatter("squaresGateHideLine")
      const store = content.adornmentsStore
      const movableLine = MovableLineAdornmentModel.create()
      store.addAdornment(movableLine, content.getUpdateCategoriesOptions())
      store.setShowSquaresOfResiduals(true)
      expect(store.isShowingAdornment(kMovableLineType)).toBe(true)
      expect(store.showSquaresOfResiduals).toBe(true)

      store.hideAdornment(kMovableLineType)

      expect(store.isShowingAdornment(kMovableLineType)).toBe(false)
      expect(store.showSquaresOfResiduals).toBe(false)

      diComponentHandler.delete!({ component: tile })
    })

    it("clears showResidualPlot when the last visible line adornment is hidden", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const { tile, content } = await createScatter("residualGateHideLine")
      const store = content.adornmentsStore
      const movableLine = MovableLineAdornmentModel.create()
      store.addAdornment(movableLine, content.getUpdateCategoriesOptions())
      store.setShowResidualPlot(true)
      expect(store.showResidualPlot).toBe(true)

      store.hideAdornment(kMovableLineType)

      expect(store.showResidualPlot).toBe(false)

      diComponentHandler.delete!({ component: tile })
    })

    // V2 required the user to re-check the line after a categorical detour; V3 without this
    // reaction would silently re-show it as soon as both axes were numeric again.
    it("hides Movable Line when y-axis is swapped to categorical, and keeps it hidden after swap back to numeric",
       async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const { dataset, tile, content } = await createScatter("lineHideRoundTrip")
      const store = content.adornmentsStore
      const movableLine = MovableLineAdornmentModel.create()
      store.addAdornment(movableLine, content.getUpdateCategoriesOptions())
      store.setShowResidualPlot(true)
      const dataConfig = content.graphPointLayerModel.dataConfiguration
      const a1 = dataset.getAttributeByName("a1")!   // categorical
      const a4 = dataset.getAttributeByName("a4")!   // numeric
      expect(dataConfig.attributeType("y")).toBe("numeric")
      expect(store.isShowingAdornment(kMovableLineType)).toBe(true)

      // Swap y to categorical — line hides, residual plot clears.
      dataConfig.setAttribute("y", { attributeID: a1.id })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(dataConfig.attributeType("y")).not.toBe("numeric")
      expect(store.isShowingAdornment(kMovableLineType)).toBe(false)
      expect(store.showResidualPlot).toBe(false)

      // Swap y back to numeric — the line stays hidden and the residual plot stays off
      // (user must re-check them explicitly).
      dataConfig.setAttribute("y", { attributeID: a4.id })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(dataConfig.attributeType("y")).toBe("numeric")
      expect(store.isShowingAdornment(kMovableLineType)).toBe(false)
      expect(store.showResidualPlot).toBe(false)

      diComponentHandler.delete!({ component: tile })
    })

    // A legend attribute makes residualPlotIsApplicable false while leaving Movable Line
    // visible — so the squares gate does not fire, but the residual plot gate should.
    it("clears showResidualPlot when a legend attribute makes it inapplicable, but keeps Squares", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const { tile, content } = await createScatter("residualGateLegend")
      const store = content.adornmentsStore
      const movableLine = MovableLineAdornmentModel.create()
      store.addAdornment(movableLine, content.getUpdateCategoriesOptions())
      store.setShowSquaresOfResiduals(true)
      store.setShowResidualPlot(true)

      // Assign a legend attribute — residualPlotIsApplicable returns false, but a line
      // is still visible so the squares possibility survives.
      const dataConfig = content.graphPointLayerModel.dataConfiguration
      dataConfig.setAttribute("legend", { attributeID: dataConfig.attributeID("y") })
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(store.isShowingAdornment(kMovableLineType)).toBe(true)
      expect(store.showSquaresOfResiduals).toBe(true)
      expect(store.showResidualPlot).toBe(false)

      diComponentHandler.delete!({ component: tile })
    })

    // The reactive clear (setShowResidualPlot(false)) fires from a reaction triggered by the
    // line-removal action. Because the removal goes through applyModelChange — which folds response
    // actions into the same history entry — a single undo must restore BOTH the line and the
    // Residual Plot flag, not leave them in an intermediate state.
    it("undoes a line removal and its reactive Residual Plot clear as one atomic history entry", async () => {
      (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
      const { tile, content } = await createScatter("residualUndoAtomic")
      const store = content.adornmentsStore
      const movableLine = MovableLineAdornmentModel.create()
      store.addAdornment(movableLine, content.getUpdateCategoriesOptions())
      store.setShowResidualPlot(true)
      expect(store.isShowingAdornment(kMovableLineType)).toBe(true)
      expect(store.showResidualPlot).toBe(true)

      // Record history from here (setup above is untracked).
      const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
      appState.document.treeMonitor!.enableMonitoring()
      await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })

      // Remove the line the way the checkbox does — via applyModelChange. The syncResidualPlotGate
      // reaction fires within this action and clears showResidualPlot.
      store.applyModelChange(() => store.hideAdornment(kMovableLineType), {
        undoStringKey: "V3.Undo.graph.hideMovableLine",
        redoStringKey: "V3.Redo.graph.hideMovableLine"
      })
      await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })

      expect(store.isShowingAdornment(kMovableLineType)).toBe(false)
      expect(store.showResidualPlot).toBe(false)

      // A single undo restores BOTH the line and the Residual Plot flag (atomic).
      expect(appState.document.canUndo).toBe(true)
      appState.document.undoLastAction()
      await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })

      expect(store.isShowingAdornment(kMovableLineType)).toBe(true)
      expect(store.showResidualPlot).toBe(true)

      appState.document.treeMonitor!.disableMonitoring()
      diComponentHandler.delete!({ component: tile })
    })
  })
})
