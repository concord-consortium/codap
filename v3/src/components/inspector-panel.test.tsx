import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MenuItem } from "react-aria-components"
import {
  InspectorButton, InspectorMenu, InspectorMenuContent, InspectorPalette, InspectorPanel
} from "./inspector-panel"

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function ToolbarHarness({ persistenceKey = "inspector-panel-test-toolbar" }: { persistenceKey?: string }) {
  return (
    <InspectorPanel
      component="graph"
      show={true}
      toolbarAriaLabel="Graph"
      toolbarOrientation="vertical"
      toolbarPersistenceKey={persistenceKey}
      width="narrow"
    >
      <InspectorButton label="First" testId="first-button" tooltip="First tooltip">
        <svg />
      </InspectorButton>
      <InspectorButton label="Second" testId="second-button" tooltip="Second tooltip">
        <svg />
      </InspectorButton>
      <InspectorMenu icon={<svg />} label="Third" testId="third-button" tooltip="Third tooltip">
        <InspectorMenuContent>
          <MenuItem>Test item</MenuItem>
        </InspectorMenuContent>
      </InspectorMenu>
    </InspectorPanel>
  )
}

function MenuNavigationHarness({ onOpen }: { onOpen: jest.Mock }) {
  return (
    <InspectorPanel
      component="graph"
      show={true}
      toolbarAriaLabel="Graph"
      toolbarOrientation="vertical"
      toolbarPersistenceKey="menu-navigation"
      width="narrow"
    >
      <InspectorMenu icon={<svg />} label="Menu" onOpen={onOpen} testId="menu-button" tooltip="Menu tooltip">
        <InspectorMenuContent>
          <MenuItem>Test item</MenuItem>
        </InspectorMenuContent>
      </InspectorMenu>
      <InspectorButton label="Next" testId="next-button" tooltip="Next tooltip">
        <svg />
      </InspectorButton>
    </InspectorPanel>
  )
}

describe("inspector-panel accessibility", () => {
  const originalResizeObserver = global.ResizeObserver

  beforeAll(() => {
    ;(global as any).ResizeObserver = ResizeObserverMock
  })

  afterAll(() => {
    ;(global as any).ResizeObserver = originalResizeObserver
  })

  it("hides a labeled inspector button icon from assistive tech", () => {
    render(
      <InspectorButton label="Info" testId="info-button" tooltip="Info tooltip">
        <svg role="img" aria-label="info icon" />
      </InspectorButton>
    )

    const button = screen.getByRole("button", { name: "Info" })
    expect(button).toBeInTheDocument()
    // Icon should be hidden from assistive tech (inside aria-hidden wrapper)
    expect(within(button).queryByRole("img")).not.toBeInTheDocument()
  })

  it("keeps an icon-only inspector button name on the button itself", () => {
    render(
      <InspectorButton testId="icon-only-button" tooltip="Resize (R)">
        <svg role="img" aria-label="resize icon" />
      </InspectorButton>
    )

    const button = screen.getByRole("button", { name: "Resize" })
    expect(button).toBeInTheDocument()
    // Icon should NOT be hidden from assistive tech (no aria-hidden wrapper)
    expect(within(button).getByRole("img")).toBeInTheDocument()
  })

  it("passes popup semantics through inspector buttons", () => {
    render(
      <InspectorButton
        aria-controls="dataset-info-modal"
        aria-expanded={true}
        label="Info"
        testId="dialog-button"
        tooltip="Info tooltip"
      >
        <svg />
      </InspectorButton>
    )

    const button = screen.getByRole("button", { name: "Info" })
    expect(button).toHaveAttribute("aria-controls", "dataset-info-modal")
    expect(button).toHaveAttribute("aria-expanded", "true")
  })

  it("hides a labeled inspector menu icon from assistive tech", () => {
    render(
      <InspectorMenu
        icon={<svg role="img" aria-label="menu icon" />}
        label="View"
        testId="view-menu"
        tooltip="View tooltip"
      >
        <InspectorMenuContent>
          <MenuItem>Test item</MenuItem>
        </InspectorMenuContent>
      </InspectorMenu>
    )

    const button = screen.getByRole("button", { name: "View" })
    expect(button).toBeInTheDocument()
    // Icon should be hidden from assistive tech (inside aria-hidden wrapper)
    expect(within(button).queryByRole("img")).not.toBeInTheDocument()
  })

  it("exposes menu semantics on InspectorMenu trigger buttons", () => {
    render(
      <InspectorMenu
        icon={<svg />}
        label="View"
        testId="view-menu"
        tooltip="View tooltip"
      >
        <InspectorMenuContent>
          <MenuItem>Test item</MenuItem>
        </InspectorMenuContent>
      </InspectorMenu>
    )

    const button = screen.getByRole("button", { name: "View" })
    expect(button).toHaveAttribute("aria-haspopup", "true")
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("marks palette header icons decorative", () => {
    render(
      <InspectorPalette
        Icon={<svg role="img" aria-label="palette icon" />}
        title="Values"
        setShowPalette={jest.fn()}
      >
        <div>Palette body</div>
      </InspectorPalette>
    )

    const region = screen.getByRole("region", { name: "Values" })
    expect(region).toBeInTheDocument()
    // Palette icon should be decorative (hidden from assistive tech)
    expect(within(region).queryByRole("img")).not.toBeInTheDocument()
  })

  it("passes the id prop through to the palette element", () => {
    render(
      <InspectorPalette
        Icon={<svg />}
        id="values-palette"
        title="Values"
        setShowPalette={jest.fn()}
      >
        <div>Palette body</div>
      </InspectorPalette>
    )

    const region = screen.getByRole("region", { name: "Values" })
    expect(region).toHaveAttribute("id", "values-palette")
  })

  it("renders toolbar semantics on inspector panels when configured", () => {
    render(<ToolbarHarness persistenceKey="toolbar-semantics" />)

    const toolbar = screen.getByRole("toolbar", { name: "Graph" })
    expect(toolbar).toHaveAttribute("aria-orientation", "vertical")
  })

  it("does not render toolbar semantics when toolbarAriaLabel is not provided", () => {
    render(
      <InspectorPanel component="graph" show={true} width="narrow">
        <InspectorButton label="Button" testId="solo-button" tooltip="Tooltip">
          <svg />
        </InspectorButton>
      </InspectorPanel>
    )

    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument()
    const panel = screen.getByTestId("inspector-panel")
    expect(panel).not.toHaveAttribute("aria-orientation")
  })

  it("uses roving tabindex without wrapping in inspector toolbars", async () => {
    const user = userEvent.setup()
    render(<ToolbarHarness persistenceKey="toolbar-wrap" />)

    const buttons = screen.getAllByRole("button")
    expect(buttons[0]).toHaveAttribute("tabindex", "0")
    expect(buttons[1]).toHaveAttribute("tabindex", "-1")
    expect(buttons[2]).toHaveAttribute("tabindex", "-1")

    await user.click(buttons[0])
    await user.keyboard("{ArrowDown}")
    expect(buttons[1]).toHaveFocus()
    expect(buttons[1]).toHaveAttribute("tabindex", "0")

    await user.keyboard("{ArrowDown}")
    expect(buttons[2]).toHaveFocus()

    await user.keyboard("{ArrowDown}")
    expect(buttons[2]).toHaveFocus()

    await user.keyboard("{ArrowUp}")
    expect(buttons[1]).toHaveFocus()
  })

  it("remembers the last active inspector toolbar item for the current session", async () => {
    const user = userEvent.setup()
    const { unmount } = render(<ToolbarHarness persistenceKey="toolbar-memory" />)
    const buttons = screen.getAllByRole("button")

    await user.click(buttons[0])
    await user.keyboard("{ArrowDown}")
    await user.keyboard("{ArrowDown}")
    expect(buttons[2]).toHaveFocus()
    unmount()

    render(<ToolbarHarness persistenceKey="toolbar-memory" />)
    const rerenderedButtons = screen.getAllByRole("button")
    expect(rerenderedButtons[2]).toHaveAttribute("tabindex", "0")
    expect(rerenderedButtons[0]).toHaveAttribute("tabindex", "-1")
  })

  it("uses toolbar arrow navigation on submenu triggers instead of opening the menu", async () => {
    const user = userEvent.setup()
    const handleOpen = jest.fn()
    render(<MenuNavigationHarness onOpen={handleOpen} />)

    const menuButton = screen.getByRole("button", { name: "Menu" })
    const nextButton = screen.getByRole("button", { name: "Next" })

    // Tab into the toolbar to focus the menu button without clicking (which would open the menu)
    await user.tab()
    expect(menuButton).toHaveFocus()
    handleOpen.mockClear()

    // Arrow key should move to the next toolbar item, not open the menu
    await user.keyboard("{ArrowDown}")
    expect(nextButton).toHaveFocus()
    expect(handleOpen).not.toHaveBeenCalled()
  })

  it("returns focus to the menu trigger when the menu is closed with Escape", async () => {
    const user = userEvent.setup()
    render(<MenuNavigationHarness onOpen={jest.fn()} />)

    const menuButton = screen.getByRole("button", { name: "Menu" })

    await user.click(menuButton)
    expect(screen.getByRole("menu")).toBeInTheDocument()

    await user.keyboard("{Escape}")
    await waitFor(() => {
      expect(menuButton).toHaveFocus()
    })
  })

})
