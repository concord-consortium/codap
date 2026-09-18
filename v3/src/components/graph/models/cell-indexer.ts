import { kOther } from "../../data-display/data-display-types"
import { updateCellKey } from "../adornments/utilities/adornment-utils"
import { cellKeyToString } from "../utilities/cell-key-utils"

export type CellRole = "x" | "y" | "topSplit" | "rightSplit"

export interface ICellIndexerOptions {
  xAttrId: string
  xCats: readonly string[]
  yAttrId: string
  yCats: readonly string[]
  topAttrId: string
  topCats: readonly string[]
  rightAttrId: string
  rightCats: readonly string[]
}

interface IRoleInfo {
  attrId: string
  cats: readonly string[]
  slotOf: Map<string, number>
  otherSlot: number
}

function makeRoleInfo(attrId: string, cats: readonly string[]): IRoleInfo {
  const slotOf = new Map<string, number>()
  cats.forEach((cat, index) => {
    if (!slotOf.has(cat)) slotOf.set(cat, index)
  })
  return { attrId, cats, slotOf, otherSlot: slotOf.get(kOther) ?? -1 }
}

/**
 * Owns the encoding of the graph's cell grid: which categories occupy each role, how a case's
 * category values map to a cell, and how a cell index maps to a cell key.
 *
 * Deliberately a plain class rather than an MST node. It is derived state with no identity, it
 * must be cheap to rebuild whenever the categories change, and keeping it outside the tree means
 * it has no snapshot, patch or undo/redo surface.
 */
export class CellIndexer {
  private readonly roles: Record<CellRole, IRoleInfo>
  private readonly xCount: number
  private readonly yCount: number
  private readonly rightCount: number
  private readonly topCount: number
  private readonly indexOfCellKeyString: Map<string, number>

  readonly cellCount: number

  constructor(options: ICellIndexerOptions) {
    this.roles = {
      x: makeRoleInfo(options.xAttrId, options.xCats),
      y: makeRoleInfo(options.yAttrId, options.yCats),
      topSplit: makeRoleInfo(options.topAttrId, options.topCats),
      rightSplit: makeRoleInfo(options.rightAttrId, options.rightCats)
    }
    // A role with no categories still occupies one (degenerate) slot, matching getAllCellKeys().
    this.xCount = options.xCats.length || 1
    this.yCount = options.yCats.length || 1
    this.rightCount = options.rightCats.length || 1
    this.topCount = options.topCats.length || 1
    this.cellCount = this.topCount * this.rightCount * this.yCount * this.xCount

    // The reverse direction is a lookup rather than arithmetic inversion, because updateCellKey
    // writes an __IMPOSSIBLE__ sentinel when one attribute occupies two roles, which cannot be
    // inverted. Building the map from cellKeyForIndex keeps both directions consistent by
    // construction, and collapses colliding keys exactly as the subPlotCases cache already does.
    this.indexOfCellKeyString = new Map<string, number>()
    for (let i = 0; i < this.cellCount; i++) {
      const keyString = cellKeyToString(this.cellKeyForIndex(i))
      if (!this.indexOfCellKeyString.has(keyString)) {
        this.indexOfCellKeyString.set(keyString, i)
      }
    }
  }

  /**
   * The slot a value occupies in its role, or -1 if it belongs to no cell. Mirrors
   * categoricalValueForCaseInRole: a value outside the (already clamped) category array falls into
   * the role's own kOther slot, so there is never any question which role an overflow belongs to.
   */
  slotFor(role: CellRole, strValue: string | undefined): number {
    const info = this.roles[role]
    if (!info.attrId) return 0
    if (strValue && info.slotOf.has(strValue)) return info.slotOf.get(strValue) ?? -1
    return info.otherSlot
  }

  indexForSlots(slots: { top: number, right: number, y: number, x: number }): number {
    const { top, right, y, x } = slots
    if (top < 0 || right < 0 || y < 0 || x < 0) return -1
    return top * (this.rightCount * this.yCount * this.xCount) +
           right * (this.yCount * this.xCount) +
           y * this.xCount +
           x
  }

  cellKeyForIndex(index: number): Record<string, string> {
    let cellKey: Record<string, string> = {}
    const topIndex = Math.floor(index / (this.rightCount * this.yCount * this.xCount))
    cellKey = updateCellKey(cellKey, this.roles.topSplit.attrId, this.roles.topSplit.cats[topIndex])
    const rightIndex = Math.floor(index / (this.yCount * this.xCount)) % this.rightCount
    cellKey = updateCellKey(cellKey, this.roles.rightSplit.attrId, this.roles.rightSplit.cats[rightIndex])
    const yIndex = Math.floor(index / this.xCount) % this.yCount
    cellKey = updateCellKey(cellKey, this.roles.y.attrId, this.roles.y.cats[yIndex])
    cellKey = updateCellKey(cellKey, this.roles.x.attrId, this.roles.x.cats[index % this.xCount])
    return cellKey
  }

  indexForCellKey(cellKey: Record<string, string>): number {
    return this.indexOfCellKeyString.get(cellKeyToString(cellKey)) ?? -1
  }
}
