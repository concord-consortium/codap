import { render, screen } from "@testing-library/react"
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
    expect(await screen.findByTestId("tool-shelf-button-plugins")).toBeInTheDocument()
    // click the button
    user.click(screen.getByTestId("tool-shelf-button-plugins"))
    expect(await screen.findByText(t("V3.ToolButtonData.pluginMenu.fetchError"))).toBeInTheDocument()
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
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => null)
    render(<PluginsButton/>)
    expect(await screen.findByTestId("tool-shelf-button-plugins")).toBeInTheDocument()
    // click the button
    user.click(screen.getByTestId("tool-shelf-button-plugins"))
    expect(await screen.findByText("Test Plugin")).toBeInTheDocument()
    // I spent a while trying to find a better solution to this problem without success.
    // The problem is complicated by the fact that the setState call at issue comes from
    // Chakra's menu component rather than our own components. In the end, we just
    // suppress the error and assert that it's the only error that occurred.
    expect(errorSpy).toHaveBeenCalledTimes(1)
    const expectedErrorStr = "Warning: An update to %s inside a test was not wrapped in act(...)"
    expect(errorSpy.mock.calls[0][0].startsWith(expectedErrorStr)).toBe(true)
    errorSpy.mockRestore()
  })
})
