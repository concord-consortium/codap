declare module 'georaster-layer-for-leaflet' {
  import { Layer, LayerOptions } from 'leaflet'

  interface GeoRaster {
    pixelWidth: number
    pixelHeight: number
    width: number
    height: number
    noDataValue: number
    projection: number
    xmin: number
    ymin: number
    xmax: number
    ymax: number
    values?: number[][]
    imageData?: Uint8Array | Float32Array | Int16Array
  }

  interface GeoRasterLayerOptions extends LayerOptions {
    georaster: GeoRaster
    opacity?: number
    resolution?: number
    pixelValuesToColorFn?: (values: number[]) => string
  }

  export default class GeoRasterLayer extends Layer {
    constructor(options: GeoRasterLayerOptions)
    setOpacity(opacity: number): this
    getOpacity(): number
  }
}
