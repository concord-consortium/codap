import {
  CalculatedColumn, Column, EditorProps, FormatterProps, HeaderRendererProps, RowRendererProps, RowsChangeData
} from "react-data-grid"

export const kCaseTableIdBase = "case-table"

export interface TRow {
  __id__: string;
  // ids of attributes whose DOM representation have been manipulated
  __domAttrs__?: Set<string>
}
export interface TRowsChangeData extends RowsChangeData<TRow> {}
export interface TColumn extends Column<TRow> {}
export interface TCalculatedColumn extends CalculatedColumn<TRow> {}
export interface TEditorProps extends EditorProps<TRow> {}
export interface TFormatterProps extends FormatterProps<TRow> {}
export interface THeaderRendererProps extends HeaderRendererProps<TRow> {}
export interface TRowRendererProps extends RowRendererProps<TRow> {}

export const kIndexColumnKey = "__index__"
