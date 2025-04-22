// We are only directly using the GeoRater type, not the code this might
// help reduce the size of the bundled code.
import GeoRasterLayer, { GeoRasterLayerOptions } from "georaster-layer-for-leaflet"
import { decodePng, IDecodedPng, IImage32 } from '@lunapaint/png-codec'
import { IMapContentModel } from "../models/map-content-model"

/**
 * This type was determined by trial and error working with the GeoRasterLayer library.
 * It is almost a subset of GeoRaster type used by the library, but even that type
 * doesn't include all of the properties needed by GeoRasterLayer.
 */
interface IGeoRaster {
  pixelWidth: number
  pixelHeight: number
  width: number
  height: number
  noDataValue: number
  // FIXME: Update this to match the expected type
  values: any
  xmin: number
  ymin: number
  xmax: number
  ymax: number
  projection: number
  // FIXME: Update this to match the expected type
  palette: any
  numberOfRasters: number
}

// interface ProfileRow {
//   url: string
//   start: number
//   fetch?: number
//   arrayBuffer?: number
//   decodePng?: number
//   getGeorasterValuesAndPalette?: number
//   newGeoRasterLayer?: number
// }
// let currentProfileRow: ProfileRow | undefined = undefined
// function

// const profileData: ProfileRow[] = []

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

async function getGeoRaster(mapModel: IMapContentModel) {
  const url = mapModel.geoRaster?.url
  if (!url) {
    console.error("No URL provided for georaster")
    return
  }
  try {
    let start = performance.now()
    const response = await fetch(url)
    performance.measure("getGeoraster-fetch", { start })
    if (url !== mapModel.geoRaster?.url) {
      // The URL has changed since we started the fetch.
      return
    }
    start = performance.now()
    const arrayBuffer = await response.arrayBuffer()
    performance.measure("getGeoraster-arrayBuffer", { start })
    if (url !== mapModel.geoRaster?.url) {
      // The URL has changed since we got the arrayBuffer.
      return
    }
    start = performance.now()

    // TODO: add a way to specify the format in the CODAP api
    // check that the image is a PNG
    const uint8Buffer = new Uint8Array(arrayBuffer)
    const png = await decodePng(uint8Buffer, { force32: true})
    performance.measure("getGeoraster-decodePng", { start })
    if (url !== mapModel.geoRaster?.url) {
      // The URL has changed since we started decoding the PNG.
      return
    }

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
    const geoRaster: IGeoRaster = {
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

    // The georaster-layer-for-leaflet library expects a GeoRaster object
    // that is a bit different than the one we created. It has a few extra
    // properties and methods. However these are not actually used by the
    // GeoRasterLayer object.
    return geoRaster as NonNullable<GeoRasterLayerOptions["georaster"]>
  } catch (error) {
    console.error("Error fetching and processing geo raster", error)
  }
}

/**
 * Creates a GeoRaster layer from a the model. If the url in the model changes while
 * it is being processed, the function will return undefined.
 *
 * @returns A promise that resolves to a Leaflet layer or undefined if the there's an error
 */
export async function createLeafletGeoRasterLayer(mapModel: IMapContentModel) {
  try {
    const georaster = await getGeoRaster(mapModel)
    if (!georaster) {
      // The georaster could not be created perhaps because the URL changed
      return
    }

    const layer = new GeoRasterLayer({
      georaster,
      // Add to the overlay pane so it is on top of the base map but below the
      // the other layers that CODAP adds.
      pane: "overlayPane",
      opacity: mapModel.geoRaster?.opacity ?? 0.5,
      // This is how detailed the georaster should be projected on to each Leaflet tile
      // Most tiles are 256x256 some are 512x512. Using 256 shows the squares of the
      // georaster nicely. However when the map is zoomed in and the georaster isn't
      // detailed at that zoom level, it is kind of a waste. However it does expose the
      // exact lines of the georaster "pixels" or samples. That might be useful for students
      // to understand raster data.
      resolution: 256,
      // Uncomment to get more information about the georaster rendering process
      // debugLevel: 2,
    })

    return {
      georaster,
      layer
    }
  } catch (error) {
    console.error("Error initializing GeoRasterLayer", error)
  }
}
