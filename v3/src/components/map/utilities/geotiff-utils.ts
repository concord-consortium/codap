// eslint-disable-next-line @typescript-eslint/no-require-imports
const parseGeoraster = require("georaster")
import GeoRasterLayer from "georaster-layer-for-leaflet"
import { Layer } from "leaflet"

/**
 * Creates a GeoTIFF layer from a URL
 * @param url The URL of the GeoTIFF file
 * @returns A promise that resolves to a Leaflet layer or undefined if there's an error
 */
export async function createGeoTIFFLayer(url: string): Promise<Layer | undefined> {
  try {
    const response = await fetch(url)
    console.log(`--- response`, response)
    const arrayBuffer = await response.arrayBuffer()
    console.log(` -- arrayBuffer`, arrayBuffer)
    const georaster = await parseGeoraster(arrayBuffer)
    console.log(` -- georaster`, georaster)

    return new GeoRasterLayer({
      georaster,
      opacity: 0.7
    })
  } catch (error) {
    console.error("Error initializing GeoTIFFLayer", error)
  }
}
