import {
  CalculatedColumn, CellClickArgs, CellKeyDownArgs, CellSelectArgs, ColSpanArgs, Column, RenderCellProps,
  RenderEditCellProps, Renderers, RenderHeaderCellProps, RenderRowProps, RowsChangeData
} from "react-data-grid"
import { DEBUG_CASE_IDS } from "../../lib/debug"
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

export interface IScrollOptions {
  // "auto" moves immediately; "smooth" animates
  scrollBehavior?: "auto" | "smooth"
  // disable parent/child scroll sync for the target table
  disableScrollSync?: boolean
}

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
export type OnScrollRowsIntoViewFn = (collectionId: string, rowIndices: number[], options?: IScrollOptions) => void

export const kInputRowKey = "__input__"

export const kDropzoneWidth = 30
export const kIndexColumnWidth = DEBUG_CASE_IDS ? 150 : 35
export const kDefaultColumnWidth = 60
export const kMinAutoColumnWidth = 50
export const kMaxAutoColumnWidth = 600
export const kCellPadding = 11

export const kCaseTableFontFamily = "Montserrat, sans-serif"
export const kCaseTableFontSize = "8pt"
export const kCaseTableHeaderFont = `bold ${kCaseTableFontSize} ${kCaseTableFontFamily}`
export const kCaseTableBodyFont = `${kCaseTableFontSize} ${kCaseTableFontFamily}`

export const kCaseTableDefaultWidth = 580
export const kNewCaseTableDefaultWidth = 186
export const kCaseTableDefaultHeight = 200
export const kDefaultRowHeaderHeight = 30
// used for row resizing
export const kRowHeightPadding = 4
export const kSnapToLineHeight = 14
export const kDefaultRowHeight = kSnapToLineHeight + kRowHeightPadding

export function roundToRowHeight(height: number) {
  return kSnapToLineHeight * Math.round((height - kRowHeightPadding) / kSnapToLineHeight) + kRowHeightPadding
}
export function lineCountFromRowHeight(height: number) {
  return Math.ceil((height - kRowHeightPadding) / kSnapToLineHeight)
}
