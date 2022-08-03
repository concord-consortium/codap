import { IDataSet } from "../../data-model/data-set"
import {
  CalculatedColumn, Column, EditorProps, FormatterProps, HeaderRendererProps, RowsChangeData
} from "react-data-grid"

export type TRow = IDataSet["cases"][number]
export interface TRowsChangeData extends RowsChangeData<TRow> {}
export interface TColumn extends Column<TRow> {}
export interface TCalculatedColumn extends CalculatedColumn<TRow> {}
export interface TEditorProps extends EditorProps<TRow> {}
export interface TFormatterProps extends FormatterProps<TRow> {}
export interface THeaderRendererProps extends HeaderRendererProps<TRow> {}

export const kIndexColumnKey = "__index__"
