import { getSnapshot, types } from "mobx-state-tree"
import { omitUndefined } from "../../test/test-utils"
import { toCanonical } from "../data/data-set"
import { createCodapDocument } from "./create-codap-document"
import "../shared/data-set-metadata-registration"
import "../shared/shared-data-set-registration"

// eslint-disable-next-line no-var
var mockNodeIdCount = 0
jest.mock("../../utilities/js-utils", () => ({
  ...jest.requireActual("../../utilities/js-utils"),
  hashOrderedStringSet: () => 12345678,
  hashStringSet: () => 12345678,
  typedId: () => `test-${++mockNodeIdCount}`,
  uniqueOrderedId: () => `order-${++mockNodeIdCount}`
}))
jest.mock("../../utilities/codap-utils", () => {
  const mockV3Id = () => `test-${++mockNodeIdCount}`
  return {
    ...jest.requireActual("../../utilities/codap-utils"),
    v3Id: mockV3Id,
    typeV3Id: () => types.optional(types.identifier, () => `${mockV3Id()}`)
  }
})

describe("createCodapDocument", () => {
  beforeEach(() => {
    mockNodeIdCount = 0
  })

  it("creates an empty document", () => {
    const doc = createCodapDocument()
    expect(doc.key).toBe("test-1")
    expect(doc.type).toBe("CODAP")
    expect(omitUndefined(getSnapshot(doc.content!))).toEqual({
      rowMap: { "test-3": { id: "test-3", type: "free", maxZIndex: 0, tiles: {} } },
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
    const { sharedDataSet, sharedMetadata } = doc.content!.createDataSet()
    const { dataSet: data } = sharedDataSet
    data.addAttribute({ name: "a" })
    data.addCases(toCanonical(data, [{ a: "1" }, { a: "2" }, { a: "3" }]))

    // need to wrap the serialization in prepareSnapshot()/completeSnapshot() to get the data
    data.prepareSnapshot()
    const snapContent = omitUndefined(getSnapshot(doc.content!))
    data.completeSnapshot()

    // the resulting document content contains the contents of the DataSet
    expect(snapContent).toEqual({
      rowMap: { "test-3": { id: "test-3", type: "free", maxZIndex: 0, tiles: {} } },
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
                  values: ["1", "2", "3"]
                }
              },
              _itemIds: ["test-9", "test-10", "test-11"],
              setAsideItemIds: [],
              collections: [{
                id: "test-7",
                name: "Cases",
                attributes: ["test-8"],
                _groupKeyCaseIds: [
                  ["test-9", "test-12"],
                  ["test-10", "test-13"],
                  ["test-11", "test-14"]
                ]
              }],
              id: "test-5",
              snapSelection: []
            },
            id: sharedDataSet.id,
            providerId: "",
            type: "SharedDataSet"
          },
          tiles: []
        },
        [sharedMetadata.id]: {
          sharedModel: {
            collections: {},
            attributes: {
              "test-8": {
                "color": "#FF6800",
                "colorRange": {
                  "highColor": "#FF6800",
                  "lowColor": "#f5e9e0",
                },
              },
            },
            data: "test-5",
            id: sharedMetadata.id,
            type: "SharedCaseMetadata"
          },
          tiles: []
        }
      },
      tileMap: {}
    })
  })
})
