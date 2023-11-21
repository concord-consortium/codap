export const kMovableLineClass = "movable-line"
export const kMovableLineType = "Movable Line"
export const kMovableLinePrefix = "ADRN"
export const kMovableLineLabelKey = "DG.Inspector.graphMovableLine"
export const kMovableLineUndoAddKey = "DG.Undo.graph.showMovableLine"
export const kMovableLineRedoAddKey = "DG.Redo.graph.showMovableLine"
export const kMovableLineUndoRemoveKey = "DG.Undo.graph.hideMovableLine"
export const kMovableLineRedoRemoveKey = "DG.Redo.graph.hideMovableLine"

export interface ILineInterceptAndSlope {
  category?: string,
  cellKey: Record<string, string>,
  intercept: number,
  slope: number
}

export interface ISquareOfResidual {
  caseID: string,
  color?: string,
  side: number,
  x: number,
  y: number
}
