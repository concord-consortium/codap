import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { PluginsButton } from "./plugins-button"

describe("PluginsButtons", () => {
  const user = userEvent.setup()

  it("renders with standard plugins", async () => {
    render(<PluginsButton/>)
    expect(await screen.findByTestId("tool-shelf-button-plugins")).toBeInTheDocument()
    // click the button
    user.click(screen.getByTestId("tool-shelf-button-plugins"))
    expect(await screen.findByText("Simulation")).toBeInTheDocument()
    user.click(await screen.findByText("Simulation"))
    expect(await screen.findByText("Sampler")).toBeInTheDocument()
  })
})
