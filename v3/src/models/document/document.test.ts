import { ITestTileContent, TestTileContent } from "../../test/test-tile-content"
import { createSingleTileContent } from "../../test/test-utils"
import { createDocumentModel } from "./create-document-model"
import { IDocumentModel } from "./document"

describe("document model", () => {
  let document: IDocumentModel
  let documentWithoutContent: IDocumentModel

  beforeEach(() => {
    document = createDocumentModel({
      type: "test-app",
      key: "test",
      createdAt: 1,
      content: {}
    })
    documentWithoutContent = createDocumentModel({
      type: "test-app",
      key: "test",
      createdAt: 1
    })
  })

  it("generates keys if not client provided", () => {
    const documentWithoutClientKey = createDocumentModel({
      type: "test-app",
      createdAt: 1,
      content: {}
    })
    expect(documentWithoutClientKey.key).toBeTruthy()
  })

  it("can create documents without content and set the content later", () => {
    expect(documentWithoutContent.content).toBeUndefined()
    expect(documentWithoutContent.hasContent).toBe(false)
    documentWithoutContent.setContent({})
    expect(documentWithoutContent.content).toBeDefined()
    expect(documentWithoutContent.hasContent).toBe(true)
  })

  it("can set creation date/time", () => {
    expect(document.createdAt).toBe(1)
    document.setCreatedAt(10)
    expect(document.createdAt).toBe(10)
  })

  it("has a default title", () => {
    // This is the default document name defined by the localization key:
    // DG.Document.defaultDocumentName
    expect(document.title).toBe("Untitled Document")
  })

  it("can set properties", () => {
    document.setProperty("foo", "bar")
    expect(document.getProperty("foo")).toBe("bar")
    document.setProperty("baz", "2")
    expect(document.getNumericProperty("baz")).toBe(2)
    expect(document.copyProperties()).toEqual({ foo: "bar", baz: "2" })
    document.setProperty("baz")
    expect(document.copyProperties()).toEqual({ foo: "bar" })
    document.setNumericProperty("baz", 2)
    expect(document.copyProperties()).toEqual({ foo: "bar", baz: "2" })
  })

  it("can set content", () => {
    document.setContent(createSingleTileContent(TestTileContent.create({ type: "Test", test: "test" })))
    expect(document.content!.tileMap.size).toBe(1)
    document.content!.tileMap.forEach(tile => {
      const textContent = tile.content as ITestTileContent
      expect(textContent.type).toBe("Test")
      expect(textContent.test).toBe("test")
    })
  })

})
