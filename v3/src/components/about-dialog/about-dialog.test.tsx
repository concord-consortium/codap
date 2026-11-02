import { act, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { displayVersion } from "../../utilities/version-utils"
import { AboutDialog } from "./about-dialog"
import { IOssLibrary, resetOssLibrariesRequest } from "./use-oss-libraries"

const kLibraries: IOssLibrary[] = [
  { name: "@chakra-ui/react", version: "2.8.2", license: "MIT" },
  { name: "d3", version: "7.9.0", license: "ISC" },
  { name: "mobx", version: "6.12.3", license: "MIT" },
  { name: "mobx-state-tree", version: "5.4.1", license: "MIT" }
]

function mockFetch(result: IOssLibrary[] | "error" | "pending") {
  global.fetch = jest.fn().mockImplementation(() => {
    if (result === "pending") return new Promise(() => undefined)
    if (result === "error") return Promise.resolve({ ok: false, status: 404 })
    return Promise.resolve({ ok: true, json: () => Promise.resolve(result) })
  })
}

// lets the mocked fetch resolve and the dialog re-render
async function flushFetch() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

function getAcknowledgementsButton() {
  return screen.getByTestId("about-dialog-acknowledgements")
}

async function setup() {
  const user = userEvent.setup()
  const onClose = jest.fn()
  const view = render(<AboutDialog isOpen={true} onClose={onClose}/>)
  await flushFetch()
  return { user, onClose, ...view }
}

describe("AboutDialog", () => {
  beforeEach(() => {
    resetOssLibrariesRequest()
    mockFetch(kLibraries)
  })

  describe("About CODAP view", () => {
    it("is a modal dialog named by its title", async () => {
      await setup()
      const dialog = screen.getByRole("dialog", { name: "About CODAP" })
      expect(dialog).toHaveAttribute("aria-modal", "true")
    })

    it("shows the logo, version, build, and copyright", async () => {
      await setup()
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
    ])("links %s to %s in a new tab", async (text, href) => {
      await setup()
      const link = screen.getByRole("link", { name: `${text} (opens in a new tab)` })
      expect(link).toHaveAttribute("href", href)
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("links both Terms of Use mentions to the terms page", async () => {
      await setup()
      const links = screen.getAllByRole("link", { name: "Terms of Use (opens in a new tab)" })
      expect(links).toHaveLength(2)
      links.forEach(link => expect(link).toHaveAttribute("href", "https://concord.org/terms-of-use/"))
    })

    it("links the licensing email address without opening a new tab", async () => {
      await setup()
      const link = screen.getByRole("link", { name: "licensing@concord.org" })
      expect(link).toHaveAttribute("href", "mailto:licensing@concord.org")
      expect(link).not.toHaveAttribute("target")
    })
  })

  describe("switching views", () => {
    it("shows the libraries view and moves focus to its Back button", async () => {
      const { user } = await setup()
      await user.click(getAcknowledgementsButton())
      expect(screen.getByRole("dialog", { name: "Open-source libraries" })).toBeInTheDocument()
      expect(screen.getByText(/CODAP is built with these open-source projects/)).toBeInTheDocument()
      const noticesLink = screen.getByRole("link", { name: "THIRD-PARTY-NOTICES (opens in a new tab)" })
      expect(noticesLink).toHaveAttribute("href", "THIRD-PARTY-NOTICES.md")
      expect(screen.getByTestId("about-dialog-header-back")).toHaveFocus()
    })

    it.each(["about-dialog-header-back", "about-dialog-footer-back"])(
      "returns to the About view from %s and focuses the acknowledgements button", async testId => {
        const { user } = await setup()
        await user.click(getAcknowledgementsButton())
        await user.click(screen.getByTestId(testId))
        expect(screen.getByRole("dialog", { name: "About CODAP" })).toBeInTheDocument()
        expect(getAcknowledgementsButton()).toHaveFocus()
      })

    it("reopens to the About view", async () => {
      const { user, onClose, rerender } = await setup()
      await user.click(getAcknowledgementsButton())
      rerender(<AboutDialog isOpen={false} onClose={onClose}/>)
      rerender(<AboutDialog isOpen={true} onClose={onClose}/>)
      expect(await screen.findByRole("dialog", { name: "About CODAP" })).toBeInTheDocument()
    })
  })

  describe("closing", () => {
    it.each(["modal-close-button", "about-dialog-close-button"])("closes with %s", async testId => {
      const { user, onClose } = await setup()
      await user.click(screen.getByTestId(testId))
      expect(onClose).toHaveBeenCalled()
    })

    it("closes with Escape", async () => {
      const { user, onClose } = await setup()
      // Esc only reaches the dialog once focus is inside it
      // eslint-disable-next-line testing-library/no-node-access
      await waitFor(() => expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement))
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
      await flushFetch()
      await user.click(screen.getByTestId("about-dialog-close-button"))
      await waitFor(() => expect(screen.getByRole("button", { name: "Help" })).toHaveFocus())
    })
  })

  describe("open-source libraries", () => {
    async function showLibraries() {
      const setupResult = await setup()
      await setupResult.user.click(getAcknowledgementsButton())
      return setupResult
    }

    it("shows the project count on the acknowledgements button", async () => {
      await setup()
      expect(getAcknowledgementsButton()).toHaveTextContent("4 projects")
    })

    it.each([["pending"], ["error"]] as const)("omits the project count when the list is %s", async result => {
      mockFetch(result)
      await setup()
      expect(getAcknowledgementsButton()).not.toHaveTextContent("projects")
    })

    it("lists each library's name, version, and license", async () => {
      await showLibraries()
      const rows = screen.getAllByRole("listitem")
      expect(rows).toHaveLength(4)
      expect(rows[1]).toHaveTextContent("d3")
      expect(rows[1]).toHaveTextContent("7.9.0")
      expect(rows[1]).toHaveTextContent("ISC")
    })

    it("filters by name, ignoring case", async () => {
      const { user } = await showLibraries()
      await user.type(screen.getByRole("textbox", { name: "Search libraries…" }), "MOBX")
      const rows = screen.getAllByRole("listitem")
      expect(rows).toHaveLength(2)
      expect(rows[0]).toHaveTextContent("mobx")
      expect(screen.getByText("2 libraries")).toHaveAttribute("aria-live", "polite")
    })

    it("filters by license", async () => {
      const { user } = await showLibraries()
      await user.type(screen.getByRole("textbox", { name: "Search libraries…" }), "isc")
      expect(screen.getAllByRole("listitem")).toHaveLength(1)
      expect(screen.getByText("1 library")).toBeInTheDocument()
    })

    it("says when nothing matches", async () => {
      const { user } = await showLibraries()
      await user.type(screen.getByRole("textbox", { name: "Search libraries…" }), "zzz")
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
      expect(screen.getByText("No libraries match “zzz”.")).toBeInTheDocument()
    })

    it("says when the list is loading", async () => {
      mockFetch("pending")
      await showLibraries()
      expect(screen.getByText("Loading libraries…")).toBeInTheDocument()
    })

    it("says when the list couldn't be loaded, and still links to the notices", async () => {
      mockFetch("error")
      await showLibraries()
      expect(screen.getByText("The library list couldn't be loaded.")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "THIRD-PARTY-NOTICES (opens in a new tab)" }))
        .toHaveAttribute("href", "THIRD-PARTY-NOTICES.md")
    })
  })
})
