import { DIDataContext } from "../data-interactive-data-set-types"
import { diDataContextListHandler } from "./data-context-list-handler"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { toV2Id } from "../../utilities/codap-utils"

describe("DataInteractive DataContextHandler", () => {
  const handler = diDataContextListHandler

  it("get works as expected", () => {
    const { dataset } = setupTestDataset()
    const title = "dataset title"
    dataset.setTitle(title)

    expect(handler.get?.({}).success).toBe(false)

    const result = handler.get!({ dataContextList: [dataset] })
    expect(result.success).toBe(true)
    const values = result.values as DIDataContext[]
    expect(values.length).toBe(1)
    const diDataContext = values[0]
    expect(diDataContext.name).toBe(dataset.name)
    expect(diDataContext.title).toBe(dataset._title)
    expect(diDataContext.guid).toBe(toV2Id(dataset.id))
    expect(diDataContext.id).toBe(toV2Id(dataset.id))
  })
})
