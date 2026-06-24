import { uniq } from "lodash"
import {
  getEnv, hasEnv, IAnyStateTreeNode, Instance, resolveIdentifier, SnapshotIn, types
} from "mobx-state-tree"
import { kellyColors } from "../../utilities/color-utils"
import { compareValues } from "../../utilities/data-utils"
import { gLocale } from "../../utilities/translation/locale"
import { Attribute, IAttribute } from "./attribute"
import { IDataSet } from "./data-set"

export interface ICategoryMove {
  value: string     // category value
  fromIndex: number // original index of category
  toIndex: number   // new index of category
  length: number    // number of categories at time of move
  after?: string    // the category after which the current category was placed
  before?: string   // the category before which the current category was placed
}

interface IProvisionalEnvironment {
  provisionalDataSet?: IDataSet
}

export function getProvisionalDataSet(node: IAnyStateTreeNode | null) {
  const env = node && hasEnv(node) ? getEnv<IProvisionalEnvironment>(node) : {}
  return env.provisionalDataSet
}

// Provisional CategorySets are created with an MST environment that contains their DataSet.
// When a provisional CategorySet is promoted to a regular CategorySet and attached to the tree,
// it takes on the environment of its document (since MST environments are associated with the root
// of the tree). This allows references in CategorySets to be resolved directly via their DataSet
// for provisional CategorySets but then to be resolved normally by MST once they're promoted and
// added to the document.
export function createProvisionalCategorySet(data: IDataSet | undefined, attrId: string) {
  return CategorySet.create({ attribute: attrId }, { provisionalDataSet: data })
}

// Apply the user-recorded category moves to a freshly-sorted values array. Each move records
// neighbor categories (`after`/`before`) so a re-derivation can place the moved category back
// into approximately its user-chosen slot, even after other categories have come or gone.
function applyMoves(values: string[], moves: readonly ICategoryMove[]): string[] {
  if (moves.length === 0) return values

  const result = values.slice()
  const indexMap = new Map<string, number>()
  function rebuildIndexMap() {
    indexMap.clear()
    result.forEach((v, i) => indexMap.set(v, i))
  }
  function moveValueToIndex(value: string, dstIndex: number) {
    const valueIndex = indexMap.get(value)
    if (valueIndex != null && valueIndex !== dstIndex) {
      result.splice(valueIndex, 1)
      result.splice(dstIndex, 0, value)
      rebuildIndexMap()
    }
  }
  // if the source index is after the destination index, adjust the destination index
  const afterDstIndex = (srcIndex: number, afterIndex: number) =>
    srcIndex > afterIndex ? afterIndex + 1 : afterIndex
  // if the source index is before the destination index, adjust the destination index
  const beforeDstIndex = (srcIndex: number, beforeIndex: number) =>
    srcIndex < beforeIndex ? beforeIndex - 1 : beforeIndex

  rebuildIndexMap()
  moves.forEach(move => {
    const valueIndex = indexMap.get(move.value)
    // the value associated with this category move is no longer one of the categories
    if (valueIndex == null) return

    const afterIndex = move.after ? indexMap.get(move.after) : undefined
    const beforeIndex = move.before ? indexMap.get(move.before) : undefined
    // both neighboring categories still exist?
    if ((afterIndex != null) && (beforeIndex != null)) {
      // category is already (at least approximately) where it should be
      if ((valueIndex >= afterIndex) && (valueIndex <= beforeIndex)) return

      // move it next to the category closest to its original position
      const moveRatio = move.toIndex / move.length
      const afterRatio = afterIndex / result.length
      const beforeRatio = beforeIndex / result.length
      const afterDistance = Math.abs(moveRatio - afterRatio)
      const beforeDistance = Math.abs(moveRatio - beforeRatio)
      const dstIndex = afterDistance < beforeDistance
        ? afterDstIndex(valueIndex, afterIndex)
        : beforeDstIndex(valueIndex, beforeIndex)
      moveValueToIndex(move.value, dstIndex)
    }
    else if (afterIndex != null) {
      moveValueToIndex(move.value, afterDstIndex(valueIndex, afterIndex))
    }
    else if (beforeIndex != null) {
      moveValueToIndex(move.value, beforeDstIndex(valueIndex, beforeIndex))
    }
    else {
      // neither category neighbor still exists
      const moveRatio = move.toIndex / move.length
      // if it was moved near the beginning, put it at the beginning
      if (moveRatio <= 0.2) {
        moveValueToIndex(move.value, 0)
      }
      // if it was moved near the end, put it at the end
      else if (moveRatio >= 0.8) {
        moveValueToIndex(move.value, result.length - 1)
      }
      // else just punt for now
    }
  })
  return result
}

// While a category drag is in progress, slot the dragged category into its in-flight position.
function applyDrag(values: string[], dragCategory: string, dragCategoryIndex: number): string[] {
  const fromIndex = values.indexOf(dragCategory)
  if (fromIndex < 0 || fromIndex === dragCategoryIndex) return values
  const result = values.slice()
  result.splice(fromIndex, 1)
  result.splice(dragCategoryIndex, 0, dragCategory)
  return result
}

export const CategorySet = types.model("CategorySet", {
  // Customize the reference lookup so that provisional category sets are looked up directly in the DataSet.
  // Otherwise, references can only be resolved once the CategorySet has been added to the document, which
  // triggers undoable actions, etc.
  attribute: types.reference(Attribute, {
    get(identifier: string, parent: IAnyStateTreeNode | null): any {
      const provisionalDataSet = getProvisionalDataSet(parent)
      return provisionalDataSet?.attrFromID(identifier) ??
              resolveIdentifier<typeof Attribute>(Attribute, parent, identifier)
    },
    set(attribute: IAttribute) {
      return attribute.id
    },
    onInvalidated: ({ parent: self, invalidId }) => {
      self.handleAttributeInvalidated?.(invalidId)
    }
  }),
  // user color assignments to categories in an attribute
  colors: types.map(types.string),
  // user category re-orderings
  moves: types.array(types.frozen<ICategoryMove>())
})
.volatile(self => ({
  handleAttributeInvalidated: undefined as Maybe<(attrId: string) => void>,
  dragCategory: undefined as Maybe<string>,
  dragCategoryIndex: -1
}))
.views(self => ({
  // Categories are derived directly from the attribute's values plus user moves and the in-flight
  // drag state. MST views are MobX computeds, so the result is cached and re-derived only when one
  // of the tracked dependencies changes. The deliberate read of `attribute.changeCount` establishes
  // a dependency on element mutations in `strValues` (which is a volatile array — element-level
  // mutations like setComputedValues bump changeCount but don't fire on the array reference).
  // This is the simpler successor to a manual cache + reaction that previously lived here; that
  // pattern was fragile because mobx defers a reaction's initial accessor invocation past mutations
  // landing in the same outer batch (CODAP-1429).
  get values(): readonly string[] {
    const attr = self.attribute
    // DO NOT REMOVE: this read tracks element-level mutations in attr.strValues (a volatile
    // array whose mutations bump changeCount but don't fire on the array reference). Without
    // it, formula recomputes via setComputedValues would not re-derive the categories.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    attr.changeCount
    const sorted = uniq(attr.strValues.filter(v => v != null && v !== ""))
                    .sort((a, b) => compareValues(a, b, gLocale.compareStrings))
    const reordered = applyMoves(sorted, self.moves)
    return self.dragCategory != null
      ? applyDrag(reordered, self.dragCategory, self.dragCategoryIndex)
      : reordered
  }
}))
.views(self => ({
  get indexMap(): ReadonlyMap<string, number> {
    const map = new Map<string, number>()
    self.values.forEach((v, i) => map.set(v, i))
    return map
  }
}))
.views(self => ({
  index(value: string): number | undefined {
    return self.indexMap.get(value)
  },
  get valuesArray(): string[] {
    return Array.from(self.values)
  },
  // list of actions that indicate deliberate action by the user
  // used to determine when to move provisional category sets into the document
  get userActionNames() {
    return ["move", "setColorForCategory", "storeCurrentColorForCategory"]
  },
  get lastMove() {
    return self.moves.length > 0
            ? self.moves[self.moves.length - 1]
            : undefined
  }
}))
.views(self => ({
  get colorMap() {
    const colorForCategory = (category: string, index: number) => {
      return self.colors.get(category) ?? kellyColors[index % kellyColors.length]
    }

    // We intentionally create a new non-observable map here.
    // This way this map object can be observed and if it changes a user knows the
    // colors or categories have changed
    const map: Record<string, string> = {}
    self.values.forEach((category, index) => map[category] = colorForCategory(category, index))
    return map
  }
}))
.views(self => ({
  colorForCategory(category: string) {
    return self.colorMap[category]
  }
}))
.actions(self => ({
  onAttributeInvalidated(handler: (attrId: string) => void) {
    self.handleAttributeInvalidated = handler
  },
  setDragCategory(category?: string, index = -1) {
    self.dragCategory = category
    self.dragCategoryIndex = index
  },
  move(value: string, beforeValue?: string) {
    const fromIndex = self.index(value)
    if (fromIndex == null) return
    let toIndex = (beforeValue != null) ? self.index(beforeValue) : undefined
    if (toIndex === undefined) {
      toIndex = self.values.length - 1
    } else if (fromIndex < toIndex) {
      toIndex--
    }

    const afterIndex = toIndex === 0 ? undefined : toIndex < fromIndex ? toIndex - 1 : toIndex
    const afterValue = afterIndex != null ? self.values[afterIndex] : undefined
    const move: ICategoryMove = {
      value,
      fromIndex,
      toIndex,
      length: self.values.length,
      after: afterValue,
      before: beforeValue
    }
    // combine with last move if appropriate
    if (value === self.lastMove?.value) {
      move.fromIndex = self.lastMove.fromIndex
      self.moves[self.moves.length - 1] = move
    }
    else {
      self.moves.push(move)
    }
  },
  setColorForCategory(value: string, color: string) {
    if (color) {
      self.colors.set(value, color)
    } else {
      self.colors.delete(value)
    }
  },
  storeCurrentColorForCategory(value: string) {
    const color = self.colorForCategory(value)
    if (color) {
      self.colors.set(value, color)
    }
  },
  storeAllCurrentColors() {
    self.values.forEach(value => {
      if (!self.colors.get(value)) {
        this.storeCurrentColorForCategory(value)
      }
    })
  }
}))
export interface ICategorySet extends Instance<typeof CategorySet> {}
export interface ICategorySetSnapshot extends SnapshotIn<typeof CategorySet> {}
