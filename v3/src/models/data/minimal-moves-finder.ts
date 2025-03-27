/*
 * MinimalMovesFinder
 *
 * This class finds a reasonably minimal number of moves that converts an array of strings in one
 * order to another order. This is used when importing v2 documents to convert v2's __order array,
 * which is an ordered list of all values in the category set, to v3's CategorySet, which
 * represents the order as a set of moves required to transform from alphanumerically sorted to
 * the desired order. The algorithm initially identifies blocks of strings that are in the same
 * order in both arrays, as well as the longest such block, and then finds a reasonable number of
 * moves to convert the current order to the desired order. The algorithm represents the blocks in
 * an AVL tree data structure, which allows for efficient searching and insertion of blocks of
 * strings. It then iteratively considers the beginning and end of the longest block, determining
 * the next move based on heuristics like size of the blocks and their position relative to their
 * expected position in the desired order. The algorithm is not guaranteed to find the absolute
 * minimum number of moves, but it should be reasonably close in most cases.
 *
 * The AVL tree class (@nedb/binary-search-tree) is used to store the blocks of strings, and
 * provides methods for searching and manipulating the tree. It was extended for our use case to
 * track the longest node in the tree and to allow for prepending values to the node data when
 * inserting. The MappedStringArray class is used to maintain an array of strings and a mapping
 * of those strings to their indices, allowing for efficient lookups and moves within the array.
 *
 * This code assumes that the input arrays contain unique strings (no duplicates) and that the
 * same strings are present in both arrays. Clients should preprocess the input arrays to
 * guarantee that these conditions are met.
 */
import { AVLNode, AVLTree } from "@nedb/binary-search-tree"
import { isEqual } from "lodash"
import { MappedStringArray } from "../../utilities/mapped-string-array"
import { ICategoryMove } from "./category-set"

interface INeighborBlock {
  key: number
  values: string[]
  isOnSide: boolean
}

interface INeighborBlocks {
  current?: INeighborBlock
  expected?: INeighborBlock
}

export class MinimalMovesFinder {
  private currStrings: MappedStringArray
  private dstStrings: MappedStringArray
  private blockTree: AVLTree
  private moves: ICategoryMove[] = []
  private debug: boolean

  constructor(srcArray: string[], dstArray: string[], debug = false) {
    this.currStrings = new MappedStringArray(srcArray)
    this.dstStrings = new MappedStringArray(dstArray, true)
    // AVL tree stores an array of consecutive string values under the start index as key
    this.blockTree = new AVLTree()
    this.debug = debug

    // identify blocks of values in the correct order
    let prevDstIndex = -999
    let currStartIndex = -999
    this.currStrings.values.forEach((value, currIndex) => {
      const dstIndex = this.dstStrings.getIndex(value)
      if (dstIndex !== prevDstIndex + 1) {
        currStartIndex = currIndex
      }
      this.blockTree.insert(currStartIndex, value)
      prevDstIndex = dstIndex ?? -999
    })
  }

  get longest() {
    return this.blockTree.longest
  }

  getLastIndexOfBlock(index: number) {
    const blockValues = this.blockTree.search(index)
    if (!blockValues?.length) return -1
    return index + blockValues.length - 1
  }

  getDestinationIndexForBlockStart(index: number) {
    const value = this.currStrings.getValue(index)
    const dstIndex = value ? this.dstStrings.getIndex(value) : null
    return dstIndex != null ? dstIndex : -1
  }

  getDestinationIndexForBlockEnd(index: number) {
    const blockValues = this.blockTree.search(index)
    if (!blockValues?.length) return -1
    const lastValue = blockValues[blockValues.length - 1]
    const dstIndex = this.dstStrings.getIndex(lastValue)
    return dstIndex != null ? dstIndex : -1
  }

  getBlockContainingIndex(index: number) {
    const values = this.blockTree.searchNearestLte(index)
    if (!values) return null
    const key = this.currStrings.getIndex(values[0])
    if (key == null || index >= key + values.length) return null
    return { key, values }
  }

  getBlockContainingValue(value: Maybe<string>) {
    const index = value != null ? this.currStrings.getIndex(value) : null
    return index != null ? this.getBlockContainingIndex(index) : null
  }

  // useful for debugging
  validateTree(label: string, validateLongest = true) {
    if (!this.debug) return true
    // ensure that the AVL tree indices are valid
    let currIndex = 0
    let isValid = true
    let longest: AVLNode | null = null
    this.blockTree.executeOnEveryNode(node => {
      if (!longest || node.data.length > longest.data.length) {
        longest = node
      }
      if (node.key !== currIndex) {
        isValid = false
        console.error(`${label}:`, "validateTreeIndices [invalid node]", "node.key:", node.key, "currIndex:", currIndex)
        this.blockTree.prettyPrint(true)
      }
      currIndex += node.data.length
    })
    // validate the longest block
    const _longest = longest as AVLNode | null
    if (validateLongest &&
        (this.getBlockContainingIndex(this.longest.key)?.key !== this.longest.key ||
        !_longest || _longest.data.length > this.longest.data.length)) {
      console.error(`${label}:`, "validateTreeIndices [invalid longest]", "longest.key:", this.longest.key,
                    "containingBlock:", this.getBlockContainingIndex(this.longest.key)?.key,
                    "actualLongest:", _longest?.key, "actualLongestValues:", _longest?.data)
      this.blockTree.prettyPrint(true)
      isValid = false
    }
    if (isValid) {
      // eslint-disable-next-line no-console
      console.log(`${label}:`, "validateTreeIndices [valid tree]")
    }
    return isValid
  }

  // identify the current and expected predecessor blocks for the specified block
  getPredecessors(block: AVLNode) {
    const neighbors: INeighborBlocks = {}

    const firstString = this.currStrings.getValue(block.key)
    const firstDstIndex = firstString ? this.dstStrings.getIndex(firstString) ?? block.key : block.key

    // find the current predecessor block
    const currPredecessorValues = this.blockTree.searchBefore(block.key)
    if (currPredecessorValues) {
      const currPredecessorKey = this.currStrings.getIndex(currPredecessorValues[0])
      if (currPredecessorKey != null) {
        const currPredecessorDstIndex = this.dstStrings.getIndex(currPredecessorValues[0]) ?? currPredecessorKey
        neighbors.current = {
          key: currPredecessorKey,
          values: currPredecessorValues,
          isOnSide: currPredecessorDstIndex < firstDstIndex
        }
      }
    }

    // find the expected predecessor block
    const expectedPredecessorDstIndex = firstDstIndex != null ? firstDstIndex - 1 : undefined
    if (expectedPredecessorDstIndex != null && expectedPredecessorDstIndex >= 0) {
      const expectedPredecessorValue = this.dstStrings.getValue(expectedPredecessorDstIndex)
      const expectedPredecessor = this.getBlockContainingValue(expectedPredecessorValue)
      if (expectedPredecessor) {
        neighbors.expected = {
          ...expectedPredecessor,
          isOnSide: (expectedPredecessor.key < block.key) === (expectedPredecessorDstIndex < firstDstIndex)
        }
      }
    }

    return neighbors.current || neighbors.expected ? neighbors : null
  }

  // identify the current and expected successor blocks for the specified block
  getSuccessors(block: AVLNode) {
    const neighbors: INeighborBlocks = {}

    const lastIndex = block.key + block.data.length - 1
    const lastString = this.currStrings.getValue(lastIndex)
    const lastDstIndex = lastString ? this.dstStrings.getIndex(lastString) ?? lastIndex: lastIndex

    // find the current successor block
    const currSuccessorValues = this.blockTree.searchAfter(block.key)
    if (currSuccessorValues) {
      const currSuccessorKey = this.currStrings.getIndex(currSuccessorValues[0])
      if (currSuccessorKey != null) {
        const currSuccessorDstIndex = this.dstStrings.getIndex(currSuccessorValues[0]) ?? currSuccessorKey
        neighbors.current = {
          key: currSuccessorKey,
          values: currSuccessorValues,
          isOnSide: currSuccessorDstIndex > lastDstIndex
        }
      }
    }

    // find the expected successor block
    const expectedSuccessorDstIndex = lastDstIndex != null ? lastDstIndex + 1 : undefined
    if (expectedSuccessorDstIndex != null && expectedSuccessorDstIndex < this.dstStrings.length) {
      const expectedSuccessorValue = this.dstStrings.getValue(expectedSuccessorDstIndex)
      const expectedSuccessor = this.getBlockContainingValue(expectedSuccessorValue)
      if (expectedSuccessor) {
        neighbors.expected = {
          ...expectedSuccessor,
          isOnSide: (expectedSuccessor.key > block.key) === (expectedSuccessorDstIndex > lastDstIndex)
        }
      }
    }

    return neighbors.current || neighbors.expected ? neighbors : null
  }

  syncPredecessors() {
    // move blocks into/out of position immediately before the longest block
    let predecessors: INeighborBlocks | null = null
    let prevPredecessors: INeighborBlocks | null = null
    while ((predecessors = this.getPredecessors(this.longest))) {
      if (isEqual(predecessors, prevPredecessors)) {
        console.error("minMoves [beforeLongest -- infinite loop]", "longestBlock:", this.longest.key)
        this.blockTree.prettyPrint(true)
        return
      }
      // move one block into position
      this.syncLongestPredecessors(predecessors)
      prevPredecessors = predecessors
    }
  }

  syncSuccessors() {
    // move blocks into/out of position immediately after the longest block
    let successors: INeighborBlocks | null
    let prevSuccessors: INeighborBlocks | null = null
    while ((successors = this.getSuccessors(this.longest))) {
      if (isEqual(successors, prevSuccessors)) {
        console.error("minMoves [afterLongest -- infinite loop]", "longestBlock:", this.longest.key)
        this.blockTree.prettyPrint(true)
        return
      }
      // move one block into position
      this.syncLongestSuccessors(successors)
      prevSuccessors = successors
    }
  }

  // determine the minimum number of moves required to sort the blocks of values
  // `successorsFirst` affects the order of execution and is primarily useful for testing
  minMoves(successorsFirst = false) {
    // move blocks into/out of position immediately before the longest block
    if (!successorsFirst) {
      this.syncPredecessors()
    }

    // move blocks into/out of position immediately after the longest block
    this.syncSuccessors()

    // move blocks into/out of position immediately before the longest block
    if (successorsFirst) {
      this.syncPredecessors()
    }
    return this.moves
  }

  // move a single value from one block to another
  // returns the new source and destination block indices
  // if the source block is empty, it will be deleted
  moveValueFromBlockToBlock(value: string, srcBlock: number, dstBlock: number, prepend = false) {
    const srcIndex = this.currStrings.getIndex(value)
    if (srcIndex == null) return [] as number[]
    const dstIndex = prepend ? dstBlock : this.getLastIndexOfBlock(dstBlock)
    const minIndex = Math.min(srcIndex, dstIndex)
    const maxIndex = Math.max(srcIndex, dstIndex)
    // move the value from the source block to the destination block
    this.blockTree.delete(srcBlock, value)
    this.blockTree.insert(dstBlock, value, prepend)
    // adjust the keys (indices) of all affected blocks
    let nextSrcBlock = srcBlock
    let nextDstBlock = dstBlock
    let longest: AVLNode | null = null
    this.blockTree.executeOnEveryNode(node => {
      if (!longest || node.data.length > longest.data.length) {
        longest = node
      }
      if (srcBlock < dstBlock) {
        // moving values forward; decrement affected indices
        if (node.key > minIndex && node.key <= maxIndex) {
          if (nextDstBlock === node.key) {
            --nextDstBlock
          }
          --node.key
        }
      } else {
        // moving values backward; increment affected indices
        if (node.key > minIndex && node.key < maxIndex) {
          if (nextSrcBlock === node.key) {
            ++nextSrcBlock
          }
          ++node.key
        }
      }
    })
    if (longest) {
      this.blockTree.longest = longest
    }
    return [nextSrcBlock, nextDstBlock] as const
  }

  // traverse the tree, merging adjacent blocks of values into a single block
  mergeAdjacentBlocks() {
    let prevNode: AVLNode | null = null
    const nodesToMerge: { prev: AVLNode, next: AVLNode }[] = []
    // find adjacent blocks of values that can be merged
    // (i.e. the end of one block is is expected to precede the start of the next block)
    this.blockTree.executeOnEveryNode(node => {
      const prevNodeEndDstIndex = prevNode ? this.getDestinationIndexForBlockEnd(prevNode.key) : -999
      const nodeStartDstIndex = this.getDestinationIndexForBlockStart(node.key)
      if (prevNode && prevNodeEndDstIndex + 1 === nodeStartDstIndex) {
        nodesToMerge.push({ prev: prevNode, next: node })
      }
      prevNode = node
    })
    // merge any adjacent blocks identified
    for (let i = 0; i < nodesToMerge.length; ++i) {
      const { prev, next } = nodesToMerge[i]
      // merge the shorter block into the longer one
      if (prev.data.length < next.data.length) {
        const prevNodeKey = prev.key
        for (const value of prev.data.slice().reverse()) {
          this.blockTree.delete(prevNodeKey, value)
          this.blockTree.insert(next.key, value, true)
        }
        next.key = prevNodeKey
      }
      else {
        const nextNodeKey = next.key
        // adjust next merge if it's affected by this merge
        if (i < nodesToMerge.length - 1 && nodesToMerge[i + 1].prev.key === nextNodeKey) {
          nodesToMerge[i + 1].prev = prev
        }
        for (const value of next.data.slice()) {
          this.blockTree.delete(nextNodeKey, value)
          this.blockTree.insert(prev.key, value)
        }
      }
    }
  }

  // merge one block at the beginning of another block
  mergeBlockBefore(blockToMoveKey: number, blockToJoinKey: number) {
    const blockToMoveStrings = this.blockTree.search(blockToMoveKey) ?? []
    let successorValue = this.currStrings.getValue(blockToJoinKey)
    if (!successorValue) return
    for (let i = blockToMoveStrings.length - 1; i >= 0; --i) {
      const value = blockToMoveStrings[i]
      ;[blockToMoveKey, blockToJoinKey] = this.moveValueFromBlockToBlock(value, blockToMoveKey, blockToJoinKey, true)
      const move = this.currStrings.moveValueBefore(value, successorValue)
      if (move) this.moves.push({ ...move, value, length: this.currStrings.length, before: successorValue })
      successorValue = value
    }
    // after moving the block, merge any merge-able adjacent blocks that may have resulted
    this.mergeAdjacentBlocks()
  }

  // merge one block at the end of another block
  mergeBlockAfter(blockToMoveKey: number, blockToJoinKey: number) {
    const blockToMoveStrings = this.blockTree.search(blockToMoveKey)
    const joinedBlockLength = this.blockTree.search(blockToJoinKey)?.length
    if (!blockToMoveStrings || joinedBlockLength == null) return
    let predecessorValue = this.currStrings.getValue(blockToJoinKey + joinedBlockLength - 1)
    if (!predecessorValue) return
    for (let i = 0; i < blockToMoveStrings.length; ++i) {
      const value = blockToMoveStrings[i]
      ;[blockToMoveKey, blockToJoinKey] = this.moveValueFromBlockToBlock(value, blockToMoveKey, blockToJoinKey)
      const move = this.currStrings.moveValueAfter(value, predecessorValue)
      if (move) this.moves.push({ ...move, value, length: this.currStrings.length, after: predecessorValue })
      predecessorValue = value
    }
    // after moving the block, merge any merge-able adjacent blocks that may have resulted
    this.mergeAdjacentBlocks()
  }

  // given actual and expected predecessors, heuristically decide which block to move into position and move it
  syncLongestPredecessors(predecessors: INeighborBlocks) {
    this.validateTree("minMoves.syncLongestPredecessors [begin]")
    let blockToMove: "current" | "expected" | null = null
    // if we have neither a current or expected predecessor, we're done
    if (!predecessors.current && !predecessors.expected) return
    // if we only have one of the two, move that one
    if (!!predecessors.current !== !!predecessors.expected) {
      blockToMove = predecessors.current ? "current" : "expected"
    }
    // if we have both and one of them is on the wrong side of the longest block, move that one
    if (!blockToMove && predecessors?.current?.isOnSide !== predecessors?.expected?.isOnSide) {
      blockToMove = predecessors.current?.isOnSide ? "expected" : "current"
    }
    // if we have both and they're both on the (in)correct side of the longest block, move the smaller one
    if (!blockToMove && predecessors.current?.values && predecessors.expected?.values) {
      blockToMove = predecessors.current.values.length < predecessors.expected.values.length ? "current" : "expected"
    }

    // move the block identified to move
    if (blockToMove === "current" && predecessors.current) {
      // move the current predecessor out of the way
      const predecessorDstIndex = this.getDestinationIndexForBlockStart(predecessors.current.key)
      const valueBeforePredecessor = this.dstStrings.getValue(predecessorDstIndex - 1)
      const blockBeforePredecessor = this.getBlockContainingValue(valueBeforePredecessor)
      const blockBeforeDistance = blockBeforePredecessor
                                    ? Math.abs(predecessorDstIndex -
                                                this.getLastIndexOfBlock(blockBeforePredecessor.key))
                                    : Infinity
      const valueAfterPredecessor = this.dstStrings.getValue(predecessorDstIndex + predecessors.current.values.length)
      const blockAfterPredecessor = this.getBlockContainingValue(valueAfterPredecessor)
      const blockAfterDistance = blockAfterPredecessor
                                    ? Math.abs(predecessorDstIndex - blockAfterPredecessor.key)
                                    : Infinity
      // merge it with the block whose current position is closest to the predecessor's destination index
      if (blockBeforeDistance < blockAfterDistance) {
        if (blockBeforePredecessor) {
          this.mergeBlockAfter(predecessors.current.key, blockBeforePredecessor.key)
        }
      }
      else {
        if (blockAfterPredecessor) {
          this.mergeBlockBefore(predecessors.current.key, blockAfterPredecessor.key)
        }
      }
    }
    else if (predecessors.expected) {
      // move the expected predecessor to the beginning of the longest block
      this.mergeBlockBefore(predecessors.expected.key, this.longest.key)
    }
    this.validateTree("minMoves.syncLongestPredecessors [end]")
  }

  // given actual and expected successor, heuristically decide which block to move into position and move it
  syncLongestSuccessors(successors: INeighborBlocks) {
    this.validateTree("minMoves.syncLongestSuccessors [begin]")
    let blockToMove: "current" | "expected" | null = null
    // if we have neither a current or expected successor, we're done
    if (!successors.current && !successors.expected) return
    // if we only have one of the two, move that one
    if (!!successors.current !== !!successors.expected) {
      blockToMove = successors.current ? "current" : "expected"
    }
    // if we have both and one of them is on the wrong side of the longest block, move that one
    if (!blockToMove && successors?.current?.isOnSide !== successors?.expected?.isOnSide) {
      blockToMove = successors.current?.isOnSide ? "expected" : "current"
    }
    // if we have both and they're both on the (in)correct side of the longest block, move the smaller one
    if (!blockToMove && successors.current?.values && successors.expected?.values) {
      blockToMove = successors.current.values.length < successors.expected.values.length ? "current" : "expected"
    }

    // move the block identified to move
    if (blockToMove === "current" && successors.current) {
      // move the current successor out of the way
      const successorDstIndex = this.getDestinationIndexForBlockStart(successors.current.key)
      const valueBeforeSuccessor = this.dstStrings.getValue(successorDstIndex  - 1)
      const blockBeforeSuccessor = this.getBlockContainingValue(valueBeforeSuccessor)
      const blockBeforeDistance = blockBeforeSuccessor
                                    ? Math.abs(successorDstIndex - this.getLastIndexOfBlock(blockBeforeSuccessor.key))
                                    : Infinity
      const valueAfterSuccessor = this.dstStrings.getValue(successorDstIndex + successors.current.values.length)
      const blockAfterSuccessor = this.getBlockContainingValue(valueAfterSuccessor)
      const blockAfterDistance = blockAfterSuccessor
                                    ? Math.abs(successorDstIndex - blockAfterSuccessor.key)
                                    : Infinity
      // merge it with the block whose current position is closest to the successor's destination index
      if (blockBeforeDistance < blockAfterDistance) {
        if (blockBeforeSuccessor) {
          this.mergeBlockAfter(successors.current.key, blockBeforeSuccessor.key)
        }
      }
      else {
        if (blockAfterSuccessor) {
          this.mergeBlockBefore(successors.current.key, blockAfterSuccessor.key)
        }
      }
    }
    else if (successors.expected) {
      // move the desired successor to the end of the longest block
      this.mergeBlockAfter(successors.expected.key, this.longest.key)
    }
    this.validateTree("minMoves.syncLongestSuccessors [end]")
  }
}
