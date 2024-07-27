import { getSnapshot } from "mobx-state-tree"
import { isCalculatorModel } from "../../components/calculator/calculator-model"
import { kCalculatorIdPrefix } from "../../components/calculator/calculator-registration"
import { appState } from "../../models/app-state"
import { toV3Id } from "../../utilities/codap-utils"
import { DIComponentInfo } from "../data-interactive-types"
import { diComponentHandler } from "./component-handler"
import { testGetComponent } from "./component-handler-test-utils"
import { setupTestDataset } from "./handler-test-utils"

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
