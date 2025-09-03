import { Selection } from "d3"

export interface ILabel {
  label?: Selection<HTMLDivElement, unknown, null, undefined>
}

export interface ILineCoords {
  x1: number
  x2: number
  y1: number
  y2: number
}

export interface ILineSpecs {
  isVertical: boolean
  lineClass: string
  lineId: string
  offset?: number
  x1: number
  x2: number
  y1: number
  y2: number
}

export interface IRange {
  min?: number
  max?: number
}

export interface IRangeSpecs {
  cellCounts: Record<string, number>
  coords: ILineCoords
  coverClass: string
  isVertical: boolean
  lineClass: string
  lineOffset?: number
  rangeMin: number
  rangeMax: number
  rectOffset?: number
  secondaryAxisX?: number
  secondaryAxisY?: number
  extentForSecondaryAxis?: string
}

export interface IRectSpecs {
  isVertical: boolean,
  rectOffset?: number
  width: number | string
  height: number | string
  x: number
  y: number
}

export interface IValue {
  line?: Selection<SVGLineElement, unknown, null, undefined>
  cover?: Selection<SVGLineElement, unknown, null, undefined>
  text?: Selection<SVGTextElement, unknown, null, undefined>
  divText?: Selection<HTMLDivElement, unknown, HTMLElement, undefined>
  range?: Selection<SVGRectElement, unknown, null, undefined>
  rangeMin?: Selection<SVGLineElement, unknown, null, undefined>
  rangeMax?: Selection<SVGLineElement, unknown, null, undefined>
  rangeMinCover?: Selection<SVGLineElement, unknown, null, undefined>
  rangeMaxCover?: Selection<SVGLineElement, unknown, null, undefined>
  label?: Selection<HTMLDivElement, unknown, null, undefined>
}
