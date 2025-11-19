import { AxisModelType } from "../components/axis/models/axis-model"
import { IFormula } from "../models/formula/formula"

interface IBaseLegendQuantileProps {
  numberOfLegendQuantiles?: number
  legendQuantilesAreLocked?: boolean
}

interface IExportLegendQuantileProps extends IBaseLegendQuantileProps {
  legendQuantiles?: number[]
}

interface IImportLegendQuantileProps extends IBaseLegendQuantileProps {
  legendQuantiles?: number[] | null[] // null occurs in some documents, presumably as a result of a bug
}

type IValidImportLegendQuantileProps = IExportLegendQuantileProps

interface IExportV3Properties extends IExportLegendQuantileProps {
  filterFormula?: IFormula
}

// key is v2 place, e.g. "x" or "y", but typing it more specifically here requires casting elsewhere
export type V2PlaceToV3AxisTypeMap = Partial<Record<string, AxisModelType>>

interface IImportV3Properties extends IImportLegendQuantileProps {
  axisTypes?: V2PlaceToV3AxisTypeMap
  filterFormula?: string
}

function hasFilterFormula(props: IExportV3Properties): boolean {
  return !!props.filterFormula?.display
}

function validateImportLegendQuantileProps(props: IImportLegendQuantileProps): IValidImportLegendQuantileProps {
  if (!hasLegendQuantiles(props)) return {}
  const numberOfLegendQuantiles = props.numberOfLegendQuantiles
  if (numberOfLegendQuantiles == null) return {}
  if (props.legendQuantiles?.length && props.legendQuantiles?.some((q: number | null) => q == null)) {
    // if any quantile values are invalid, we ignore the quantiles
    return {}
  }
  return {
    numberOfLegendQuantiles,
    legendQuantilesAreLocked: props.legendQuantilesAreLocked ?? false,
    ...(props.legendQuantiles?.length ? { legendQuantiles: props.legendQuantiles as number[] } : {})
  }
}

function hasLegendQuantiles(props?: IExportLegendQuantileProps | IImportLegendQuantileProps): boolean {
  return props?.numberOfLegendQuantiles != null ||
         props?.legendQuantilesAreLocked === true ||
         (!!props?.legendQuantiles?.length && props?.legendQuantiles.every((q: number | null) => q != null))
}

export function exportLegendQuantileProps(props?: IExportLegendQuantileProps) {
  return hasLegendQuantiles(props)
          ? {
              numberOfLegendQuantiles: props?.numberOfLegendQuantiles ?? 0,
              legendQuantilesAreLocked: props?.legendQuantilesAreLocked ?? false,
              // legendQuantiles are only stored if they are locked
              ...(props?.legendQuantilesAreLocked ? { legendQuantiles: props?.legendQuantiles ?? [] } : {})
            }
          : {}
}

export function importLegendQuantileProps(props?: IImportLegendQuantileProps) {
  if (!props) return {}
  // because the types are simple, we can use the same function for import and export
  return exportLegendQuantileProps(validateImportLegendQuantileProps(props))
}

// In v2, graphs save/restore legend quantile properties, but maps do not.
// Therefore, we provide an option to include legend quantiles when exporting v3 extension properties.
interface IExportV3PropsOptions {
  axisTypes?: V2PlaceToV3AxisTypeMap
  includeLegendQuantiles?: boolean
}
export function exportV3Properties(props: IExportV3Properties, options?: IExportV3PropsOptions) {
  const { axisTypes, includeLegendQuantiles } = options || {}
  const _hasFilter = hasFilterFormula(props)
  const _hasLegendQuantiles = includeLegendQuantiles && hasLegendQuantiles(props)
  const _hasAxisTypes = axisTypes && (Object.keys(axisTypes).length > 0)
  return _hasFilter || _hasLegendQuantiles || _hasAxisTypes
          ? {
              v3: {
                ...(_hasFilter ? { filterFormula: props.filterFormula?.display } : {}),
                ...exportLegendQuantileProps(props),
                ...(axisTypes ? { axisTypes } : {})
              }
            }
          : {}
}

interface IImportV3PropsOptions {
  axisTypes?: V2PlaceToV3AxisTypeMap
}
export function importV3Properties(props?: IImportV3Properties, options?: IImportV3PropsOptions) {
  const { axisTypes } = options || {}
  if (axisTypes && props?.axisTypes) {
    axisTypes.x = props.axisTypes.x
    axisTypes.y = props.axisTypes.y
  }
  return props?.filterFormula || hasLegendQuantiles(props)
          ? {
              ...(props?.filterFormula ? { filterFormula: { display: props.filterFormula } } : {}),
              ...importLegendQuantileProps(props)
            }
          : {}
}
