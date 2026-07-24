import { GeoImage } from "./geo-image"

// Stand in for a loaded <img>: prepare() reads naturalWidth/naturalHeight and drawImage()s it.
// jest-canvas-mock backs the canvas so getImageData returns a zero-filled buffer of the right size.
function fakeLoadedImage(width: number, height: number): HTMLImageElement {
  const img = new Image()
  Object.defineProperty(img, "complete", { value: true })
  Object.defineProperty(img, "naturalWidth", { value: width })
  Object.defineProperty(img, "naturalHeight", { value: height })
  return img
}

describe("GeoImage", () => {
  it("pixelData throws before prepare() has been called", () => {
    const geoImage = new GeoImage()
    expect(() => geoImage.pixelData).toThrow(/prepare/)
  })

  it("pixelData returns the source RGBA buffer (width * height * 4) after prepare()", () => {
    const geoImage = new GeoImage()
    geoImage.img = fakeLoadedImage(3, 2)
    geoImage.prepare()
    const data = geoImage.pixelData
    expect(data).toBeInstanceOf(Uint8ClampedArray)
    expect(data.length).toBe(3 * 2 * 4)
  })

  it("prepare() is idempotent — repeated calls keep the same pixel buffer", () => {
    const geoImage = new GeoImage()
    geoImage.img = fakeLoadedImage(2, 2)
    geoImage.prepare()
    const first = geoImage.pixelData
    geoImage.prepare()
    expect(geoImage.pixelData).toBe(first)
  })
})
