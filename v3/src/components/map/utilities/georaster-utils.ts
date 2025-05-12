import { IMapContentModel } from "../models/map-content-model"
import GeoRasterLayer, { GeoRasterLayerClass } from "./georaster-layer-for-leaflet"
import { GeoImage } from './geo-image'
import { GeoRaster } from "./georaster-types"

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
    const xmin = -180
    const xmax = 180
    const ymin = -90
    const ymax = 90

    const xRange = xmax - xmin

    // Calculate the pixelSize in degrees.
    const pixelSize = xRange/width

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
 * Creates or updates a GeoRaster layer. If the url in the model changes while
 * it is being processed, the function will return undefined.
 *
 * @returns A promise that resolves to a Leaflet layer or undefined if the there's an error
 */
export async function createOrUpdateLeafletGeoRasterLayer(mapModel: IMapContentModel) {
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
      if (currentLayer.updateGeoraster(georaster, opacity)) {
        // We were able to update the existing layer with the new GeoRaster
        return
      }

      // The layer is not compatible with the new GeoRaster, so remove it
      currentLayer.remove()
      currentLayer = undefined
    }

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

  } catch (error) {
    console.error("Error initializing GeoRasterLayer", error)
  }
}
