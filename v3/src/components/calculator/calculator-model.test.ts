import { getSnapshot } from "mobx-state-tree"
import { CalculatorModel, isCalculatorModel } from "./calculator-model"
import { kCalculatorTileType } from "./calculator-defs"

describe("CalculatorModel", () => {

  it("creates with default values", () => {
    const calculator = CalculatorModel.create()
    expect(calculator.type).toBe(kCalculatorTileType)
    expect(calculator.name).toBe("")
    expect(calculator.value).toBe("")
  })

  it("creates with initial value", () => {
    const calculator = CalculatorModel.create({ value: "42" })
    expect(calculator.value).toBe("42")
  })

  it("setValue updates the value", () => {
    const calculator = CalculatorModel.create()
    expect(calculator.value).toBe("")

    calculator.setValue("123")
    expect(calculator.value).toBe("123")

    calculator.setValue("456.789")
    expect(calculator.value).toBe("456.789")
  })

  it("setValue with no argument clears the value", () => {
    const calculator = CalculatorModel.create({ value: "123" })
    expect(calculator.value).toBe("123")

    calculator.setValue()
    expect(calculator.value).toBe("")
  })

  it("serializes and deserializes value correctly", () => {
    const calculator = CalculatorModel.create({ value: "3.14159" })
    const snapshot = getSnapshot(calculator)

    expect(snapshot.value).toBe("3.14159")

    const restored = CalculatorModel.create(snapshot)
    expect(restored.value).toBe("3.14159")
  })

  it("preserves value through snapshot round-trip", () => {
    const calculator = CalculatorModel.create()
    calculator.setValue("result: 42")

    const snapshot = getSnapshot(calculator)
    const restored = CalculatorModel.create(snapshot)

    expect(restored.value).toBe("result: 42")
  })

  describe("isCalculatorModel", () => {
    it("returns true for calculator models", () => {
      const calculator = CalculatorModel.create()
      expect(isCalculatorModel(calculator)).toBe(true)
    })

    it("returns false for undefined", () => {
      expect(isCalculatorModel(undefined)).toBe(false)
    })

    it("returns false for objects with different type", () => {
      const notCalculator = { type: "other" }
      expect(isCalculatorModel(notCalculator as any)).toBe(false)
    })
  })
})
