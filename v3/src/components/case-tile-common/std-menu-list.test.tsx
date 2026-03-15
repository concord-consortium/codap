/* eslint-disable testing-library/no-node-access */
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Button, MenuTrigger } from "react-aria-components"
import { IMenuItem, StdMenuList } from "./std-menu-list"

// StdMenuList renders its own InspectorMenuContent (Popover + Menu).
// It needs a React Aria MenuTrigger parent for overlay context.
const renderMenuList = (menuItems: IMenuItem[]) => {
  return render(
    <MenuTrigger defaultOpen>
      <Button>Trigger</Button>
      <StdMenuList menuItems={menuItems} data-testid="test-menu-list" />
    </MenuTrigger>
  )
}

describe("StdMenuList", () => {
  const mockClick = jest.fn()

  const menuItems: IMenuItem[] = [
    {
      itemKey: "item.enabled",
      handleClick: mockClick,
      dataTestId: "enabled-item"
    },
    {
      itemKey: "item.disabled",
      isEnabled: () => false,
      handleClick: mockClick,
      dataTestId: "disabled-item"
    },
    {
      itemKey: "item.unimplemented",
      dataTestId: "unimplemented-item"
    },
    {
      itemKey: "item.customLabel",
      itemLabel: () => "Custom Label",
      handleClick: mockClick,
      dataTestId: "custom-label-item"
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders all menu items", () => {
    renderMenuList(menuItems)
    expect(screen.getByTestId("enabled-item")).toBeInTheDocument()
    expect(screen.getByTestId("disabled-item")).toBeInTheDocument()
    expect(screen.getByTestId("unimplemented-item")).toBeInTheDocument()
    expect(screen.getByTestId("custom-label-item")).toBeInTheDocument()
  })

  it("uses itemLabel when provided, falls back to translating itemKey", () => {
    renderMenuList(menuItems)
    expect(screen.getByTestId("custom-label-item")).toHaveTextContent("Custom Label")
    // t() returns the key when no translation is found
    expect(screen.getByTestId("enabled-item")).toHaveTextContent("item.enabled")
  })

  it("passes isDisabled to items when isEnabled returns false", () => {
    renderMenuList(menuItems)
    const item = screen.getByTestId("disabled-item")
    expect(item).toHaveAttribute("aria-disabled", "true")
  })

  it("passes isDisabled to items without a handleClick", () => {
    renderMenuList(menuItems)
    const item = screen.getByTestId("unimplemented-item")
    expect(item).toHaveAttribute("aria-disabled", "true")
  })

  it("calls handleClick when an enabled item is clicked", async () => {
    const user = userEvent.setup()
    renderMenuList(menuItems)
    await user.click(screen.getByTestId("enabled-item"))
    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  describe("unimplemented item emoji", () => {
    it("shows 🚧 emoji with aria-hidden on items without handleClick", () => {
      renderMenuList(menuItems)
      const item = screen.getByTestId("unimplemented-item")
      const emojiSpan = item.querySelector("span[aria-hidden='true']")
      expect(emojiSpan).toBeInTheDocument()
      expect(emojiSpan).toHaveTextContent("🚧")
    })

    it("does not show 🚧 emoji on items with handleClick", () => {
      renderMenuList(menuItems)
      const item = screen.getByTestId("enabled-item")
      const emojiSpan = item.querySelector("span[aria-hidden='true']")
      expect(emojiSpan).not.toBeInTheDocument()
    })
  })

})
/* eslint-enable testing-library/no-node-access */
