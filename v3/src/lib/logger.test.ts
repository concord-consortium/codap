// import mockXhr from "xhr-mock"
// import { getSnapshot } from "mobx-state-tree"
// import { Logger } from "./logger"
// import { LogEventName } from "./logger-types"
// import { DocumentContentModel } from "../models/document/document-content"
// import { uniqueId } from "../utilities/js-utils"

// // This is needed so MST can deserialize snapshots referring to tiles
// import { registerTileTypes } from "../register-tile-types"
// registerTileTypes(["Geometry", "Text"])

// const investigation = InvestigationModel.create({
//   ordinal: 1,
//   title: "Investigation 1",
//   problems: [ { ordinal: 1, title: "Problem 1.1" } ]
// })
// const problem = investigation.getProblem(1)

// // can be useful for debugging tests
// // jest.mock("../lib/debug", () => ({
// //   DEBUG_LOGGER: true
// // }))

// describe("uninitialized logger", () => {
//   let stores: IStores

//   beforeEach(() => {
//     mockXhr.setup()
//     stores = createStores({
//       appMode: "authed",
//       appConfig: specAppConfig({ config: { appName: "TestLogger"} }),
//       user: UserModel.create({id: "0", portal: "test"})
//     })
//   })

//   afterEach(() => {
//     mockXhr.reset()
//     mockXhr.teardown()
//   })

//   it("throws exception if not initialized", () => {
//     expect(() => Logger.Instance).toThrow()
//   })

//   it("does not log when not initialized", (done) => {
//     const TEST_LOG_MESSAGE = 999
//     const mockPostHandler = jest.fn((req, res) => {
//       expect(mockPostHandler).toHaveBeenCalledTimes(1)
//       done()
//       return res.status(201)
//     })
//     mockXhr.use(mockPostHandler)

//     // should not log since we're not initialized
//     Logger.log(TEST_LOG_MESSAGE)

//     Logger.initializeLogger(stores)

//     // should log now that we're initialized
//     Logger.log(TEST_LOG_MESSAGE)
//   })
// })

// describe("dev/qa/test logger with DEBUG_LOGGER false", () => {
//   let stores: IStores

//   beforeEach(() => {
//     mockXhr.setup()
//     stores = createStores({
//       appMode: "test",
//       appConfig: specAppConfig({ config: { appName: "TestLogger"} }),
//       persistentUI: PersistentUIModel.create({
//         activeNavTab: ENavTab.kStudentWork,
//         problemWorkspace: {
//           type: ProblemWorkspace,
//           mode: "1-up"
//         },
//       }),
//       ui: UIModel.create({
//         learningLogWorkspace: {
//           type: LearningLogWorkspace,
//           mode: "1-up"
//         },
//       }),
//       user: UserModel.create({id: "0", type: "teacher", portal: "test"})
//     })

//     Logger.initializeLogger(stores, { investigation: investigation.title, problem: problem?.title })
//   })

//   afterEach(() => {
//     mockXhr.reset()
//     mockXhr.teardown()
//   })

//   it("does not log in dev/qa/test modes", (done) => {
//     const TEST_LOG_MESSAGE = 999
//     const mockPostHandler = jest.fn((req, res) => {
//       expect(mockPostHandler).toHaveBeenCalledTimes(1)
//       done()
//       return res.status(201)
//     })
//     mockXhr.use(mockPostHandler)

//     // should not be logged due to mode
//     Logger.log(TEST_LOG_MESSAGE)

//     // should be logged
//     Logger.isLoggingEnabled = true
//     Logger.log(TEST_LOG_MESSAGE)
//   })

// })

// describe("demo logger with DEBUG_LOGGER false", () => {
//   let stores: IStores

//   beforeEach(() => {
//     mockXhr.setup()
//     stores = createStores({
//       appMode: "demo",
//       appConfig: specAppConfig({ config: { appName: "TestLogger"} }),
//       persistentUI: PersistentUIModel.create({
//         activeNavTab: ENavTab.kStudentWork,
//         problemWorkspace: {
//           type: ProblemWorkspace,
//           mode: "1-up"
//         },
//       }),
//       ui: UIModel.create({
//         learningLogWorkspace: {
//           type: LearningLogWorkspace,
//           mode: "1-up"
//         },
//       }),
//       user: UserModel.create({id: "0", type: "teacher", portal: "test"})
//     })

//     Logger.initializeLogger(stores, { investigation: investigation.title, problem: problem?.title })
//   })

//   afterEach(() => {
//     mockXhr.reset()
//     mockXhr.teardown()
//   })

//   it("does not log in demo mode", (done) => {
//     const TEST_LOG_MESSAGE = 999
//     const mockPostHandler = jest.fn((req, res) => {
//       expect(mockPostHandler).toHaveBeenCalledTimes(1)
//       done()
//       return res.status(201)
//     })
//     mockXhr.use(mockPostHandler)

//     // should not be logged due to mode
//     Logger.log(TEST_LOG_MESSAGE)

//     // should be logged
//     Logger.isLoggingEnabled = true
//     Logger.log(TEST_LOG_MESSAGE)
//   })

// })

// describe("authed logger", () => {
//   let stores: IStores

//   beforeEach(() => {
//     mockXhr.setup()

//     const content = DocumentContentModel.create(createSingleTileContent({
//       id: "tile1",
//       type: "Text",
//       title: "test title",
//     }))

//     stores = createStores({
//       appMode: "authed",
//       appConfig: specAppConfig({ config: { appName: "TestLogger"} }),
//       user: UserModel.create({
//         id: "0", type: "student", portal: "test",
//         loggingRemoteEndpoint: "foo"
//       }),
//       problem:  ProblemModel.create({
//         ordinal: 1, title: "Problem",
//         sections: [{
//           type: "introduction",
//           content: getSnapshot(content),
//         }]
//       })
//     })

//     Logger.initializeLogger(stores, { investigation: investigation.title, problem: problem?.title })
//   })

//   afterEach(() => {
//     mockXhr.teardown()
//   })

//   describe("updateProblem()", () => {

//     const _investigation = InvestigationModel.create({
//       ordinal: 2,
//       title: "Investigation 2",
//       problems: [ { ordinal: 1, title: "Problem 2.1" } ]
//     })
//     const _problem = investigation.getProblem(1) as ProblemModelType

//     it("updateProblem()", () => {
//       Logger.updateAppContext({ investigation: _investigation.title, problem: _problem.title })

//       expect((Logger as any)._instance.investigationTitle = "Investigation 2")
//       expect((Logger as any)._instance.problemTitle = "Problem 2.1")
//     })

//   })

//   describe ("tile CRUD events", () => {

//     it("can log a simple message with all the appropriate properties", (done) => {
//       mockXhr.post(/.*/, (req, res) => {
//         expect(req.header("Content-Type")).toEqual("application/json charset=UTF-8")

//         const request = JSON.parse(req.body())

//         expect(request.application).toBe("TestLogger")
//         expect(request.username).toBe("0@test")
//         expect(request.investigation).toBe("Investigation 1")
//         expect(request.problem).toBe("Problem 1.1")
//         expect(request.session).toEqual(expect.anything())
//         expect(request.time).toEqual(expect.anything())
//         expect(request.event).toBe("CREATE_TILE")
//         expect(request.method).toBe("do")
//         expect(request.parameters).toEqual({foo: "bar"})

//         done()
//         return res.status(201)
//       })

//       Logger.log(LogEventName.CREATE_TILE, { foo: "bar" })
//     })

//     // it("can log tile creation", (done) => {
//     //   const tile = TileModel.create({ content: TextContentModel.create() })

//     //   mockXhr.post(/.*/, (req, res) => {
//     //     const request = JSON.parse(req.body())

//     //     expect(request.event).toBe("CREATE_TILE")
//     //     expect(request.parameters.objectId).toBe(tile.id)
//     //     expect(request.parameters.objectType).toBe("Text")
//     //     expect(request.parameters.serializedObject).toEqual({
//     //       type: "Text",
//     //       text: ""
//     //     })
//     //     expect(request.parameters.documentKey).toBe(undefined)

//     //     done()
//     //     return res.status(201)
//     //   })

//     //   // Logger.logTileEvent(LogEventName.CREATE_TILE, tile)
//     // })

//     it("can log tile creation in a document", (done) => {
//       const document = createDocumentModel({
//         type: ProblemDocument,
//         uid: "1",
//         key: "source-document",
//         createdAt: 1,
//         content: {},
//         visibility: "public"
//       })
//       stores.documents.add(document)

//       mockXhr.post(/.*/, (req, res) => {
//         const request = JSON.parse(req.body())

//         expect(request.event).toBe("CREATE_TILE")
//         // expect(request.parameters.objectId).toBe(tile.id)
//         expect(request.parameters.objectType).toBe("Text")
//         expect(request.parameters.serializedObject).toEqual({
//           type: "Text",
//           text: ""
//         })
//         expect(request.parameters.documentKey).toBe("source-document")
//         expect(request.parameters.documentType).toBe("problem")

//         done()
//         return res.status(201)
//       })

//       document.content?.userAddTile("text")
//     })

//     it("can log copying tiles between documents", (done) => {
//       const sourceDocument = createDocumentModel({
//         type: ProblemDocument,
//         uid: "source-user",
//         key: "source-document",
//         createdAt: 1,
//         content: {},
//         visibility: "public"
//       })
//       sourceDocument.setContent(createSingleTileContent({ type: "Text", text: "test" }))

//       const destinationDocument = createDocumentModel({
//         type: ProblemDocument,
//         uid: "destination-user",
//         key: "destination-document",
//         createdAt: 1,
//         content: {},
//         visibility: "public"
//       })

//       stores.documents.add(sourceDocument)
//       stores.documents.add(destinationDocument)

//       mockXhr.post(/.*/, (req, res) => {
//         const request = JSON.parse(req.body())

//         expect(request.event).toBe("COPY_TILE")
//         // expect(request.parameters.objectId).toBe(tile.id)
//         expect(request.parameters.objectType).toBe("Text")
//         expect(request.parameters.serializedObject).toEqual({
//           type: "Text",
//           text: "test"
//         })
//         expect(request.parameters.documentKey).toBe("destination-document")
//         expect(request.parameters.documentType).toBe("problem")
//         expect(request.parameters.objectId).not.toBe(tileToCopy.id)
//         expect(request.parameters.sourceDocumentKey).toBe("source-document")
//         expect(request.parameters.sourceDocumentType).toBe("problem")
//         expect(request.parameters.sourceObjectId).toBe(tileToCopy.id)
//         expect(request.parameters.sourceUsername).toBe("source-user")

//         done()
//         return res.status(201)
//       })

//       const tileToCopy = sourceDocument.content!.firstTile!

//       const copyTileInfo: IDropTileItem = {
//         rowIndex: 0,
//         tileIndex: 0,
//         tileId: tileToCopy.id,
//         newTileId: uniqueId(),
//         tileContent: JSON.stringify(tileToCopy),
//         tileType: tileToCopy.content.type
//       }

//       destinationDocument.content!.userCopyTiles([copyTileInfo], { rowInsertIndex: 0 })
//     })

//   })

//   // describe("Tile changes", () => {
//   //   it("can log tile change events", (done) => {
//   //     const tile = TileModel.create({ content: defaultGeometryContent() })
//   //     // const change: JXGChange = { operation: "create", target: "point" }

//   //     mockXhr.post(/.*/, (req, res) => {
//   //       const request = JSON.parse(req.body())

//   //       expect(request.event).toBe("GEOMETRY_TOOL_CHANGE")
//   //       expect(request.parameters.toolId).toBe(tile.id)
//   //       expect(request.parameters.operation).toBe("create")
//   //       expect(request.parameters.target).toBe("point")
//   //       expect(request.parameters.documentKey).toBe(undefined)

//   //       done()
//   //       return res.status(201)
//   //     })

//   //     // Logger.logTileChange(LogEventName.GEOMETRY_TOOL_CHANGE, "create", change, tile.id)
//   //   })
//   // })

//   describe("workspace events", () => {

//     let workspace: WorkspaceModelType
//     let doc1: DocumentModelType
//     let doc2: DocumentModelType

//     beforeEach(() => {
//       workspace = WorkspaceModel.create({
//         type: ProblemWorkspace,
//         mode: "1-up",
//       })

//       doc1 = createDocumentModel({
//         uid: "1",
//         type: ProblemWorkspace,
//         key: "test1",
//         createdAt: 1,
//         content: {}
//       })

//       doc2 = createDocumentModel({
//         uid: "2",
//         type: ProblemDocument,
//         key: "test2",
//         createdAt: 1,
//         content: {}
//       })
//     })

//     it("can log opening the primary document", (done) => {
//       mockXhr.post(/.*/, (req, res) => {
//         const request = JSON.parse(req.body())

//         expect(request.event).toBe("VIEW_SHOW_DOCUMENT")
//         expect(request.parameters.documentKey).toBe("test1")
//         expect(request.parameters.documentType).toBe("problem")

//         done()
//         return res.status(201)
//       })

//       workspace.setPrimaryDocument(doc1)
//     })

//     it("can log opening the comparison document", (done) => {
//       mockXhr.post(/.*/, (req, res) => {
//         const request = JSON.parse(req.body())

//         expect(request.event).toBe("VIEW_SHOW_COMPARISON_DOCUMENT")
//         expect(request.parameters.documentKey).toBe("test2")
//         expect(request.parameters.documentType).toBe("problem")

//         done()
//         return res.status(201)
//       })

//       workspace.setComparisonDocument(doc2)
//     })

//     it("can log toggling the comparison panel", (done) => {
//       mockXhr.post(/.*/, (req, res) => {
//         const request = JSON.parse(req.body())

//         expect(request.event).toBe("VIEW_SHOW_COMPARISON_PANEL")

//         done()
//         return res.status(201)
//       })

//       workspace.toggleComparisonVisible()
//     })

//     it("can log toggling of mode with disconnects", (done) => {
//       mockXhr.post(/.*/, (req, res) => {
//         const request = JSON.parse(req.body())

//         expect(request.event).toBe("VIEW_ENTER_FOUR_UP")
//         expect(request.disconnects).toBe("0/0/1")

//         done()
//         return res.status(201)
//       })

//       stores.user.incrementNetworkStatusAlertCount()
//       workspace.toggleMode()
//     })
//   })
// })
