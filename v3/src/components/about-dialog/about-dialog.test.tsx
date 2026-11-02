import { render, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { displayVersion } from "../../utilities/version-utils"
import { AboutDialog } from "./about-dialog"

function setup() {
  const user = userEvent.setup()
  const onClose = jest.fn()
  const view = render(<AboutDialog isOpen={true} onClose={onClose}/>)
  return { user, onClose, ...view }
}

describe("AboutDialog", () => {
  describe("About CODAP view", () => {
    it("is a modal dialog named by its title", () => {
      setup()
      const dialog = screen.getByRole("dialog", { name: "About CODAP" })
      expect(dialog).toHaveAttribute("aria-modal", "true")
    })

    it("shows the logo, version, build, and copyright", () => {
      setup()
      expect(screen.getByRole("img", { name: "CODAP, a product of The Concord Consortium" })).toBeInTheDocument()
      expect(screen.getByText("Common Online Data Analysis Platform")).toBeInTheDocument()
      expect(screen.getByText(`Version ${displayVersion(pkg.version)} · build ${build.buildNumber}`))
        .toBeInTheDocument()
      expect(screen.getByText(`© 1996–${new Date().getFullYear()} The Concord Consortium, Inc.`))
        .toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "License & Terms of Use" })).toBeInTheDocument()
    })

    it.each([
      ["MIT License", "https://github.com/concord-consortium/codap/blob/main/LICENSE"],
      ["concord.org/licensing", "https://concord.org/licensing"],
      ["Licensing details", "https://concord.org/licensing/"],
      ["Source on GitHub", "https://github.com/concord-consortium/codap"]
    ])("links %s to %s in a new tab", (text, href) => {
      setup()
      const link = screen.getByRole("link", { name: `${text} (opens in a new tab)` })
      expect(link).toHaveAttribute("href", href)
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("links both Terms of Use mentions to the terms page", () => {
      setup()
      const links = screen.getAllByRole("link", { name: "Terms of Use (opens in a new tab)" })
      expect(links).toHaveLength(2)
      links.forEach(link => expect(link).toHaveAttribute("href", "https://concord.org/terms-of-use/"))
    })

    it("links the licensing email address without opening a new tab", () => {
      setup()
      const link = screen.getByRole("link", { name: "licensing@concord.org" })
      expect(link).toHaveAttribute("href", "mailto:licensing@concord.org")
      expect(link).not.toHaveAttribute("target")
    })
  })

  describe("switching views", () => {
    it("shows the libraries view and moves focus to its Back button", async () => {
      const { user } = setup()
      await user.click(screen.getByRole("button", { name: "Open-source libraries & acknowledgements" }))
      expect(screen.getByRole("dialog", { name: "Open-source libraries" })).toBeInTheDocument()
      expect(screen.getByText(/CODAP is built with these open-source projects/)).toBeInTheDocument()
      const noticesLink = screen.getByRole("link", { name: "THIRD-PARTY-NOTICES (opens in a new tab)" })
      expect(noticesLink)
        .toHaveAttribute("href", "https://github.com/concord-consortium/codap/blob/main/THIRD-PARTY-NOTICES.md")
      expect(screen.getByTestId("about-dialog-header-back")).toHaveFocus()
    })

    it.each(["about-dialog-header-back", "about-dialog-footer-back"])(
      "returns to the About view from %s and focuses the acknowledgements button", async testId => {
        const { user } = setup()
        await user.click(screen.getByRole("button", { name: "Open-source libraries & acknowledgements" }))
        await user.click(screen.getByTestId(testId))
        expect(screen.getByRole("dialog", { name: "About CODAP" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Open-source libraries & acknowledgements" })).toHaveFocus()
      })

    it("reopens to the About view", async () => {
      const { user, onClose, rerender } = setup()
      await user.click(screen.getByRole("button", { name: "Open-source libraries & acknowledgements" }))
      rerender(<AboutDialog isOpen={false} onClose={onClose}/>)
      rerender(<AboutDialog isOpen={true} onClose={onClose}/>)
      expect(await screen.findByRole("dialog", { name: "About CODAP" })).toBeInTheDocument()
    })
  })

  describe("closing", () => {
    it.each(["modal-close-button", "about-dialog-close-button"])("closes with %s", async testId => {
      const { user, onClose } = setup()
      await user.click(screen.getByTestId(testId))
      expect(onClose).toHaveBeenCalled()
    })

    it("closes with Escape", async () => {
      const { user, onClose } = setup()
      await waitFor(() => expect(within(screen.getByRole("dialog")).getByTestId("modal-close-button")).toHaveFocus())
      await user.keyboard("{Escape}")
      expect(onClose).toHaveBeenCalled()
    })

    it("returns focus to the Help menu button", async () => {
      function Harness() {
        const [isOpen, setIsOpen] = useState(true)
        return (
          <>
            <div className="help-menu"><button className="menu-anchor">Help</button></div>
            <AboutDialog isOpen={isOpen} onClose={() => setIsOpen(false)}/>
          </>
        )
      }
      const user = userEvent.setup()
      render(<Harness/>)
      await user.click(screen.getByTestId("about-dialog-close-button"))
      await waitFor(() => expect(screen.getByRole("button", { name: "Help" })).toHaveFocus())
    })
  })
})
