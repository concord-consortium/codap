import { HistoryEntryType } from "./history"

type UndoRedoStringKeys = [undoKey: string, redoKey: string]
type UndoRedoStringKeysOrFn = UndoRedoStringKeys | ((entry?: HistoryEntryType) => UndoRedoStringKeys | undefined)

const undoRedoStrings: Record<string, UndoRedoStringKeysOrFn> = {}

export function registerUndoRedoStrings(strings: Record<string, UndoRedoStringKeysOrFn>) {
  Object.keys(strings).forEach(key => {
    undoRedoStrings[key] = strings[key]
  })
}

export function getUndoStringKey(key: string, entry?: HistoryEntryType) {
  const stringKeysOrFn = undoRedoStrings[key]
  const stringKeys = (typeof stringKeysOrFn === "function") ? stringKeysOrFn(entry) : stringKeysOrFn
  return stringKeys?.[0] || "DG.mainPage.mainPane.undoButton.toolTip"
}

export function getRedoStringKey(key: string, entry?: HistoryEntryType) {
  const stringKeysOrFn = undoRedoStrings[key]
  const stringKeys = (typeof stringKeysOrFn === "function") ? stringKeysOrFn(entry) : stringKeysOrFn
  return stringKeys?.[1] || "DG.mainPage.mainPane.redoButton.toolTip"
}
