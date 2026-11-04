import { act, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { RefObject, useRef, useState } from "react"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { persistentState } from "../../models/persistent-state"
import { AboutDialogView } from "../../models/ui-state-types"
import { displayVersion } from "../../utilities/version-utils"
import { AboutDialog } from "./about-dialog"
import { IOssLibrary, resetOssLibrariesRequest } from "./use-oss-libraries"

// Chakra's Checkbox tracks keyboard focus with @zag-js/focus-visible, which overwrites HTMLElement.prototype.focus
// the first time a Checkbox mounts. user-event's setup() makes that property getter-only, so the assignment throws.
// Focus-visible styling doesn't matter in these tests.
jest.mock("@zag-js/focus-visible", () => ({
  ...jest.requireActual("@zag-js/focus-visible"),
  trackFocusVisible: () => () => undefined
}))

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

async function setup(initialView: AboutDialogView = "about") {
  const user = userEvent.setup()
  const onClose = jest.fn()
  const view = render(<AboutDialog isOpen={true} initialView={initialView} onClose={onClose}/>)
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
      ["MIT License", "https://github.com/concord-consortium/codap/blob/main/v3/LICENSE"],
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
      rerender(<AboutDialog isOpen={false} initialView="about" onClose={onClose}/>)
      rerender(<AboutDialog isOpen={true} initialView="about" onClose={onClose}/>)
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

    it("returns focus to returnFocusRef", async () => {
      function Harness() {
        const [isOpen, setIsOpen] = useState(true)
        const openerRef = useRef<HTMLButtonElement>(null)
        return (
          <>
            <button ref={openerRef}>Opener</button>
            <AboutDialog isOpen={isOpen} initialView="about" returnFocusRef={openerRef}
              onClose={() => setIsOpen(false)}/>
          </>
        )
      }
      const user = userEvent.setup()
      render(<Harness/>)
      await flushFetch()
      await user.click(screen.getByTestId("about-dialog-close-button"))
      await waitFor(() => expect(screen.getByRole("button", { name: "Opener" })).toHaveFocus())
    })

    it("returns focus to returnFocusRef even if the opener clears it on close", async () => {
      // like App, which passes uiState's ref, which closeAboutDialog() clears before the dialog finishes closing
      // The button that opens the dialog differs from the return target, as with the Help menu's item and button.
      function Harness() {
        const returnTargetRef = useRef<HTMLButtonElement>(null)
        const [returnFocusRef, setReturnFocusRef] = useState<RefObject<HTMLElement>>()
        return (
          <>
            <button onClick={() => setReturnFocusRef(returnTargetRef)}>Open</button>
            <button ref={returnTargetRef}>Return here</button>
            <AboutDialog isOpen={!!returnFocusRef} initialView="about" returnFocusRef={returnFocusRef}
              onClose={() => setReturnFocusRef(undefined)}/>
          </>
        )
      }
      const user = userEvent.setup()
      render(<Harness/>)
      await user.click(screen.getByRole("button", { name: "Open" }))
      await flushFetch()
      await user.click(screen.getByTestId("about-dialog-close-button"))
      await waitFor(() => expect(screen.getByRole("button", { name: "Return here" })).toHaveFocus())
    })

    it("without returnFocusRef, returns focus to what had it before opening", async () => {
      function Harness() {
        const [isOpen, setIsOpen] = useState(false)
        return (
          <>
            <button onClick={() => setIsOpen(true)}>Open</button>
            <AboutDialog isOpen={isOpen} initialView="welcome" onClose={() => setIsOpen(false)}/>
          </>
        )
      }
      const user = userEvent.setup()
      render(<Harness/>)
      await user.click(screen.getByRole("button", { name: "Open" }))
      await flushFetch()
      await user.click(screen.getByTestId("about-dialog-get-started"))
      await waitFor(() => expect(screen.getByRole("button", { name: "Open" })).toHaveFocus())
    })
  })

  describe("welcome view", () => {
    beforeEach(() => {
      persistentState.setHideWelcome(false)
    })

    it("is named by its title and shows the logo and intro", async () => {
      await setup("welcome")
      expect(screen.getByRole("dialog", { name: "Welcome to CODAP" })).toBeInTheDocument()
      expect(screen.getByRole("img", { name: "CODAP, a product of The Concord Consortium" })).toBeInTheDocument()
      expect(screen.getByText("Explore, analyze, and visualize data right in your browser.")).toBeInTheDocument()
    })

    it("starts with focus on Get started, which closes the dialog", async () => {
      const { user, onClose } = await setup("welcome")
      const getStarted = screen.getByRole("button", { name: "Get started" })
      await waitFor(() => expect(getStarted).toHaveFocus())
      await user.click(getStarted)
      expect(onClose).toHaveBeenCalled()
    })

    it("switches to the About view and focuses the close button", async () => {
      const { user } = await setup("welcome")
      await user.click(screen.getByRole("button", { name: "About & licensing" }))
      expect(screen.getByRole("dialog", { name: "About CODAP" })).toBeInTheDocument()
      expect(screen.getByTestId("modal-close-button")).toHaveFocus()
    })

    it("remembers \"Don't show this again\"", async () => {
      const { user } = await setup("welcome")
      const checkbox = screen.getByRole("checkbox", { name: "Don’t show this again" })
      expect(checkbox).not.toBeChecked()
      await user.click(checkbox)
      expect(persistentState.hideWelcome).toBe(true)
      await user.click(checkbox)
      expect(persistentState.hideWelcome).toBe(false)
    })

    it("reopens to the welcome view", async () => {
      const { user, onClose, rerender } = await setup("welcome")
      await user.click(screen.getByRole("button", { name: "About & licensing" }))
      rerender(<AboutDialog isOpen={false} initialView="welcome" onClose={onClose}/>)
      rerender(<AboutDialog isOpen={true} initialView="welcome" onClose={onClose}/>)
      expect(await screen.findByRole("dialog", { name: "Welcome to CODAP" })).toBeInTheDocument()
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
