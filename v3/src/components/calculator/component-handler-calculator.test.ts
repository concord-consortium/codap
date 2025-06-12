import { getSnapshot } from "mobx-state-tree"
import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { testGetComponent } from "../../data-interactive/handlers/component-handler-test-utils"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { appState } from "../../models/app-state"
import { toV3Id } from "../../utilities/codap-utils"
import { isCalculatorModel } from "./calculator-model"
import { kCalculatorIdPrefix } from "./calculator-registration"

describe("DataInteractive ComponentHandler Calculator", () => {
  const handler = diComponentHandler
  const documentContent = appState.document.content!
  const { dataset } = setupTestDataset()
  documentContent.createDataSet(getSnapshot(dataset))

  it("create and get work", () => {
    // Create a calculator tile
    expect(documentContent.tileMap.size).toBe(0)
    const result = handler.create!({}, { type: "calculator", name: "calc" })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kCalculatorIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    expect(tile.title).toBe("calc")
    expect(isCalculatorModel(tile.content)).toBe(true)

    // Delete hides the calculator tile
    expect(documentContent.isTileHidden(tile.id)).toBe(false)
    const deleteResult = handler.delete?.({ component: tile })
    expect(deleteResult?.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    expect(documentContent.isTileHidden(tile.id)).toBe(true)

    // Show a hidden calculator tile
    const result2 = handler.create!({}, { type: "calculator" })
    expect(result2.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    expect(documentContent.isTileHidden(tile.id)).toBe(false)
    const result2Values = result2.values as DIComponentInfo
    expect(result2Values.id).toBe(resultValues.id)

    testGetComponent(tile, handler)
  })
})
