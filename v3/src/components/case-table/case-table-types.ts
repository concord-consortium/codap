import {
  CalculatedColumn, Column, EditorProps, FormatterProps, HeaderRendererProps, RowRendererProps, RowsChangeData
} from "react-data-grid"
import { IGroupedCase } from "../../models/data/data-set-types"

export const kCaseTableIdBase = "case-table"

export const symDom = Symbol.for("dom")

// TRow extends IGroupedCase to facilitate interchange
export interface TRow extends IGroupedCase {
  // ids of attributes whose DOM representation have been manipulated
  [symDom]?: Set<string>
}
export interface TRowsChangeData extends RowsChangeData<TRow> {}
export interface TColumn extends Column<TRow> {}
export interface TCalculatedColumn extends CalculatedColumn<TRow> {}
export interface TEditorProps extends EditorProps<TRow> {}
export interface TFormatterProps extends FormatterProps<TRow> {}
export interface THeaderRendererProps extends HeaderRendererProps<TRow> {}
export interface TRowRendererProps extends RowRendererProps<TRow> {}

// used in lieu of attribute id for index column for ReactDataGrid
export const kIndexColumnKey = "__index__"
