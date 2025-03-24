import { Layer } from "leaflet"
import { fromArrayBuffer } from "geotiff"
import GeoRasterLayer from "georaster-layer-for-leaflet"

function isValidRasterType(data: any): data is Uint8Array | Int16Array | Float32Array {
  return data instanceof Uint8Array || data instanceof Int16Array || data instanceof Float32Array
}

/**
 * Creates a GeoTIFF layer from a URL
 * @param url The URL of the GeoTIFF file
 * @returns A promise that resolves to a Leaflet layer or undefined if there's an error
 */
export async function createGeoTIFFLayer(url: string): Promise<Layer | undefined> {
  try {
    // Fetch the GeoTIFF file
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch GeoTIFF: ${response.statusText}`)
    }

    // Convert response to array buffer and parse GeoTIFF
    const arrayBuffer = await response.arrayBuffer()
    const tiff = await fromArrayBuffer(arrayBuffer)
    const image = await tiff.getImage()
    const rasters = await image.readRasters()
    const bounds = image.getBoundingBox()
    const [width, height] = [image.getWidth(), image.getHeight()]

    // Ensure we have a supported TypedArray for the first raster
    if (!isValidRasterType(rasters[0])) {
      throw new Error('Unsupported raster data type')
    }

    // Create and return the layer
    return new GeoRasterLayer({
      georaster: {
        imageData: rasters[0],
        width,
        height,
        noDataValue: 0,
        projection: 4326, // Assuming WGS84 projection
        xmin: bounds[0],
        ymin: bounds[1],
        xmax: bounds[2],
        ymax: bounds[3],
        pixelWidth: (bounds[2] - bounds[0]) / width,
        pixelHeight: (bounds[3] - bounds[1]) / height
      },
      opacity: 0.7,
      resolution: 256,
      pixelValuesToColorFn: values => {
        const value = values[0]
        // Simple grayscale visualization - can be customized based on your needs
        return `rgb(${value}, ${value}, ${value})`
      }
    })
  } catch (error) {
    console.error('Error creating GeoTIFF layer:', error)
    return undefined
  }
}
