import { AxisModelType } from "../components/axis/models/axis-model"
import { IFormula } from "../models/formula/formula"
import { kDefaultPointShape } from "../utilities/point-shape-utils"

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

interface IExportV3Properties extends IExportLegendQuantileProps {
  filterFormula?: IFormula
}

// key is v2 place, e.g. "x" or "y", but typing it more specifically here requires casting elsewhere
export type V2PlaceToV3AxisTypeMap = Partial<Record<string, AxisModelType>>

interface IImportV3Properties extends IImportLegendQuantileProps {
  axisTypes?: V2PlaceToV3AxisTypeMap
  filterFormula?: string
  pointShape?: string
}

function hasFilterFormula(props: IExportV3Properties): boolean {
  return !!props.filterFormula?.display
}

function hasLegendQuantiles(props?: IExportLegendQuantileProps | IImportLegendQuantileProps): boolean {
  return props?.numberOfLegendQuantiles != null ||
         props?.legendQuantilesAreLocked === true ||
         (!!props?.legendQuantiles?.length && props?.legendQuantiles.every((q: number | null) => q != null))
}

interface ILegendQuantileSource {
  attributeType(role: string): string | undefined
  displayedLegendBinCount: number
  legendQuantilesAreLocked?: boolean
  legendQuantiles: number[]
  legendLockedMin?: number
  legendLockedMax?: number
  liveLegendDisplayRange: { min?: number, max?: number }
}

// V2 saves a locked legend's bin edges with the min first and the max last (N+1 values for N bins).
// It adds a small amount to the max so the max value itself falls in the last bin, because V2's bins
// do not include their upper edge. V3 saves the true min and max separately from the inner edges, so
// the padding is removed on import and added once on export.
const kV2LegendMaxPaddingFactor = 0.000001

export function padV2LegendMax(min: number, max: number) {
  return max + Math.abs(max - min) * kV2LegendMaxPaddingFactor
}

// The inverse of padV2LegendMax: the largest number that pads to paddedMax or less. V2 padded the
// true max with the same arithmetic, so the result is never below it. (A result below it would make
// the max case "missing".) When the min is much larger in size than the max, the padding is much
// larger than the max, and many numbers pad to the same value. Then the result can be a little above
// the true max, because the saved value does not hold the exact max. A paddedMax below min was not
// padded this way; keep it.
export function unpadV2LegendMax(min: number, paddedMax: number) {
  if (!(paddedMax >= min) || !Number.isFinite(paddedMax) || !Number.isFinite(min)) return paddedMax
  const padsWithin = (value: number) => padV2LegendMax(min, value) <= paddedMax
  // The padding can be too small to change paddedMax; then paddedMax is the largest such number.
  if (padsWithin(paddedMax)) return paddedMax
  // Binary search between low (pads to paddedMax or less) and high (pads to more). Start from the
  // estimate max ~= (paddedMax + min * f) / (1 + f), from paddedMax = max + (max - min) * f.
  let low = min
  let high = paddedMax
  const estimate = (paddedMax + min * kV2LegendMaxPaddingFactor) / (1 + kV2LegendMaxPaddingFactor)
  if (estimate > low && estimate < high) {
    if (padsWithin(estimate)) low = estimate
    else high = estimate
  }
  // Halve the interval until low and high are neighboring numbers. About 2,100 halvings reach that
  // from any interval; the limit only guards against an unexpected input.
  for (let i = 0; i < 2200; i++) {
    const middle = Number.isFinite(high - low) ? low + (high - low) / 2 : low / 2 + high / 2
    if (middle <= low || middle >= high) break
    if (padsWithin(middle)) low = middle
    else high = middle
  }
  return low
}

// The locked bin edges in V2 format: [min, ...inner edges, padded max]. An older V3 document may
// have no saved min and max; then the live range is used. The data may have changed since it was
// locked, so the live range is widened to include the saved edges, to keep the values in order.
// When the widened range ends at a saved edge, the end bin has zero width (for example
// [10, 10, 20, ...]). V2 shows it as an empty bin. The true min and max of an older document are
// not known, so this cannot be avoided. With no range at all, only the inner edges can be written,
// as before.
function exportLockedLegendEdges(dataConfig: ILegendQuantileSource) {
  const inner = [...dataConfig.legendQuantiles]
  let min = dataConfig.legendLockedMin ?? dataConfig.liveLegendDisplayRange?.min
  let max = dataConfig.legendLockedMax ?? dataConfig.liveLegendDisplayRange?.max
  if (min == null || max == null) return inner
  if (inner.length > 0) {
    min = Math.min(min, inner[0])
    max = Math.max(max, inner[inner.length - 1])
  }
  return [min, ...inner, padV2LegendMax(min, max)]
}

interface IExportLegendQuantileStorageOptions {
  // The native V2 graph storage always wrote numberOfLegendQuantiles/legendQuantilesAreLocked
  // (defaulting to 5/false), so set this for that path to preserve round-trip fidelity. The V3
  // extension namespace (v3:) and maps omit the block for a default (5, unlocked) legend.
  v2Native?: boolean
}
// Derives the V2 legend-quantile storage from a data configuration. The bin count is
// displayedLegendBinCount: the locked count while locked, else the per-attribute bin count (clamped).
// A numeric or date legend has bins, as in V2; for any other or absent legend it falls back to V2's
// default of 5 (the bin count collapses to 1 there). For the v3 extension namespace (and maps) the
// block is emitted only when the count differs from V2's default of 5 or the quantiles are locked;
// the native V2 graph path (v2Native) always emits it.
// Defensive: some callers (e.g. the data-interactive data-context export) pass a bare DataSet that
// has neither attributeType nor a bin count; for those this returns {} rather than throwing.
export function exportLegendQuantileStorage(
  dataConfig: ILegendQuantileSource, options?: IExportLegendQuantileStorageOptions
): IExportLegendQuantileProps {
  if (typeof dataConfig?.attributeType !== "function") return {}
  const legendType = dataConfig.attributeType("legend")
  const isBinnedLegend = legendType === "numeric" || legendType === "date"
  const locked = dataConfig.legendQuantilesAreLocked ?? false
  // displayedLegendBinCount is the locked bin count while locked, so it matches the exported edges
  // even after hiding cases has lowered the live bin count.
  const count = isBinnedLegend ? dataConfig.displayedLegendBinCount : 5
  if (!options?.v2Native && count === 5 && !locked) return {}
  return {
    numberOfLegendQuantiles: count,
    legendQuantilesAreLocked: locked,
    ...(locked ? { legendQuantiles: exportLockedLegendEdges(dataConfig) } : {})
  }
}

// Lock props for the DataConfiguration snapshot. The bin count is handled separately
// (applyImportedLegendBinCount) because it lives in per-attribute metadata, not the config.
// The V2 edges [min, ...inner edges, padded max] are split into V3's legendLockedMin, inner
// legendQuantiles, and legendLockedMax, with the padding removed from the max.
// Older versions of V3 wrote only the inner edges (N-1 values for N bins), always with the bin
// count. A list of exactly N-1 values is read that way and kept as inner edges. Every other list is
// read as V2's format. V2 can save a count that does not match its edges (it keeps the locked edges
// when the count changes), and it always writes the count, so a missing count also means V2.
export function importLegendLockProps(props?: IImportLegendQuantileProps) {
  if (!props?.legendQuantilesAreLocked) return {}
  const validQuantiles = !!props.legendQuantiles?.length &&
    props.legendQuantiles.every((q: number | null) => q != null)
  if (!validQuantiles) return { legendQuantilesAreLocked: true }
  const edges = props.legendQuantiles as number[]
  const isOlderV3InnerEdges = props.numberOfLegendQuantiles != null &&
    edges.length === props.numberOfLegendQuantiles - 1
  // V2 always writes at least 2 values (N+1 for N >= 1 bins), so keep a shorter list as it is too.
  if (isOlderV3InnerEdges || edges.length < 2) return { legendQuantilesAreLocked: true, legendQuantiles: edges }
  const min = edges[0]
  return {
    legendQuantilesAreLocked: true,
    legendQuantiles: edges.slice(1, -1),
    legendLockedMin: min,
    legendLockedMax: unpadV2LegendMax(min, edges[edges.length - 1])
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
  pointShape?: string
}
export function exportV3Properties(props: IExportV3Properties, options?: IExportV3PropsOptions) {
  const { axisTypes, includeLegendQuantiles, pointShape } = options || {}
  const _hasFilter = hasFilterFormula(props)
  // Only write legend quantile props into the v3 namespace when explicitly requested (maps). Graphs
  // round-trip the bin count via the native top-level numberOfLegendQuantiles, so a v3 copy would be
  // redundant noise here.
  const legendStorage = includeLegendQuantiles
                          ? exportLegendQuantileStorage(props as unknown as ILegendQuantileSource)
                          : {}
  const _hasLegendQuantiles = Object.keys(legendStorage).length > 0
  const _hasAxisTypes = axisTypes && (Object.keys(axisTypes).length > 0)
  // Only a non-default shape is worth writing; a document that never used the feature gains nothing.
  const _hasPointShape = pointShape != null && pointShape !== kDefaultPointShape
  return _hasFilter || _hasLegendQuantiles || _hasAxisTypes || _hasPointShape
          ? {
              v3: {
                ...(_hasFilter ? { filterFormula: props.filterFormula?.display } : {}),
                ...legendStorage,
                ...(axisTypes ? { axisTypes } : {}),
                ...(_hasPointShape ? { pointShape } : {})
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
