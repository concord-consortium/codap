/* eslint-disable testing-library/no-node-access */
import { Menu } from "@chakra-ui/react"
import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { IMenuItem, StdMenuList } from "./std-menu-list"

// StdMenuList must be rendered inside a Chakra <Menu> parent
const renderMenuList = (menuItems: IMenuItem[]) => {
  return render(
    <Menu isOpen>
      <StdMenuList menuItems={menuItems} data-testid="test-menu-list" />
    </Menu>
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
    // Chakra MenuItem sets aria-disabled on the rendered element
    const item = screen.getByTestId("disabled-item")
    // In Chakra v2, disabled MenuItems get either aria-disabled or disabled attribute
    const isDisabled = item.getAttribute("aria-disabled") === "true" || item.hasAttribute("disabled")
    expect(isDisabled).toBe(true)
  })

  it("passes isDisabled to items without a handleClick", () => {
    renderMenuList(menuItems)
    const item = screen.getByTestId("unimplemented-item")
    const isDisabled = item.getAttribute("aria-disabled") === "true" || item.hasAttribute("disabled")
    expect(isDisabled).toBe(true)
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

  describe("scroll into view on focus", () => {
    it("calls scrollIntoView when a menu item receives focus", () => {
      renderMenuList(menuItems)
      const items = screen.getAllByRole("menuitem")
      act(() => { items[0].focus() })
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" })
    })
  })
})
/* eslint-enable testing-library/no-node-access */
