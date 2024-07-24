// import mockXhr from "xhr-mock";
// import { Logger } from "./logger";
// import { InvestigationModel } from "../models/curriculum/investigation";
// import { specAppConfig } from "../models/stores/spec-app-config";
// import { IStores, createStores } from "../models/stores/stores";
// import { UserModel } from "../models/stores/user";

// const investigation = InvestigationModel.create({
//   ordinal: 1,
//   title: "Investigation 1",
//   problems: [ { ordinal: 1, title: "Problem 1.1" } ]
// });
// const problem = investigation.getProblem(1);

// jest.mock("../lib/debug", () => ({
//   DEBUG_LOGGER: true,
//   // eslint-disable-next-line no-console
//   debugLog: (enabled: boolean, message: any, ...params: any[]) => { console.log(message, ...params); }
// }));

// describe("dev/qa/test logger with DEBUG_LOGGER true", () => {
//   let stores: IStores;
//   let mockConsoleLog: jest.SpyInstance;

//   beforeEach(() => {
//     mockXhr.setup();
//     stores = createStores({
//       appMode: "test",
//       appConfig: specAppConfig({ config: { appName: "TestLogger" } }),
//       user: UserModel.create({id: "0", type: "teacher", portal: "test"})
//     });

//     // intercept and suppress console logs
//     mockConsoleLog = jest.spyOn(global.console, "log").mockImplementation(() => null);

//     Logger.initializeLogger(stores, { investigation: investigation.title, problem: problem?.title });
//   });

//   afterEach(() => {
//     mockXhr.reset();
//     mockXhr.teardown();

//     mockConsoleLog.mockRestore();
//   });

//   it("does not log in dev/qa/test modes", (done) => {
//     const TEST_LOG_MESSAGE = 999;
//     const mockPostHandler = jest.fn((req, res) => {
//       expect(mockPostHandler).toHaveBeenCalledTimes(1);
//       done();
//       return res.status(201);
//     });
//     mockXhr.use(mockPostHandler);

//     // should be logged despite mode
//     Logger.log(TEST_LOG_MESSAGE);

//     // once for initialize and once for the log
//     expect(mockConsoleLog).toHaveBeenCalledTimes(2);
//   });

// });
