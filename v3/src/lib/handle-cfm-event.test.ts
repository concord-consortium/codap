import { CloudFileManagerClient, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { getSnapshot } from "mobx-state-tree"
import { appState } from "../models/app-state"
import { createCodapDocument, isCodapDocument } from "../models/codap/create-codap-document"
import { ICodapV2DocumentJson } from "../v2/codap-v2-types"
import * as ImportV2Document from "../v2/import-v2-document"
import { handleCFMEvent } from "./handle-cfm-event"
import { Logger } from "./logger"

describe("handleCFMEvent", () => {

  let updateDocumentSpy: jest.SpyInstance

  beforeEach(() => {
    updateDocumentSpy = jest.spyOn(Logger, "updateDocument").mockImplementation(() => null)
  })

  afterEach(() => {
    updateDocumentSpy.mockRestore()
  })

  it("handles the `connected` message", () => {
    const mockCfmClient = {
      setProviderOptions: jest.fn(),
      _ui: {
        setMenuBarInfo: jest.fn()
      },
    }
    const mockCfmClientArg = mockCfmClient as unknown as CloudFileManagerClient
    const cfmEvent = {
      type: "connected"
    } as CloudFileManagerClientEvent
    handleCFMEvent(mockCfmClientArg, cfmEvent)
    expect(mockCfmClient.setProviderOptions).toHaveBeenCalledTimes(1)
    const [providerNameArg, providerOptionsArg] = mockCfmClient.setProviderOptions.mock.calls[0]
    expect(providerNameArg).toBe("documentStore")
    expect(providerOptionsArg.appName).toBe("DG")
    expect(providerOptionsArg.appVersion).toBeTruthy()
    expect(providerOptionsArg.appBuildNum).toBeTruthy()
    expect(mockCfmClient._ui.setMenuBarInfo).toHaveBeenCalledTimes(1)
    const menuBarInfoArg = mockCfmClient._ui.setMenuBarInfo.mock.calls[0][0]
    expect(menuBarInfoArg).toBe(`v${providerOptionsArg.appVersion} (${providerOptionsArg.appBuildNum})`)
  })

  it("handles the `getContent` message", done => {
    const mockCfmClient = {} as CloudFileManagerClient
    const mockCfmEvent = {
      type: "getContent",
      callback: jest.fn()
    }
    const mockCfmEventArg = mockCfmEvent as unknown as CloudFileManagerClientEvent
    handleCFMEvent(mockCfmClient, mockCfmEventArg)
    setTimeout(() => {
      const contentArg = mockCfmEvent.callback.mock.calls[0][0]
      expect(isCodapDocument(contentArg.content)).toBe(true)
      done()
    })
  })

  it("handles the `openedFile` message with a v2 document", () => {
    const mockCfmClient = {} as CloudFileManagerClient
    const mockV2Document: ICodapV2DocumentJson = {
      appName: "DG",
      components: [],
      contexts: []
    } as unknown as ICodapV2DocumentJson
    const cfmEvent = {
      type: "openedFile",
      data: {
        content: mockV2Document
      }
    } as CloudFileManagerClientEvent
    const spy = jest.spyOn(ImportV2Document, "importV2Document")
    handleCFMEvent(mockCfmClient, cfmEvent)
    expect(ImportV2Document.importV2Document).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it("handles the `openedFile` message with a v3 document", () => {
    const mockCfmClient = {} as CloudFileManagerClient
    const v3Document = createCodapDocument()
    const cfmEvent = {
      type: "openedFile",
      data: {
        content: getSnapshot(v3Document)
      }
    } as CloudFileManagerClientEvent
    const spy = jest.spyOn(appState, "setDocument")
    handleCFMEvent(mockCfmClient, cfmEvent)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

})
