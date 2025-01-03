import { graphSnaphsot } from "./image-utils"

describe("graphSnaphsot", () => {
  it("should return a string", async () => {
    const svgElementsToImageOptions = {
      rootEl: document.createElement("div"),
      graphWidth: 100,
      graphHeight: 100,
      graphTitle: "title",
      asDataURL: true
    }
    const result = await graphSnaphsot(svgElementsToImageOptions)
    expect(typeof result).toBe("string")
  })
})
