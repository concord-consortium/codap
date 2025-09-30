import { scrollTileIntoView } from "./dom-utils"

describe("scrollTileIntoView", () => {
  let getElementByIdSpy: jest.SpyInstance
  let requestAnimationFrameSpy: jest.SpyInstance
  let scrollToSpy: jest.SpyInstance
  let originalInnerWidth: number
  let originalInnerHeight: number

  beforeEach(() => {
    scrollToSpy = jest.spyOn(window, "scrollTo").mockImplementation(() => {})
    getElementByIdSpy = jest.spyOn(document, "getElementById")
    requestAnimationFrameSpy = jest.spyOn(window, "requestAnimationFrame").mockImplementation(cb => {
      cb(0)
      return 0
    })
    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true })
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true })
  })

  afterEach(() => {
    scrollToSpy.mockRestore()
    getElementByIdSpy.mockRestore()
    requestAnimationFrameSpy.mockRestore()
    Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, configurable: true })
    Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true })
  })

  it("does nothing if element is not found", () => {
    getElementByIdSpy.mockReturnValue(null)
    scrollTileIntoView("missing-tile")
    expect(getElementByIdSpy).toHaveBeenCalledWith("missing-tile")
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it("does nothing if element is fully visible", () => {
    const el = {
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        bottom: 600,
        right: 800
      }),
      parentElement: null
    } as any
    getElementByIdSpy.mockReturnValue(el)
    scrollTileIntoView("visible-tile")
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it("calls scrollIntoView if element is partially out of view (top)", () => {
    const el = {
      getBoundingClientRect: () => ({
        top: -10,
        left: 0,
        bottom: 590,
        right: 800,
        height: 600,
        width: 800
      }),
      parentElement: null
    } as any
    getElementByIdSpy.mockReturnValue(el)
    scrollTileIntoView("partial-top")
    expect(scrollToSpy).toHaveBeenCalledWith({ left: 0, top: expect.any(Number), behavior: "smooth" })
  })

  it("calls scrollIntoView if element is partially out of view (right)", () => {
    const el = {
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        bottom: 600,
        right: 900
      }),
      parentElement: null
    } as any
    getElementByIdSpy.mockReturnValue(el)
    scrollTileIntoView("partial-right")
    expect(scrollToSpy).toHaveBeenCalledWith({ left: expect.any(Number), top: 0, behavior: "smooth" })
  })

  it("calls scrollIntoView if element is partially out of view (left)", () => {
    const el = {
      getBoundingClientRect: () => ({ top: 0, left: -1, bottom: 600, right: 799 }),
      parentElement: null
    } as any
    getElementByIdSpy.mockReturnValue(el)
    scrollTileIntoView("partial-left")
    expect(scrollToSpy).toHaveBeenCalledWith({ left: expect.any(Number), top: 0, behavior: "smooth" })
  })

  it("calls scrollIntoView if element is partially out of view (bottom)", () => {
    const el = {
      getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 601, right: 800 }),
      parentElement: null
    } as any
    getElementByIdSpy.mockReturnValue(el)
    scrollTileIntoView("partial-bottom")
    expect(scrollToSpy).toHaveBeenCalledWith({ left: 0, top: expect.any(Number), behavior: "smooth" })
  })

  it("calls scrollIntoView if element is completely out of view", () => {
    const el = {
      getBoundingClientRect: () => ({
        top: 700,
        left: 900,
        bottom: 900,
        right: 1100
      }),
      parentElement: null
    } as any
    getElementByIdSpy.mockReturnValue(el)
    scrollTileIntoView("out-of-view")
    expect(scrollToSpy).toHaveBeenCalledWith({ left: expect.any(Number), top: expect.any(Number), behavior: "smooth" })
  })
})
