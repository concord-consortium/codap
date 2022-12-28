import React from "react"
import {AxisPlace, AxisPlaces} from "../axis/axis-types"

export const GraphPlaces = [...AxisPlaces, "plot", "legend"] as const
export type GraphPlace = typeof GraphPlaces[number]
export const PrimaryAttrRoles = ['x', 'y'] as const
export const TipAttrRoles = [...PrimaryAttrRoles, 'legend', 'caption', 'y2'] as const
export const GraphAttrRoles = [
  ...TipAttrRoles, 'polygon', 'topSplit', 'rightSplit'] as const
export type GraphAttrRole = typeof GraphAttrRoles[number]


export const attrRoleToAxisPlace: Partial<Record<GraphAttrRole, AxisPlace>> = {
  x: "bottom",
  y: "left",
  y2: "right",
  rightSplit: "right",
  topSplit: "top"
}
export const attrRoleToGraphPlace: Partial<Record<GraphAttrRole, GraphPlace>> = {
  ...attrRoleToAxisPlace,
  legend: "legend"
}

export const axisPlaceToAttrRole: Record<AxisPlace, GraphAttrRole> = {
  bottom: "x",
  left: "y",
  top: "topSplit",
  right: "y2",  // Todo: how to deal with 'rightSplit'?
}

export const graphPlaceToAttrRole = (graphPlace: GraphPlace) => {
  return AxisPlaces.includes(graphPlace as AxisPlace) ? axisPlaceToAttrRole[graphPlace as AxisPlace] : 'legend'
}

export interface PlotProps {
  dotsRef: React.RefObject<SVGSVGElement>
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

export const kTitleBarHeight = 25,
  transitionDuration = 1000,
  pointRadiusMax = 10,
  pointRadiusMin = 3,
  pointRadiusLogBase = 2.0, // reduce point radius from max by log of (num. cases) base (LogBase).
  pointRadiusSelectionAddend = 1,
  hoverRadiusFactor = 1.5,
  kGraphFont = '12px sans-serif'

export const PlotTypes = ["casePlot", "dotPlot", "dotChart", "scatterPlot"] as const
export type PlotType = typeof PlotTypes[number]

export const kGraphClass = "graph-plot"
export const kGraphClassSelector = `.${kGraphClass}`
