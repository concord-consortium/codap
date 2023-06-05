import {
  CalculatedColumn, CellClickArgs, ColSpanArgs, Column, RenderEditCellProps, RenderCellProps, RenderHeaderCellProps,
  RenderRowProps, RowsChangeData
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
export interface TRenderEditCellProps extends RenderEditCellProps<TRow> {}
export interface TRenderCellProps extends RenderCellProps<TRow> {}
export interface TRenderHeaderCellProps extends RenderHeaderCellProps<TRow> {}
export interface TRenderRowProps extends RenderRowProps<TRow> {}
export interface TCellClickArgs extends CellClickArgs<TRow> {}
export type TColSpanArgs = ColSpanArgs<TRow, unknown>

// used in lieu of attribute id for index column for ReactDataGrid
export const kIndexColumnKey = "__index__"

export const kChildMostTableCollectionId = "child-most"
