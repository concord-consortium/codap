import React from "react"
import {AxisPlace} from "../axis/axis-types"
import {GraphPlace} from "../axis-graph-shared"
import {IDotsRef} from "../data-display/data-display-types"

export const PrimaryAttrRoles = ['x', 'y'] as const
export type PrimaryAttrRole = typeof PrimaryAttrRoles[number]
export const TipAttrRoles =
  [...PrimaryAttrRoles, 'rightNumeric', 'topSplit', 'rightSplit', 'legend', 'caption'] as const
export const GraphAttrRoles = [
  ...TipAttrRoles, 'polygon', 'yPlus'] as const
export type GraphAttrRole = typeof GraphAttrRoles[number]
export type IsGraphDropAllowed = (place: GraphPlace, attrId?: string) => boolean

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

export const PlotTypes = ["casePlot", "dotPlot", "dotChart", "scatterPlot"] as const
export type PlotType = typeof PlotTypes[number]

export const kAxisTickLength = 4,
  kAxisGap = 2

export const kGraphClass = "graph-plot"
export const kGraphClassSelector = `.${kGraphClass}`
export const kGraphAdornmentsClass = "graph-adornments-grid"
export const kGraphAdornmentsClassSelector = `.${kGraphAdornmentsClass}`
