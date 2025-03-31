import React from "react"
import {AxisPlace} from "../axis/axis-types"
import {GraphPlace} from "../axis-graph-shared"
import { ICase } from "../../models/data/data-set-types"

export type Point = { x: number, y: number }
export type CPLine = { slope: number, intercept: number, pivot1?: Point, pivot2?: Point }
export const kNullPoint = {x: -999, y: -999}

export const PointDisplayTypes = ["points", "bars"] as const
export type PointDisplayType = typeof PointDisplayTypes[number]

export const isPointDisplayType = (value: string): value is PointDisplayType => {
  return PointDisplayTypes.includes(value as PointDisplayType)
}

export type MarqueeMode = "unclicked" | "selected" | "dragging"

export interface Rect {
  x: number, y: number, width: number, height: number
}

export interface rTreeRect { x: number, y: number, w: number, h: number }

export interface counterProps {
  counter: number,
  setCounter: React.Dispatch<React.SetStateAction<number>>
}

export interface IConnectingLineDescription {
  caseData: ICase
  lineCoords: [number, number]
  plotNum?: number
}

export interface ICaseSubsetDescription {
  category?: string
  cellKey: Record<string, string>
}

export const
  transitionDuration = 1000,
  pointRadiusMax = 10,
  pointRadiusMin = 3,
  pointRadiusLogBase = 2.0, // reduce point radius from max by log of (num. cases) base (LogBase).
  pointRadiusSelectionAddend = 1,
  hoverRadiusFactor = 1.5,
  kDataDisplayFont = '12px sans-serif',
  kChoroplethHeight = 16

export const kPortalClass = "portal-parent"
export const kPortalClassSelector = `.${kPortalClass}`

export const PrimaryAttrRoles = ['x', 'y'] as const
export type PrimaryAttrRole = typeof PrimaryAttrRoles[number]
export const GraphTipAttrRoles =
  [...PrimaryAttrRoles, 'rightNumeric', 'topSplit', 'rightSplit', 'legend', 'caption'] as const
export const GraphAttrRoles = [
  ...GraphTipAttrRoles, 'yPlus'] as const
export type GraphAttrRole = typeof GraphAttrRoles[number]
export const GraphSplitAttrRoles = [...PrimaryAttrRoles, 'topSplit', 'rightSplit'] as const
export type GraphSplitAttrRole = typeof GraphSplitAttrRoles[number]

export const MapAttrRoles = ['lat', 'long', 'pinLat', 'pinLong', 'polygon'] as const
export type MapAttrRole = typeof MapAttrRoles[number]

export const AttrRoles = [...GraphAttrRoles, ...MapAttrRoles] as const
export type AttrRole = typeof AttrRoles[number]
// We leave open the possibility that TipAttrRoles may include some that are not GraphTipAttrRoles
export const TipAttrRoles = [...GraphTipAttrRoles] as const

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

export const kOther = '__other__' // Used as key to category map entry that stashes overflow of what
                                              // doesn't fit on cell axis. Not likely to be an attribute value
export const kMain = '__main__' // When an axis has no categories, this is its pseudo-category
