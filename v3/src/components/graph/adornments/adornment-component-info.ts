import React from "react"

export interface IAdornmentComponentInfo {
  adornmentEltClass: string
  Component: React.ComponentType<any>
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
