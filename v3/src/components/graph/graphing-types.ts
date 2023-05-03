import React from "react"
import {AxisPlace} from "../axis/axis-types"
import {GraphPlace} from "../axis-graph-shared"
import {DotsElt} from "./d3-types"

export const PrimaryAttrRoles = ['x', 'y'] as const
export type PrimaryAttrRole = typeof PrimaryAttrRoles[number]
export const TipAttrRoles =
  [...PrimaryAttrRoles, 'rightNumeric', 'topSplit', 'rightSplit', 'legend', 'caption'] as const
export const GraphAttrRoles = [
  ...TipAttrRoles, 'polygon', 'yPlus'] as const
export type GraphAttrRole = typeof GraphAttrRoles[number]
export type IsGraphDropAllowed = (place: GraphPlace, attrId?: string) => boolean

export type IDotsRef = React.MutableRefObject<DotsElt>

export const attrRoleToAxisPlace: Partial<Record<GraphAttrRole, AxisPlace>> = {
  x: "bottom",
  y: "left",
  rightNumeric: "rightNumeric",
  rightSplit: "rightCat",
  topSplit: "top"
}
export const attrRoleToGraphPlace: Partial<Record<GraphAttrRole, GraphPlace>> = {
  ...attrRoleToAxisPlace,
  yPlus: "yPlus",
  legend: "legend"
}

export const axisPlaceToAttrRole: Record<AxisPlace, GraphAttrRole> = {
  bottom: "x",
  left: "y",
  top: "topSplit",
  rightCat: "rightSplit",
  rightNumeric: "rightNumeric"
}

export const graphPlaceToAttrRole: Record<GraphPlace, GraphAttrRole> = {
  ...axisPlaceToAttrRole,
  legend: "legend",
  plot: "legend",
  yPlus: "yPlus"
}

export interface PlotProps {
  dotsRef: IDotsRef
  enableAnimation: React.MutableRefObject<boolean>
}

// One element of the data array assigned to the points
export interface InternalizedData {
  xAttributeID: string,
  yAttributeID: string,
  cases:string[]
}

export type Point = { x: number, y: number }
export type CPLine = { slope: number, intercept: number, pivot1?: Point, pivot2?: Point }
export const kNullPoint = {x: -999, y: -999}

export interface Rect {
  x: number, y: number, width: number, height: number
}

export interface rTreeRect { x: number, y: number, w: number, h: number }

export interface counterProps {
  counter:number,
  setCounter: React.Dispatch<React.SetStateAction<number>>
}

export const
  transitionDuration = 1000,
  pointRadiusMax = 10,
  pointRadiusMin = 3,
  pointRadiusLogBase = 2.0, // reduce point radius from max by log of (num. cases) base (LogBase).
  pointRadiusSelectionAddend = 1,
  hoverRadiusFactor = 1.5,
  kGraphFont = '12px sans-serif',
  kChoroplethHeight = 16

export const PlotTypes = ["casePlot", "dotPlot", "dotChart", "scatterPlot"] as const
export type PlotType = typeof PlotTypes[number]

export const kGraphClass = "graph-plot"
export const kGraphClassSelector = `.${kGraphClass}`
