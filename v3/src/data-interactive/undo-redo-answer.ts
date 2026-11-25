// Tracks the plugins, or the host page, that CODAP has asked to undo or redo an action they reported
// (undoAction or redoAction). While one answers, its requests don't clear what can be redone (see
// AppHistoryService). An answer lasts until shortly after the plugin has replied to every notice it was sent, or
// until a timeout; a new entry, or erasing the history, ends every answer. The undo guide
// (doc/plugin-api/guides/undo-and-redo.md) lists the requests this heuristic misses.

// how long after its last reply a plugin's requests still count as part of its answer
export const kUndoRedoAnswerGraceMs = 500
// how long an answer can last while a reply is outstanding
export const kUndoRedoAnswerTimeoutMs = 3000

interface IUndoRedoAnswer {
  // identifies this answer, so a late reply to an answer that has ended doesn't count toward a later one
  generation: number
  // the undoAction and redoAction notices the plugin hasn't replied to yet
  outstanding: number
  timer?: ReturnType<typeof setTimeout>
}

const answers = new Map<string, IUndoRedoAnswer>()
let lastGeneration = 0

// End one plugin's answer, or with no tile, every answer
export function endUndoRedoAnswer(tileId?: string) {
  const ids = tileId != null ? [tileId] : Array.from(answers.keys())
  ids.forEach(id => {
    const answer = answers.get(id)
    if (answer?.timer) clearTimeout(answer.timer)
    answers.delete(id)
  })
}

function setAnswerTimer(tileId: string, answer: IUndoRedoAnswer, ms: number) {
  if (answer.timer) clearTimeout(answer.timer)
  answer.timer = setTimeout(() => endUndoRedoAnswer(tileId), ms)
}

// CODAP sent the plugin undoAction or redoAction. Returns the answer's generation, to pass with the reply.
export function startUndoRedoAnswer(tileId: string) {
  const answer = answers.get(tileId) ?? { generation: ++lastGeneration, outstanding: 0 }
  answers.set(tileId, answer)
  ++answer.outstanding
  setAnswerTimer(tileId, answer, kUndoRedoAnswerTimeoutMs)
  return answer.generation
}

// The plugin replied to one of them: once it has replied to all, its answer ends after a short grace period,
// for requests sent just after the reply
export function replyToUndoRedoAnswer(tileId: string, generation: number) {
  const answer = answers.get(tileId)
  if (answer?.generation !== generation) return
  answer.outstanding = Math.max(0, answer.outstanding - 1)
  if (answer.outstanding === 0) setAnswerTimer(tileId, answer, kUndoRedoAnswerGraceMs)
}

// A new entry or an erased history ends every answer; undoing or redoing entries doesn't
export function handleUndoHistoryChangeForAnswer(change: string) {
  if (change === "add" || change === "clearRedo" || change === "clearUndo") endUndoRedoAnswer()
}

export function isAnsweringUndoRedo(tileId?: string) {
  return tileId != null && answers.has(tileId)
}
