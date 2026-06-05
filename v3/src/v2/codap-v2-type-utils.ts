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

interface ILegendQuantileSource {
  attributeType(role: string): string | undefined
  legendBinCount: number
  legendQuantilesAreLocked?: boolean
  legendQuantiles: number[]
}

interface IExportLegendQuantileStorageOptions {
  // The native V2 graph storage always wrote numberOfLegendQuantiles/legendQuantilesAreLocked
  // (defaulting to 5/false), so set this for that path to preserve round-trip fidelity. The V3
  // extension namespace (v3:) and maps omit the block for a default (5, unlocked) legend.
  v2Native?: boolean
}
// Derives the V2 legend-quantile storage from a data configuration. The bin count is sourced from
// the per-attribute binCount (via legendBinCount); for a non-numeric or absent legend it falls back
// to V2's default of 5 (legendBinCount collapses to 1 when the legend isn't numeric). For the v3
// extension namespace (and maps) the block is emitted only when the count differs from V2's default
// of 5 or the quantiles are locked; the native V2 graph path (v2Native) always emits it.
// Defensive: some callers (e.g. the data-interactive data-context export) pass a bare DataSet that
// has neither attributeType nor legendBinCount; for those this returns {} rather than throwing.
export function exportLegendQuantileStorage(
  dataConfig: ILegendQuantileSource, options?: IExportLegendQuantileStorageOptions
) {
  if (typeof dataConfig?.attributeType !== "function") return {}
  const isNumericLegend = dataConfig.attributeType("legend") === "numeric"
  const locked = dataConfig.legendQuantilesAreLocked ?? false
  const count = isNumericLegend ? dataConfig.legendBinCount : 5
  if (!options?.v2Native && count === 5 && !locked) return {}
  return {
    numberOfLegendQuantiles: count,
    legendQuantilesAreLocked: locked,
    ...(locked ? { legendQuantiles: [...dataConfig.legendQuantiles] } : {})
  }
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

// Lock props for the DataConfiguration snapshot. The bin count is handled separately
// (applyImportedLegendBinCount) because it lives in per-attribute metadata, not the config.
export function importLegendLockProps(props?: IImportLegendQuantileProps) {
  if (!props?.legendQuantilesAreLocked) return {}
  const validQuantiles = !!props.legendQuantiles?.length &&
    props.legendQuantiles.every((q: number | null) => q != null)
  return {
    legendQuantilesAreLocked: true,
    ...(validQuantiles ? { legendQuantiles: props.legendQuantiles as number[] } : {})
  }
}

interface ILegendBinCountTarget {
  setAttributeBinCount(attrId: string, value?: number): void
}
// Maps V2's numberOfLegendQuantiles onto the legend attribute's per-attribute bin count, skipping
// the default of 5 (so common V2 docs create no metadata).
export function applyImportedLegendBinCount(
  props: IImportLegendQuantileProps | undefined, legendAttrId: string | undefined, metadata?: ILegendBinCountTarget
) {
  const count = props?.numberOfLegendQuantiles
  if (!metadata || !legendAttrId || count == null || count === 5) return
  metadata.setAttributeBinCount(legendAttrId, count)
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
  const legendStorage = exportLegendQuantileStorage(props as unknown as ILegendQuantileSource)
  const _hasLegendQuantiles = !!includeLegendQuantiles && Object.keys(legendStorage).length > 0
  const _hasAxisTypes = axisTypes && (Object.keys(axisTypes).length > 0)
  return _hasFilter || _hasLegendQuantiles || _hasAxisTypes
          ? {
              v3: {
                ...(_hasFilter ? { filterFormula: props.filterFormula?.display } : {}),
                ...legendStorage,
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
              // the bin count moves to per-attribute metadata via applyImportedLegendBinCount;
              // the config snapshot keeps only the lock props
              ...importLegendLockProps(props)
            }
          : {}
}
