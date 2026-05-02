import { getSnapshot } from "mobx-state-tree"
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
  })
})
