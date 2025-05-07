import type { GridLayerOptions, Coords, CRS, DoneCallback, LatLngBounds, Transformation } from "leaflet"
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson"
import { GeoImage } from "../geo-image"

export type MaskStrategy = "inside" | "outside"

export type PixelValuesToColorFn = (values: number[]) => string | undefined

export type DebugLevel = 0 | 1 | 2 | 3 | 4 | 5

export type ResampleMethod = "bilinear" | "nearest"

export type SimplePoint = {
  x: number;
  y: number;
}

export type Mask = string | Feature | FeatureCollection | Polygon | MultiPolygon

export interface GeoRasterLayerOptions extends GridLayerOptions {
  resolution?: number | { [key: number]: number };
  debugLevel?: DebugLevel;
  bounds?: LatLngBounds;
  mask?: Mask;
  mask_srs?: string | number;
  mask_strategy?: MaskStrategy;
  caching?: boolean;
  georaster: GeoRaster;
}

export type GetRasterOptions = {
  innerTileTopLeftPoint: SimplePoint;
  heightOfSampleInScreenPixels: number;
  widthOfSampleInScreenPixels: number;
  zoom: number;
  numberOfSamplesAcross: number;
  numberOfSamplesDown: number;
  ymax: number;
  xmin: number;
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

export type GeoRasterValues = number[][][]

export type GeoRasterKeys =
  | "height"
  | "width"
  | "noDataValue"
  | "pixelHeight"
  | "pixelWidth"
  | "projection"
  | "xmin"
  | "xmax"
  | "ymin"
  | "ymax"

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

export interface CustomTransformation extends Transformation {
  _a?: number,
  _b?: number,
  _c?: number,
  _d?: number
}

export interface CustomCRS extends CRS {
  transformation?: CustomTransformation
}
