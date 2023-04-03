import { addDisposer, Instance, isValidReference, onAction, types } from "mobx-state-tree"
import { kellyColors } from "../../utilities/color-utils"
import { Attribute } from "./attribute"

interface ICategoryMove {
  value: string     // category value
  fromIndex: number // original index of category
  toIndex: number   // new index of category
  length: number    // number of categories at time of move
  after?: string    // the category after which the current category was placed
  before?: string   // the category before which the current category was placed
}

export const CategorySet = types.model("CategorySet", {
  attribute: types.reference(Attribute, {
    onInvalidated: ({ parent: self, invalidId }) => {
      self.handleAttributeInvalidated?.(invalidId)
    }
  }),
  // user color assignments
  colors: types.map(types.string),
  // user category re-orderings
  moves: types.array(types.frozen<ICategoryMove>())
})
.volatile(self => ({
  handleAttributeInvalidated: undefined as ((attrId: string) => void) | undefined
}))
.actions(self => ({
  onAttributeInvalidated(handler: (attrId: string) => void) {
    self.handleAttributeInvalidated = handler
  }
}))
.extend(self => {
  // map from category value to index
  const _indexMap = new Map<string, number>()
  let _values = [] as string[]
  let _isValid = false

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
    if (!_isValid) {
      _indexMap.clear()
      _values = []

      // build default category set order (order of occurrence)
      // could default to alphameric sort order if desired instead
      self.attribute.strValues.forEach(value => {
        if (_indexMap.get(value) == null) {
          _indexMap.set(value, _values.length)
          _values.push(value)
        }
      })

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

      _isValid = true
    }
  }

  return {
    views: {
      get values() {
        refresh()
        return _values
      },
      index(value: string) {
        return _indexMap.get(value)
      }
    },
    actions: {
      invalidate() {
        _isValid = false
      }
    }
  }
})
.views(self => ({
  colorForCategory(category: string) {
    const userColor = self.colors.get(category)
    const catIndex = self.index(category)
    return userColor || (catIndex != null ? kellyColors[catIndex % kellyColors.length] : undefined)
  }
}))
.actions(self => ({
  afterAttach() {
    // invalidate the cached categories when necessary
    if (isValidReference(() => self.attribute)) {
      addDisposer(self, onAction(self.attribute, action => {
        const actionsInvalidatingCategories = [
          "clearFormula", "setDisplayFormula", "addValue", "addValues", "setValue", "setValues", "removeValues"
        ]
        if (actionsInvalidatingCategories.includes(action.name)) {
          self.invalidate()
        }
      }, true))
    }
  },
  move(value: string, beforeValue?: string) {
    const fromIndex = self.index(value)
    if (fromIndex == null) return
    const toIndex = (beforeValue != null) ? self.index(beforeValue) ?? self.values.length - 1 : self.values.length - 1
    const afterIndex = toIndex === 0 ? undefined : toIndex < fromIndex ? toIndex - 1 : toIndex
    const afterValue = afterIndex != null ? self.values[afterIndex] : undefined
    self.moves.push({
      value,
      fromIndex,
      toIndex,
      length: self.values.length,
      after: afterValue,
      before: beforeValue
    })
    self.invalidate()
  },
  setColorForCategory(value: string, color: string) {
    if (self.index(value)) {
      self.colors.set(value, color)
    }
  }
}))
export interface ICategorySet extends Instance<typeof CategorySet> {}
