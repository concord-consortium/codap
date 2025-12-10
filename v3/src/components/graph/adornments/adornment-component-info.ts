import React from "react"
import { IBaseNumericAxisModel } from "../../axis/models/base-numeric-axis-model"
import { AdornmentModel, IAdornmentModel } from "./adornment-models"

export interface IAdornmentComponentProps {
  cellKey: Record<string, string>
  cellCoords: { row: number, col: number }
  containerId: string
  model: IAdornmentModel
  plotHeight: number
  plotWidth: number
  xAxis?: IBaseNumericAxisModel
  yAxis?: IBaseNumericAxisModel
  labelsDivRef?: React.RefObject<HTMLDivElement>
  spannerRef?: React.RefObject<SVGSVGElement>
}

export interface IAdornmentControlsProps {
  adornmentModel: typeof AdornmentModel
}

export interface IAdornmentBannerComponentProps {
  model: IAdornmentModel
}

export interface IAdornmentComponentInfo {
  adornmentEltClass: string
  Component: React.ComponentType<IAdornmentComponentProps>
  Controls: React.ComponentType<IAdornmentControlsProps>
  BannerComponent?: React.ComponentType<IAdornmentBannerComponentProps>
  labelKey: string
  order: number
  type: string
}

const gAdornmentComponentInfoMap = new Map<string, IAdornmentComponentInfo>()

export function registerAdornmentComponentInfo(info: IAdornmentComponentInfo) {
  gAdornmentComponentInfoMap.set(info.type, info)
}

export function getAdornmentComponentKeys() {
  return Array.from(gAdornmentComponentInfoMap.keys())
}

// undefined is supported so callers do not need to check the type before passing it in
export function getAdornmentComponentInfo(type?: string) {
  return type ? gAdornmentComponentInfoMap.get(type) : undefined
}
