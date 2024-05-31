import { toV2Id } from "../../utilities/codap-utils"
import { DIFullCase } from "../data-interactive-types"
import { setupTestDataset } from "./handler-test-utils"
import { diItemSearchHandler } from "./item-search-handler"


describe("DataInteractive ItemSearchHandler", () => {
  const handler = diItemSearchHandler

  it("delete works", () => {
    const { dataset: dataContext } = setupTestDataset()
    const itemSearch = [dataContext.cases[0], dataContext.cases[2], dataContext.cases[5]]
    const itemIds = itemSearch.map(item => item.__id__)

    expect(handler.delete?.({ dataContext }).success).toBe(false)
    expect(handler.delete?.({ itemSearch }).success).toBe(false)

    itemIds.forEach(id => expect(dataContext.getCase(id)).toBeDefined())
    expect(dataContext.cases.length).toBe(6)
    const result = handler.delete!({ dataContext, itemSearch })
    expect(result?.success).toBe(true)
    expect(dataContext.cases.length).toBe(3)
    itemIds.forEach(id => expect(dataContext.getCase(id)).toBeUndefined())
    const values = result.values as number[]
    itemIds.forEach(id => expect(values.includes(toV2Id(id))))
  })

  it("get works", () => {
    const { dataset: dataContext, a1 } = setupTestDataset()
    const itemSearch = [dataContext.cases[0], dataContext.cases[2], dataContext.cases[5]]

    expect(handler.get?.({ dataContext }).success).toBe(false)
    expect(handler.get?.({ itemSearch }).success).toBe(false)

    const result = handler.get!({ dataContext, itemSearch })
    expect(result.success).toBe(true)
    const values = result.values as DIFullCase[]
    itemSearch.forEach((item, index) => {
      expect(values[index].id).toBe(toV2Id(item.__id__))
      const itemIndex = dataContext.caseIndexFromID(item.__id__)!
      dataContext.attributes.forEach(
        attribute => expect(values[index].values?.[attribute.name]).toBe(attribute.value(itemIndex))
      )
    })
  })
})
