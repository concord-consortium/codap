import { toV2Id } from "../../utilities/codap-utils"
import { DIFullCase } from "../data-interactive-data-set-types"
import { diCaseFormulaSearchHandler } from "./case-formula-search-handler"
import { setupTestDataset } from "../../test/dataset-test-utils"


describe("DataInteractive CaseFormulaSearchHandler", () => {
  const handler = diCaseFormulaSearchHandler

  it("get works", () => {
    const { dataset: dataContext, c2: collection } = setupTestDataset()
    const cases = dataContext.getGroupsForCollection(collection.id).map(c => c.groupedCase)
    const caseFormulaSearch = [cases[0], cases[2], cases[3]]

    expect(handler.get?.({ dataContext, collection }).success).toBe(false)
    expect(handler.get?.({ dataContext, caseFormulaSearch }).success).toBe(false)
    expect(handler.get?.({ collection, caseFormulaSearch }).success).toBe(false)

    const result = handler.get!({ dataContext, collection, caseFormulaSearch })
    expect(result.success).toBe(true)
    const values = result.values as DIFullCase[]
    caseFormulaSearch.forEach((item, index) => {
      expect(values[index].id).toBe(toV2Id(item.__id__))
      const itemIndex = dataContext.getItemIndex(dataContext.caseInfoMap.get(item.__id__)!.childItemIds[0])!
      collection.attributes.forEach(attribute => {
        expect(attribute && values[index].values?.[attribute.name]).toBe(attribute?.value(itemIndex))
      })
    })
  })
})
