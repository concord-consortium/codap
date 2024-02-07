export const DEFAULT_Z_INDEX = 0
export const RAISED_Z_INDEX = 100
export const MAX_SPRITE_SCALE = 2

export interface IPixiPointMetadata {
  caseID: string
  plotNum: number
  style: IPixiPointStyle
}

export interface IPixiPointStyle {
  radius: number
  fill: string
  stroke: string
  strokeWidth: number
  strokeOpacity?: number
}
