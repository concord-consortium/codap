import { observable, runInAction } from "mobx"
import { castToSnapshot, types } from "mobx-state-tree"
import { DataSet, IDataSet } from "../data/data-set"
import { createDataSet } from "../data/data-set-conversion"
import { GlobalValue } from "../global/global-value"
import { GlobalValueManager } from "../global/global-value-manager"
import { Formula, IFormula } from "./formula"
import { FormulaManager } from "./formula-manager"
import {
  CASE_INDEX_FAKE_ATTR_ID, globalValueIdToCanonical, idToCanonical, localAttrIdToCanonical
} from "./utils/name-mapping-utils"
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
  const dataSet = createDataSet({ name: "Cases", attributes: [{ name: "foo" }] })
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

  describe("when two formulas reference each other only through prev() (CODAP-1357)", () => {
    it("recalculates without infinite recursion in the downstream cascade", () => {
      // Pre-PR, cycle detection rejected mutual prev() references. With CODAP-1357 they pass
      // validation, but recalculateDownstreamFormulas still walks the cycle-safe edges, so
      // without a re-entry guard the cascade recurses sunny -> rainy -> sunny -> ... and
      // stack-overflows (RangeError, caught by MobX and logged to console.error).
      const consoleErrSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)
      try {
        const formulaManager = new FormulaManager()
        const dataSet = createDataSet({
          attributes: [
            { name: "sunny", formula: { display: "prev(rainy)" } },
            { name: "rainy", formula: { display: "prev(sunny)" } }
          ]
        }, {formulaManager})
        dataSet.addCases([{ __id__: "1" }])
        const adapter = new AttributeFormulaAdapter(formulaManager.getAdapterApi())
        formulaManager.addDataSet(dataSet)
        formulaManager.addAdapters([adapter])

        // No errors should have been reported by MobX (a stack overflow would be).
        expect(consoleErrSpy).not.toHaveBeenCalled()
        const sunnyValue = dataSet.getValueAtItemIndex(0, dataSet.attrFromName("sunny")?.id || "")
        const rainyValue = dataSet.getValueAtItemIndex(0, dataSet.attrFromName("rainy")?.id || "")
        expect(typeof sunnyValue === "string" ? sunnyValue : "").not.toMatch(/Circular reference/)
        expect(typeof rainyValue === "string" ? rainyValue : "").not.toMatch(/Circular reference/)
      } finally {
        consoleErrSpy.mockRestore()
      }
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

    // CODAP-1290 follow-up: when a formula references a global by name and the global is created
    // afterward, the formula's canonical form is updated and a recalculation is triggered, but
    // subsequent global-value changes are missed because the formula's static dependency list was
    // captured at registration time when the global did not exist.
    describe("when a global value referenced by name is added after the formula", () => {
      it("recalculates the formula when the newly-added global's value subsequently changes", () => {
        const formulaManager = new FormulaManager()
        const dataSet = createDataSet({ name: "Cases", attributes: [{ name: "result" }] })
        const formula = Formula.create({ display: "slider1 + 1" })
        Container.create({
          dataSet: castToSnapshot(dataSet),
          formula
        }, { formulaManager })
        const adapter = getFakeAdapter(formula, dataSet)
        const globalValueManager = GlobalValueManager.create()
        formulaManager.addDataSet(dataSet)
        formulaManager.addGlobalValueManager(globalValueManager)
        formulaManager.addAdapters([adapter])

        // Slider doesn't exist yet — `slider1` is unresolved in the canonical form.
        expect(formula.canonical).toEqual("slider1 + 1")
        expect(adapter.recalculateFormula).toHaveBeenCalledTimes(1)

        // Add the slider as a global value. The formula's canonical form should be re-resolved
        // (this part already works) and the formula recalculates once.
        const slider = GlobalValue.create({ name: "slider1", _value: 5 })
        globalValueManager.addValue(slider)
        expect(formula.canonical).toEqual(`${globalValueIdToCanonical(slider.id)} + 1`)
        expect(adapter.recalculateFormula).toHaveBeenCalledTimes(2)

        // The bug: changing the slider's value should now trigger a recalculation, but the
        // formula's global-value observer was registered with no dependencies (the slider didn't
        // exist at registration time), so the change is silently missed.
        slider.setValue(10)
        expect(adapter.recalculateFormula).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe("recalculateDownstreamFormulas", () => {
    it("recalculates downstream formula when upstream attribute changes", () => {
      const formulaManager = new FormulaManager()
      const dataSet = createDataSet({
        attributes: [
          { name: "x" },
          // "double" depends on "x" via formula
          { name: "double", formula: { display: "x * 2" } }
        ]
      }, { formulaManager })
      dataSet.addCases([{ __id__: "c1" }])
      const adapter = new AttributeFormulaAdapter(formulaManager.getAdapterApi())
      formulaManager.addDataSet(dataSet)
      formulaManager.addAdapters([adapter])

      const xId = dataSet.attrFromName("x")!.id
      const doubleId = dataSet.attrFromName("double")!.id

      // Set x to 5 — "double" should compute to 10 after recalculation
      dataSet.setCaseValues([{ __id__: "c1", [xId]: 5 }])
      expect(dataSet.getNumeric("c1", doubleId)).toBe(10)

      // Set x to 7 — "double" should update to 14
      dataSet.setCaseValues([{ __id__: "c1", [xId]: 7 }])
      expect(dataSet.getNumeric("c1", doubleId)).toBe(14)
    })

    it("cascades through multiple levels (A → B → C)", () => {
      const formulaManager = new FormulaManager()
      const dataSet = createDataSet({
        attributes: [
          { name: "x" },
          { name: "y", formula: { display: "x + 1" } },
          { name: "z", formula: { display: "y * 2" } }
        ]
      }, { formulaManager })
      dataSet.addCases([{ __id__: "c1" }])
      const adapter = new AttributeFormulaAdapter(formulaManager.getAdapterApi())
      formulaManager.addDataSet(dataSet)
      formulaManager.addAdapters([adapter])

      const xId = dataSet.attrFromName("x")!.id
      const yId = dataSet.attrFromName("y")!.id
      const zId = dataSet.attrFromName("z")!.id

      // x=3 → y=4 → z=8
      dataSet.setCaseValues([{ __id__: "c1", [xId]: 3 }])
      expect(dataSet.getNumeric("c1", yId)).toBe(4)
      expect(dataSet.getNumeric("c1", zId)).toBe(8)

      // x=10 → y=11 → z=22
      dataSet.setCaseValues([{ __id__: "c1", [xId]: 10 }])
      expect(dataSet.getNumeric("c1", yId)).toBe(11)
      expect(dataSet.getNumeric("c1", zId)).toBe(22)
    })

    it("does not recalculate non-dependent formulas", () => {
      const formulaManager = new FormulaManager()
      const dataSet = createDataSet({
        attributes: [
          { name: "x" },
          { name: "y" },
          { name: "fromX", formula: { display: "x + 1" } },
          { name: "fromY", formula: { display: "y + 1" } }
        ]
      }, { formulaManager })
      dataSet.addCases([{ __id__: "c1" }])
      const adapter = new AttributeFormulaAdapter(formulaManager.getAdapterApi())
      formulaManager.addDataSet(dataSet)
      formulaManager.addAdapters([adapter])

      const xId = dataSet.attrFromName("x")!.id
      const yId = dataSet.attrFromName("y")!.id
      const fromXId = dataSet.attrFromName("fromX")!.id
      const fromYId = dataSet.attrFromName("fromY")!.id

      // Set both base values
      dataSet.setCaseValues([{ __id__: "c1", [xId]: 5, [yId]: 10 }])
      expect(dataSet.getNumeric("c1", fromXId)).toBe(6)
      expect(dataSet.getNumeric("c1", fromYId)).toBe(11)

      // Change only x — fromY should remain 11
      dataSet.setCaseValues([{ __id__: "c1", [xId]: 20 }])
      expect(dataSet.getNumeric("c1", fromXId)).toBe(21)
      expect(dataSet.getNumeric("c1", fromYId)).toBe(11)
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
