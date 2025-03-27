// eslint-disable-next-line @typescript-eslint/no-require-imports
const parseGeoraster = require("georaster")
import GeoRasterLayer from "georaster-layer-for-leaflet"

import L from "leaflet"
import "leaflet-geotiff-2"
import { fromArrayBuffer } from "geotiff"

/**
 * Creates a GeoTIFF layer from a URL
 * @param url The URL of the GeoTIFF file
 * @returns A promise that resolves to a Leaflet layer or undefined if there's an error
 */
export async function createGeoTIFFLayer(url: string) {
  try {
    const response = await fetch(url)
    console.log(`--- response`, response)
    const arrayBuffer = await response.arrayBuffer()
    console.log(` -- arrayBuffer`, arrayBuffer)
    const georaster = await parseGeoraster(arrayBuffer)
    console.log(` -- georaster`, georaster)

    return {
      georaster,
      layer: new GeoRasterLayer({
        georaster,
        opacity: 0.7
      })
    }
  } catch (error) {
    console.error("Error initializing GeoTIFFLayer", error)
  }
}

type ColorArray = [number, number, number][]

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
      return [...color, 255]
    }

  render(raster: any, _canvas: any, ctx: any, args: any) {
    const rasterImageData = ctx.createImageData(raster.width, raster.height)

    // compute max band max value if not set yet
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
        let cMax = srt[srt.length - 1];
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

export async function createGeoTIFFLayer2(url: string) {
  try {
    const response = await fetch(url)
    console.log(`--- response`, response)
    const arrayBuffer = await response.arrayBuffer()
    console.log(` -- arrayBuffer`, arrayBuffer)
    const tiff = await fromArrayBuffer(arrayBuffer)
    console.log(` -- georaster`, tiff)
    const image = await tiff.getImage()
    console.log(` -- image`, image)
    const colorMap = image.fileDirectory.ColorMap

    const colors: ColorArray = []

    if (colorMap) {
      const nColors = colorMap.length / 3
      for (let i = 0; i < nColors; i++) {
        colors.push([
          // eslint-disable-next-line no-bitwise
          colorMap[i] >> 8,
          // eslint-disable-next-line no-bitwise
          colorMap[i + nColors] >> 8,
          // eslint-disable-next-line no-bitwise
          colorMap[i + 2 * nColors] >> 8
        ])
      }
    }

    const layer = L.leafletGeotiff(url, {
      renderer: new ColorMapRenderer({ colors }),
      // renderer: new ColorMapRenderer({}),
      opacity: 0.7
    })

    return layer
  } catch (error) {
    console.error("Error initializing GeoTIFFLayer", error)
  }
}
