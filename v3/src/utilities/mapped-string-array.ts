/*
 * MappedStringArray
 *
 * A class that maintains an array of strings and a mapping of those strings to their indices.
 * It allows for moving values within the array and updates the index mapping accordingly.
 */

export class MappedStringArray {
  values: string[]
  indices: Record<string, number>

  constructor(values: string[], readOnly = false) {
    // copy the values array if it's not read-only
    this.values = readOnly ? values : [...values]
    this.indices = {}
    values.forEach((value, index) => {
      this.indices[value] = index
    })
  }

  get length() {
    return this.values.length
  }

  getIndex(value: string): Maybe<number> {
    return this.indices[value]
  }

  getValue(index: number): Maybe<string> {
    return this.values[index]
  }

  moveValueAfter(valueToMove: string, valueToMoveAfter: string) {
    const indexToMove = this.indices[valueToMove]
    const indexToMoveAfter = this.indices[valueToMoveAfter]
    if (indexToMove == null || indexToMoveAfter == null) return
    if (indexToMove === indexToMoveAfter || indexToMove === indexToMoveAfter + 1) return
    const indexToMoveBefore = indexToMoveAfter + 1
    const valueToMoveBefore = this.values[indexToMoveBefore]
    // move the value to its new position in the array
    this.values.splice(indexToMoveBefore, 0, valueToMove)
    // remove the value from its original position in the array
    const indexToDelete = indexToMove < indexToMoveAfter ? indexToMove : indexToMove + 1
    this.values.splice(indexToDelete, 1)
    // update the affected indices
    const minAffectedIndex = Math.min(indexToMove, indexToMoveAfter)
    for (let i = minAffectedIndex; i < this.values.length; i++) {
      this.indices[this.values[i]] = i
    }
    const dstIndex = indexToMove > indexToMoveAfter ? indexToMoveAfter + 1 : indexToMoveAfter
    return {
      fromIndex: indexToMove,
      toIndex: dstIndex,
      length: this.values.length,
      after: valueToMoveAfter,
      before: valueToMoveBefore
    }
  }

  moveValueBefore(valueToMove: string, valueToMoveBefore: string) {
    const indexToMove = this.indices[valueToMove]
    const indexToMoveBefore = this.indices[valueToMoveBefore]
    if (indexToMove == null || indexToMoveBefore == null) return
    // if it's already in the right place there's no reason to move it
    if (indexToMove === indexToMoveBefore || indexToMove === indexToMoveBefore - 1) return
    const indexToMoveAfter = indexToMoveBefore - 1
    const valueToMoveAfter = this.values[indexToMoveAfter]
    // move the value to its new position in the array
    this.values.splice(indexToMoveBefore, 0, valueToMove)
    // remove the value from its original position in the array
    const indexToDelete = indexToMove < indexToMoveBefore ? indexToMove : indexToMove + 1
    this.values.splice(indexToDelete, 1)
    // update the affected indices
    const minAffectedIndex = Math.min(indexToMove, indexToMoveBefore)
    for (let i = minAffectedIndex; i < this.values.length; i++) {
      this.indices[this.values[i]] = i
    }
    const dstIndex = indexToMove < indexToMoveBefore ? indexToMoveBefore - 1 : indexToMoveBefore
    return {
      fromIndex: indexToMove,
      toIndex: dstIndex,
      length: this.values.length,
      before: valueToMoveBefore,
      after: valueToMoveAfter
    }
  }
}
