import { getShortcutKey } from "./tiles-list-button"

describe("getShortcutKey", () => {
  it("returns '1' through '9' for indices 0–8", () => {
    for (let i = 0; i < 9; i++) {
      expect(getShortcutKey(i)).toBe(String(i + 1))
    }
  })

  it("returns '0' for index 9", () => {
    expect(getShortcutKey(9)).toBe("0")
  })

  it("returns 'a' through 'z' for indices 10–35", () => {
    for (let i = 10; i < 36; i++) {
      expect(getShortcutKey(i)).toBe(String.fromCharCode(97 + i - 10))
    }
  })

  it("returns undefined for index 36 and beyond", () => {
    expect(getShortcutKey(36)).toBeUndefined()
    expect(getShortcutKey(100)).toBeUndefined()
  })
})
