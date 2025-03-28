declare module 'georaster' {
  interface GeoRaster {
    pixelWidth: number
    pixelHeight: number
    width: number
    height: number
    noDataValue: number
    values: number[][]
    xmin: number
    ymin: number
    xmax: number
    ymax: number
    projection: number
  }

  /**
   * Parses a GeoTIFF file from an ArrayBuffer into a GeoRaster object
   * @param arrayBuffer The ArrayBuffer containing the GeoTIFF data
   * @returns A promise that resolves to a GeoRaster object
   */
  export function parseGeoraster(arrayBuffer: ArrayBuffer): Promise<GeoRaster>
}
