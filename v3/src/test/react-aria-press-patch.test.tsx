import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ListBox, ListBoxItem } from "react-aria-components"

// patches/react-aria+3.53.1.patch backports an upstream fix (adobe/react-spectrum#10820): on macOS, react-aria 3.53
// stopped preventing the default action of a plain Enter keydown, so when choosing an option with Enter moves focus
// to the Select's trigger, the browser's Enter activation clicks the trigger and the list reopens. This test fails if
// the patch is lost, e.g. when react-aria is updated; once an update includes the fix, remove the patch and keep it.
describe("react-aria Enter handling on macOS", () => {
  let platformSpy: jest.SpyInstance

  beforeEach(() => {
    platformSpy = jest.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel")
  })

  afterEach(() => {
    platformSpy.mockRestore()
  })

  it("doesn't activate an element that choosing an option with Enter focuses", async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()
    render(
      <>
        <button data-testid="next" onClick={onClick}>Next</button>
        <ListBox aria-label="Color" selectionMode="single"
          onSelectionChange={() => screen.getByTestId("next").focus()}>
          <ListBoxItem id="red">Red</ListBoxItem>
          <ListBoxItem id="green">Green</ListBoxItem>
        </ListBox>
      </>
    )
    act(() => screen.getAllByRole("option")[0].focus())

    await user.keyboard("{Enter}")

    expect(screen.getByTestId("next")).toHaveFocus()
    expect(onClick).not.toHaveBeenCalled()
  })
})
