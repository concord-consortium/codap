import { getSnapshot } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { toV2Id } from "../../utilities/codap-utils"
import { processAction } from "../data-interactive-request-processor"
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

    expect(handler.get?.({ dataContext, collection, error: "Undefined symbol foo" }))
      .toEqual({ success: false, values: { error: "Undefined symbol foo" } })

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

  it("reports formula errors in values.error, as in V2", async () => {
    const { content } = appState.document
    const source = setupTestDataset().dataset
    // attribute values are only included in the snapshot when it's prepared
    source.prepareSnapshot()
    const { dataSet: dataset } = content!.createDataSet(getSnapshot(source)).sharedDataSet
    dataset.validateCases()
    const search = (formula: string) => processAction({
      action: "get", resource: `dataContext[${dataset.name}].collection[collection2].caseFormulaSearch[${formula}]`
    })
    expect(await search("a1=")).toEqual({ success: false, values: { error: "Unable to parse query." } })
    expect(await search("Mas>1")).toEqual({ success: false, values: { error: "Undefined symbol Mas" } })
  })
})
