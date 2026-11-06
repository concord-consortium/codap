import { appState } from "../../models/app-state"
import { diConfigurationListHandler } from "./configuration-list-handler"

describe("DataInteractive ConfigurationListHandler", () => {
  const handler = diConfigurationListHandler
  const content = appState.document.content!

  afterEach(() => {
    content.setGaussianFitEnabled(false)
  })

  // the handler reads the document, not the requester's frame, so a request from the host page works too
  describe("get", () => {
    it("returns list with gaussianFitEnabled as 'yes' when enabled", () => {
      content.setGaussianFitEnabled(true)
      const result = handler.get?.({})
      expect(result).toEqual({ success: true, values: [{ name: "gaussianFitEnabled", value: "yes" }] })
    })

    it("returns list with gaussianFitEnabled as empty string when disabled", () => {
      content.setGaussianFitEnabled(false)
      const result = handler.get?.({})
      expect(result).toEqual({ success: true, values: [{ name: "gaussianFitEnabled", value: "" }] })
    })
  })
})
