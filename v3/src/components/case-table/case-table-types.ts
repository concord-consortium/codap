import {
  CalculatedColumn, CellClickArgs, CellKeyDownArgs, CellSelectArgs, ColSpanArgs, Column, RenderCellProps,
  RenderEditCellProps, Renderers, RenderHeaderCellProps, RenderRowProps, RowsChangeData
} from "react-data-grid"
import { IGroupedCase, symFirstChild } from "../../models/data/data-set-types"

export const kCaseTableIdBase = "case-table"

export const symDom = Symbol.for("dom")

// TRow extends IGroupedCase to facilitate interchange
export interface TRow extends IGroupedCase {
  // true if this row is the first child case of a given parent case
  [symFirstChild]?: boolean
  // ids of attributes whose DOM representation have been manipulated in performance mode
  [symDom]?: Set<string>
}
export interface TRowsChangeData extends RowsChangeData<TRow> {}
export interface TColumn extends Column<TRow> {}
export interface TCalculatedColumn extends CalculatedColumn<TRow> {}
export interface TRenderers extends Renderers<TRow, unknown> {}
export interface TRenderEditCellProps extends RenderEditCellProps<TRow> {}
export interface TRenderCellProps extends RenderCellProps<TRow> {}
export interface TRenderHeaderCellProps extends RenderHeaderCellProps<TRow> {}
export interface TRenderRowProps extends RenderRowProps<TRow> {}
export interface TCellClickArgs extends CellClickArgs<TRow> {}
export interface TCellSelectArgs extends CellSelectArgs<TRow> {}
export type TCellKeyDownArgs = CellKeyDownArgs<TRow>
export type TColSpanArgs = ColSpanArgs<TRow, unknown>

export interface IBaseTableScrollInfo {
  element: HTMLDivElement
  scrollRowIntoView: (rowIndex: number) => void
}
export interface ISetTableScrollInfo extends IBaseTableScrollInfo {
  collectionId: string
}
export interface ITableScrollInfo extends IBaseTableScrollInfo {
  scrollCount: number
}
export type ScrollRowIntoViewFn = (rowIndex: number) => void
export type SetScrollInfoFn = (scrollInfo: ISetTableScrollInfo) => void
export type TableScrollEvent = React.UIEvent<HTMLDivElement, UIEvent>
export type OnTableScrollFn = (event: TableScrollEvent, collectionId: string, element: HTMLDivElement) => void
export type OnScrollClosestRowIntoViewFn = (collectionId: string, rowIndices: number[]) => void

export const kInputRowKey = "__input__"

export const kDefaultColumnWidth = 80
export const kMinColumnWidth = 60
