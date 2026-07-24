/**
 * Copies the RGB of a source raster pixel into a destination ImageData buffer, painting the sample's
 * screen rectangle. Reads the pixel at (srcX, srcY) from `src` (a `srcWidth`-wide RGBA buffer) and
 * fills the destination rectangle [destX, destX + width) x [destY, destY + height) with it, clamped
 * to the destination bounds the way canvas fillRect would clip. Alpha is written opaque (255); the
 * map layer's element opacity provides the overall transparency.
 */
export function paintRasterSample(
  dest: Uint8ClampedArray, destWidth: number, destHeight: number,
  src: Uint8ClampedArray, srcWidth: number, srcX: number, srcY: number,
  destX: number, destY: number, width: number, height: number
): void {
  const s = (srcY * srcWidth + srcX) * 4
  const r = src[s]
  const g = src[s + 1]
  const b = src[s + 2]
  const xStart = Math.max(destX, 0)
  const yStart = Math.max(destY, 0)
  const xEnd = Math.min(destX + width, destWidth)
  const yEnd = Math.min(destY + height, destHeight)
  for (let py = yStart; py < yEnd; py++) {
    let di = (py * destWidth + xStart) * 4
    for (let px = xStart; px < xEnd; px++) {
      dest[di++] = r
      dest[di++] = g
      dest[di++] = b
      dest[di++] = 255
    }
  }
}
