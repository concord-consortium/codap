export interface ILineDescription {
  category?: string
  cellKey: Record<string, string>
  intercept: number
  slope: number
}

export interface ISquareOfResidual {
  caseID: string
  color?: string
  side: number
  x: number
  y: number
}

export type ResidualSquareFn = (slope: number, intercept: number, caseID: string, plotNum?: number) => ISquareOfResidual
