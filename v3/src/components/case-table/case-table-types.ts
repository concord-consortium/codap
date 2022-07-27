import { IDataSet } from "../../data-model/data-set"
import { CalculatedColumn, Column, FormatterProps } from "react-data-grid"

export type TRow = IDataSet["cases"][0]
export type TColumn = Column<TRow>
export type TCalculatedColumn = CalculatedColumn<TRow>
export type TFormatterProps = FormatterProps<TRow>
