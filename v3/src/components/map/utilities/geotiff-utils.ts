// TODO: clean this import up. It is possible to use an import
// but then the types are wrong, and there is an old eslint rule which doesn't
// allow duplicate imports: a normal one and one for types
// There is a newer import rule we can use instead which allows this.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const parseGeoraster = require("georaster")
import type { GeoRaster } from "georaster"

import GeoRasterLayer from "georaster-layer-for-leaflet"

import L from "leaflet"
import "leaflet-geotiff-2"
import { decodePng, IDecodedPng, IImage32 } from '@lunapaint/png-codec'

/**
 * Convert a color representing by an array of r,g,b to single number.
 * This number can be used in a lookup tables.
 */
function getIntFromColors(color: Uint8Array, offset = 0) {
  // eslint-disable-next-line no-bitwise
  return color[offset] << 16 | color[offset+1] << 8 | color[offset+2]
}

/**
 * Convert png values which are interleaved rgba,
 * to an indexed raster using a palette.
 * The result looks like:
 * ```js
 * [ // an array of rasters
 *   [ // an array of rows
 *     [ a, b, c, ...], // each row has a value for the color
 *     ...
 *   ]
 * ]
 * This function could be updated to also handle pngs that don't
 * have palettes.
 */
function getGeorasterValues(png: IDecodedPng<IImage32>) {
  const { image, palette } = png

  if (!palette) {
    console.error("Can't handle images without palettes")
    return []
  }

  // The PNG library does not provide the pixels with their
  // palette indexes, so we have to convert the r,g,b colors
  // back to the palette indexes.

  // Make a lookup table so we can quickly go from the color
  // returned by the png library to the index in the palette.
  const paletteMap: Record<number, number> = {}
  for (let i = 0; i< palette.size; i++) {
    const pngColor = palette.getRgb(i)
    paletteMap[getIntFromColors(pngColor)] = i
  }

  const values = []

  for (let y = 0; y < image.height; y++) {
    const row: number[] = []
    values.push(row)
    for (let x = 0; x < image.width; x++) {
      // Each pixel is 4 bytes (R,G,B,A)
      const idx = (y * image.width + x) * 4

      row.push(paletteMap[getIntFromColors(image.data, idx)])
    }
  }

  // An array of the values is returned because that is what the georaster
  // library expects. If we support full r,g,b images then there should be
  // a separate set of values for red, and one for green, and one for blue.
  return [ values ]
}

function getGeoPalette(png: IDecodedPng<IImage32>) {
  const { palette } = png

  if (!palette) throw new Error("Need a palette")

  const geoPalette: Uint8Array[] = []

  for (let i = 0; i< palette.size; i++) {
    const pngColor = palette.getRgb(i)
    // We have to copy the color because the palette seems to re-use the
    // same array
    const geoColor = new Uint8Array(4)
    geoColor[0] = pngColor[0]
    geoColor[1] = pngColor[1]
    geoColor[2] = pngColor[2]
    geoColor[3] = 255
    geoPalette.push(geoColor)
  }

  return geoPalette
}


async function getGeoraster(url: string) {
  try {
    console.log(`--- getGeoraster start`)
    const response = await fetch(url)
    console.log(`--- response`, response)
    const arrayBuffer = await response.arrayBuffer()
    console.log(` -- arrayBuffer`, arrayBuffer)

    // TODO: add a way to specify the format in the CODAP api
    if (url.match(/.*PNG.*/)) {
      const uint8Buffer = new Uint8Array(arrayBuffer)
      const png = await decodePng(uint8Buffer, { force32: true})
      console.log(` -- decodePng finished`)

      // assume the image goes from x -180 to -180 y -90 to 90
      // TODO: add a way for the CODAP api call to specify the bounding box of the
      // image.
      const xmin = -180
      const xmax = 180
      const ymin = -90
      const ymax = 90

      const xRange = xmax - xmin

      // Calculate the pixelSize in degrees.
      const pixelSize = xRange/png.image.width

      // We manually construct the georaster instead of using the parseGeoraster function.
      // The parseGeoraster function doesn't support PNGs directly. It is necessary to
      // construct an object with the image bytes and send that. This object is basically
      // the same thing that parseGeoraster returns.
      // By skipping parseGeoraster the code should be a bit faster and perhaps we can
      // reduce the size of the code this new feature adds to CODAP.

      // The GeoRaster type is close to what we need to provide, but it is missing
      // the palette, and numberOfRasters. It also has the wrong type for the
      // values.
      // TODO: look for a type in the georaster-layer-for-leaflet library instead
      const georaster: GeoRaster & { palette: any, numberOfRasters: number } = {
        pixelWidth: pixelSize,
        pixelHeight: pixelSize,

        width: png.image.width,
        height: png.image.height,
        noDataValue: 0,
        // This looks typed wrong
        values: getGeorasterValues(png) as any,
        xmin,
        ymin,
        xmax,
        ymax,
        projection: 4326,
        palette: getGeoPalette(png),
        numberOfRasters: 1,
      }
      console.log(` -- georaster`, georaster)
      return georaster
    } else {
      const georaster = await parseGeoraster(arrayBuffer)
      console.log(` -- georaster`, georaster)
      return georaster
    }
  } catch (error) {
    console.error("Error fetching and processing geoTIFF", error)
  }
}

/**
 * Creates a GeoTIFF layer from a URL
 * @param url The URL of the GeoTIFF file
 * @returns A promise that resolves to a Leaflet layer or undefined if there's an error
 */
export async function createGeoTIFFLayerWithGeorasterLayerForLeaflet(url: string) {
  try {
    const georaster = await getGeoraster(url)

    return {
      georaster,
      layer: new GeoRasterLayer({
        georaster,
        // TODO: this should probably be configurable by the plugin API and the CODAP user
        opacity: 0.5,
        // This is how detailed the georaster should be projected on to each Leaflet tile
        // Most tiles are 256x256 some are 512x512. Using 256 shows the squares of the
        // georaster nicely. However when the map is zoomed in and the georaster isn't
        // detailed at that zoom level, it is kind of a waste. However it does expose the
        // exact lines of the georaster "pixels" or samples. That might be useful for students
        // to understand raster data.
        resolution: 256,
        // Uncomment to get more information about the georaster rendering process
        // debugLevel: 2
      })
    }
  } catch (error) {
    console.error("Error initializing GeoTIFFLayer", error)
  }
}

type ColorArray = [number, number, number, number][]

// Modified version of leaflet-geotiff-rgb
class ColorMapRenderer extends (L as any).LeafletGeotiffRenderer {
  colors: ColorArray

  constructor(options: any) {
    super()
    this.colors = options.colors ?? []
    this.initialize(options)
  }

  initialize(options: any) {
    L.setOptions(this, options)
    this.name = "Color Map Canvas Renderer"
  }

  getColor(value: number): [number, number, number, number] {
    const color = this.colors[value]
    if (!color) return [0, 0, 0, 0] // transparent
    return [...color]
  }

  render(raster: any, _canvas: any, ctx: any, args: any) {
    const rasterImageData = ctx.createImageData(raster.width, raster.height)

    // This code is taken from leaflet-geotiff-rgb and is used to render in grayscale
    if (!this.options.bandMaxVal) {
      let maxVal = 0
      for (let i = 0; i < raster.data.length; i++) {
        // get max value per band
        //  first return sorted array of values that are not NaN
        const srt = raster.data[i]
          .filter(function(v: any) {
            return !isNaN(v)
          })
          .sort()
        let cMax = srt[srt.length - 1]
        if (
          this.options.cutoffBrightest &&
          this.options.cutoffBrightest > 0 &&
          this.options.cutoffBrightest < 1
        ) {
          cMax =
            srt[
              srt.length -
                1 -
                Math.round(srt.length * this.options.cutoffBrightest)
            ]
        }
        if (cMax > maxVal) {
          maxVal = cMax
        }
        this.options.bandMaxVal = maxVal
      }
    }
    const scaleMax = this.options.bandMaxVal > 0 ? this.options.bandMaxVal : 255
    function scale(val: number) {
      return Math.round((val / scaleMax) * 255)
    }

    // Determine colors for each pixel
    for (let i = 0, j = 0; i < rasterImageData.data.length; i += 4, j += 1) {
      if (this.colors) {
        const color = this.getColor(raster.data[0][j])
        rasterImageData.data[i] = color[0]
        rasterImageData.data[i + 1] = color[1]
        rasterImageData.data[i + 2] = color[2]
        rasterImageData.data[i + 3] = color[3]
      } else {
        // If no color map is specified, use grayscale
        rasterImageData.data[i] = scale(raster.data[0][j]) // R value
        rasterImageData.data[i + 1] = scale(raster.data[0][j]) // G value
        rasterImageData.data[i + 2] = scale(raster.data[0][j]) // B value
        rasterImageData.data[i + 3] = raster.data[3][j] ?? 255 // A value
      }
    }

    const imageData = this.parent.transform(rasterImageData, args)
    ctx.putImageData(imageData, args.xStart, args.yStart)
  }
}

export async function createGeoTIFFLayerWithLeafletGeottif2(url: string) {
  try {
    // const georaster = await getGeoraster(url)
    // const colors = georaster.palette

    const layer = L.leafletGeotiff(url, {
      // renderer: new ColorMapRenderer({ colors }),
      renderer: new ColorMapRenderer({}),
      opacity: 0.7
    })

    return layer
  } catch (error) {
    console.error("Error initializing GeoTIFFLayer", error)
  }
}

// Creates a layer to display a PNG or JPEG
export function createImageLayer(url: string) {
  const latLongBounds = L.latLngBounds([[-90, -180], [90, 180]])
  return L.imageOverlay(url, latLongBounds, {
    opacity: 0.5
  })
}
