import { paintRasterSample } from "./raster-paint"

// Build a `width`-wide source RGBA buffer from [r,g,b] triples (alpha filled to 255).
function makeSrc(width: number, pixels: Array<[number, number, number]>): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(pixels.length * 4)
  pixels.forEach(([r, g, b], i) => {
    buf[i * 4] = r
    buf[i * 4 + 1] = g
    buf[i * 4 + 2] = b
    buf[i * 4 + 3] = 255
  })
  return buf
}

// Read the RGBA of destination pixel (x, y) from a `width`-wide buffer.
function pixel(dest: Uint8ClampedArray, width: number, x: number, y: number) {
  const i = (y * width + x) * 4
  return [dest[i], dest[i + 1], dest[i + 2], dest[i + 3]]
}

describe("paintRasterSample", () => {
  it("fills the rect with the source pixel's RGB and opaque alpha, leaving other pixels untouched", () => {
    const src = makeSrc(2, [[255, 0, 0], [0, 255, 0]]) // (0,0)=red, (1,0)=green
    const dest = new Uint8ClampedArray(4 * 4 * 4)      // 4x4
    // paint source (1,0)=green over the dest rect at (1,1), size 2x2
    paintRasterSample(dest, 4, 4, src, 2, 1, 0, 1, 1, 2, 2)
    expect(pixel(dest, 4, 1, 1)).toEqual([0, 255, 0, 255])
    expect(pixel(dest, 4, 2, 1)).toEqual([0, 255, 0, 255])
    expect(pixel(dest, 4, 1, 2)).toEqual([0, 255, 0, 255])
    expect(pixel(dest, 4, 2, 2)).toEqual([0, 255, 0, 255])
    // pixels outside the rect are untouched
    expect(pixel(dest, 4, 0, 0)).toEqual([0, 0, 0, 0])
    expect(pixel(dest, 4, 3, 3)).toEqual([0, 0, 0, 0])
  })

  it("clips at the left/top edges when destX/destY are negative", () => {
    const src = makeSrc(1, [[10, 20, 30]])
    const dest = new Uint8ClampedArray(3 * 3 * 4)
    // rect starts at (-1,-1), size 2x2 -> only (0,0) is in bounds
    paintRasterSample(dest, 3, 3, src, 1, 0, 0, -1, -1, 2, 2)
    expect(pixel(dest, 3, 0, 0)).toEqual([10, 20, 30, 255])
    expect(pixel(dest, 3, 1, 0)).toEqual([0, 0, 0, 0])
    expect(pixel(dest, 3, 0, 1)).toEqual([0, 0, 0, 0])
  })

  it("clips at the right/bottom edges", () => {
    const src = makeSrc(1, [[1, 2, 3]])
    const dest = new Uint8ClampedArray(2 * 2 * 4)
    // rect at (1,1), size 3x3 -> only (1,1) is in bounds
    paintRasterSample(dest, 2, 2, src, 1, 0, 0, 1, 1, 3, 3)
    expect(pixel(dest, 2, 1, 1)).toEqual([1, 2, 3, 255])
    expect(pixel(dest, 2, 0, 0)).toEqual([0, 0, 0, 0])
  })

  it("writes nothing when the rect is entirely out of bounds", () => {
    const src = makeSrc(1, [[9, 9, 9]])
    const dest = new Uint8ClampedArray(2 * 2 * 4)
    const untouched = Uint8ClampedArray.from(dest)
    paintRasterSample(dest, 2, 2, src, 1, 0, 0, 5, 5, 2, 2)    // off bottom-right
    expect(dest).toEqual(untouched)
    paintRasterSample(dest, 2, 2, src, 1, 0, 0, -5, -5, 2, 2)  // off top-left
    expect(dest).toEqual(untouched)
  })

  it("paints a single pixel for a 1x1 rect", () => {
    const src = makeSrc(2, [[0, 0, 0], [100, 110, 120]])
    const dest = new Uint8ClampedArray(2 * 2 * 4)
    paintRasterSample(dest, 2, 2, src, 2, 1, 0, 0, 0, 1, 1)
    expect(pixel(dest, 2, 0, 0)).toEqual([100, 110, 120, 255])
    expect(pixel(dest, 2, 1, 0)).toEqual([0, 0, 0, 0])
  })

  it("indexes the source as (srcY * srcWidth + srcX)", () => {
    // 2x2 source: (0,0),(1,0),(0,1),(1,1)
    const src = makeSrc(2, [[1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4]])
    const dest = new Uint8ClampedArray(1 * 1 * 4)
    paintRasterSample(dest, 1, 1, src, 2, 1, 1, 0, 0, 1, 1) // source (1,1) -> [4,4,4]
    expect(pixel(dest, 1, 0, 0)).toEqual([4, 4, 4, 255])
  })
})
