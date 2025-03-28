// types/leaflet-geotiff.d.ts
import * as L from "leaflet"

declare module "leaflet" {
  interface LeafletGeotiffOptions {
    band?: number
    name?: string
    displayMin?: number
    displayMax?: number
    opacity?: number
    renderer: any // can refine this if needed
  }

  function leafletGeotiff(
    url: string | ArrayBuffer,
    options: LeafletGeotiffOptions
  ): L.Layer

  namespace LeafletGeotiff {
    class rgb {
      constructor(options: {
        r: number
        g: number
        b: number
        alpha?: number
        noDataValue?: number
      })
    }

    class Plotty {
      constructor(options: {
        colorScale: string
        displayMin?: number
        displayMax?: number
        clampLow?: boolean
        clampHigh?: boolean
      })
    }
  }
}
