import { getEnv, getSnapshot } from "mobx-state-tree"
import { omitUndefined } from "../../test/test-utils"
import { gDataBroker } from "../data/data-broker"
import { DataSet, toCanonical } from "../data/data-set"
import { ITileEnvironment } from "../tiles/tile-content"
import { createCodapDocument } from "./create-codap-document"
import { ISharedModelDocumentManager } from "../document/shared-model-document-manager"
import { ISharedDataSet } from "../shared/shared-data-set"
import "../shared/shared-case-metadata-registration"
import "../shared/shared-data-set-registration"

// eslint-disable-next-line no-var
var mockNodeIdCount = 0
jest.mock("../../utilities/js-utils", () => ({
  typedId: () => `test-${++mockNodeIdCount}`,
  uniqueOrderedId: () => `order-${++mockNodeIdCount}`
}))

describe("createCodapDocument", () => {
  beforeEach(() => {
    mockNodeIdCount = 0
  })

  it("creates an empty document", () => {
    const doc = createCodapDocument()
    expect(doc.key).toBe("test-1")
    expect(doc.type).toBe("CODAP")
    expect(omitUndefined(getSnapshot(doc.content!))).toEqual({
      rowMap: { "test-2": { id: "test-2", type: "free", order: [], tiles: {} } },
      rowOrder: ["test-2"],
      sharedModelMap: {},
      tileMap: {}
    })
  })

  it("DataBroker adds a DataSet to the document as a shared model", () => {
    const doc = createCodapDocument()
    const manager = getEnv<ITileEnvironment>(doc).sharedModelManager as ISharedModelDocumentManager
    const data = DataSet.create()
    data.addAttribute({ name: "a" })
    data.addCases(toCanonical(data, [{ a: "1" }, { a: "2" }, { a: "3" }]))
    gDataBroker.setSharedModelManager(manager)
    gDataBroker.addDataSet(data)

    const entry = doc.content?.sharedModelMap.get("test-9")
    const sharedModel = entry?.sharedModel as ISharedDataSet | undefined
    // the DataSet is not copied -- it's a single instance
    expect(data).toBe(gDataBroker.last)
    expect(gDataBroker.last).toBe(sharedModel?.dataSet)

    // need to wrap the serialization in prepareSnapshot()/completeSnapshot() to get the data
    data.prepareSnapshot()
    const snapContent = omitUndefined(getSnapshot(doc.content!))
    data.completeSnapshot()

    // the resulting document content contains the contents of the DataSet
    expect(snapContent).toEqual({
      rowMap: { "test-2": { id: "test-2", type: "free", order: [], tiles: {} } },
      rowOrder: ["test-2"],
      sharedModelMap: {
        "test-9": {
          sharedModel: {
            dataSet: {
              attributes: [{
                clientKey: "",
                formula: {},
                id: "test-5",
                name: "a",
                title: "",
                editable: true,
                values: ["1", "2", "3"]
              }],
              cases: [{ __id__: "CASEorder-6" }, { __id__: "CASEorder-7" }, { __id__: "CASEorder-8" }],
              collections: [],
              ungrouped: { id: "test-4", name: "", title: "" },
              id: "test-3",
              snapSelection: []
            },
            id: "test-9",
            providerId: "",
            type: "SharedDataSet"
          },
          tiles: []
        },
        "test-12": {
          sharedModel: {
            collections: {},
            columnWidths: {},
            data: "test-3",
            hidden: {},
            id: "test-12",
            type: "SharedCaseMetadata"
          },
          tiles: []
        }
      },
      tileMap: {}
    })
  })
})
