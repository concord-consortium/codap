import { resolveElement, tourElements, TourElementKey } from "./tour-elements"

describe("resolveElement", () => {
  it("returns the registry entry for a known key", () => {
    expect(resolveElement("toolShelf.table")).toBe(tourElements.toolShelf.table)
  })

  // Plugins supply tour keys, so a bad one must resolve to nothing rather than throw.
  it.each([
    ["an unknown namespace", "noSuchNamespace.table"],
    ["an unknown element", "toolShelf.noSuchElement"],
    ["an inherited property", "toolShelf.constructor"],
    ["an inherited namespace", "constructor.name"]
  ])("returns undefined for %s", (_desc, key) => {
    expect(resolveElement(key as TourElementKey)).toBeUndefined()
  })
})
