import { appState } from "../../models/app-state"
import { diConfigurationListHandler } from "./configuration-list-handler"

describe("DataInteractive ConfigurationListHandler", () => {
  const handler = diConfigurationListHandler
  const content = appState.document.content!

  afterEach(() => {
    content.setGaussianFitEnabled(false)
  })

  describe("get", () => {
    it("returns gaussianFitEnabled as 'yes' when enabled, without an interactiveFrame, as from the host page", () => {
      content.setGaussianFitEnabled(true)
      const result = handler.get?.({})
      expect(result).toEqual({ success: true, values: [{ name: "gaussianFitEnabled", value: "yes" }] })
    })

    it("returns gaussianFitEnabled as '' when disabled, without an interactiveFrame, as from the host page", () => {
      content.setGaussianFitEnabled(false)
      const result = handler.get?.({})
      expect(result).toEqual({ success: true, values: [{ name: "gaussianFitEnabled", value: "" }] })
    })
  })
})
