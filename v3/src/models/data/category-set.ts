import { uniq } from "lodash"
import { observable, runInAction } from "mobx"
import {
  addDisposer, getEnv, hasEnv, IAnyStateTreeNode, IDisposer, Instance, ISerializedActionCall, isValidReference,
  resolveIdentifier, SnapshotIn, types
} from "mobx-state-tree"
import { kellyColors } from "../../utilities/color-utils"
import { compareValues } from "../../utilities/data-utils"
import { onAnyAction } from "../../utilities/mst-utils"
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
  provisionalAttributeActionDisposer: undefined as Maybe<IDisposer>,
  handleAttributeInvalidated: undefined as Maybe<(attrId: string) => void>,
}))
.actions(self => ({
  onAttributeInvalidated(handler: (attrId: string) => void) {
    self.handleAttributeInvalidated = handler
  }
}))
.extend(self => {
  // map from category value to index
  const _indexMap = new Map<string, number>()
  const observableValues = observable.array<string>()
  let _values: string[] = []
  const _isValid = observable.box(false)

  function rebuildIndexMap() {
    _indexMap.clear()
    _values.forEach((value, index) => {
      _indexMap.set(value, index)
    })
  }

  function moveValueToIndex(value: string, dstIndex: number) {
    const valueIndex = _indexMap.get(value)
    if (valueIndex != null && valueIndex !== dstIndex) {
      const insertIndex = valueIndex < dstIndex ? dstIndex - 1 : dstIndex
      // remove value from current position
      _values.splice(valueIndex, 1)
      // insert value in new position
      _values.splice(insertIndex, 0, value)
      // update the index map
      rebuildIndexMap()
    }
  }

  function refresh() {
    if (!_isValid.get()) {
      // build default category set order (sorted alphanumerically)
      _values = uniq(self.attribute.strValues.filter(value => value != null && value !== ""))
      _values.sort((a, b) => compareValues(a, b, gLocale.compareStrings))
      rebuildIndexMap()

      // apply category moves
      self.moves.forEach(move => {
        const valueIndex = _indexMap.get(move.value)
        // the value associated with this category move is no longer one of the categories
        if (valueIndex == null) return

        const afterIndex = move.after ? _indexMap.get(move.after) : undefined
        const beforeIndex = move.before ? _indexMap.get(move.before) : undefined
        // both neighboring categories still exist?
        if ((afterIndex != null) && (beforeIndex != null)) {
          // category is already (at least approximately) where it should be
          if ((valueIndex >= afterIndex) && (valueIndex <= beforeIndex)) return

          // move it next to the category closest to its original position
          const moveRatio = move.toIndex / move.length
          const afterRatio = (afterIndex + 1) / _values.length
          const beforeRatio = beforeIndex / _values.length
          const afterDistance = Math.abs(moveRatio - afterRatio)
          const beforeDistance = Math.abs(moveRatio - beforeRatio)
          const dstIndex = afterDistance < beforeDistance ? afterIndex + 1 : beforeIndex
          moveValueToIndex(move.value, dstIndex)
        }
        else if (afterIndex != null) {
          moveValueToIndex(move.value, afterIndex + 1)
        }
        else if (beforeIndex != null) {
          moveValueToIndex(move.value, beforeIndex)
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
            moveValueToIndex(move.value, move.length - 1)
          }
          else {
            // just punt for now
          }
        }
      })

      runInAction(() => {
        observableValues.replace(_values)
        _isValid.set(true)
      })
    }
  }

  return {
    views: {
      get values() {
        refresh()
        return observableValues
      },
      index(value: string) {
        refresh()
        return _indexMap.get(value)
      }
    },
    actions: {
      invalidate() {
        _isValid.set(false)
      }
    }
  }
})
.views(self => ({
  get colorMap() {
    const colorForCategory = (category: string) => {
      const userColor = self.colors.get(category)
      if (userColor) {
        return userColor
      }
      const catIndex = self.index(category)
      return catIndex != null ? kellyColors[catIndex % kellyColors.length] : undefined
    }

    // We intentionally create a new non-observable map here.
    // This way this map object can be observed and if it changes a user knows the
    // colors or categories have changed
    const map: Record<string, string | undefined> = {}
    self.values.forEach(category => map[category] = colorForCategory(category))
    return map
  }
}))
.views(self => ({
  get valuesArray() {
    return Array.from(self.values)
  },
  get userActionNames() {
    // list of actions that indicate deliberate action by the user
    // used to determine when to move provisional category sets into the document
    return ["move", "setColorForCategory", "storeCurrentColorForCategory"]
  },
  get lastMove() {
    return self.moves.length > 0
            ? self.moves[self.moves.length - 1]
            : undefined
  },
  colorForCategory(category: string) {
    return self.colorMap[category]
  }
}))
.actions(self => ({
  handleAttributeAction(action: ISerializedActionCall) {
    const actionsInvalidatingCategories = [
      "clearFormula", "setDisplayExpression", "addValue", "addValues", "setValue", "setValues", "removeValues"
    ]
    if (actionsInvalidatingCategories.includes(action.name)) {
      self.invalidate()
    }
  }
}))
.actions(self => ({
  afterCreate() {
    // invalidate the cached categories when necessary
    // afterAttach isn't called for provisional category sets, so we need to listen here
    const hasProvisionalDataSet = !!getProvisionalDataSet(self)
    if (hasProvisionalDataSet && isValidReference(() => self.attribute)) {
      const provisionalDisposer = onAnyAction(self.attribute, action => self.handleAttributeAction(action))
      self.provisionalAttributeActionDisposer = provisionalDisposer
      addDisposer(self, () => self.provisionalAttributeActionDisposer?.())
    }
  },
  afterAttach() {
    // invalidate the cached categories when necessary
    if (isValidReference(() => self.attribute)) {
      self.provisionalAttributeActionDisposer?.()
      self.provisionalAttributeActionDisposer = undefined
      addDisposer(self, onAnyAction(self.attribute, action => self.handleAttributeAction(action)))
    }
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
    self.invalidate()
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
