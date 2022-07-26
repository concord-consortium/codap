// mock the measureText function
const mockMeasureText = jest.fn((text: string, fontSize: number) => {
  // assume every character is half the width of the font's height
  return { width: text.length * fontSize / 2 }
})

// mock the 2D canvas context
class MockCanvas2DContext {
  font = ""

  get fontSize() {
    const match = /(\d+)/.exec(this.font || "")
    const sizeStr = match?.[1]
    return sizeStr ? +sizeStr : 16
  }

  measureText(text: string) {
    return mockMeasureText(text, this.fontSize / 2)
  }
}

// mock document.createElement to return a "canvas" element that returns our mock 2D context
const mockCreateElement = jest.spyOn(document, "createElement").mockImplementation(() => ({
  getContext: () => {
    console.log("mockCreateElement.getContext")
    return new MockCanvas2DContext()
  }
} as any as HTMLCanvasElement))

import { defaultFont } from "../components/constants"
import { measureText } from "./use-measure-text"

describe("measureText", () => {
  const testText = "test text"
  const testText2 = "another string to test"
  const otherFont = "bold 20px serif"

  beforeEach(() => {
    mockMeasureText.mockClear()
  })

  afterAll(() => {
    mockCreateElement.mockRestore()
  })

  it("returns the same value for default font", () => {
    expect(measureText(testText)).toEqual(measureText(testText, defaultFont))
    // second call returns cached result
    expect(mockMeasureText).toHaveBeenCalledTimes(1)
  })
  it("returns different lengths for different strings", () => {
    expect(measureText(testText)).not.toEqual(measureText(testText2))
    // one result was cached by the previous test
    expect(mockMeasureText).toHaveBeenCalledTimes(1)
  })
  it("returns different lengths for different fonts", () => {
    expect(measureText(testText)).not.toEqual(measureText(testText, otherFont))
    // one result was cached by the previous test
    expect(mockMeasureText).toHaveBeenCalledTimes(1)
  })
  it("is consistent after multiple strings and fonts", () => {
    expect(measureText(testText)).toEqual(measureText(testText))
    // both results were cached by previous tests
    expect(mockMeasureText).toHaveBeenCalledTimes(0)
  })
})
