import { getSnapshot, getType, Instance, types } from "mobx-state-tree"
// import { ITileProps } from "src/components/tiles/tile-component"
import { SharedModel, ISharedModel } from "../shared/shared-model"
import { registerSharedModelInfo } from "../shared/shared-model-registry"
import { TileContentModel } from "../tiles/tile-content"
import { registerTileComponentInfo } from "../tiles/tile-component-info"
import { registerTileContentInfo } from "../tiles/tile-content-info"
import { DocumentContentModel, IDocumentContentSnapshotIn } from "../document/document-content"
import { createDocumentModel } from "../document/create-document-model"
import { when } from "mobx"
import { CDocument, TreeManager } from "./tree-manager"
import { HistoryEntrySnapshot } from "./history"
import { nanoid } from "nanoid"
import { cloneDeep } from "lodash"

const TestSharedModel = SharedModel
  .named("TestSharedModel")
  .props({
    type: "TestSharedModel",
    value: types.maybe(types.string)
  })
  .actions(self => ({
    setValue(value: string) {
      self.value = value
    }
  }))
interface TestSharedModelType extends Instance<typeof TestSharedModel> {}

registerSharedModelInfo({
  type: "TestSharedModel",
  modelClass: TestSharedModel
})

const TestTile = TileContentModel
  .named("TestTile")
  .props({
    type: "TestTile",
    text: types.maybe(types.string),
    flag: types.maybe(types.boolean),
    actionText: types.maybe(types.string)
  })
  .volatile(self => ({
    updateCount: 0
  }))
  .views(self => ({
    get sharedModel() {
      const sharedModelManager = self.tileEnv?.sharedModelManager
      const firstSharedModel = sharedModelManager?.getTileSharedModels(self)?.[0]
      if (!firstSharedModel || getType(firstSharedModel) !== TestSharedModel) {
        return undefined
      }
      return firstSharedModel as TestSharedModelType
    },
  }))
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      self.updateCount++
      const sharedModelValue = self.sharedModel?.value
      self.text = sharedModelValue ? `${sharedModelValue}-tile` : undefined
    },
    setFlag(_flag: boolean) {
      self.flag = _flag
    },
    setActionText(value: string) {
      self.actionText = value
    }
  }))
interface TestTileType extends Instance<typeof TestTile> {}

const TestTileComponent: React.FC<any> = () => {
  throw new Error("Component not implemented.")
}
const TestTileTitleBarComponent: React.FC<any> = () => {
  throw new Error("Component not implemented.")
}

registerTileContentInfo({
  type: "TestTile",
  prefix: "TEST",
  modelClass: TestTile,
  defaultContent(options) {
    return TestTile.create()
  },
  getTitle() {
    return "Test"
  }
})
registerTileComponentInfo({
  type: "TestTile",
  TitleBar: TestTileTitleBarComponent,
  Component: TestTileComponent,
  tileEltClass: "test-tile"
})

function setupDocument(initialContent? : IDocumentContentSnapshotIn) {
  const docContentSnapshot = initialContent ||  {
    sharedModelMap: {
      "sm1": {
        sharedModel: {
          id: "sm1",
          type: "TestSharedModel"
        },
        tiles: [ "t1" ]
      }
    },
    tileMap: {
      "t1": {
        id: "t1",
        content: {
          type: "TestTile"
        },
      }
    }
  }
  const docContent = DocumentContentModel.create(docContentSnapshot)

  // This is needed to setup the tree monitor and shared model manager
  const docModel = createDocumentModel({
    type: "Test",
    key: "test",
    content: docContent as any
  })

  docModel.treeMonitor!.enableMonitoring()

  const sharedModel = docContent.sharedModelMap.get("sm1")?.sharedModel as TestSharedModelType
  const tileContent = docContent.tileMap.get("t1")?.content as TestTileType
  const manager = docModel.treeManagerAPI as Instance<typeof TreeManager>
  const undoStore = manager.undoStore

  return {docContent, sharedModel, tileContent, manager, undoStore}
}

const updateFlag = {
  model: "TestTile",
  action: "/content/tileMap/t1/content/setFlag",
  created: expect.any(Number),
  id: expect.any(String),
  records: [
    { action: "/content/tileMap/t1/content/setFlag",
      inversePatches: [
        { op: "replace", path: "/content/tileMap/t1/content/flag", value: undefined}
      ],
      patches: [
        { op: "replace", path: "/content/tileMap/t1/content/flag", value: true}
      ],
      tree: "test"
    },
  ],
  state: "complete",
  tree: "test",
  undoable: true
}

const action1 =   {
  model: "TestTile",
  action: "/content/tileMap/t1/content/setActionText",
  created: expect.any(Number),
  id: expect.any(String),
  records: [
    { action: "/content/tileMap/t1/content/setActionText",
      inversePatches: [
        { op: "replace", path: "/content/tileMap/t1/content/actionText", value: undefined}
      ],
      patches: [
        { op: "replace", path: "/content/tileMap/t1/content/actionText", value: "action 1"}
      ],
      tree: "test"
    },
  ],
  state: "complete",
  tree: "test",
  undoable: true
}

const action2 =   {
  model: "TestTile",
  action: "/content/tileMap/t1/content/setActionText",
  created: expect.any(Number),
  id: expect.any(String),
  records: [
    { action: "/content/tileMap/t1/content/setActionText",
      inversePatches: [
        { op: "replace", path: "/content/tileMap/t1/content/actionText", value: "action 1"}
      ],
      patches: [
        { op: "replace", path: "/content/tileMap/t1/content/actionText", value: "action 2"}
      ],
      tree: "test"
    },
  ],
  state: "complete",
  tree: "test",
  undoable: true
}

const action3 = {
  model: "TestTile",
  action: "/content/tileMap/t1/content/setActionText",
  created: expect.any(Number),
  id: expect.any(String),
  records: [
    { action: "/content/tileMap/t1/content/setActionText",
      inversePatches: [
        { op: "replace", path: "/content/tileMap/t1/content/actionText", value: "action 2"}
      ],
      patches: [
        { op: "replace", path: "/content/tileMap/t1/content/actionText", value: "action 3"}
      ],
      tree: "test"
    },
  ],
  state: "complete",
  tree: "test",
  undoable: true
}

const action4 = {
  model: "TestTile",
  action: "/content/tileMap/t1/content/setActionText",
  created: expect.any(Number),
  id: expect.any(String),
  records: [
    { action: "/content/tileMap/t1/content/setActionText",
      inversePatches: [
        { op: "replace", path: "/content/tileMap/t1/content/actionText", value: "action 3"}
      ],
      patches: [
        { op: "replace", path: "/content/tileMap/t1/content/actionText", value: "action 4"}
      ],
      tree: "test"
    },
  ],
  state: "complete",
  tree: "test",
  undoable: true
}

/**
 * Remove the Jest `expect.any(Number)` on created, and provide a real id.
 * @param entry
 * @returns
 */
function makeRealHistoryEntry(entry: any): HistoryEntrySnapshot {
  const realEntry = cloneDeep(entry)
  realEntry.created = Date.now()
  realEntry.id = nanoid()
  return realEntry
}

it("records multiple history entries", async () => {
  const {tileContent, manager} = setupDocument()
  tileContent.setFlag(true)
  tileContent.setActionText("action 1")
  tileContent.setActionText("action 2")
  tileContent.setActionText("action 3")
  tileContent.setActionText("action 4")

  const changeDocument: Instance<typeof CDocument> = manager.document
  await expectEntryToBeComplete(manager, 5)

  expect(getSnapshot(changeDocument.history)).toEqual([
    updateFlag, action1, action2, action3, action4 ])
})

it("can replay the history entries", async () => {
  const {tileContent, manager} = setupDocument()
  const history = [
    makeRealHistoryEntry(updateFlag),
    makeRealHistoryEntry(action1),
    makeRealHistoryEntry(action2),
    makeRealHistoryEntry(action3),
    makeRealHistoryEntry(action4),
  ]

  manager.setChangeDocument(CDocument.create({history}))
  await manager.replayHistoryToTrees()

  expect(tileContent.flag).toBe(true)
  expect(tileContent.actionText).toEqual("action 4")

  manager.setNumHistoryEntriesApplied(manager.document.history.length)
  expect(manager.numHistoryEventsApplied).toBe(5)

  await manager.goToHistoryEntry(2)
  expect(tileContent.actionText).toBe("action 1")

  // The history should not change after it is replayed
  expect(getSnapshot(manager.document.history)).toEqual(history)
})

// TODO: it would nicer to use a custom Jest matcher here so we can
// provide a better error message when it fails
async function expectEntryToBeComplete(manager: Instance<typeof TreeManager>, length: number) {
  const changeDocument: Instance<typeof CDocument> = manager.document
  let timedOut = false
  try {
    await when(
      () => {
        const _historyLength = changeDocument.history.length
        return _historyLength >= length && changeDocument.history[_historyLength - 1]?.state === "complete"
      },
      {timeout: 100})
  } catch (e) {
    timedOut = true
  }
  const historyLength = changeDocument.history.length
  const lastEntry = changeDocument.history[historyLength - 1]
  expect({
    historyLength,
    lastEntryState: lastEntry?.state,
    activeExchanges: lastEntry?.activeExchanges.toJSON(),
    timedOut
  }).toEqual({
    historyLength: length,
    lastEntryState: "complete",
    activeExchanges: [],
    timedOut: false
  })
}
