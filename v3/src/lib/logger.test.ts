/* eslint-disable jest/no-commented-out-tests */
import mockXhr from "xhr-mock"
import { Logger } from "./logger"
import { createCodapDocument } from "../models/codap/create-codap-document"
const fs = require("fs")
const path = require("path")

// can be useful for debugging tests
// jest.mock("../lib/debug", () => ({
//   DEBUG_LOGGER: true
// }))

describe("uninitialized logger", () => {
  beforeEach(() => {
    mockXhr.setup()
  })

  afterEach(() => {
    mockXhr.reset()
    mockXhr.teardown()
  })

  it("throws exception if not initialized", () => {
    expect(() => Logger.Instance).toThrow()
  })

  it("does not log when not initialized", (done) => {
    const file = path.join(__dirname, "../../cypress/fixtures", "two-coasters.codap3")
    const documentJson = fs.readFileSync(file, "utf8")
    const documentDoc = JSON.parse(documentJson)
    const testDoc = createCodapDocument(documentDoc)

    const TEST_LOG_MESSAGE = "999"
    const mockPostHandler = jest.fn((req, res) => {
      expect(mockPostHandler).toHaveBeenCalledTimes(1)
      done()
      return res.status(201)
    })
    mockXhr.use(mockPostHandler)

    // should not log since we're not initialized
    Logger.log(TEST_LOG_MESSAGE)

    Logger.initializeLogger(testDoc)

    // should log now that we're initialized
    Logger.log(TEST_LOG_MESSAGE)
  })
})

describe.skip("dev/qa/test logger with DEBUG_LOGGER false", () => {
  const file = path.join(__dirname, "../../cypress/fixtures", "two-coasters.codap3")
  const documentJson = fs.readFileSync(file, "utf8")
  const documentDoc = JSON.parse(documentJson)
  const testDoc = createCodapDocument(documentDoc)

  beforeEach(() => {
    mockXhr.setup()
    Logger.initializeLogger(testDoc)
  })

  afterEach(() => {
    mockXhr.reset()
    mockXhr.teardown()
  })

  it("does not log in dev/qa/test modes", (done) => {
    const TEST_LOG_MESSAGE = "999"
    const mockPostHandler = jest.fn((req, res) => {
      expect(mockPostHandler).toHaveBeenCalledTimes(1)
      done()
      return res.status(201)
    })
    mockXhr.use(mockPostHandler)

    // should not be logged due to mode
    Logger.log(TEST_LOG_MESSAGE)

    // should be logged
    Logger.isLoggingEnabled = true
    Logger.log(TEST_LOG_MESSAGE)
  })
})

describe.skip("demo logger with DEBUG_LOGGER false", () => {
  const file = path.join(__dirname, "../../cypress/fixtures", "two-coasters.codap3")
  const documentJson = fs.readFileSync(file, "utf8")
  const documentDoc = JSON.parse(documentJson)
  const testDoc = createCodapDocument(documentDoc)

  beforeEach(() => {
    mockXhr.setup()
    Logger.initializeLogger(testDoc)
  })

  afterEach(() => {
    mockXhr.reset()
    mockXhr.teardown()
  })

  it("does not log in demo mode", (done) => {
    const TEST_LOG_MESSAGE = "999"
    const mockPostHandler = jest.fn((req, res) => {
      expect(mockPostHandler).toHaveBeenCalledTimes(1)
      done()
      return res.status(201)
    })
    mockXhr.use(mockPostHandler)

    // should not be logged due to mode
    Logger.log(TEST_LOG_MESSAGE)

    // should be logged
    Logger.isLoggingEnabled = true
    Logger.log(TEST_LOG_MESSAGE)
  })

})

describe.skip("authed logger", () => {
  // const file = path.join(__dirname, "../../cypress/fixtures", "two-coasters.codap3")
  // const documentJson = fs.readFileSync(file, "utf8")
  // const documentDoc = JSON.parse(documentJson)
  // const testDoc = createCodapDocument(documentDoc)

  // beforeEach(() => {
  //   mockXhr.setup()
  //   Logger.initializeLogger(testDoc)
  // })

  // afterEach(() => {
  //   mockXhr.teardown()
  // })

  // describe ("tile CRUD events", () => {

    // it("can log a simple message with all the appropriate properties", (done) => {
    //   mockXhr.post(/.*/, (req, res) => {
    //     expect(req.header("Content-Type")).toEqual("application/json charset=UTF-8")

    //     const request = JSON.parse(req.body())

    //     expect(request.application).toBe("TestLogger")
    //     expect(request.username).toBe("0@test")
    //     expect(request.investigation).toBe("Investigation 1")
    //     expect(request.problem).toBe("Problem 1.1")
    //     expect(request.session).toEqual(expect.anything())
    //     expect(request.time).toEqual(expect.anything())
    //     expect(request.event).toBe("CREATE_TILE")
    //     expect(request.method).toBe("do")
    //     expect(request.parameters).toEqual({foo: "bar"})

    //     done()
    //     return res.status(201)
    //   })

    //   Logger.log("Create tile", { foo: "bar" })
    // })

    // it("can log tile creation", (done) => {
    //   const tile = TileModel.create({ content: TextContentModel.create() })

    //   mockXhr.post(/.*/, (req, res) => {
    //     const request = JSON.parse(req.body())

    //     expect(request.event).toBe("CREATE_TILE")
    //     expect(request.parameters.objectId).toBe(tile.id)
    //     expect(request.parameters.objectType).toBe("Text")
    //     expect(request.parameters.serializedObject).toEqual({
    //       type: "Text",
    //       text: ""
    //     })
    //     expect(request.parameters.documentKey).toBe(undefined)

    //     done()
    //     return res.status(201)
    //   })

    //   // Logger.logTileEvent(LogEventName.CREATE_TILE, tile)
    // })

    // it("can log tile creation in a document", (done) => {
    //   const document = createDocumentModel({
    //     type: ProblemDocument,
    //     uid: "1",
    //     key: "source-document",
    //     createdAt: 1,
    //     content: {},
    //     visibility: "public"
    //   })
    //   stores.documents.add(document)

    //   mockXhr.post(/.*/, (req, res) => {
    //     const request = JSON.parse(req.body())

    //     expect(request.event).toBe("CREATE_TILE")
    //     // expect(request.parameters.objectId).toBe(tile.id)
    //     expect(request.parameters.objectType).toBe("Text")
    //     expect(request.parameters.serializedObject).toEqual({
    //       type: "Text",
    //       text: ""
    //     })
    //     expect(request.parameters.documentKey).toBe("source-document")
    //     expect(request.parameters.documentType).toBe("problem")

    //     done()
    //     return res.status(201)
    //   })

    //   document.content?.userAddTile("text")
    // })

    // it("can log copying tiles between documents", (done) => {
    //   const sourceDocument = createDocumentModel({
    //     type: ProblemDocument,
    //     uid: "source-user",
    //     key: "source-document",
    //     createdAt: 1,
    //     content: {},
    //     visibility: "public"
    //   })
    //   sourceDocument.setContent(createSingleTileContent({ type: "Text", text: "test" }))

    //   const destinationDocument = createDocumentModel({
    //     type: ProblemDocument,
    //     uid: "destination-user",
    //     key: "destination-document",
    //     createdAt: 1,
    //     content: {},
    //     visibility: "public"
    //   })

    //   stores.documents.add(sourceDocument)
    //   stores.documents.add(destinationDocument)

    //   mockXhr.post(/.*/, (req, res) => {
    //     const request = JSON.parse(req.body())

    //     expect(request.event).toBe("COPY_TILE")
    //     // expect(request.parameters.objectId).toBe(tile.id)
    //     expect(request.parameters.objectType).toBe("Text")
    //     expect(request.parameters.serializedObject).toEqual({
    //       type: "Text",
    //       text: "test"
    //     })
    //     expect(request.parameters.documentKey).toBe("destination-document")
    //     expect(request.parameters.documentType).toBe("problem")
    //     expect(request.parameters.objectId).not.toBe(tileToCopy.id)
    //     expect(request.parameters.sourceDocumentKey).toBe("source-document")
    //     expect(request.parameters.sourceDocumentType).toBe("problem")
    //     expect(request.parameters.sourceObjectId).toBe(tileToCopy.id)
    //     expect(request.parameters.sourceUsername).toBe("source-user")

    //     done()
    //     return res.status(201)
    //   })

    //   const tileToCopy = sourceDocument.content!.firstTile!

    //   const copyTileInfo: IDropTileItem = {
    //     rowIndex: 0,
    //     tileIndex: 0,
    //     tileId: tileToCopy.id,
    //     newTileId: uniqueId(),
    //     tileContent: JSON.stringify(tileToCopy),
    //     tileType: tileToCopy.content.type
    //   }

    //   destinationDocument.content!.userCopyTiles([copyTileInfo], { rowInsertIndex: 0 })
    // })

  // })

  // describe("Tile changes", () => {
  //   it("can log tile change events", (done) => {
  //     const tile = TileModel.create({ content: defaultGeometryContent() })
  //     // const change: JXGChange = { operation: "create", target: "point" }

  //     mockXhr.post(/.*/, (req, res) => {
  //       const request = JSON.parse(req.body())

  //       expect(request.event).toBe("GEOMETRY_TOOL_CHANGE")
  //       expect(request.parameters.toolId).toBe(tile.id)
  //       expect(request.parameters.operation).toBe("create")
  //       expect(request.parameters.target).toBe("point")
  //       expect(request.parameters.documentKey).toBe(undefined)

  //       done()
  //       return res.status(201)
  //     })

  //     // Logger.logTileChange(LogEventName.GEOMETRY_TOOL_CHANGE, "create", change, tile.id)
  //   })
  // })

})
/* eslint-enable jest/no-commented-out-tests */
