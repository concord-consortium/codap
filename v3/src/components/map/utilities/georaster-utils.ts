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
 * Wraps an async `render` in a coalescing driver that applies back-pressure: at most one render
 * runs at a time. Requests that arrive while a render is in flight do not start a second concurrent
 * render — they set a "dirty" flag so the running driver performs exactly one more render when the
 * current one finishes, picking up the latest state. Any number of requests during a render collapse
 * into a single follow-up. `render` is expected to handle its own errors.
 *
 * During slider animation this turns "fire a fetch/render on every tick and discard the frames that
 * get overtaken" into "render as fast as the pipeline sustains, showing each frame that is started";
 * the frames skipped while a render is in flight are coalesced and never fetched.
 */
export function makeCoalescingRunner(render: () => Promise<void>): () => Promise<void> {
  let running = false
  let dirty = false
  return async function request() {
    dirty = true
    if (running) return
    running = true
    try {
      while (dirty) {
        dirty = false
        await render()
      }
    } finally {
      running = false
    }
  }
}

// One coalescing runner per map so concurrent geoRaster updates to the same map serialize while
// updates to different maps stay independent. Keyed weakly so runners are collected with their map.
const geoRasterRunners = new WeakMap<IMapContentModel, () => Promise<void>>()

/**
 * Called by the map's autorun whenever geoRaster (or its url) changes. Routes through a per-map
 * coalescing runner (see makeCoalescingRunner) so that, during animation, a new fetch/render never
 * starts while one is in flight; intermediate frames are coalesced (never fetched) and the runner
 * renders only the latest once the current frame completes.
 */
export function createOrUpdateLeafletGeoRasterLayer(mapModel: IMapContentModel): Promise<void> {
  // The observing MST autorun re-subscribes to whatever is read synchronously on each call. Read the
  // url here so the subscription is renewed every time — including calls where the coalescing runner
  // returns early because a render is already in flight (and so never reaches the url read inside
  // renderGeoRasterOnce). Without this the autorun would stop firing and the map would freeze after
  // the first coalesced frame.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  mapModel.geoRaster?.url
  let run = geoRasterRunners.get(mapModel)
  if (!run) {
    run = makeCoalescingRunner(() => renderGeoRasterOnce(mapModel))
    geoRasterRunners.set(mapModel, run)
  }
  return run()
}

/**
 * Renders the map's current geoRaster once. Always renders the frame it fetches (it does not bail if
 * the url advances mid-fetch) so no started frame is wasted; the coalescing runner is responsible for
 * following up with the latest url afterward.
 */
async function renderGeoRasterOnce(mapModel: IMapContentModel) {
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

    const { opacity } = mapModel.geoRaster

    const georaster = await getGeoRaster(mapModel)
    if (!georaster) {
      // The georaster could not be created
      return
    }

    if (!mapModel.geoRaster) {
      // The raster was removed while we were fetching; the runner's follow-up render drops the layer.
      return
    }

    // Find the current layer if it exists
    // We search for the layer here after the getGeoRaster call incase the layers were changed
    // while we were waiting for the georaster to be created.
    let currentLayer = findGeoRasterLayer(mapModel)

    if (currentLayer) {
      // The steady-state animation path: reuse the existing layer and redraw its tiles.
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
