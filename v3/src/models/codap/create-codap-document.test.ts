import { getSnapshot } from "mobx-state-tree"
import { omitUndefined } from "../../test/test-utils"
import { gDataBroker } from "../data/data-broker"
import { DataSet, toCanonical } from "../data/data-set"
import { createCodapDocument } from "./create-codap-document"
import { ISharedDataSet } from "../shared/shared-data-set"
import { getSharedModelManager } from "../tiles/tile-environment"
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
      rowMap: { "test-3": { id: "test-3", type: "free", savedOrder: [], tiles: {} } },
      rowOrder: ["test-3"],
      sharedModelMap: {
        "test-2": { sharedModel: { id: "test-2", type: "GlobalValueManager", globals: {} }, tiles: [] }
      },
      tileMap: {}
    })
  })

  it("creates an empty document with mosaic layout", () => {
    const doc = createCodapDocument(undefined, { layout: "mosaic" })
    expect(doc.key).toBe("test-1")
    expect(doc.type).toBe("CODAP")
    expect(omitUndefined(getSnapshot(doc.content!))).toEqual({
      rowMap: { "test-3": { id: "test-3", type: "mosaic", nodes: {}, root: "", tiles: {} } },
      rowOrder: ["test-3"],
      sharedModelMap: {
        "test-2": { sharedModel: { id: "test-2", type: "GlobalValueManager", globals: {} }, tiles: [] }
      },
      tileMap: {}
    })
  })

  it("DataBroker adds a DataSet to the document as a shared model", () => {
    const doc = createCodapDocument()
    const manager = getSharedModelManager(doc)
    const data = DataSet.create()
    data.addAttribute({ name: "a" })
    data.addCases(toCanonical(data, [{ a: "1" }, { a: "2" }, { a: "3" }]))
    gDataBroker.setSharedModelManager(manager!)
    const { sharedData, caseMetadata } = gDataBroker.addDataSet(data)

    const entry = doc.content?.sharedModelMap.get(sharedData.id)
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
      rowMap: { "test-3": { id: "test-3", type: "free", savedOrder: [], tiles: {} } },
      rowOrder: ["test-3"],
      sharedModelMap: {
        "test-2": {
          sharedModel: { id: "test-2", type: "GlobalValueManager", globals: {} },
          tiles: []
        },
        [sharedData.id]: {
          sharedModel: {
            dataSet: {
              attributes: [{
                clientKey: "",
                id: "test-6",
                name: "a",
                title: "",
                editable: true,
                values: ["1", "2", "3"]
              }],
              cases: [{ __id__: "CASEorder-7" }, { __id__: "CASEorder-8" }, { __id__: "CASEorder-9" }],
              collections: [],
              ungrouped: { id: "test-5", name: "", title: "" },
              id: "test-4",
              snapSelection: []
            },
            id: sharedData.id,
            providerId: "",
            type: "SharedDataSet"
          },
          tiles: []
        },
        [caseMetadata.id]: {
          sharedModel: {
            categories: {},
            collections: {},
            columnWidths: {},
            data: "test-4",
            hidden: {},
            id: caseMetadata.id,
            type: "SharedCaseMetadata"
          },
          tiles: []
        }
      },
      tileMap: {}
    })
  })
})
