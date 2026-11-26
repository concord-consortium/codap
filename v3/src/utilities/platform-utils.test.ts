/*
 * isMac is evaluated once at import, so each platform needs its own module instance rather than a
 * mock that can be swapped between assertions.
 */
function loadForPlatform(platform: string) {
  Object.defineProperty(window.navigator, "platform", { value: platform, configurable: true })
  let loaded: typeof import("./platform-utils") | undefined
  jest.isolateModules(() => {
    loaded = require("./platform-utils")
  })
  return loaded!
}

const mac = () => loadForPlatform("MacIntel")
const win = () => loadForPlatform("Win32")

describe("platform-utils", () => {
  // loadForPlatform shadows the prototype's platform getter with an own property; removing it
  // restores the real value.
  afterEach(() => {
    delete (window.navigator as { platform?: string }).platform
  })

  describe("isMac / cmdKey", () => {
    it("detects a Mac", () => {
      expect(mac().isMac).toBe(true)
      expect(mac().cmdKey).toBe("Meta")
    })

    it("detects a non-Mac", () => {
      expect(win().isMac).toBe(false)
      expect(win().cmdKey).toBe("Control")
    })
  })

  describe("isCommandKeyDown", () => {
    it("reads meta on a Mac and ignores ctrl", () => {
      const { isCommandKeyDown } = mac()
      expect(isCommandKeyDown({ metaKey: true })).toBe(true)
      expect(isCommandKeyDown({ ctrlKey: true })).toBe(false)
    })

    it("reads ctrl off the Mac and ignores meta", () => {
      const { isCommandKeyDown } = win()
      expect(isCommandKeyDown({ ctrlKey: true })).toBe(true)
      expect(isCommandKeyDown({ metaKey: true })).toBe(false)
    })
  })

  describe("hasSelectionModifier", () => {
    it("treats shift as a selection modifier on either platform", () => {
      expect(mac().hasSelectionModifier({ shiftKey: true })).toBe(true)
      expect(win().hasSelectionModifier({ shiftKey: true })).toBe(true)
    })

    it("accepts cmd but not ctrl on a Mac", () => {
      const { hasSelectionModifier } = mac()
      expect(hasSelectionModifier({ metaKey: true })).toBe(true)
      expect(hasSelectionModifier({ ctrlKey: true })).toBe(false)
    })

    it("accepts ctrl but not cmd off the Mac", () => {
      const { hasSelectionModifier } = win()
      expect(hasSelectionModifier({ ctrlKey: true })).toBe(true)
      expect(hasSelectionModifier({ metaKey: true })).toBe(false)
    })

    it("ignores alt", () => {
      expect(mac().hasSelectionModifier({ altKey: true })).toBe(false)
      expect(win().hasSelectionModifier({ altKey: true })).toBe(false)
    })

    it("is false for an unmodified click", () => {
      expect(mac().hasSelectionModifier({})).toBe(false)
      expect(win().hasSelectionModifier({})).toBe(false)
    })
  })

  describe("preservesSelection", () => {
    it("accepts shift, cmd, and ctrl on both platforms", () => {
      for (const load of [mac, win]) {
        const { preservesSelection } = load()
        expect(preservesSelection({ shiftKey: true })).toBe(true)
        expect(preservesSelection({ metaKey: true })).toBe(true)
        expect(preservesSelection({ ctrlKey: true })).toBe(true)
      }
    })

    it("ignores alt", () => {
      expect(mac().preservesSelection({ altKey: true })).toBe(false)
      expect(win().preservesSelection({ altKey: true })).toBe(false)
    })

    it("is false for an unmodified click", () => {
      expect(mac().preservesSelection({})).toBe(false)
      expect(win().preservesSelection({})).toBe(false)
    })
  })
})
