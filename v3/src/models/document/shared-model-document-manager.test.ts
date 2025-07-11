import { destroy, Instance, types, flow, SnapshotIn } from "mobx-state-tree"
import { when } from "mobx"
import { ITileBaseProps } from "../../components/tiles/tile-base-props"
import { SharedModel, ISharedModel } from "../shared/shared-model"
import { SharedModelDocumentManager } from "./shared-model-document-manager"
import { registerSharedModelInfo } from "../shared/shared-model-registry"
import { registerTileComponentInfo } from "../tiles/tile-component-info"
import { registerTileContentInfo } from "../tiles/tile-content-info"
import { TileContentModel } from "../tiles/tile-content"
import { getSharedModelManager } from "../tiles/tile-environment"
import { createDocumentModel } from "./create-document-model"
import { DocumentContentModel } from "./document-content"
import { TileModel } from "../tiles/tile-model"
import { LegacyTileRowModel } from "./legacy-tile-row"

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const TestSharedModel = SharedModel
  .named("TestSharedModel")
  .props({
    type: "TestSharedModel",
    value: types.maybe(types.string)
  })
  .actions(self => ({
    setValue(value: string) {
      self.value = value
    },
    setValueAsync: flow(function *setValueAsync(value: string) {
      self.value = value
      yield wait(20)
      self.value = value+1
    })
  }))
interface TestISharedModel extends Instance<typeof TestSharedModel> {}

registerSharedModelInfo({
  type: "TestSharedModel",
  modelClass: TestSharedModel
})

const TestSharedModel2 = SharedModel
  .named("TestSharedModel2")
  .props({type: "TestSharedModel2"})

registerSharedModelInfo({
  type: "TestSharedModel2",
  modelClass: TestSharedModel2
})

// Snapshot processor type
const _TestSharedModel3 = SharedModel
  .named("TestSharedModel3")
  .props({type: "TestSharedModel3"})
const TestSharedModel3 = types.snapshotProcessor(_TestSharedModel3, {
  preProcessor(snapshot: any) {
    // Remove any extra properties
    return {
      id: snapshot.id,
      type: snapshot.type,
    }
  }
})

registerSharedModelInfo({
  type: "TestSharedModel3",
  // modelClass prop is restrictive, but the snapshotProcessor type should work fine
  modelClass: TestSharedModel3 as typeof _TestSharedModel3
})


const TestTile = TileContentModel
  .named("TestTile")
  .props({
    type: "TestTile",
    updateCount: 0,
    something: 0
  })
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      self.updateCount++
    },
    doSomething() {
      self.something += 1
    },
    doSomethingAsync: flow(function *doSomethingAsync() {
      self.something += 1
      yield wait(20)
      self.something += 1
    })
  }))
interface TestTileType extends Instance<typeof TestTile> {}

const TestTileComponent: React.FC<ITileBaseProps> = () => {
  throw new Error("Component not implemented.")
}
const TestTileTitleBarComponent: React.FC<ITileBaseProps> = () => {
  throw new Error("Component not implemented.")
}

registerTileContentInfo({
  type: "TestTile",
  prefix: "TEST",
  modelClass: TestTile,
  defaultContent(options) {
    throw new Error("Function not implemented.")
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

describe("SharedModelDocumentManager", () => {
  it("handles setDocument with an empty doc", () => {
    const doc = DocumentContentModel.create()
    const manager = new SharedModelDocumentManager()
    manager.setDocument(doc)
    expect(manager.document).toBe(doc)
  })

  it("is ready when there is a document", () => {
    const doc = DocumentContentModel.create()
    const manager = new SharedModelDocumentManager()
    expect(manager.isReady).toBe(false)
    manager.setDocument(doc)
    expect(manager.isReady).toBe(true)
  })

  const defaultDocumentContent = {
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
          type: "TestTile",
        },
      }
    }
  }

  function setupDocument(documentContent? : SnapshotIn<typeof DocumentContentModel>) {
    const doc = DocumentContentModel.create(documentContent || defaultDocumentContent)
    doc.setRowCreator(() => LegacyTileRowModel.create())

    // This is needed to setup the tree monitor and shared model manager
    const docModel = createDocumentModel({
      type: "Test",
      key: "test",
      content: doc as any
    })

    // Enable the tree monitor so changes to the shared model trigger the update.
    docModel.treeMonitor!.enableMonitoring()

    return {doc, docModel}
  }

  it("calls tileContent#updateAfterSharedModelChanges when the shared model changes", async () => {
    const {doc, docModel} = setupDocument()
    const tile = doc.tileMap.get("t1")
    assertIsDefined(tile)
    const tileContent = tile.content as TestTileType
    assertIsDefined(tileContent)
    await expectUpdateToBeCalledTimes(tileContent, 0)

    const sharedModel = doc.sharedModelMap.get("sm1")?.sharedModel as TestISharedModel
    expect(sharedModel).toBeDefined()
    expect(getSharedModelManager(doc)?.getSharedModelById("sm1")).toBe(sharedModel)

    sharedModel.setValue("something")

    await expectUpdateToBeCalledTimes(tileContent, 1)

    destroy(docModel)
  })

  it("calls tileContent#updateAfterSharedModelChanges only for shared model changes", async () => {
    const {doc, docModel} = setupDocument()

    const tile = doc.tileMap.get("t1")
    assertIsDefined(tile)
    const tileContent = tile.content as TestTileType
    assertIsDefined(tileContent)
    await expectUpdateToBeCalledTimes(tileContent, 0)

    const sharedModel = doc.sharedModelMap.get("sm1")?.sharedModel as TestISharedModel
    expect(sharedModel).toBeDefined()
    expect(getSharedModelManager(doc)?.getSharedModelById("sm1")).toBe(sharedModel)

    // We call an async action on the tile
    // Then while the async action is running we change the sharedModel
    // In the end 'updateAfterSharedModelChanges' should only be called
    // one time. This isn't critical because it shouldn't break anything
    // if 'updateAfterSharedModelChanges' is called twice. It is just
    // inefficient and can make debugging confusing if it does.
    //
    // This is a tricky case because the middleware recording changes to
    // the shared model will have 2 'recordAction' functions going at the
    // same time. Only the one started by the shared model change should
    // actually cause 'updateAfterSharedModelChanges' to be called.
    const doSomethingPromise = tileContent.doSomethingAsync()
    // Give the middleware time to handle this call first
    await wait(1)
    sharedModel.setValue("new value")

    // make sure doSomethingAsync is finished
    await doSomethingPromise

    // Give the middleware time to handle the end of the calls, it is really
    // difficult to wait for this precisely so we just wait with a timeout
    await wait(10)

    await expectUpdateToBeCalledTimes(tileContent, 1)

    destroy(docModel)
  })

  // eslint-disable-next-line jest/expect-expect
  it("starts monitoring shared models added after the document", async () => {
    const {doc, docModel} = setupDocument({
      tileMap: {
        "t1": {
          id: "t1",
          content: {
            type: "TestTile",
          },
        }
      }
    })

    const tile = doc.tileMap.get("t1")
    assertIsDefined(tile)
    const tileContent = tile.content as TestTileType
    assertIsDefined(tileContent)

    await expectUpdateToBeCalledTimes(tileContent, 0)

    const manager = getSharedModelManager(docModel)
    const sharedModel = TestSharedModel.create({})
    manager!.addTileSharedModel(tileContent, sharedModel)

    // The update function should be called right after it is added
    await expectUpdateToBeCalledTimes(tileContent, 1)

    // it should be monitoring this now
    sharedModel.setValue("something")
    await expectUpdateToBeCalledTimes(tileContent, 2)

    destroy(docModel)
  })

  // eslint-disable-next-line jest/expect-expect
  it("updates tiles added after the document", async () => {
    const {doc, docModel} = setupDocument({
      sharedModelMap: {
        "sm1": {
          sharedModel: {
            id: "sm1",
            type: "TestSharedModel"
          }
        }
      },
    })

    const sharedModel = doc.sharedModelMap.get("sm1")?.sharedModel as TestISharedModel
    assertIsDefined(sharedModel)

    const tileContent = TestTile.create()
    doc.insertTileInDefaultRow(TileModel.create({ content: tileContent }))
    await expectUpdateToBeCalledTimes(tileContent, 0)

    const manager = getSharedModelManager(docModel)
    manager!.addTileSharedModel(tileContent, sharedModel)

    // The update function should be called right after it is added
    await expectUpdateToBeCalledTimes(tileContent, 1)

    // it should be monitoring this now
    sharedModel.setValue("something")
    await expectUpdateToBeCalledTimes(tileContent, 2)

    destroy(docModel)
  })

  it("finds a shared model by type", () => {
    const manager = new SharedModelDocumentManager()
    const doc = DocumentContentModel.create({
      sharedModelMap: {
        "sm1": {
          sharedModel: {
            id: "sm1",
            type: "TestSharedModel"
          }
        }
      },
    }, { sharedModelManager: manager })
    manager.setDocument(doc)

    const sharedModel = manager.findFirstSharedModelByType(TestSharedModel)
    expect(sharedModel?.id).toBe("sm1")
    expect(getSharedModelManager(doc)?.getSharedModelById("sm1")).toBe(sharedModel)

    const sharedModel2 = manager.findFirstSharedModelByType(TestSharedModel2)
    expect(sharedModel2).toBeUndefined()
    expect(getSharedModelManager(doc)?.getSharedModelById("sm2")).toBeUndefined()
  })

  it("finds a snapshotProcessor shared model by the original type", () => {
    const doc = DocumentContentModel.create({
      sharedModelMap: {
        "sm1": {
          sharedModel: {
            id: "sm1",
            type: "TestSharedModel3"
          }
        }
      },
    })
    const manager = new SharedModelDocumentManager()
    manager.setDocument(doc)
    const sharedModel = manager.findFirstSharedModelByType(_TestSharedModel3)
    expect(sharedModel?.id).toBe("sm1")

    const sharedModel2 = manager.findFirstSharedModelByType(TestSharedModel3 as typeof _TestSharedModel3)
    expect(sharedModel2?.id).toBeUndefined()

    const sharedModel3 = manager.findFirstSharedModelByType(TestSharedModel)
    expect(sharedModel3).toBeUndefined()
  })

  it("provides warnings when finding a shared model by type", () => {
    const doc = DocumentContentModel.create({
      sharedModelMap: {
        "sm1": {
          sharedModel: {
            id: "sm1",
            type: "TestSharedModel"
          }
        }
      },
    })
    const manager = new SharedModelDocumentManager()

    jestSpyConsole("warn", spy => {
      const result1 = manager.findFirstSharedModelByType(TestSharedModel)
      expect(spy).toHaveBeenCalled()
      expect(result1).toBeUndefined()
      spy.mockClear()

      manager.setDocument(doc)

      const result2 = manager.findFirstSharedModelByType(TestSharedModel)
      expect(spy).not.toHaveBeenCalled()
      expect(result2?.id).toBe("sm1")
    })
  })

  it("gets shared models associated with the tile and vice-versa", () => {
    const doc = DocumentContentModel.create({
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
            type: "TestTile",
          },
        },
        "t2": {
          id: "t2",
          content: {
            type: "TestTile",
          },
        }
      }
    })

    const tile = doc.tileMap.get("t1")
    assertIsDefined(tile)
    const tileContent = tile.content
    assertIsDefined(tileContent)
    const manager = new SharedModelDocumentManager()
    manager.setDocument(doc)
    const tileSharedModels = manager.getTileSharedModels(tileContent)
    expect(tileSharedModels).toBeDefined()
    expect(tileSharedModels).toHaveLength(1)
    expect(tileSharedModels[0]?.id).toBe("sm1")
    expect(manager.getSharedModelTileIds(tileSharedModels[0])).toEqual(["t1"])

    const tile2 = doc.tileMap.get("t2")
    assertIsDefined(tile2)
    const tileContent2 = tile2.content
    assertIsDefined(tileContent2)
    const tileSharedModels2 = manager.getTileSharedModels(tileContent2)
    expect(tileSharedModels2).toBeDefined()
    expect(tileSharedModels2).toHaveLength(0)
    expect(manager.getSharedModelTileIds(tileSharedModels[0])).toEqual(["t1"])
})

  it("provides warnings when getting shared models for invalid cases", () => {
    const doc = DocumentContentModel.create({
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
            type: "TestTile",
          },
        },
      }
    })

    const tileContent = doc.tileMap.get("t1")?.content
    assertIsDefined(tileContent)
    const manager = new SharedModelDocumentManager()

    jestSpyConsole("warn", spy => {
      const result1 = manager.getTileSharedModels(tileContent)
      expect(spy).toHaveBeenCalled()
      expect(result1).toHaveLength(0)
      spy.mockClear()

      manager.setDocument(doc)

      const notAttachedTileContent = TestTile.create({})
      const result2 = manager.getTileSharedModels(notAttachedTileContent)
      expect(spy).toHaveBeenCalled()
      expect(result2).toHaveLength(0)
      spy.mockClear()

      // Just make sure a valid call works without warning
      const result3 = manager.getTileSharedModels(tileContent)
      expect(spy).not.toHaveBeenCalled()
      expect(result3).toHaveLength(1)
    })
  })

  it("adds a shared model to the tile and document", () => {
    const doc = DocumentContentModel.create({
      tileMap: {
        "t1": {
          id: "t1",
          content: {
            type: "TestTile",
          },
        }
      }
    })

    const tile = doc.tileMap.get("t1")
    assertIsDefined(tile)
    const tileContent = tile.content
    assertIsDefined(tileContent)
    const manager = new SharedModelDocumentManager()
    manager.setDocument(doc)

    const spyUpdate = jest.spyOn(tileContent, 'updateAfterSharedModelChanges')

    // might need to specify the type...
    const sharedModel = TestSharedModel.create({})
    manager.addTileSharedModel(tileContent, sharedModel)
    const sharedModelEntry = doc.sharedModelMap.get(sharedModel.id)
    expect(sharedModelEntry).toBeDefined()

    expect(sharedModelEntry?.sharedModel).toBeDefined()
    expect(sharedModelEntry?.tiles).toHaveLength(1)
    expect(sharedModelEntry?.tiles[0]?.id).toBe("t1")

    expect(spyUpdate).not.toHaveBeenCalled()
  })

  it("a shared model can be added to multiple tiles", async () => {
    const { doc, docModel } = setupDocument({
      tileMap: {
        "t1": {
          id: "t1",
          content: {
            type: "TestTile",
          },
        },
        "t2": {
          id: "t2",
          content: {
            type: "TestTile",
          },
        }
      }
    })

    const tileContent1 = doc.tileMap.get("t1")?.content as TestTileType
    assertIsDefined(tileContent1)

    const tileContent2 = doc.tileMap.get("t2")?.content as TestTileType
    assertIsDefined(tileContent2)

    const manager = getSharedModelManager(docModel)

    const sharedModel = TestSharedModel.create({})

    // Add to the first tile (and document)
    manager!.addTileSharedModel(tileContent1, sharedModel)
    const sharedModelEntry = doc.sharedModelMap.get(sharedModel.id)
    expect(sharedModelEntry?.tiles[0]?.id).toBe("t1")

    // The update function is called for adding the shared model and for linking it
    await expectUpdateToBeCalledTimes(tileContent1, 1)
    await expectUpdateToBeCalledTimes(tileContent2, 0)

    // just tile 1 should be monitoring this now
    sharedModel.setValue("something")
    await expectUpdateToBeCalledTimes(tileContent1, 2)
    await expectUpdateToBeCalledTimes(tileContent2, 0)

    // Add to the second tile
    manager!.addTileSharedModel(tileContent2, sharedModel)
    expect(doc.sharedModelMap.get(sharedModel.id)).toBe(sharedModelEntry)
    expect(sharedModelEntry?.tiles[0]?.id).toBe("t1")
    expect(sharedModelEntry?.tiles[1]?.id).toBe("t2")

    // The update function of the newly added tile should be called right after
    // it is added
    await expectUpdateToBeCalledTimes(tileContent2, 1)
    // The existing tile's update function should also be called
    await expectUpdateToBeCalledTimes(tileContent1, 3)

    // now both tile's update functions should be called when the shared
    // model changes
    sharedModel.setValue("something2")
    await expectUpdateToBeCalledTimes(tileContent1, 4)
    await expectUpdateToBeCalledTimes(tileContent2, 2)

    destroy(docModel)
  })

  it("a shared model added to a tile twice is only stored once", () => {
    const doc = DocumentContentModel.create({
      tileMap: {
        "t1": {
          id: "t1",
          content: {
            type: "TestTile",
          },
        }
      }
    })

    const tileContent = doc.tileMap.get("t1")?.content
    assertIsDefined(tileContent)
    const manager = new SharedModelDocumentManager()
    manager.setDocument(doc)

    const spyUpdate = jest.spyOn(tileContent, 'updateAfterSharedModelChanges')

    const sharedModel = TestSharedModel.create({})

    // First add
    manager.addTileSharedModel(tileContent, sharedModel)
    const sharedModelEntry = doc.sharedModelMap.get(sharedModel.id)
    expect(sharedModelEntry?.sharedModel).toBe(sharedModel)
    expect(sharedModelEntry?.tiles).toHaveLength(1)
    expect(sharedModelEntry?.tiles[0]?.id).toBe("t1")
    expect(spyUpdate).not.toHaveBeenCalled()

    spyUpdate.mockClear()

    // Second add
    manager.addTileSharedModel(tileContent, sharedModel)
    expect(doc.sharedModelMap.get(sharedModel.id)).toBe(sharedModelEntry)
    expect(sharedModelEntry?.sharedModel).toBe(sharedModel)
    expect(sharedModelEntry?.tiles).toHaveLength(1)
    expect(sharedModelEntry?.tiles[0]?.id).toBe("t1")

    expect(spyUpdate).not.toHaveBeenCalled()
  })

  // eslint-disable-next-line jest/expect-expect
  it("a second shared model can be added to a tile", async () => {
    const { doc, docModel } = setupDocument({
      tileMap: {
        "t1": {
          id: "t1",
          content: {
            type: "TestTile",
          },
        }
      }
    })

    const tileContent = doc.tileMap.get("t1")?.content as TestTileType
    assertIsDefined(tileContent)

    await expectUpdateToBeCalledTimes(tileContent, 0)

    const manager = getSharedModelManager(docModel)
    const sharedModel1 = TestSharedModel.create({})
    manager!.addTileSharedModel(tileContent, sharedModel1)

    // The update function should be called right after it is added
    await expectUpdateToBeCalledAfter(tileContent, 0, 1)

    // it should be monitoring this now
    sharedModel1.setValue("something")
    await expectUpdateToBeCalledAfter(tileContent, 1, 2)

    const sharedModel2 = TestSharedModel.create({})
    manager!.addTileSharedModel(tileContent, sharedModel2)

    // The update function should be called right after second model is added
    // It is actually called twice, see above for details.
    await expectUpdateToBeCalledAfter(tileContent, 2, 3)

    // it should still be monitoring the first model
    sharedModel1.setValue("something2")
    await expectUpdateToBeCalledAfter(tileContent, 3, 4)

    // it should also be monitoring the second model
    sharedModel2.setValue("something")
    await expectUpdateToBeCalledAfter(tileContent, 4, 5)

    destroy(docModel)
  })

  it("provides warnings when adding a shared model in some cases", () => {
    const doc = DocumentContentModel.create({
      tileMap: {
        "t1": {
          id: "t1",
          content: {
            type: "TestTile",
          },
        }
      }
    })

    const tileContent = doc.tileMap.get("t1")?.content
    assertIsDefined(tileContent)

    const manager = new SharedModelDocumentManager()
    const sharedModel = TestSharedModel.create({})

    jestSpyConsole("warn", spy => {
      manager.addTileSharedModel(tileContent, sharedModel)
      expect(spy).toHaveBeenCalled()
      const sharedModelEntry1 = doc.sharedModelMap.get(sharedModel.id)
      expect(sharedModelEntry1).toBeUndefined()
      spy.mockClear()

      manager.setDocument(doc)

      const notAttachedTileContent = TestTile.create({})
      manager.addTileSharedModel(notAttachedTileContent, sharedModel)
      expect(spy).toHaveBeenCalled()
      const sharedModelEntry2 = doc.sharedModelMap.get(sharedModel.id)
      expect(sharedModelEntry2).toBeUndefined()
      spy.mockClear()

      // It works when called correctly
      manager.addTileSharedModel(tileContent, sharedModel)
      expect(spy).not.toHaveBeenCalled()
      const sharedModelEntry3 = doc.sharedModelMap.get(sharedModel.id)
      expect(sharedModelEntry3).toBeDefined()
    })
  })

  it("removes shared models associated with a tile", () => {
    const doc = DocumentContentModel.create({
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
            type: "TestTile",
          },
        },
      }
    })

    const tileContent = doc.tileMap.get("t1")?.content
    assertIsDefined(tileContent)
    const manager = new SharedModelDocumentManager()
    manager.setDocument(doc)

    const tileSharedModels = manager.getTileSharedModels(tileContent)
    expect(tileSharedModels).toBeDefined()
    expect(tileSharedModels).toHaveLength(1)
    const sharedModel = tileSharedModels[0]
    expect(sharedModel?.id).toBe("sm1")

    manager.removeTileSharedModel(tileContent, sharedModel)
    const tileSharedModelsAfter = manager.getTileSharedModels(tileContent)
    expect(tileSharedModelsAfter).toBeDefined()
    expect(tileSharedModelsAfter).toHaveLength(0)
  })

  it("provides warnings when removing shared models associated with a tile", () => {
    const doc = DocumentContentModel.create({
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
            type: "TestTile",
          },
        },
      }
    })

    const tileContent = doc.tileMap.get("t1")?.content
    assertIsDefined(tileContent)
    const manager = new SharedModelDocumentManager()
    const sharedModel = doc.sharedModelMap.get("sm1")?.sharedModel
    assertIsDefined(sharedModel)

    jestSpyConsole("warn", spy => {
      manager.removeTileSharedModel(tileContent, sharedModel)
      expect(spy).toHaveBeenCalled()
      spy.mockClear()

      manager.setDocument(doc)

      const notAttachedTileContent = TestTile.create({})
      manager.removeTileSharedModel(notAttachedTileContent, sharedModel)
      expect(spy).toHaveBeenCalled()
      spy.mockClear()

      const notAttachedSharedModel = TestSharedModel.create({})
      manager.removeTileSharedModel(tileContent, notAttachedSharedModel)
      expect(spy).toHaveBeenCalled()
      spy.mockClear()
    })
  })

  it("handles a tile being deleted that references a shared model", async () => {
    const {doc, docModel} = setupDocument({
      sharedModelMap: {
        "sm1": {
          sharedModel: {
            id: "sm1",
            type: "TestSharedModel"
          },
          tiles: [ "t1", "t2" ]
        }
      },
      tileMap: {
        "t1": {
          id: "t1",
          content: {
            type: "TestTile",
          },
        },
        "t2": {
          id: "t2",
          content: {
            type: "TestTile",
          },
        },
      }
    })

    const tileContent1 = doc.tileMap.get("t1")?.content as TestTileType
    assertIsDefined(tileContent1)

    const tileContent2 = doc.tileMap.get("t2")?.content as TestTileType
    assertIsDefined(tileContent2)

    // We expect the update functions not to be called right away
    expectUpdateToBeCalledTimes(tileContent1, 0)
    expectUpdateToBeCalledTimes(tileContent2, 0)

    // Update the shared model and make sure the update functions are called
    const sharedModel = doc.sharedModelMap.get("sm1")?.sharedModel as TestISharedModel
    expect(sharedModel).toBeDefined()
    sharedModel.setValue("something")

    await expectUpdateToBeCalledTimes(tileContent1, 1)
    await expectUpdateToBeCalledTimes(tileContent2, 1)

    // Delete tile t2
    doc.deleteTile("t2")

    // Make sure tile t1 is still working
    sharedModel.setValue("something else")
    await expectUpdateToBeCalledTimes(tileContent1, 2)

    destroy(docModel)
  })

  it("handles a loading a shared model entry with a broken reference", async () => {
    const {doc, docModel} = setupDocument({
      sharedModelMap: {
        "sm1": {
          sharedModel: {
            id: "sm1",
            type: "TestSharedModel"
          },
          tiles: [ "t1", "t2" ]
        }
      },
      tileMap: {
        "t1": {
          id: "t1",
          content: {
            type: "TestTile",
          },
        },
      }
    })

    // Make sure this is working normally
    const tileContent1 = doc.tileMap.get("t1")?.content as TestTileType
    const sharedModel = doc.sharedModelMap.get("sm1")?.sharedModel as TestISharedModel
    expect(sharedModel).toBeDefined()
    sharedModel.setValue("something")

    await expectUpdateToBeCalledTimes(tileContent1, 1)

    destroy(docModel)
  })
})

// TODO: This could be turned into a custom matcher, so then it would look like:
// expect(() => tileContent1.updateCount).toChangeTo(1);
// function mobxValueChanged<ValueType>(func: () => ValueType, timeout = 100): Promise<ValueType> {
//   return new Promise((resolve, reject) => {
//     const initialValue = func();
//     const disposer = reaction(func, (value, previousValue, _reaction) => {
//       _reaction.dispose();
//       resolve(value);
//     });
//     setTimeout(() => {
//       disposer();
//       reject(`Value didn't change within timeout. Initial value: ${initialValue}`);
//     }, timeout);
//   });
// }

// Alternatively we could try to make a matcher that waits for an action to be called
// This would require adding a spy that modifies a mobX object which is then observed
// So it would look more like:
// spyUpdate1 = mstActionSpy(tileContent1, 'updateAfterSharedModelChanges');
// expect(spyUpdate1).toBeCalledWithin(100);
// function expectActionToBeCalled(object, actionName, timeout = 100)
// This would be tricky because onAction has to be added to the root, so we'd need
// get the root of the object, then get the path of the object then wait for
// an action on this object at this path.

// Just to get this done we could just make a helper function for this
async function expectUpdateToBeCalledTimes(testTile: TestTileType, times: number) {
  const updateCalledTimes = when(() => {
    return testTile.updateCount === times
  }, {timeout: 100})
  return expect(updateCalledTimes).resolves.toBeUndefined()
}

async function expectUpdateToBeCalledAfter(testTile: TestTileType, initialCount: number, nextCount: number) {
  expect(testTile.updateCount).toBe(initialCount)
  const updateCalledTimes = when(() => {
    return testTile.updateCount === nextCount
  }, {timeout: 100})
  return expect(updateCalledTimes).resolves.toBeUndefined()
}
