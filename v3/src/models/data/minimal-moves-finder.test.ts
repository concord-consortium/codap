import { isEqual, isObject, transform } from "lodash"
import { ICategoryMove } from "./category-set"
import { MinimalMovesFinder } from "./minimal-moves-finder"

/**
 * Removes `undefined` properties from an object recursively.
 * @param obj The object to clean.
 * @returns A new object with `undefined` properties removed.
 */
function clean<T extends object>(obj: T): T {
  return transform(obj, (result, value, key) => {
    if (value !== undefined) {
      // If the value is an object, recursively clean it
      result[key] = isObject(value) ? clean(value) : value
    }
  })
}

function testMinMoves(input: string[], target: string[], expectedMoves: ICategoryMove[], debug = false) {
  const finder = new MinimalMovesFinder(input, target, debug)
  const minMovesPredecessorsFirst = finder.minMoves()
  const minMovesSuccessorsFirst = finder.minMoves(true)
  // run the moves finder both ways to potentially increase coverage
  expect(minMovesPredecessorsFirst).toEqual(expectedMoves)
  expect(minMovesSuccessorsFirst).toEqual(expectedMoves)
  // so there can be an expect() in each test case
  return isEqual(clean(minMovesPredecessorsFirst), expectedMoves) &&
          isEqual(clean(minMovesSuccessorsFirst), expectedMoves)
}

describe("MinimalMovesFinder", () => {
  it("should handle empty arrays", () => {
    expect(testMinMoves([], [], [])).toBe(true)
  })
  it("should handle ordered arrays", () => {
    expect(testMinMoves(["a", "b", "c"], ["a", "b", "c"],
      [])).toBe(true)
  })
  it("should handle a single move from end to beginning of longest block with debugging", () => {
    jestSpyConsole("log", spy => {
      expect(testMinMoves(["b", "c", "a"], ["a", "b", "c"],
        [{ value: "a", fromIndex: 2, toIndex: 0, length: 3, before: "b" }], true)).toBe(true)
      expect(spy).toHaveBeenCalled()
    })
  })
  it("validateTree should flag invalid node indices", () => {
    jestSpyConsole("log", logSpy => {
      jestSpyConsole("error", errorSpy => {
        const finder = new MinimalMovesFinder(["a", "b", "c"], ["a", "b", "c"], true)
        // @ts-expect-error ignore private access for test
        finder.blockTree.tree.key = 1
        expect(finder.validateTree("invalid node test")).toBe(false)
        expect(logSpy).toHaveBeenCalled()
        expect(errorSpy).toHaveBeenCalled()
      })
    })
  })
  it("should flag infinite loops", () => {
    const predecessorsSpy = jest.spyOn(MinimalMovesFinder.prototype, "getPredecessors").mockImplementation(() => {
      return {} // force an infinite loop
    })
    jestSpyConsole("log", logSpy => {
      jestSpyConsole("error", errorSpy => {
        const finder = new MinimalMovesFinder(["a", "b", "c"], ["a", "b", "c"])
        expect(finder.minMoves()).toEqual([])
        expect(errorSpy).toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalled()
      })
    })
    predecessorsSpy.mockRestore()

    const successorsSpy = jest.spyOn(MinimalMovesFinder.prototype, "getSuccessors").mockImplementation(() => {
      return {} // force an infinite loop
    })
    jestSpyConsole("log", logSpy => {
      jestSpyConsole("error", errorSpy => {
        const finder = new MinimalMovesFinder(["a", "b", "c"], ["a", "b", "c"])
        expect(finder.minMoves()).toEqual([])
        expect(errorSpy).toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalled()
      })
    })
    successorsSpy.mockRestore()
  })
  it("should handle a single move from beginning to end of longest block", () => {
    expect(testMinMoves(["c", "a", "b"], ["a", "b", "c"],
      [{ value: "c", fromIndex: 0, toIndex: 2, length: 3, after: "b" }])).toBe(true)
  })
  it("should handle moving a single block from end to beginning of longest block", () => {
    expect(testMinMoves(["c", "d", "e", "a", "b"], ["a", "b", "c", "d", "e"], [
      { value: "b", fromIndex: 4, toIndex: 0, length: 5, before: "c" },
      { value: "a", fromIndex: 4, toIndex: 0, length: 5, before: "b" }
    ])).toBe(true)
  })
  it("should handle moving a single block from beginning to end of longest block", () => {
    expect(testMinMoves(["d", "e", "a", "b", "c"], ["a", "b", "c", "d", "e"], [
      { value: "d", fromIndex: 0, toIndex: 4, length: 5, after: "c" },
      { value: "e", fromIndex: 0, toIndex: 4, length: 5, after: "d" }
    ])).toBe(true)
  })
  it("should handle moving a single block from beginning to middle before longest block", () => {
    expect(testMinMoves(["c", "a", "b", "d", "e", "f"], ["a", "b", "c", "d", "e", "f"],
      [{ value: "c", fromIndex: 0, toIndex: 2, length: 6, after: "b", before: "d" }])).toBe(true)
  })
  it("should handle moving a single block from end to middle after longest block", () => {
    expect(testMinMoves(["a", "b", "c", "e", "f", "d"], ["a", "b", "c", "d", "e", "f"],
      [{ value: "d", fromIndex: 5, toIndex: 3, length: 6, after: "c", before: "e" }])).toBe(true)
  })
  it("should handle moving a single block from end to middle before longest block", () => {
    expect(testMinMoves(["a", "b", "d", "e", "f", "c"], ["a", "b", "c", "d", "e", "f"],
      [{ value: "c", fromIndex: 5, toIndex: 2, length: 6, after: "b", before: "d" }])).toBe(true)
  })
  it("should handle moving multiple blocks from end to beginning of longest block", () => {
    expect(testMinMoves(["c", "d", "e", "b", "a"], ["a", "b", "c", "d", "e"], [
        { value: "b", fromIndex: 3, toIndex: 0, length: 5, before: "c" },
        { value: "a", fromIndex: 4, toIndex: 0, length: 5, before: "b" }
      ])).toBe(true)
  })
  it("should handle moving multiple blocks from beginning to end of longest block", () => {
    expect(testMinMoves(["e", "d", "a", "b", "c"], ["a", "b", "c", "d", "e"], [
        { value: "d", fromIndex: 1, toIndex: 4, length: 5, after: "c" },
        { value: "e", fromIndex: 0, toIndex: 4, length: 5, after: "d" }
      ])).toBe(true)
  })
  it("should handle moving middle block to first block around longest block", () => {
    expect(testMinMoves(["b", "c", "d", "a", "e", "f"], ["a", "b", "c", "d", "e", "f"],
      [{ value: "a", fromIndex: 3, toIndex: 0, length: 6, before: "b" }])).toBe(true)
  })
  it("should handle moving middle block to last block around longest block", () => {
    expect(testMinMoves(["a", "b", "f", "c", "d", "e"], ["a", "b", "c", "d", "e", "f"],
      [{ value: "f", fromIndex: 2, toIndex: 5, length: 6, after: "e" }])).toBe(true)
  })
  it("should handle moving middle block to first block around first block", () => {
    expect(testMinMoves(["b", "c", "d", "a", "e", "f"], ["a", "b", "c", "d", "e", "f"],
      [{ value: "a", fromIndex: 3, toIndex: 0, length: 6, before: "b" }])).toBe(true)
  })
  it("should handle moving middle block to last block around last block", () => {
    expect(testMinMoves(["a", "b", "c", "f", "d", "e"], ["a", "b", "c", "d", "e", "f"],
      [{ value: "f", fromIndex: 3, toIndex: 5, length: 6, after: "e" }])).toBe(true)
  })
  it("should handle adjacent middle elements swapped", () => {
    expect(testMinMoves(["a", "c", "b", "d"], ["a", "b", "c", "d"], [
      { value: "b", fromIndex: 2, toIndex: 1, length: 4, after: "a", before: "c" }
    ])).toBe(true)
  })
  it("should handle two non-adjacent elements swapped", () => {
    expect(testMinMoves(["a", "d", "c", "b"], ["a", "b", "c", "d"], [
      { value: "b", fromIndex: 3, toIndex: 1, length: 4, after: "a", before: "d" },
      { value: "c", fromIndex: 3, toIndex: 2, length: 4, after: "b", before: "d" }
    ])).toBe(true)
  })
  it("should handle multiple moves from before longest block to another block", () => {
    expect(testMinMoves(["a", "e", "f", "b", "c", "d"], ["a", "b", "c", "d", "e", "f"], [
      { value: "e", fromIndex: 1, toIndex: 5, length: 6, after: "d" },
      { value: "f", fromIndex: 1, toIndex: 5, length: 6, after: "e" }
    ])).toBe(true)
  })
  it("should handle multiple moves from after longest block to another block", () => {
    expect(testMinMoves(["c", "d", "e", "a", "b", "f"], ["a", "b", "c", "d", "e", "f"], [
      { value: "b", fromIndex: 4, toIndex: 0, length: 6, before: "c" },
      { value: "a", fromIndex: 4, toIndex: 0, length: 6, before: "b" }
    ])).toBe(true)
  })
  it("can handle an interleaved sequence", () => {
    expect(testMinMoves(["a", "d", "b", "e", "c", "f"], ["a", "b", "c", "d", "e", "f"], [
      { value: "b", fromIndex: 2, toIndex: 1, length: 6, after: "a", before: "d" },
      { value: "c", fromIndex: 4, toIndex: 2, length: 6, after: "b", before: "d" }
    ])).toBe(true)
  })
  it("can reverse a reversed sequence", () => {
    expect(testMinMoves(["e", "d", "c", "b", "a"], ["a", "b", "c", "d", "e"], [
      { value: "d", fromIndex: 1, toIndex: 0, length: 5, before: "e" },
      { value: "c", fromIndex: 2, toIndex: 0, length: 5, before: "d" },
      { value: "b", fromIndex: 3, toIndex: 0, length: 5, before: "c" },
      { value: "a", fromIndex: 4, toIndex: 0, length: 5, before: "b" }])).toBe(true)
  })
  it("should handle blocks in reverse order", () => {
    expect(testMinMoves(["c", "b", "a", "f", "e", "d"], ["a", "b", "c", "d", "e", "f"], [
      { value: "b", fromIndex: 1, toIndex: 0, length: 6, before: "c" },
      { value: "a", fromIndex: 2, toIndex: 0, length: 6, before: "b" },
      { value: "d", fromIndex: 5, toIndex: 3, length: 6, before: "f", after: "c" },
      { value: "e", fromIndex: 5, toIndex: 4, length: 6, before: "f", after: "d" }
    ])).toBe(true)
  })
  it("should handle LifeSpan from a mammals example document", () => {
    expect(testMinMoves(
      ["3", "5", "7", "9", "10", "12", "14", "15", "16", "19", "20", "25", "30", "40", "50", "70", "80"],
      ["10", "12", "14", "15", "16", "19", "20", "25", "3", "30", "40", "5", "50", "7", "70", "80", "9"], [
        { value: "9", fromIndex: 3, toIndex: 16, length: 17, after: "80" },
        { value: "7", fromIndex: 2, toIndex: 13, length: 17, after: "50", before: "70" },
        { value: "5", fromIndex: 1, toIndex: 11, length: 17, after: "40", before: "50" },
        { value: "3", fromIndex: 0, toIndex: 8, length: 17, after: "25", before: "30" }
      ])).toBe(true)
  })
})
