import { SnapshotIn, types, getSnapshot } from "mobx-state-tree"
import { JsonNumber } from "./json-number"

const TestObject = types.model("TestObject", {
  numProp: JsonNumber
})
.actions(self => ({
  setNumProp(value: string | number) {
    // This is a weird feature of MST where a value can be set as either a
    // snapshot or the actual value
    self.numProp = value as number
  }
}))
interface TestObjectSnapshot extends SnapshotIn<typeof TestObject> {}

function roundTripObject(initialSnapshot: TestObjectSnapshot) {
  const line = TestObject.create(initialSnapshot)
  const savedSnapshot = getSnapshot(line)
  const savedJson = JSON.stringify(savedSnapshot)
  const loadedSnapshot = JSON.parse(savedJson)
  return TestObject.create(loadedSnapshot)
}

describe("JsonNumber", () => {
  it("serializes NaN", () => {
    const obj1 = roundTripObject({numProp: NaN})
    expect(obj1.numProp).toBe(NaN)

    const obj2 = roundTripObject({numProp: "NaN"})
    expect(obj2.numProp).toBe(NaN)
  })
  it("serializes Infinity", () => {
    const obj1 = roundTripObject({numProp: Infinity})
    expect(obj1.numProp).toBe(Infinity)

    const obj2 = roundTripObject({numProp: "Infinity"})
    expect(obj2.numProp).toBe(Infinity)
  })
  it("serializes -Infinity", () => {
    const obj1 = roundTripObject({numProp: -Infinity})
    expect(obj1.numProp).toBe(-Infinity)

    const obj2 = roundTripObject({numProp: "-Infinity"})
    expect(obj2.numProp).toBe(-Infinity)
  })
  it("serializes finite numbers as numbers", () => {
    const obj = TestObject.create({numProp: 5})
    const snapshot = getSnapshot(obj)
    expect(snapshot.numProp).not.toBe("5")
    expect(snapshot.numProp).toBe(5)
  })
  it("loads string numbers", () => {
    // This isn't required but is nice in case a string number ends up in
    // the JSON
    const obj = roundTripObject({numProp: "5" as unknown as number})
    expect(obj.numProp).toBe(5)
  })
  it("loads null values", () => {
    // This isn't required but it is nice that old documents will not completely crash if loaded
    // with a null value
    const obj = roundTripObject({numProp: null as unknown as number})
    expect(obj.numProp).toBe(NaN)
  })
  it("converts value on assignment", () => {
    const obj = TestObject.create({numProp: 1})
    expect(obj.numProp).toBe(1)
    obj.setNumProp("NaN")
    expect(obj.numProp).toBe(NaN)
  })
})
