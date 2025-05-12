import type { GridLayerOptions, Coords, DoneCallback, LatLngBounds } from "leaflet"
import { GeoImage } from "../geo-image"

export type DebugLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface GeoRasterLayerOptions extends GridLayerOptions {
  resolution?: number | { [key: number]: number };
  debugLevel?: DebugLevel;
  bounds?: LatLngBounds;
  caching?: boolean;
  georaster: GeoRaster;
}

export interface DrawTileOptions {
  tile: HTMLCanvasElement;
  coords: Coords;
  context: CanvasRenderingContext2D;
  done: DoneCallback;
  resolution: number;
}

// note: Tile is taken from leaflets `InternalTiles` type and should not be modified.  - SFR 2021-01-19
export type Tile = {
  active?: boolean;
  coords: Coords;
  current: boolean;
  el: HTMLCanvasElement;
  loaded?: Date;
  retain?: boolean;
}

export type GeoRasterKeys = keyof GeoRaster

export interface GeoRaster {
  height: number;
  noDataValue: null | undefined | number | typeof NaN;
  pixelHeight: number;
  pixelWidth: number;
  projection: number;
  image: GeoImage;
  width: number;
  xmax: number;
  xmin: number;
  ymax: number;
  ymin: number;
}

export interface CustomCSSStyleDeclaration extends CSSStyleDeclaration {
  WebkitBackfaceVisibility?: string
}
