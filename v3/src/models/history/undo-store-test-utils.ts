import { Instance } from "@concord-consortium/mobx-state-tree"
import { when } from "mobx"
import { TreeManager, CDocument } from "./tree-manager"

// TODO: it would nicer to use a custom Jest matcher here so we can
// provide a better error message when it fails
export async function expectEntryToBeComplete(manager: Instance<typeof TreeManager>, length: number) {
  const changeDocument: Instance<typeof CDocument> = manager.document
  let timedOut = false
  try {
    await when(
      () => changeDocument.history.length >= length && changeDocument.history.at(length-1)?.state === "complete",
      {timeout: 100})
  } catch (e) {
    timedOut = true
  }
  expect({
    historyLength: changeDocument.history.length,
    lastEntryState: changeDocument.history.at(-1)?.state,
    activeExchanges: changeDocument.history.at(-1)?.activeExchanges.toJSON(),
    timedOut
  }).toEqual({
    historyLength: length,
    lastEntryState: "complete",
    activeExchanges: [],
    timedOut: false
  })
}
