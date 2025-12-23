import { ICase } from "../data/data-set-types"
import {
  IGlobalValueDependency,
  ILocalAttributeDependency, ILookupDependency
} from "./formula-types"
import {
  getLocalAttrCasesToRecalculate, getLookupCasesToRecalculate, isAttrDefined, observeDatasetHierarchyChanges,
  observeGlobalValues, observeLocalAttributes, observeLookupDependencies, observeSymbolNameChanges
} from "./formula-observers"
import { DataSet, IDataSet } from "../data/data-set"
import { GlobalValueManager } from "../global/global-value-manager"
import { GlobalValue } from "../global/global-value"

describe("isAttrDefined", () => {
  const dataSetCase: ICase = { __id__: "1", attr1: 1, attr2: 2 }

  it("returns true if the attribute is defined in the data set case", () => {
    const attributeId = "attr1"
    const result = isAttrDefined(dataSetCase, attributeId)
    expect(result).toBe(true)
  })

  it("returns false if the attribute is not defined in the data set case", () => {
    const attributeId = "attr3"
    const result = isAttrDefined(dataSetCase, attributeId)
    expect(result).toBe(false)
  })

  it("returns false if the attribute ID is not provided", () => {
    const attributeId = undefined
    const result = isAttrDefined(dataSetCase, attributeId)
    expect(result).toBe(false)
  })
})

describe("getLocalAttrCasesToRecalculate", () => {
  const cases: ICase[] = [
    { __id__: "1", attr1: 0, attr2: 1 },
    { __id__: "2", attr1: 2, attr2: 3 },
    { __id__: "3", attr1: "" }, // empty string should be considered as value that needs to trigger recalculation
    { __id__: "4", attr2: 4 },
  ]

  it("returns 'ALL_CASES' if any case has an attribute that depends on an aggregate attribute", () => {
    const formulaDependencies: ILocalAttributeDependency[] = [
      { attrId: "attr1", type: "localAttribute", aggregate: false },
      { attrId: "attr2", type: "localAttribute", aggregate: true },
    ]
    const result = getLocalAttrCasesToRecalculate(cases, formulaDependencies)
    expect(result).toBe("ALL_CASES")
  })

  it("returns an array of cases that have an attribute that depends on a regular attribute", () => {
    const formulaDependencies: ILocalAttributeDependency[] = [
      { attrId: "attr1", type: "localAttribute", aggregate: false }
    ]
    const result = getLocalAttrCasesToRecalculate(cases, formulaDependencies)
    expect(result).toEqual([cases[0], cases[1], cases[2]])
  })

  it("returns an empty array if no case has an attribute that depends on a regular attribute", () => {
    const formulaDependencies: ILocalAttributeDependency[] = [
      { attrId: "attr3", type: "localAttribute", aggregate: false }
    ]
    const result = getLocalAttrCasesToRecalculate(cases, formulaDependencies)
    expect(result).toEqual([])
  })
})

describe("getLookupCasesToRecalculate", () => {
  const dependency: ILookupDependency = { type: "lookup", dataSetId: "ds1", attrId: "attr1", otherAttrId: "attr2" }

  it("returns 'ALL_CASES' if any case has the lookup attribute or the lookup key attribute", () => {
    expect(getLookupCasesToRecalculate([{ __id__: "1", attr1: 1 }], dependency)).toBe("ALL_CASES")
    expect(getLookupCasesToRecalculate([{ __id__: "1", attr2: "" }], dependency)).toBe("ALL_CASES")
  })

  it("returns an empty array if no case has the lookup attribute or the lookup key attribute", () => {
    expect(getLookupCasesToRecalculate([{ __id__: "1", attr3: 3 }], dependency)).toEqual([])
  })
})

describe("observeLocalAttributes", () => {
  describe("when there's no aggregate dependency", () => {
    const dataSet = DataSet.create({ id: "ds1" })

    const formulaDependenciesWithoutAggregate: ILocalAttributeDependency[] = [
      { type: "localAttribute", attrId: "attr1", aggregate: false },
      { type: "localAttribute", attrId: "attr2", aggregate: false },
    ]

    it("should call recalculateCallback with newly added cases", () => {
      const recalculateCallback = jest.fn()
      const dispose = observeLocalAttributes(formulaDependenciesWithoutAggregate, dataSet, recalculateCallback)
      const newCases = [{ __id__: "case1" }, { __id__: "case2" }]
      dataSet.addCases(newCases)
      // non-aggregate optimization has been removed for now
      expect(recalculateCallback).toHaveBeenCalledWith("ALL_CASES")

      dispose()
      dataSet.addCases(newCases)
      expect(recalculateCallback).toHaveBeenCalledTimes(1)
    })

    it("should call recalculateCallback with sorted cases", () => {
      const recalculateCallback = jest.fn()
      dataSet.addAttribute({ id: "attr1", name: "attr1" })
      const newCases = [{ __id__: "case1", attr1: 1 }, { __id__: "case2", attr2: 2 }]
      dataSet.addCases(newCases)
      // non-aggregate optimization has been removed for now
      const dispose = observeLocalAttributes(formulaDependenciesWithoutAggregate, dataSet, recalculateCallback)
      dataSet.sortByAttribute("attr1", "descending")
      expect(recalculateCallback).toHaveBeenCalledWith("ALL_CASES")
      dispose()
    })

    it("should call recalculateCallback with updated cases", () => {
      const recalculateCallback = jest.fn()
      const dispose = observeLocalAttributes(formulaDependenciesWithoutAggregate, dataSet, recalculateCallback)
      const caseUpdates = [{ __id__: "case1", attr1: 1 }, { __id__: "case2", attr321: 2 }]
      dataSet.setCaseValues(caseUpdates)
      expect(recalculateCallback).toHaveBeenCalledWith([caseUpdates[0]])
      dispose()
    })
  })

  describe("when there is aggregate dependency", () => {
    const dataSet = DataSet.create({ id: "ds1" })

    const formulaDependenciesWithAggregate: ILocalAttributeDependency[] = [
      { type: "localAttribute", attrId: "attr1", aggregate: false },
      { type: "localAttribute", attrId: "attr2", aggregate: false },
      { type: "localAttribute", attrId: "attr2", aggregate: true },
    ]

    it("should call recalculateCallback with ALL_CASES when new case is added", () => {
      const recalculateCallback = jest.fn()
      const disposer = observeLocalAttributes(formulaDependenciesWithAggregate, dataSet, recalculateCallback)
      const newCases = [{ __id__: "case1" }, { __id__: "case2" }]
      dataSet.addCases(newCases)
      expect(recalculateCallback).toHaveBeenCalledWith("ALL_CASES")
      disposer()
    })

    it("should call recalculateCallback with updated cases when no aggregate dependency attribute is updated", () => {
      const recalculateCallback = jest.fn()
      const disposer = observeLocalAttributes(formulaDependenciesWithAggregate, dataSet, recalculateCallback)
      const caseUpdates = [{ __id__: "case1", attr1: 1 }, { __id__: "case2", attr321: 2 }]
      dataSet.setCaseValues(caseUpdates)
      expect(recalculateCallback).toHaveBeenCalledWith([caseUpdates[0]])
      disposer()
    })

    it("should call recalculateCallback with ALL_CASES when aggregate dependency attribute is updated", () => {
      const recalculateCallback = jest.fn()
      const disposer = observeLocalAttributes(formulaDependenciesWithAggregate, dataSet, recalculateCallback)
      const caseUpdates = [{ __id__: "case1", attr1: 1 }, { __id__: "case2", attr2: 2 }]
      dataSet.setCaseValues(caseUpdates)
      expect(recalculateCallback).toHaveBeenCalledWith("ALL_CASES")
      disposer()
    })
  })
})

describe("observeLookupDependencies", () => {
  it("should call recalculateCallback with ALL_CASES when case is added, removed or updated", () => {
    const dataSet = DataSet.create({ id: "ds1" })
    const formulaDependencies: ILookupDependency[] = [
      { type: "lookup", dataSetId: "ds1", attrId: "attr1", otherAttrId: "attr2" },
    ]
    const recalculateCallback = jest.fn()
    const dispose = observeLookupDependencies(formulaDependencies, new Map([["ds1", dataSet]]), recalculateCallback)
    const newCases = [{ __id__: "case1" }, { __id__: "case2" }]
    dataSet.addCases(newCases)
    expect(recalculateCallback).toHaveBeenNthCalledWith(1, "ALL_CASES")

    dataSet.removeCases(["case1"])
    expect(recalculateCallback).toHaveBeenNthCalledWith(2, "ALL_CASES")

    dataSet.setCaseValues([{ __id__: "case2", attr1: 1 }])
    expect(recalculateCallback).toHaveBeenNthCalledWith(3, "ALL_CASES")

    dispose()
    dataSet.addCases(newCases)
    expect(recalculateCallback).toHaveBeenCalledTimes(3)
  })
})

describe("observeGlobalValues", () => {
  it("should call recalculateCallback with ALL_CASES when global value is updated", () => {
    const globalValueManager = GlobalValueManager.create()
    const globalValue = GlobalValue.create({ name: "global1", _value: 0 })
    globalValueManager.addValue(globalValue)
    const formulaDependencies: IGlobalValueDependency[] = [{ type: "globalValue", globalId: globalValue.id }]
    const recalculateCallback = jest.fn()
    const dispose = observeGlobalValues(formulaDependencies, globalValueManager, recalculateCallback)
    globalValueManager.getValueByName("global1")?.setValue(1)
    expect(recalculateCallback).toHaveBeenCalledWith("ALL_CASES")

    dispose()
    globalValueManager.getValueByName("global1")?.setValue(2)
    expect(recalculateCallback).toHaveBeenCalledTimes(1)
  })
})

describe("observeSymbolNameChanges", () => {
  it("should call nameUpdateCallback when symbol name is changed", () => {
    const dataSet = DataSet.create({ id: "ds1" })
    dataSet.addAttribute({ id: "attr1", name: "attr1" })
    const globalValueManager = GlobalValueManager.create()
    const globalValue = GlobalValue.create({ name: "global1", _value: 0 })
    globalValueManager.addValue(globalValue)
    const nameUpdateCallback = jest.fn()
    const dispose = observeSymbolNameChanges(new Map([["ds1", dataSet]]), globalValueManager, nameUpdateCallback)
    dataSet.setAttributeName("attr1", "newName")
    expect(nameUpdateCallback).toHaveBeenCalledTimes(1)
    globalValueManager.getValueByName("global1")?.setName("newName")
    expect(nameUpdateCallback).toHaveBeenCalledTimes(2)

    dispose()
    dataSet.attrFromID("attr1")?.setName("newName2")
    expect(nameUpdateCallback).toHaveBeenCalledTimes(2)
  })

  it("should call nameUpdateCallback when a new symbol becomes available", () => {
    const dataSet = DataSet.create({ id: "ds1" })
    const globalValueManager = GlobalValueManager.create()
    const nameUpdateCallback = jest.fn()
    const dispose = observeSymbolNameChanges(new Map([["ds1", dataSet]]), globalValueManager, nameUpdateCallback)
    globalValueManager.addValue(GlobalValue.create({ name: "global2", _value: 0 }))
    expect(nameUpdateCallback).toHaveBeenCalledTimes(1)

    dataSet.addAttribute({ id: "attr1_id", name: "attr1" })
    expect(nameUpdateCallback).toHaveBeenCalledTimes(2)

    dispose()
    globalValueManager.addValue(GlobalValue.create({ name: "global3", _value: 0 }))
    expect(nameUpdateCallback).toHaveBeenCalledTimes(2)
  })

  it("should call nameUpdateCallback when a symbol becomes unavailable", () => {
    const dataSet = DataSet.create({ id: "ds1" })
    const globalValueManager = GlobalValueManager.create()
    const globalValue = GlobalValue.create({ name: "global2", _value: 0 })
    globalValueManager.addValue(globalValue)
    dataSet.addAttribute({ id: "attr1_id", name: "attr1" })
    dataSet.addAttribute({ id: "attr2_id", name: "attr2" })
    const nameUpdateCallback = jest.fn()
    const dispose = observeSymbolNameChanges(new Map([["ds1", dataSet]]), globalValueManager, nameUpdateCallback)
    globalValueManager.removeValue(globalValue)
    expect(nameUpdateCallback).toHaveBeenCalledTimes(1)

    dataSet.removeAttribute("attr1_id")
    expect(nameUpdateCallback).toHaveBeenCalledTimes(2)

    dispose()
    dataSet.removeAttribute("attr2_id")
    expect(nameUpdateCallback).toHaveBeenCalledTimes(2)

  })
})

describe("observeDatasetHierarchyChanges", () => {
  const attributesByCollection = (dataSet: IDataSet) => {
    const attrs: string[][] = []
    dataSet.collections.forEach(collection => {
      attrs.push(collection.attributes.map(attr => attr!.id))
    })
    return attrs
  }
  it("should call recalculateCallback with ALL_CASES when attribute is moved between collections", () => {
    const dataSet = DataSet.create({ id: "ds1" })
    dataSet.addAttribute({ id: "aId", name: "a" })
    dataSet.addAttribute({ id: "bId", name: "b" })
    dataSet.addAttribute({ id: "cId", name: "c" })

    const hierarchyChangedCallback = jest.fn()
    const dispose = observeDatasetHierarchyChanges(dataSet, hierarchyChangedCallback)
    dataSet.moveAttributeToNewCollection("aId")
    expect(attributesByCollection(dataSet)).toEqual([["aId"], ["bId", "cId"]])
    expect(hierarchyChangedCallback).toHaveBeenCalledTimes(1)

    dispose()
    dataSet.moveAttributeToNewCollection("bId")
    expect(attributesByCollection(dataSet)).toEqual([["aId"], ["bId"], ["cId"]])
    expect(hierarchyChangedCallback).toHaveBeenCalledTimes(1)
  })
})
