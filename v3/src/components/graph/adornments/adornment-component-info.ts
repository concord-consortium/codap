import React from "react"
export interface IAdornmentComponentInfo {
  adornmentEltClass: string
  Component: React.ComponentType<any> // TODO: Create and use IAdornmentComponentProps instead of any?
  Controls: React.ComponentType<any> // TODO: Create and use IAdornmentControlsProps instead of any?
  BannerComponent?: React.ComponentType<any> // TODO: Create and use IAdornmentBannerComponentProps instead of any?
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
