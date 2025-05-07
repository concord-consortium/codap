import { IMapContentModel } from "../models/map-content-model"
import GeoRasterLayer, { GeoRaster, GeoRasterLayerClass } from "./georaster-layer-for-leaflet"
import { GeoImage } from './geo-image'

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

async function getGeoRaster(mapModel: IMapContentModel) {
  const url = mapModel.geoRaster?.url
  if (!url) {
    console.error("No URL provided for georaster")
    return
  }
  try {
    const geoImage = new GeoImage()
    await geoImage.loadFromUrl(url)
    if (url !== mapModel.geoRaster?.url) {
      // The URL has changed since we started the fetch.
      return
    }

    const { width, height } = geoImage

    // assume the image goes from x -180 to -180 y -90 to 90
    // TODO: add a way for the CODAP api call to specify the bounding box of the
    // image.
    const xmin = -180
    const xmax = 180
    const ymin = -90
    const ymax = 90

    const xRange = xmax - xmin

    // Calculate the pixelSize in degrees.
    const pixelSize = xRange/width

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
      width,
      height,
      noDataValue: 0,
      image: geoImage,
      xmin,
      ymin,
      xmax,
      ymax,
      projection: 4326,
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
  let currentLayer: GeoRasterLayerClass | undefined = undefined
  mapModel.leafletMap.eachLayer((existingLayer) => {
    // We need to remove the existing layer if it is a georaster layer
    // This is a bit of a hack. It isn't clear how to tell the type of a layer.
    if ("georaster" in existingLayer) {
      if (!currentLayer) {
        currentLayer = existingLayer as GeoRasterLayerClass
        return
      }

      // We've found an extra layer, remove it
      existingLayer.remove()
    }
  })

  return currentLayer as GeoRasterLayerClass | undefined
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
    let currentLayer = findGeoRasterLayer(mapModel)

    if (currentLayer) {
      if (!currentLayer.updateGeoraster(georaster, opacity)) {
        // The layer is not compatible with the new GeoRaster, so remove it
        currentLayer.remove()
        currentLayer = undefined
      }
    }

    if (!currentLayer) {
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
        debugLevel: 1,
        // Disable caching to see if the map updates
        caching: false,
      })
      layer.addTo(mapModel.leafletMap)
    }
  } catch (error) {
    console.error("Error initializing GeoRasterLayer", error)
  }
}
