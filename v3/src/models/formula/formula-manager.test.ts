import { observable, runInAction } from "mobx"
import { castToSnapshot, types } from "mobx-state-tree"
import { DataSet, IDataSet } from "../data/data-set"
import { createDataSet } from "../data/data-set-conversion"
import { Formula, IFormula } from "./formula"
import { FormulaManager } from "./formula-manager"
import { CASE_INDEX_FAKE_ATTR_ID, idToCanonical, localAttrIdToCanonical } from "./utils/name-mapping-utils"
import { AttributeFormulaAdapter } from "./attribute-formula-adapter"

const formulaDisplay = "1 + 2 + foo"

const getFakeAdapter = (formula: IFormula, dataSet: IDataSet) => {
  const activeFormulas = observable.box([formula])
  return {
    type: "fakeAdapter",
    addContentModel: jest.fn(),
    removeContentModel: jest.fn(),
    getActiveFormulas: jest.fn(() => {
      return activeFormulas.get().map(f => ({ formula: f, extraMetadata: { dataSetId: dataSet.id } }))
    }),
    recalculateFormula: jest.fn(),
    setupFormulaObservers: jest.fn(),
    setFormulaError: jest.fn(),
    getFormulaError: jest.fn(),
    // Custom test helpers:
    setActiveFormulas: (formulas: IFormula[]) => {
      runInAction(() => activeFormulas.set(formulas))
    }
  }
}

const Container = types.model("Container", {
  dataSet: DataSet,
  formula: Formula
})

const getManagerWithFakeAdapter = () => {
  const formulaManager = new FormulaManager()
  const dataSet = createDataSet({ attributes: [{ name: "foo" }] })
  const formula = Formula.create({ display: formulaDisplay })
  Container.create({
    dataSet: castToSnapshot(dataSet),
    formula
  }, {formulaManager})
  const adapter = getFakeAdapter(formula, dataSet)
  formulaManager.addDataSet(dataSet)
  formulaManager.addAdapters([adapter])
  return { manager: formulaManager, adapter, formula, dataSet }
}

describe("FormulaManager", () => {
  it("should create a formula manager", () => {
    const formulaManager = new FormulaManager()
    expect(formulaManager).toBeDefined()
  })

  it("should add dataset and adapter, get its active formulas, canonicalize them and trigger recalculation", () => {
    const { manager, adapter, formula, dataSet } = getManagerWithFakeAdapter()
    expect(manager.dataSets.size).toBe(1)
    expect(manager.adapters.length).toBe(1)
    expect(manager.adapters[0]).toBe(adapter)
    expect(adapter.getActiveFormulas).toHaveBeenCalled()
    expect(adapter.setupFormulaObservers).toHaveBeenCalled()
    expect(adapter.recalculateFormula).toHaveBeenCalled()
    expect(adapter.setFormulaError).not.toHaveBeenCalled()
    expect(manager.getFormulaMetadata(formula.id).isInitialized).toEqual(true)
    expect(formula.canonical).toEqual(`1 + 2 + ${localAttrIdToCanonical(dataSet.attrFromName("foo")?.id || "")}`)
  })

  describe("when formula has a syntax error", () => {
    it("should set formula error", () => {
      const { manager, adapter, formula } = getManagerWithFakeAdapter()
      formula.setDisplayExpression("1 + 2 +")
      expect(manager.getFormulaMetadata(formula.id).isInitialized).toEqual(false)
      expect(adapter.setFormulaError).toHaveBeenCalled()
      expect((adapter.setFormulaError).mock.calls[0][2]).toMatch(/Syntax error/)
    })
  })

  describe("when formula has adapter-specific error", () => {
    it("should set formula error", () => {
      const { adapter, formula } = getManagerWithFakeAdapter()
      adapter.getFormulaError.mockReturnValueOnce("Some error")
      formula.setDisplayExpression("1 + 2 + 3") // just to trigger re-registration and error check
      expect(adapter.setFormulaError).toHaveBeenCalled()
      expect((adapter.setFormulaError).mock.calls[0][2]).toEqual("Some error")
    })
  })

  describe("when formula has a circular dependency", () => {
    it("registers formulas in a way that lets circular detection algorithm to work correctly", () => {
      // This test is a bit specific to the attribute formula adapter, but it's pretty important as it ensures
      // that FormulaManager.registerAllFormulas is implemented in a way that delays error detection until all
      // the formulas are registered (necessary for circular dependency detection to work correctly).
      const formulaManager = new FormulaManager()
      const dataSet = createDataSet({
        attributes: [
          { name: "foo", formula: { display: "bar + 1" } },
          { name: "bar", formula: { display: "foo + 1" } }
        ]
      }, {formulaManager})
      dataSet.addCases([{ __id__: "1" }])
      const adapter = new AttributeFormulaAdapter(formulaManager.getAdapterApi())
      formulaManager.addDataSet(dataSet)
      formulaManager.addAdapters([adapter])

      expect(dataSet.getValueAtItemIndex(0, dataSet.attrFromName("foo")?.id || "")).toMatch(/Circular reference/)
      expect(dataSet.getValueAtItemIndex(0, dataSet.attrFromName("bar")?.id || "")).toMatch(/Circular reference/)
    })
  })

  describe("when formula becomes inactive or it's removed", () => {
    it("un-registers formula", () => {
      const { manager, adapter, formula } = getManagerWithFakeAdapter()
      expect(manager.getFormulaMetadata(formula.id)).toBeDefined()
      adapter.setActiveFormulas([])
      expect(() => manager.getFormulaMetadata(formula.id)).toThrow() // metadata is removed
    })
  })

  describe("formula observers", () => {
    // Note that formula observers are extracted to its own helpers that are tested separately. These tests just
    // roughly check the integration between formula manager and formula observers.
    describe("when one of the symbol value changes", () => {
      it("recalculates the formula", () => {
        const { adapter, dataSet } = getManagerWithFakeAdapter()
        const attr = dataSet.attrFromName("foo")
        expect(adapter.recalculateFormula).toHaveBeenCalledTimes(1)
        dataSet.setCaseValues([{ __id__: "1", [attr?.id || ""]: 3 }])
        expect(adapter.recalculateFormula).toHaveBeenCalledTimes(2)
      })
    })

    describe("when one of the formula symbols is renamed", () => {
      it("updates formula display expression", () => {
        const { formula, dataSet } = getManagerWithFakeAdapter()
        const attr = dataSet.attrFromName("foo")
        dataSet.setAttributeName(attr!.id, "bar")
        expect(formula.display).toEqual("1 + 2 + bar")
        expect(formula.canonical).toEqual(`1 + 2 + ${localAttrIdToCanonical(attr?.id || "")}`)
      })
    })

    describe("when one of the formula symbols is removed and re-added", () => {
      it("updates formula display and canonical expressions", () => {
        const { formula, dataSet, adapter } = getManagerWithFakeAdapter()
        expect(adapter.recalculateFormula).toHaveBeenCalledTimes(1)

        const attr = dataSet.attrFromName("foo")
        dataSet.removeAttribute(attr!.id)
        expect(formula.display).toEqual("1 + 2 + foo")
        expect(formula.canonical).toEqual("1 + 2 + foo")
        expect(adapter.recalculateFormula).toHaveBeenCalledTimes(2)

        // Re-add attribute
        dataSet.addAttribute({ name: "foo" })
        const newAttr = dataSet.attrFromName("foo")
        expect(formula.display).toEqual("1 + 2 + foo")
        expect(formula.canonical).toEqual(`1 + 2 + ${localAttrIdToCanonical(newAttr?.id || "")}`)
        expect(adapter.recalculateFormula).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe("getAdapterApi", () => {
    it("should return functional adapter api", () => {
      const { manager, adapter, formula, dataSet } = getManagerWithFakeAdapter()
      const api = manager.getAdapterApi()
      expect(api).toBeDefined()
      expect(api.getDatasets()).toEqual(manager.dataSets)
      expect(api.getBoundaryManager()).toEqual(manager.boundaryManager)
      expect(api.getGlobalValueManager()).toEqual(manager.globalValueManager)
      expect(api.getFormulaExtraMetadata(formula.id)).toEqual({
        dataSetId: dataSet.id
      })
      const context = api.getFormulaContext(formula.id)
      expect(context.formula).toEqual(formula)
      expect(context.adapter).toEqual(adapter)
      expect(context.dataSet).toEqual(dataSet)
      expect(context.isInitialized).toEqual(true)
      expect(context.registeredDisplay).toEqual(formulaDisplay)
    })
  })

  describe("getDisplayNameMap", () => {
    it("retrieves formula context and calculates display name map", () => {
      const { manager, formula, dataSet } = getManagerWithFakeAdapter()
      const attrId = dataSet.attrFromName("foo")?.id || ""
      expect(manager.getDisplayNameMap(formula.id)).toEqual({
        dataSet: {
          Cases: {
            attribute: {
              foo: idToCanonical(attrId)
            },
            id: idToCanonical(dataSet.id)
          }
        },
        localNames: {
          caseIndex: localAttrIdToCanonical(CASE_INDEX_FAKE_ATTR_ID),
          foo: localAttrIdToCanonical(attrId),
        }
      })
    })
  })

  describe("getCanonicalNameMap", () => {
    it("retrieves formula context and calculates canonical name map", () => {
      const { manager, formula, dataSet } = getManagerWithFakeAdapter()
      const attrId = dataSet.attrFromName("foo")?.id || ""
      expect(manager.getCanonicalNameMap(formula.id)).toEqual({
        [idToCanonical(attrId)]: "foo",
        [idToCanonical(dataSet.id)]: "Cases",
        [localAttrIdToCanonical(CASE_INDEX_FAKE_ATTR_ID)]: "caseIndex",
        [localAttrIdToCanonical(attrId)]: "foo"
      })
    })
  })
})
