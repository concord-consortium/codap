import { IDataSet } from "../../data-model/data-set"
import { CalculatedColumn, Column, FormatterProps, HeaderRendererProps } from "react-data-grid"

export type TRow = IDataSet["cases"][number]
export type TColumn = Column<TRow>
export type TCalculatedColumn = CalculatedColumn<TRow>
export type TFormatterProps = FormatterProps<TRow>
export type THeaderRendererProps = HeaderRendererProps<TRow>

export const kIndexColumnKey = "__index__"
