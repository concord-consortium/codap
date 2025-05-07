// We are only directly using the GeoRater type, not the code this might
// help reduce the size of the bundled code.
import { decodePng, IDecodedPng, IImage32 } from '@lunapaint/png-codec'
import { IMapContentModel } from "../models/map-content-model"
import GeoRasterLayer, { GeoRaster } from "./georaster-layer-for-leaflet"

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
    const geoRaster: GeoRaster = {
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
    return geoRaster
  } catch (error) {
    console.error("Error fetching and processing geo raster", error)
  }
}

function findGeoRasterLayer(mapModel: IMapContentModel) {
  if (!mapModel.leafletMap) {
    return
  }

  // Find the current layer if it exists
  // And also clean up any extra geo raster layers
  let currentLayer: any = undefined
  mapModel.leafletMap.eachLayer((existingLayer) => {
    // We need to remove the existing layer if it is a georaster layer
    // This is a bit of a hack. It isn't clear how to tell the type of a layer.
    if ("georasters" in existingLayer) {
      if (!currentLayer) {
        currentLayer = existingLayer
        return
      }

      // We've found an extra layer, remove it
      existingLayer.remove()
    }
  })

  return currentLayer
}

/**
 * Creates a GeoRaster layer from a the model. If the url in the model changes while
 * it is being processed, the function will return undefined.
 *
 * @returns A promise that resolves to a Leaflet layer or undefined if the there's an error
 */
export async function createLeafletGeoRasterLayer(mapModel: IMapContentModel) {
  try {

    if (!mapModel.leafletMap) {
      return
    }

    if (!mapModel.geoRaster) {
      // Remove the layer if it exists
      const existingLayer = findGeoRasterLayer(mapModel)
      if (existingLayer) {
        existingLayer.remove()
      }
      return
    }

    const { url, opacity } = mapModel.geoRaster

    const georaster = await getGeoRaster(mapModel)
    if (!georaster) {
      // The georaster could not be created perhaps because the URL changed
      return
    }

    if (url !== mapModel.geoRaster?.url) {
      // The URL has changed since we started getting the geoRaster.
      // Bail out, so we don't take time away from processing the new one.
      return
    }

    // Find the current layer if it exists
    // We search for the layer here after the getGeoRaster call incase the layers were changed
    // while we were waiting for the georaster to be created.
    // TODO: I can't figure out the typing for the GeoRasterLayer, it is like a class but
    // really it is an object with an initializer function based on the Leaflet `typeof L.Class`
    let currentLayer = findGeoRasterLayer(mapModel)

    if (currentLayer) {
      // Make sure the current layer can be updated
      if (
        currentLayer.georasters.length !== 1 ||
        currentLayer.georasters[0].width !== georaster.width ||
        currentLayer.georasters[0].height !== georaster.height ||
        currentLayer.georasters[0].pixelWidth !== georaster.pixelWidth ||
        currentLayer.georasters[0].pixelHeight !== georaster.pixelHeight ||
        currentLayer.options.opacity !== opacity
      ) {
        // The layer is not the same size as the new geoRaster, so remove it
        currentLayer.remove()
        currentLayer = undefined
      }
    }

    if (currentLayer) {
      currentLayer.georasters[0] = georaster
      currentLayer.palette = georaster.palette
      currentLayer.rasters = georaster.values

      // TODO: we need to update the opacity of the layer here too
      // Or just start over if the opacity has changed

      const tiles = currentLayer.getActiveTiles()
      console.log("Updating existing GeoRasterLayer with new georaster. Num tiles", tiles.length)
      if (!tiles) {
        console.error("No active tiles available")
        return
      }

      // Note: The unreleased version of the georaster-layer-for-leaflet library caches the tiles
      // If we start using that we'll need to deal with the cache correctly in this case.
      // Otherwise `GeoRasterLayer.createTile` will return old tiles that haven't been updated
      // new geoRaster.
      //
      // I think this can be tested by changing the zoom level, remembering what the image looks like,
      // then change the zoom level back.
      // Then change the image being viewed with the slider. And then change the zoom level again and see
      // if the resulting image has been updated or still looks like the remembered image.
      //
      // Currently this isn't a problem because the tiles are not cached.
      // Rather than using the unreleased version of the library, it'd probably be better to make our own
      // version that is less flexible, more compact, and we can optimize it better.

      tiles.forEach((tile: any) => {
        const { coords, el } = tile
        const wrappedCoords = currentLayer._wrapCoords(coords)
        const resolution = currentLayer._getResolution(wrappedCoords.z)

        currentLayer.drawTile({ tile: el, coords: wrappedCoords, resolution, context: el.getContext("2d") })
      })
    } else {
      const layer = new GeoRasterLayer({
        georaster,
        // Add to the overlay pane so it is on top of the base map but below the
        // the other layers that CODAP adds.
        pane: "overlayPane",
        opacity: mapModel.geoRaster?.opacity ?? 0.5,
        // This is how detailed the georaster should be projected on to each Leaflet tile
        // Most tiles are 256x256 some are 512x512. Using 256 shows the squares of the
        // georaster nicely. It might be OK to go down to 128 or even 64.
        resolution: 256,
        // Uncomment to get more information about the georaster rendering process
        // debugLevel: 2,
        // Disable caching to see if the map updates
        caching: false,
      })
      layer.addTo(mapModel.leafletMap)
    }
  } catch (error) {
    console.error("Error initializing GeoRasterLayer", error)
  }
}
