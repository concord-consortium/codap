import {
  endUndoRedoAnswer, handleUndoHistoryChangeForAnswer, isAnsweringUndoRedo, kUndoRedoAnswerGraceMs,
  kUndoRedoAnswerTimeoutMs, replyToUndoRedoAnswer, startUndoRedoAnswer
} from "./undo-redo-answer"

describe("undo/redo answers", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => {
    endUndoRedoAnswer()
    jest.useRealTimers()
  })

  it("ends at the timeout while a reply is outstanding", () => {
    startUndoRedoAnswer("plugin")
    jest.advanceTimersByTime(kUndoRedoAnswerTimeoutMs - 1)
    expect(isAnsweringUndoRedo("plugin")).toBe(true)
    jest.advanceTimersByTime(1)
    expect(isAnsweringUndoRedo("plugin")).toBe(false)
  })

  it("lasts until the plugin has replied to every notice it was sent", () => {
    const generation = startUndoRedoAnswer("plugin")
    expect(startUndoRedoAnswer("plugin")).toBe(generation)
    replyToUndoRedoAnswer("plugin", generation)
    jest.advanceTimersByTime(kUndoRedoAnswerGraceMs)
    expect(isAnsweringUndoRedo("plugin")).toBe(true)
    replyToUndoRedoAnswer("plugin", generation)
    jest.advanceTimersByTime(kUndoRedoAnswerGraceMs - 1)
    expect(isAnsweringUndoRedo("plugin")).toBe(true)
    jest.advanceTimersByTime(1)
    expect(isAnsweringUndoRedo("plugin")).toBe(false)
  })

  it("ignores a late reply to an answer that has ended", () => {
    const first = startUndoRedoAnswer("plugin")
    jest.advanceTimersByTime(kUndoRedoAnswerTimeoutMs)
    const second = startUndoRedoAnswer("plugin")
    expect(second).not.toBe(first)
    replyToUndoRedoAnswer("plugin", first)
    jest.advanceTimersByTime(kUndoRedoAnswerGraceMs)
    expect(isAnsweringUndoRedo("plugin")).toBe(true)
    replyToUndoRedoAnswer("plugin", second)
    jest.advanceTimersByTime(kUndoRedoAnswerGraceMs)
    expect(isAnsweringUndoRedo("plugin")).toBe(false)
  })

  it("ends every answer on a new entry or an erased history, but not on undo or redo", () => {
    startUndoRedoAnswer("a")
    startUndoRedoAnswer("b")
    handleUndoHistoryChangeForAnswer("undo")
    handleUndoHistoryChangeForAnswer("redo")
    expect([isAnsweringUndoRedo("a"), isAnsweringUndoRedo("b")]).toEqual([true, true])
    for (const change of ["add", "clearRedo", "clearUndo"]) {
      startUndoRedoAnswer("a")
      startUndoRedoAnswer("b")
      handleUndoHistoryChangeForAnswer(change)
      expect([change, isAnsweringUndoRedo("a"), isAnsweringUndoRedo("b")]).toEqual([change, false, false])
    }
  })
})
