import { toV2Id } from "../../utilities/codap-utils"
import { DIFullCase } from "../data-interactive-types"
import { setupTestDataset } from "./handler-test-utils"
import { diCaseSearchHandler } from "./case-search-handler"


describe("DataInteractive CaseSearchHandler", () => {
  const handler = diCaseSearchHandler

  it("get works", () => {
    const { dataset: dataContext, c2: collection } = setupTestDataset()
    const cases = dataContext.getGroupsForCollection(collection.id)!
    const caseSearch = [cases[0], cases[2], cases[3]]

    expect(handler.get?.({ dataContext, collection }).success).toBe(false)
    expect(handler.get?.({ dataContext, caseSearch }).success).toBe(false)
    expect(handler.get?.({ collection, caseSearch }).success).toBe(false)

    const result = handler.get!({ dataContext, collection, caseSearch })
    expect(result.success).toBe(true)
    const values = result.values as DIFullCase[]
    caseSearch.forEach((item, index) => {
      expect(values[index].id).toBe(toV2Id(item.pseudoCase.__id__))
      const itemIndex = dataContext.caseIndexFromID(item.childCaseIds[0])!
      collection.attributes.forEach(
        attribute => {
          if (attribute) expect(values[index].values?.[attribute.name]).toBe(attribute.value(itemIndex))
        }
      )
    })
  })
})
