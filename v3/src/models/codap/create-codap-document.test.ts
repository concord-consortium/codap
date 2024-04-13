import { getSnapshot } from "mobx-state-tree"
import { omitUndefined } from "../../test/test-utils"
import { toCanonical } from "../data/data-set"
import { createCodapDocument } from "./create-codap-document"
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

  it("createDataSet adds a DataSet to the document as a shared model", () => {
    const doc = createCodapDocument()
    const { sharedDataSet, caseMetadata } = doc.content!.createDataSet()
    const { dataSet: data } = sharedDataSet
    data.addAttribute({ name: "a" })
    data.addCases(toCanonical(data, [{ a: "1" }, { a: "2" }, { a: "3" }]))

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
        [sharedDataSet.id]: {
          sharedModel: {
            dataSet: {
              name: "New Dataset",
              attributesMap: {
                "test-8": {
                  clientKey: "",
                  id: "test-8",
                  name: "a",
                  editable: true,
                  values: ["1", "2", "3"]
                }
              },
              attributes: ["test-8"],
              cases: [{ __id__: "CASEorder-9" }, { __id__: "CASEorder-10" }, { __id__: "CASEorder-11" }],
              collections: [],
              ungrouped: { id: "test-6", name: "Cases" },
              id: "test-5",
              snapSelection: []
            },
            id: sharedDataSet.id,
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
            data: "test-5",
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
