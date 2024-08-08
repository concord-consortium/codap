import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import React from "react"
import { PluginsButton } from "./plugins-button"
import { t } from "../../utilities/translation/translate"
import { PluginData } from "../../hooks/use-standard-plugins"

describe("PluginsButtons", () => {
  const user = userEvent.setup()

  it("renders with no plugins", async () => {
    // fetch returns empty plugins array
    fetchMock.mockResponseOnce("[]")
    render(<PluginsButton/>)
    await waitFor(() => {
      expect(screen.getByTestId("tool-shelf-button-plugins")).toBeInTheDocument()
    })
    // click the button
    user.click(screen.getByTestId("tool-shelf-button-plugins"))
    await waitFor(() => {
      expect(screen.getByText(t("V3.ToolButtonData.pluginMenu.fetchError"))).toBeInTheDocument()
    })
  })

  it("renders with a plugin", async () => {
    // fetch returns an array with a single plugin
    const plugins: PluginData[] = [{
      categories: [],
      description: "",
      height: 100,
      icon: "",
      isStandard: "true",
      path: "",
      title: "Test Plugin",
      visible: "true",
      width: 100
    }]
    fetchMock.mockResponseOnce(JSON.stringify(plugins))
    render(<PluginsButton/>)
    await waitFor(() => {
      expect(screen.getByTestId("tool-shelf-button-plugins")).toBeInTheDocument()
    })
    // click the button
    user.click(screen.getByTestId("tool-shelf-button-plugins"))
    await waitFor(() => {
      expect(screen.getByText("Test Plugin")).toBeInTheDocument()
    })
  })
})
