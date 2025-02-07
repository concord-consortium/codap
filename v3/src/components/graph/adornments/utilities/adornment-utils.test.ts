import { updateCellKey } from "./adornment-utils"

describe("updateCellKey", () => {
  it("should return a new cellKey with the given attribute ID as a key and the given value as its value", () => {
    const cellKey = {abc123: "plants"}
    const newCellKey = updateCellKey(cellKey, "def456", "land")
    expect(newCellKey).toEqual({abc123: "plants", def456: "land"})
  })
  it("should not overwrite values for existing attribute IDs, add __IMPOSSIBLE__ key instead", () => {
    const cellKey = {abc123: "plants"}
    const newCellKey = updateCellKey(cellKey, "abc123", "meat")
    expect(newCellKey).toEqual({abc123: "plants", __IMPOSSIBLE__: "meat"})
  })
})
