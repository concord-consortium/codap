// Tracks the plugins, or the host page, that CODAP has asked to undo or redo an action they reported
// (undoAction or redoAction). While one answers, the requests it sends to reverse or reapply its change can't
// themselves be undone, but they don't clear what can be redone, so the user can still redo its action (see
// AppHistoryService).
//
// Each plugin's answer lasts until shortly after it has replied to every undoAction or redoAction it was sent,
// or until a timeout. Undoing or redoing other entries meanwhile doesn't end it, so a quick double undo still
// lets the plugin answer. A new entry, or erasing the history, ends every answer: there is nothing left to redo.
//
// This is a heuristic. A plugin that replies first and sends its requests more than the grace period later, one
// held back while the user edits a cell, or a long chain of requests may outlast it, and those requests then
// clear what can be redone. Only requests whose handlers make their change before awaiting are attributed to
// the requester (see notification-requester.ts).

// how long after its last reply a plugin's requests still count as part of its answer
export const kUndoRedoAnswerGraceMs = 500
// how long an answer can last while a reply is outstanding
export const kUndoRedoAnswerTimeoutMs = 3000

interface IUndoRedoAnswer {
  historyEntryIds: Set<string>
  // the undoAction and redoAction notices the plugin hasn't replied to yet
  outstanding: number
  timer?: ReturnType<typeof setTimeout>
}

const answers = new Map<string, IUndoRedoAnswer>()

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

// CODAP sent the plugin undoAction or redoAction for the given history entry
export function startUndoRedoAnswer(tileId: string, historyEntryId: string) {
  const answer = answers.get(tileId) ?? { historyEntryIds: new Set<string>(), outstanding: 0 }
  answers.set(tileId, answer)
  answer.historyEntryIds.add(historyEntryId)
  ++answer.outstanding
  setAnswerTimer(tileId, answer, kUndoRedoAnswerTimeoutMs)
}

// The plugin replied to one of them: once it has replied to all, its answer ends after a short grace period,
// for requests sent just after the reply
export function replyToUndoRedoAnswer(tileId: string) {
  const answer = answers.get(tileId)
  if (!answer) return
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
