import { render, screen } from "@testing-library/react"
import { userEvent } from '@testing-library/user-event'
import React from "react"
import { t } from "../../utilities/translation/translate"
import { DG } from "../../v2/dg-compat.v2"
import "./nav-buttons.v2"
const { NavButtons } = DG.React.Components as any

describe("Case card NavButtons", () => {
  jest.setTimeout(10000)
  it("renders", async () => {
    const user = userEvent.setup()
    const collectionClient = {
      getPath(path: string) {
        if (path === "casesController.selection") {
          return {
            toArray() {
              // selection is mocked to be empty by default
              return []
            }
          }
        }
      }
    }
    const mockOnPrevious = jest.fn()
    const mockOnNext = jest.fn()
    const mockOnNewCase = jest.fn()
    const mockOnDeselect = jest.fn()

    render(<NavButtons
            collectionClient={collectionClient}
            caseIndex={undefined}
            numCases={10}
            onPrevious={mockOnPrevious}
            onNext={mockOnNext}
            onNewCase={mockOnNewCase}
            onDeselect={mockOnDeselect}
            />)
    // prev button
    const prevButton = screen.getByTitle(t("DG.CaseCard.navLastCase"))
    expect(prevButton).toBeInTheDocument()
    await user.click(prevButton)
    expect(mockOnPrevious).toHaveBeenCalledTimes(1)
    // deselect button
    const deselectButton = screen.getByTitle(t("DG.CaseCard.noDeselect"))
    expect(deselectButton).toBeInTheDocument()
    expect(deselectButton).toBeDisabled()
    await user.click(deselectButton)
    expect(mockOnDeselect).toHaveBeenCalledTimes(0)
    // next button
    const nextButton = screen.getByTitle(t("DG.CaseCard.navFirstCase"))
    expect(nextButton).toBeInTheDocument()
    await user.click(nextButton)
    expect(mockOnNext).toHaveBeenCalledTimes(1)
    // add case button
    const regex = /add\s*case/ // \s* matches any whitespace, including line breaks
    const addCaseButton = screen.getByText(regex)
    expect(addCaseButton).toBeInTheDocument()
    await user.click(addCaseButton)
    expect(mockOnNewCase).toHaveBeenCalledTimes(1)
  })
})
