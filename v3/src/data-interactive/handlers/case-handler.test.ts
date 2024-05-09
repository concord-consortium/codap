import { CollectionModel, ICollectionModel } from "../../models/data/collection"
import { DataSet, IDataSet, toCanonical } from "../../models/data/data-set"
import { DINewCase, DISuccessResult, DIValues } from "../data-interactive-types"
import { diCaseHandler } from "./case-handler"

describe("DataInteractive CaseHandler", () => {
  const handler = diCaseHandler

  let dataset: IDataSet | undefined
  let c1: ICollectionModel | undefined
  let c2: ICollectionModel | undefined
  const cases = [
    { a1: "a", a2: "x", a3: 1 },
    { a1: "b", a2: "y", a3: 2 },
    { a1: "a", a2: "z", a3: 3 },
    { a1: "b", a2: "z", a3: 4 },
    { a1: "a", a2: "x", a3: 5 },
    { a1: "b", a2: "y", a3: 6 },
  ]
  const setupDataset = () => {
    dataset = DataSet.create({ name: "data" })
    c1 = CollectionModel.create({ name: "collection1" })
    c2 = CollectionModel.create({ name: "collection2" })
    dataset.addCollection(c1)
    dataset.addCollection(c2)
    dataset.addAttribute({ name: "a1" }, { collection: c1.id })
    dataset.addAttribute({ name: "a2" }, { collection: c2.id })
    dataset.addAttribute({ name: "a3" })
    dataset.addCases(toCanonical(dataset, cases))
  }

  it("create works as expected", () => {
    setupDataset()

    const oldCaseIds = dataset?.cases.map(c => +c.__id__)
    const confirmNewCase = (newCase: DINewCase) => {
      expect(newCase.itemID).toBeDefined()
      expect(oldCaseIds?.includes(newCase.itemID!)).toBe(false)
      expect(dataset?.getCase(`${newCase.itemID}`)).toBeDefined()

      // TODO Check newCase.id
    }

    expect(handler.create?.({}).success).toBe(false)

    // Creating multiple cases
    expect(dataset?.cases.length).toBe(6)
    expect(dataset?.getCasesForCollection(c2!.id).length).toBe(4)
    const result = handler.create?.({ dataContext: dataset }, [
      { values: { a1: "c", a2: "c", a3: 7 } },
      {
        parent: dataset?.getCasesForCollection(c2!.id)[0].__id__,
        values: { a3: 8 }
      }
    ] as DIValues)
    expect(result?.success).toBe(true)
    expect(dataset?.cases.length).toBe(8)
    expect(dataset?.getCasesForCollection(c2!.id).length).toBe(5)
    const newCases = result!.values as DINewCase[]
    newCases.forEach(confirmNewCase)

    // Creating a single case
    const result2 = handler.create?.({ dataContext: dataset },
      {
        parent: dataset?.getCasesForCollection(c1!.id)[0].__id__,
        values: { a2: "d", a3: 8 }
      } as DIValues
    )
    expect(result2?.success).toBe(true)
    expect(dataset?.cases.length).toBe(9)
    expect(dataset?.getCasesForCollection(c2!.id).length).toBe(6)
    const newCases2 = result2!.values as DINewCase[]
    newCases2.forEach(confirmNewCase)
  })

  it("update works as expected", () => {
    setupDataset()

    expect(handler.update?.({}).success).toBe(false)
    expect(handler.update?.({ dataContext: dataset }, {}).success).toBe(false)

    // Update single case
    const caseId0 = dataset?.cases[0].__id__
    const result = handler.update?.({ dataContext: dataset }, { id: +caseId0!, values: { a3: 10 } } as DIValues)
    expect(result?.success).toBe(true)
    expect(dataset?.getAttributeByName("a3")?.value(0)).toBe("10")
    expect((result as DISuccessResult).caseIDs?.includes(+caseId0!)).toBe(true)

    // Update multiple cases
    const caseId1 = dataset?.cases[1].__id__
    const caseId2 = dataset?.cases[2].__id__
    const result2 = handler.update?.({ dataContext: dataset }, [
      { id: +caseId1!, values: { a2: "w" } },
      { id: +caseId2!, values: { a1: "c", a2: "c", a3: "c" } }
    ] as DIValues)
    expect(result2?.success).toBe(true)
    expect(dataset?.getAttributeByName("a2")?.value(1)).toBe("w")
    const caseIDs = (result2 as DISuccessResult).caseIDs!
    expect(caseIDs.includes(+caseId1!)).toBe(true)
    const attrs = ["a1", "a2", "a3"]
    attrs.forEach(attrName => expect(dataset?.getAttributeByName(attrName)?.value(2)).toBe("c"))
    expect(caseIDs.includes(+caseId2!)).toBe(true)
  })
})
