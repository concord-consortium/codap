# CODAP-1595: About CODAP Dialog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "About CODAP…" item to the bottom of the Help menu that opens a centered, two-view About
dialog (About CODAP / Open-source libraries shell).

**Architecture:** The CFM Help menu item sets a MobX flag on `uiState`; `App` (an observer) renders
`AboutDialog` from that flag. `AboutDialog` is built on `CodapModal`, which gains `isCentered` and
`isDraggable` props. Translated sentences containing links use a new `translateToElements()` helper, and
external links use a new shared `ExternalLink` component, which also replaces the announcement banner's
hand-written message links.

**Tech Stack:** React 18, TypeScript, MobX, Chakra UI v2 (`Modal`), Jest + React Testing Library, Cypress.

**Design doc:** `v3/docs/plans/2026-10-30-codap-1595-about-dialog-design.md`

---

## Conventions for every task

- Run npm/jest/lint commands from `v3/`. Run git commands from the repo root (`v3`'s parent).
- No semicolons; max line length 120.
- **Commits:** per CLAUDE.md, show the user the proposed commit message and get explicit approval before
  every commit. The messages below are proposals. End each with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Deviations from the design doc (found while planning)

1. **Dialog header structure.** Chakra's `ModalContent` always sets `aria-labelledby` to the `ModalHeader`'s
   id, and that can't be overridden. If the Back and × buttons are inside `ModalHeader`, the dialog's
   accessible name becomes e.g. "Back Open-source libraries Close". So the header row is a plain `<div>`
   with the same classes as the existing header (`chakra-modal__header codap-modal-header-v3`, so the
   `codap-modal-v3` styles still apply), and only the title is a `ModalHeader`.
2. **Copyright line** uses plain `t()` with a `year` variable. It has no embedded elements, so
   `translateToElements()` isn't needed.
3. **Version** is plain text, not a pill, and the acknowledgements button is a Chakra `Button` with the
   existing `v3Clear` variant, per "no special styling".
4. **Help menu icon** is an exact copy of `info-icon.svg`. Its colors (`#006C8E`, `#D3F4FF`) already match
   the other Help menu icons.

---

### Task 1: `uiState.showAboutDialog` flag

**Files:**
- Modify: `v3/src/models/ui-state.ts` (observable near `_hideUserEntryModal` ~line 37; getter/action near
  `setHideUserEntryModal` ~line 239)
- Test: `v3/src/models/ui-state.test.ts`

**Step 1: Write the failing test**

Add to `ui-state.test.ts`, inside `describe("UIState", ...)`:

```ts
  describe("showAboutDialog", () => {
    it("is false by default and can be set", () => {
      const uiState = new UIState()
      expect(uiState.showAboutDialog).toBe(false)
      uiState.setShowAboutDialog(true)
      expect(uiState.showAboutDialog).toBe(true)
      uiState.setShowAboutDialog(false)
      expect(uiState.showAboutDialog).toBe(false)
    })
  })
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/models/ui-state.test.ts`
Expected: FAIL (TypeScript error: property `showAboutDialog` does not exist)

**Step 3: Implement**

In `ui-state.ts`, after the `_hideUserEntryModal` observable:

```ts
  @observable
  private _showAboutDialog = false
```

After `setHideUserEntryModal()`:

```ts
  get showAboutDialog() {
    return this._showAboutDialog
  }

  @action
  setShowAboutDialog(show: boolean) {
    this._showAboutDialog = show
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/models/ui-state.test.ts`
Expected: PASS

**Step 5: Commit** (after user approves the message)

```bash
git add v3/src/models/ui-state.ts v3/src/models/ui-state.test.ts
git commit -m "CODAP-1595: add showAboutDialog flag to uiState"
```

---

### Task 2: `translateToElements()` helper

`translateToElements()` goes in the existing `translate.ts`, next to `translate()`. That file is `.ts`, not
`.tsx`, so the helper uses `createElement(Fragment, …)` rather than JSX, and its tests (in the existing
`translate.test.ts`) use `createElement` too.

**Files:**
- Modify: `v3/src/utilities/translation/translate.ts`
- Test: `v3/src/utilities/translation/translate.test.ts`

**Step 1: Write the failing tests**

In `translate.test.ts`, add three entries to the existing `en-US.json5` mock:

```ts
jest.mock("./lang/en-US.json5", () => ({
  HELLO: "Hello",
  NAMED: "Replace %{foo} with %{bar}",
  INDEXED: "Replace %@1 with %@2",
  REVERSED: "Replace %@2 with %@1",
  POSITIONED: "Replace %@ with %@",
  EMPTY_NAMED: "Replace %{foo} with %{}",
  SENTENCE: "Read the %{link} before %{action}.",
  EDGES: "%{action}, then read the %{link}",
  PLAIN: "No placeholders here"
}))
```

Update the imports at the top of the file:

```ts
import { render, screen } from "@testing-library/react"
import { createElement, ReactNode } from "react"
import { t, translateToElements } from "./translate"
```

Add a new `describe` at the end of the file:

```ts
describe("translateToElements", () => {
  const link = createElement("a", { href: "https://example.com" }, "guide")
  const action = createElement("strong", null, "starting")

  function renderParagraph(content: ReactNode[]) {
    render(createElement("p", { "data-testid": "text" }, ...content))
    return screen.getByTestId("text")
  }

  it("replaces placeholders with elements and keeps the surrounding text", () => {
    const paragraph = renderParagraph(translateToElements("SENTENCE", { link, action }))
    expect(paragraph).toHaveTextContent("Read the guide before starting.")
    expect(screen.getByRole("link", { name: "guide" })).toHaveAttribute("href", "https://example.com")
    expect(screen.getByText("starting", { selector: "strong" })).toBeInTheDocument()
  })

  it("handles placeholders at the start and end of the string", () => {
    const paragraph = renderParagraph(translateToElements("EDGES", { link, action }))
    expect(paragraph).toHaveTextContent("starting, then read the guide")
  })

  it("returns the plain string when there are no placeholders", () => {
    expect(translateToElements("PLAIN", {})).toEqual(["No placeholders here"])
  })

  it("renders a placeholder with no matching element as empty and warns", () => {
    const spy = jest.spyOn(global.console, "warn").mockImplementation(() => null)
    const paragraph = renderParagraph(translateToElements("SENTENCE", { link }))
    expect(paragraph).toHaveTextContent("Read the guide before .")
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/utilities/translation/translate.test.ts`
Expected: FAIL (`translateToElements` is not exported from `./translate`). The existing tests still pass.

**Step 3: Implement**

In `translate.ts`, add the import at the top:

```ts
import { createElement, Fragment, ReactNode } from "react"
```

Add after `export const t = translate`:

```ts
const kPlaceholderRegExp = /%{\s*([^}\s]*)\s*}/g

// Translates a string and replaces its %{name} placeholders with React elements, so a translated
// sentence can contain links or other markup without putting markup in the string itself.
export function translateToElements(key: string, elements: Record<string, ReactNode>): ReactNode[] {
  // Pass each placeholder through translate() unchanged. translate() still handles the language
  // fallback, and it removes (with a warning) any placeholder that has no matching element.
  const vars = Object.fromEntries(Object.keys(elements).map(name => [name, `%{${name}}`]))
  const translation = translate(key, { vars })
  const result: ReactNode[] = []
  let textStart = 0
  for (const match of translation.matchAll(kPlaceholderRegExp)) {
    const [placeholder, name] = match
    if (match.index > textStart) result.push(translation.slice(textStart, match.index))
    result.push(createElement(Fragment, { key: result.length }, elements[name]))
    textStart = match.index + placeholder.length
  }
  if (textStart < translation.length) result.push(translation.slice(textStart))
  return result
}
```

If TypeScript reports `match.index` as possibly undefined, use `const index = match.index ?? 0`.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/utilities/translation/translate.test.ts`
Expected: PASS (existing tests plus 4 new ones)

**Step 5: Commit** (after user approves the message)

```bash
git add v3/src/utilities/translation/translate.ts v3/src/utilities/translation/translate.test.ts
git commit -m "CODAP-1595: add translateToElements helper for translated text with links"
```

---

### Task 3: Shared `ExternalLink` component

**Files:**
- Create: `v3/src/components/common/external-link.tsx`
- Modify: `v3/src/utilities/translation/lang/en-US.json5` (end of file)
- Test: `v3/src/components/common/external-link.test.tsx`

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { ExternalLink } from "./external-link"

const kUrl = "https://example.com"

describe("ExternalLink", () => {
  it("opens in a new tab without giving the new page access to CODAP", () => {
    render(<ExternalLink href={kUrl}>Example</ExternalLink>)
    const link = screen.getByRole("link", { name: "Example (opens in a new tab)" })
    expect(link).toHaveAttribute("href", kUrl)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("passes other anchor props through", () => {
    const onClick = jest.fn()
    render(
      <ExternalLink href={kUrl} className="my-link" data-testid="my-link" onClick={onClick}>Example</ExternalLink>
    )
    const link = screen.getByTestId("my-link")
    expect(link).toHaveClass("my-link")
    fireEvent.click(link)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("shows an arrow, hidden from screen readers, only when requested", () => {
    const { rerender } = render(<ExternalLink href={kUrl}>Example</ExternalLink>)
    expect(screen.queryByText("↗")).not.toBeInTheDocument()
    rerender(<ExternalLink href={kUrl} showArrow>Example</ExternalLink>)
    expect(screen.getByText("↗")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByRole("link", { name: "Example (opens in a new tab)" })).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- external-link`
Expected: FAIL (cannot find module `./external-link`)

**Step 3: Add the string**

At the end of `en-US.json5`, add a comma after the last entry
(`"V3.AppController.optionMenuItems.graphicsAccelerationOff": "Graphics Acceleration: Turn on"`) and append:

```json5

    "V3.ExternalLink.opensInNewTab": "(opens in a new tab)"
```

**Step 4: Implement**

```tsx
import { VisuallyHidden } from "@chakra-ui/react"
import React from "react"
import { t } from "../../utilities/translation/translate"

interface IProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel"> {
  href: string
  showArrow?: boolean
  children: React.ReactNode
}

// A link that opens in a new tab and tells screen-reader users that it does.
export function ExternalLink({ href, showArrow, children, ...others }: IProps) {
  return (
    <a {...others} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      {showArrow && <span aria-hidden="true"> ↗</span>}
      <VisuallyHidden>{` ${t("V3.ExternalLink.opensInNewTab")}`}</VisuallyHidden>
    </a>
  )
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- external-link`
Expected: PASS (3 tests)

**Step 6: Commit** (after user approves the message)

```bash
git add v3/src/components/common/external-link.tsx v3/src/components/common/external-link.test.tsx \
  v3/src/utilities/translation/lang/en-US.json5
git commit -m "CODAP-1595: add shared ExternalLink component"
```

---

### Task 4: Use `ExternalLink` for announcement banner message links

**Files:**
- Modify: `v3/src/components/announcement-banner/announcement-banner.tsx:76-85`
- Test: `v3/src/components/announcement-banner/announcement-banner.test.tsx:87,277`

**Step 1: Update the tests for the new accessible names**

Line 87:

```tsx
      const link = await screen.findByRole("link", { name: "our site (opens in a new tab)" })
```

Line 277:

```tsx
      fireEvent.click(await screen.findByRole("link", { name: "our survey (opens in a new tab)" }))
```

(Leave line 100, `{ name: "bad" }`, alone: that link must not exist at all.)

**Step 2: Run tests to verify they fail**

Run: `npm test -- announcement-banner.test`
Expected: FAIL for "renders https link segments in message as anchors" and "logs a click on a link in the
message with its url" (no link with that name)

**Step 3: Implement**

Add the import:

```tsx
import { ExternalLink } from "../common/external-link"
```

Replace the message-link `<a>` (lines 78-83):

```tsx
          segment.url
            ? (
              <ExternalLink key={i} href={segment.url} onClick={() => handleLinkClick(segment.url)}>
                {segment.text}
              </ExternalLink>
            )
            : <React.Fragment key={i}>{segment.text}</React.Fragment>
```

Do not change the "Learn More" button `<a>`.

**Step 4: Run tests to verify they pass**

Run: `npm test -- announcement-banner`
Expected: PASS (all banner tests, including the click-logging tests)

**Step 5: Check Cypress doesn't depend on the old markup**

Run: `grep -n "our site\|our survey\|find(\"a\|contains(\"a" cypress/e2e/announcement-banner.spec.ts`
Expected: no matches. (Checked during planning; re-check in case it changed.)

**Step 6: Commit** (after user approves the message)

```bash
git add v3/src/components/announcement-banner/announcement-banner.tsx \
  v3/src/components/announcement-banner/announcement-banner.test.tsx
git commit -m "CODAP-1595: use ExternalLink for announcement banner message links"
```

---

### Task 5: `CodapModal` `isCentered` and `isDraggable` props

**Files:**
- Modify: `v3/src/components/codap-modal.tsx:7-50`
- Create test: `v3/src/components/codap-modal.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react"
import { CodapModal } from "./codap-modal"

describe("CodapModal", () => {
  it("is draggable at a fixed position by default", () => {
    render(<CodapModal isOpen={true} onClose={jest.fn()}><div>content</div></CodapModal>)
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveClass("codap-modal-content")
    expect(dialog).toHaveStyle({ position: "absolute", left: "350px", top: "250px", cursor: "move" })
  })

  it("omits drag behavior and fixed positioning when isDraggable is false", () => {
    render(
      <CodapModal isOpen={true} onClose={jest.fn()} isCentered={true} isDraggable={false} modalWidth="520px">
        <div>content</div>
      </CodapModal>
    )
    const dialog = screen.getByRole("dialog")
    expect(dialog).not.toHaveClass("codap-modal-content")
    expect(dialog.style.left).toBe("")
    expect(dialog.style.top).toBe("")
    expect(dialog.style.cursor).toBe("")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/codap-modal.test.tsx`
Expected: first test PASSES (documents current behavior); second FAILS (TypeScript: unknown props
`isCentered`/`isDraggable`)

**Step 3: Implement**

Add to `IProps`:

```ts
  isCentered?: boolean
  isDraggable?: boolean
```

Update the component (also import `ModalContent`, already imported):

```tsx
export const CodapModal = forwardRef(({
  children, finalFocusRef, initialRef, isCentered, isDraggable = true, isOpen, returnFocusOnClose,
  closeOnOverlayClick, onClick, onClose, onKeyDown, modalWidth, modalHeight
}: IProps, ref: React.Ref<HTMLElement> | undefined) => {

  return (
    <Modal
      data-testid="codap-modal"
      finalFocusRef={finalFocusRef}
      initialFocusRef={initialRef}
      isCentered={isCentered}
      isOpen={isOpen}
      returnFocusOnClose={returnFocusOnClose}
      closeOnOverlayClick={closeOnOverlayClick}
      onClose={onClose}
      size="xs"
    >
      <ModalOverlay />
      {isDraggable
        ? <DraggableModalContent
            fRef={ref}
            modalWidth={modalWidth}
            modalHeight={modalHeight}
            onClick={onClick}
            onKeyDown={onKeyDown}
            isOpen={isOpen}
          >
            {children}
          </DraggableModalContent>
        : <ModalContent
            ref={ref}
            w={modalWidth}
            // maxW overrides the width limit from size="xs".
            maxW={modalWidth}
            h={modalHeight}
            onClick={onClick}
            onKeyDownCapture={onKeyDown}
          >
            {children}
          </ModalContent>
      }
    </Modal>
  )
})
```

If TypeScript rejects `ref={ref}` on `ModalContent`, use `useMergeRefs(ref)` the way
`DraggableModalContent` does.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/codap-modal.test.tsx`
Expected: PASS (2 tests)

Then run the other modal tests to confirm the default is unchanged:
`npm test -- edit-formula-modal dataset-info`
Expected: PASS

**Step 5: Commit** (after user approves the message)

```bash
git add v3/src/components/codap-modal.tsx v3/src/components/codap-modal.test.tsx
git commit -m "CODAP-1595: add isCentered and isDraggable props to CodapModal"
```

---

### Task 6: About dialog strings and link constants

**Files:**
- Modify: `v3/src/utilities/translation/lang/en-US.json5` (end of file)
- Create: `v3/src/components/about-dialog/about-dialog-constants.ts`

No tests in this task; Task 7's tests cover these.

**Step 1: Add strings**

Reuse these existing strings rather than adding new ones:

| Text | Existing key |
|---|---|
| About CODAP (dialog title) | `DG.AppController.showAboutTitle` (v2's About dialog title, already translated) |
| Common Online Data Analysis Platform | `V3.app.fullName` |
| About CODAP... (Help menu item, Task 9) | `DG.AppController.optionMenuItems.about` |

Add generic Back and Close strings next to the existing `V3.general.yes` / `V3.general.no` (~line 1344),
so other dialogs can reuse them:

```json5
    "V3.general.yes": "Yes",
    "V3.general.no": "No",
    "V3.general.back": "Back",
    "V3.general.close": "Close",
```

Then add the dialog-specific strings. At the end of `en-US.json5`, add a comma after `"V3.ExternalLink.opensInNewTab": "(opens in a new tab)"` and
append:

```json5

    "V3.AboutDialog.logoAlt": "CODAP, a product of The Concord Consortium",
    "V3.AboutDialog.version": "Version %{version} · build %{build}",
    "V3.AboutDialog.copyright": "© 1996–%{year} The Concord Consortium, Inc.",
    "V3.AboutDialog.license.heading": "License & Terms of Use",
    "V3.AboutDialog.license.p1": "%{freeOpenSource} The CODAP source code is released under the %{mitLicense}, so you’re welcome to use, modify, and build on it.",
    "V3.AboutDialog.license.freeOpenSource": "CODAP is free, open-source software.",
    "V3.AboutDialog.license.mitLicense": "MIT License",
    "V3.AboutDialog.license.p2": "%{yourUse} is governed by our %{termsOfUse}. CODAP is free for non-commercial use. Commercial use of CODAP, including integrating it into paid, subscription, or otherwise revenue-generating products, requires a separate written agreement with the Concord Consortium. Visit %{licensingPage} or contact %{licensingEmail}.",
    "V3.AboutDialog.license.yourUse": "Your use of CODAP",
    "V3.AboutDialog.license.termsOfUse": "Terms of Use",
    "V3.AboutDialog.license.licensingPage": "concord.org/licensing",
    "V3.AboutDialog.links.termsOfUse": "Terms of Use",
    "V3.AboutDialog.links.licensingDetails": "Licensing details",
    "V3.AboutDialog.links.sourceCode": "Source on GitHub",
    "V3.AboutDialog.acknowledgementsButton": "Open-source libraries & acknowledgements",
    "V3.AboutDialog.libraries.title": "Open-source libraries",
    "V3.AboutDialog.libraries.intro": "CODAP is built with these open-source projects. Our thanks to their authors and maintainers.",
    "V3.AboutDialog.libraries.footer": "This list is generated at build time from CODAP’s dependencies. Full license texts: %{noticesLink}",
    "V3.AboutDialog.libraries.noticesLink": "THIRD-PARTY-NOTICES"
```

The `json5` file is exempt from the 120-character lint limit (other entries are longer).

**Step 2: Add link constants**

`about-dialog-constants.ts`:

```ts
export const kMitLicenseUrl = "https://github.com/concord-consortium/codap/blob/main/LICENSE"
export const kTermsOfUseUrl = "https://concord.org/terms-of-use/"
export const kLicensingUrl = "https://concord.org/licensing"
export const kLicensingDetailsUrl = "https://concord.org/licensing/"
export const kLicensingEmail = "licensing@concord.org"
export const kSourceCodeUrl = "https://github.com/concord-consortium/codap"
export const kThirdPartyNoticesUrl = "https://github.com/concord-consortium/codap/blob/main/THIRD-PARTY-NOTICES.md"
```

**Step 3: Verify the strings file still parses**

Run: `npm test -- translate`
Expected: PASS

**Step 4: Commit** (after user approves the message)

```bash
git add v3/src/utilities/translation/lang/en-US.json5 v3/src/components/about-dialog/about-dialog-constants.ts
git commit -m "CODAP-1595: add About dialog strings and link constants"
```

---

### Task 7: `AboutDialog` component

**Files:**
- Create: `v3/src/components/about-dialog/about-dialog.tsx`
- Create: `v3/src/components/about-dialog/about-dialog.scss`
- Add (already in the working tree, untracked): `v3/src/assets/codap-about-screen.png`
- Test: `v3/src/components/about-dialog/about-dialog.test.tsx`

**Step 1: Write the failing tests**

```tsx
import { render, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { displayVersion } from "../../utilities/version-utils"
import { AboutDialog } from "./about-dialog"

function renderDialog() {
  const user = userEvent.setup()
  const onClose = jest.fn()
  const view = render(<AboutDialog isOpen={true} onClose={onClose}/>)
  return { user, onClose, ...view }
}

describe("AboutDialog", () => {
  describe("About CODAP view", () => {
    it("is a modal dialog named by its title", () => {
      renderDialog()
      const dialog = screen.getByRole("dialog", { name: "About CODAP" })
      expect(dialog).toHaveAttribute("aria-modal", "true")
    })

    it("shows the logo, version, build, and copyright", () => {
      renderDialog()
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
      renderDialog()
      const link = screen.getByRole("link", { name: `${text} (opens in a new tab)` })
      expect(link).toHaveAttribute("href", href)
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("links both Terms of Use mentions to the terms page", () => {
      renderDialog()
      const links = screen.getAllByRole("link", { name: "Terms of Use (opens in a new tab)" })
      expect(links).toHaveLength(2)
      links.forEach(link => expect(link).toHaveAttribute("href", "https://concord.org/terms-of-use/"))
    })

    it("links the licensing email address without opening a new tab", () => {
      renderDialog()
      const link = screen.getByRole("link", { name: "licensing@concord.org" })
      expect(link).toHaveAttribute("href", "mailto:licensing@concord.org")
      expect(link).not.toHaveAttribute("target")
    })
  })

  describe("switching views", () => {
    it("shows the libraries view and moves focus to its Back button", async () => {
      const { user } = renderDialog()
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
        const { user } = renderDialog()
        await user.click(screen.getByRole("button", { name: "Open-source libraries & acknowledgements" }))
        await user.click(screen.getByTestId(testId))
        expect(screen.getByRole("dialog", { name: "About CODAP" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Open-source libraries & acknowledgements" })).toHaveFocus()
      })

    it("reopens to the About view", async () => {
      const { user, onClose, rerender } = renderDialog()
      await user.click(screen.getByRole("button", { name: "Open-source libraries & acknowledgements" }))
      rerender(<AboutDialog isOpen={false} onClose={onClose}/>)
      rerender(<AboutDialog isOpen={true} onClose={onClose}/>)
      expect(await screen.findByRole("dialog", { name: "About CODAP" })).toBeInTheDocument()
    })
  })

  describe("closing", () => {
    it.each(["modal-close-button", "about-dialog-close-button"])("closes with %s", async testId => {
      const { user, onClose } = renderDialog()
      await user.click(screen.getByTestId(testId))
      expect(onClose).toHaveBeenCalled()
    })

    it("closes with Escape", async () => {
      const { user, onClose } = renderDialog()
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
```

Note: the "closes with Escape" test waits for initial focus to land on the × button (the first focusable
element) so the key event goes to the dialog. If initial focus lands elsewhere, wait for focus to be
anywhere inside the dialog instead.

**Step 2: Run tests to verify they fail**

Run: `npm test -- about-dialog`
Expected: FAIL (cannot find module `./about-dialog`)

**Step 3: Write the styles**

`about-dialog.scss` (body content layout only; the modal chrome comes from `codap-modal-v3.scss`):

```scss
@use "../vars";

// Layout for the About dialog's body content. The modal itself uses the shared codap-modal-v3 styles.
.about-dialog-body {
  padding: 12px 8px;
  font-size: 14px;
  line-height: 1.5;

  // Chakra's CSS reset removes link color and underline
  a {
    color: vars.$accent;
    text-decoration: underline;
  }

  p + p {
    margin-top: 8px;
  }

  .about-dialog-identity {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
  }

  .about-dialog-logo {
    width: 240px;
  }

  .about-dialog-divider {
    margin: 12px 0;
  }

  .about-dialog-heading {
    font-weight: 600;
    margin-bottom: 4px;
  }

  .about-dialog-links {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .about-dialog-libraries-footer {
    margin-top: 12px;
  }
}
```

**Step 4: Implement the component**

`about-dialog.tsx`:

```tsx
import { Button, ModalBody, ModalCloseButton, ModalFooter, ModalHeader } from "@chakra-ui/react"
import React, { useEffect, useRef, useState } from "react"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import AboutScreenLogo from "../../assets/codap-about-screen.png"
import { t, translateToElements } from "../../utilities/translation/translate"
import { displayVersion } from "../../utilities/version-utils"
import { CodapModal } from "../codap-modal"
import { ExternalLink } from "../common/external-link"
import {
  kLicensingDetailsUrl, kLicensingEmail, kLicensingUrl, kMitLicenseUrl, kSourceCodeUrl, kTermsOfUseUrl,
  kThirdPartyNoticesUrl
} from "./about-dialog-constants"

import "../codap-modal-v3.scss"
import "./about-dialog.scss"

type AboutDialogView = "about" | "libraries"

interface IProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: IProps) {
  const [view, setView] = useState<AboutDialogView>("about")
  const headerBackButtonRef = useRef<HTMLButtonElement>(null)
  const acknowledgementsButtonRef = useRef<HTMLButtonElement>(null)
  // The Help menu item that opens the dialog is gone once the menu closes,
  // so focus returns to the Help menu button instead.
  const helpMenuButtonRef = useRef<HTMLElement | null>(null)
  const focusAfterViewChange = useRef(false)

  // Set the view and find the help button when the modal opens.
  useEffect(() => {
    if (isOpen) {
      setView("about")
      helpMenuButtonRef.current = document.querySelector<HTMLElement>(".help-menu .menu-anchor")
    }
  }, [isOpen])

  // Update the focus when the view changes.
  useEffect(() => {
    if (focusAfterViewChange.current) {
      focusAfterViewChange.current = false
      const focusTarget = view === "libraries" ? headerBackButtonRef : acknowledgementsButtonRef
      focusTarget.current?.focus()
    }
  }, [view])

  function showView(newView: AboutDialogView) {
    focusAfterViewChange.current = true
    setView(newView)
  }

  const title = view === "about" ? t("DG.AppController.showAboutTitle") : t("V3.AboutDialog.libraries.title")
  const backButtonContent = <><span aria-hidden="true">‹ </span>{t("V3.general.back")}</>

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={onClose}
      isCentered={true}
      isDraggable={false}
      modalWidth="520px"
      finalFocusRef={helpMenuButtonRef}
    >
      {/* The row uses the same classes as other v3 modal headers so it gets the same styling. */}
      <div className="chakra-modal__header codap-modal-header-v3">
        {view === "libraries" &&
          <Button ref={headerBackButtonRef} size="xs" variant="v3Clear" ml="2" onClick={() => showView("about")}
              data-testid="about-dialog-header-back">
            {backButtonContent}
          </Button>
        }
        {/* Chakra names the dialog with the full text of ModalHeader, so only the title goes in it. */}
        <ModalHeader as="h2" className="codap-header-title-v3" p={0} flex="1" boxShadow="none">
          {title}
        </ModalHeader>
        <ModalCloseButton data-testid="modal-close-button"/>
      </div>
      <ModalBody>
        <div className="about-dialog-body">
          {view === "about"
            ? <AboutView acknowledgementsButtonRef={acknowledgementsButtonRef}
                onShowLibraries={() => showView("libraries")}/>
            : <LibrariesView/>
          }
        </div>
      </ModalBody>
      <ModalFooter>
        {view === "libraries" &&
          <Button size="xs" variant="v3Clear" ml="3" onClick={() => showView("about")}
              data-testid="about-dialog-footer-back">
            {backButtonContent}
          </Button>
        }
        <Button size="xs" variant="v3Default" ml="3" onClick={onClose} data-testid="about-dialog-close-button">
          {t("V3.general.close")}
        </Button>
      </ModalFooter>
    </CodapModal>
  )
}

interface IAboutViewProps {
  acknowledgementsButtonRef: React.RefObject<HTMLButtonElement>
  onShowLibraries: () => void
}

function AboutView({ acknowledgementsButtonRef, onShowLibraries }: IAboutViewProps) {
  const version = displayVersion(pkg.version)
  const year = new Date().getFullYear()
  return (
    <>
      <div className="about-dialog-identity">
        <img className="about-dialog-logo" src={AboutScreenLogo} alt={t("V3.AboutDialog.logoAlt")}/>
        <div>{t("V3.app.fullName")}</div>
        <div>{t("V3.AboutDialog.version", { vars: { version, build: build.buildNumber } })}</div>
        <div>{t("V3.AboutDialog.copyright", { vars: { year } })}</div>
      </div>
      <hr className="about-dialog-divider"/>
      <h3 className="about-dialog-heading">{t("V3.AboutDialog.license.heading")}</h3>
      <p>
        {translateToElements("V3.AboutDialog.license.p1", {
          freeOpenSource: <strong>{t("V3.AboutDialog.license.freeOpenSource")}</strong>,
          mitLicense: <ExternalLink href={kMitLicenseUrl}>{t("V3.AboutDialog.license.mitLicense")}</ExternalLink>
        })}
      </p>
      <p>
        {translateToElements("V3.AboutDialog.license.p2", {
          yourUse: <strong>{t("V3.AboutDialog.license.yourUse")}</strong>,
          termsOfUse: <ExternalLink href={kTermsOfUseUrl}>{t("V3.AboutDialog.license.termsOfUse")}</ExternalLink>,
          licensingPage:
            <ExternalLink href={kLicensingUrl}>{t("V3.AboutDialog.license.licensingPage")}</ExternalLink>,
          licensingEmail: <a href={`mailto:${kLicensingEmail}`}>{kLicensingEmail}</a>
        })}
      </p>
      <hr className="about-dialog-divider"/>
      <div className="about-dialog-links">
        <ExternalLink href={kTermsOfUseUrl} showArrow={true}>{t("V3.AboutDialog.links.termsOfUse")}</ExternalLink>
        <ExternalLink href={kLicensingDetailsUrl} showArrow={true}>
          {t("V3.AboutDialog.links.licensingDetails")}
        </ExternalLink>
        <ExternalLink href={kSourceCodeUrl} showArrow={true}>{t("V3.AboutDialog.links.sourceCode")}</ExternalLink>
      </div>
      <Button ref={acknowledgementsButtonRef} variant="v3Clear" size="sm" width="100%" mt="3"
          justifyContent="space-between" onClick={onShowLibraries} data-testid="about-dialog-acknowledgements">
        {t("V3.AboutDialog.acknowledgementsButton")}
        <span aria-hidden="true">›</span>
      </Button>
    </>
  )
}

function LibrariesView() {
  return (
    <>
      <p>{t("V3.AboutDialog.libraries.intro")}</p>
      {/* The searchable library list will go here (follow-up task). */}
      <p className="about-dialog-libraries-footer">
        {translateToElements("V3.AboutDialog.libraries.footer", {
          noticesLink:
            <ExternalLink href={kThirdPartyNoticesUrl} showArrow={true}>
              {t("V3.AboutDialog.libraries.noticesLink")}
            </ExternalLink>
        })}
      </p>
    </>
  )
}
```

Notes for the implementer:
- Don't pass `onClick={onClose}` to `ModalCloseButton`. It already calls the modal's `onClose`, so adding
  it would call `onClose` twice.
- The inner `ModalHeader` still has Chakra's theme header styles (padding, box shadow, `flex: 0`). The `p`,
  `boxShadow`, and `flex` props override those so the `codap-header-title-v3` styles take effect.

**Step 5: Run tests to verify they pass**

Run: `npm test -- about-dialog`
Expected: PASS (all tests)

If the dialog's accessible name includes extra text (e.g. "About CODAPClose"), the × or Back button has
ended up inside `ModalHeader`. Check the header structure.

**Step 6: Commit** (after user approves the message)

```bash
git add v3/src/components/about-dialog/ v3/src/assets/codap-about-screen.png
git commit -m "CODAP-1595: add About CODAP dialog component"
```

---

### Task 8: Render `AboutDialog` in `App`

**Files:**
- Modify: `v3/src/components/app.tsx` (imports ~line 44; render near `<UserEntryModal>` ~line 270-280)

**Step 1: Implement**

Add the import, alphabetically before `AnnouncementBanner`:

```tsx
import { AboutDialog } from "./about-dialog/about-dialog"
```

After the `<If condition={showUserEntry}>…</If>` block and before `<Progress />`:

```tsx
            <AboutDialog isOpen={uiState.showAboutDialog} onClose={() => uiState.setShowAboutDialog(false)}/>
```

`App` is already an `observer`, so it re-renders when the flag changes.

**Step 2: Verify**

Run: `npm run build:tsc`
Expected: no errors

Run: `npm test -- src/components/app`
Expected: PASS (existing App tests unaffected)

**Step 3: Commit** (after user approves the message)

```bash
git add v3/src/components/app.tsx
git commit -m "CODAP-1595: render About dialog from uiState"
```

---

### Task 9: Help menu item and icon

**Files:**
- Create: `v3/src/assets/cfm/about-icon.nosvgr.svg` (copy of `v3/src/assets/icons/inspector-panel/info-icon.svg`)
- Modify: `v3/src/lib/cfm/use-cloud-file-manager.ts` (imports ~line 19-46; `getMenuBar` ~line 215-249)
- Test: `v3/src/lib/cfm/use-cloud-file-manager.test.tsx`

**Step 1: Copy the icon**

Run: `cp src/assets/icons/inspector-panel/info-icon.svg src/assets/cfm/about-icon.nosvgr.svg`

**Step 2: Write the failing test**

In `use-cloud-file-manager.test.tsx`, update the import and add a new `describe` at the end of the file:

```tsx
import { uiState } from "../../models/ui-state"
import { getMenuBar, useCloudFileManager } from "./use-cloud-file-manager"
```

```tsx
describe("getMenuBar", () => {
  afterEach(() => {
    uiState.setShowAboutDialog(false)
  })

  it("ends the Help menu with a separator and an About CODAP item that opens the About dialog", () => {
    const menuBar = getMenuBar({} as CloudFileManager)
    const helpMenu = menuBar.otherMenus.find(menu => menu.className === "help-menu")!
    const separator = helpMenu.menu.at(-2)
    const aboutItem = helpMenu.menu.at(-1) as { name: string, action: () => void }
    expect(separator).toEqual({ separator: true })
    expect(aboutItem.name).toBe("About CODAP...")
    aboutItem.action()
    expect(uiState.showAboutDialog).toBe(true)
  })
})
```

**Step 3: Run test to verify it fails**

Run: `npm test -- use-cloud-file-manager`
Expected: FAIL (`getMenuBar` is not exported)

**Step 4: Implement**

Add the icon import with the other CFM icons (alphabetical, before `CODAPLogo`):

```ts
import AboutIcon from "../../assets/cfm/about-icon.nosvgr.svg"
```

Add the `uiState` import with the other model imports:

```ts
import { uiState } from "../../models/ui-state"
```

Export `getMenuBar` (it's exported for testing):

```ts
export function getMenuBar(cfm: CloudFileManager) {
```

After the Privacy Page item in the Help menu:

```ts
          {
            icon: PrivacyPolicyIcon,
            name: t("DG.AppController.optionMenuItems.toPrivacyPage"),
            action: () => window.open(privacyPolicyURL, "_blank")
          },
          { separator: true },
          {
            icon: AboutIcon,
            name: t("DG.AppController.optionMenuItems.about"),
            action: () => uiState.setShowAboutDialog(true)
          }
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- use-cloud-file-manager`
Expected: PASS (existing tests plus the new one)

**Step 6: Commit** (after user approves the message)

```bash
git add v3/src/assets/cfm/about-icon.nosvgr.svg v3/src/lib/cfm/use-cloud-file-manager.ts \
  v3/src/lib/cfm/use-cloud-file-manager.test.tsx
git commit -m "CODAP-1595: add About CODAP item to the Help menu"
```

---

### Task 10: Cypress test

**Files:**
- Create: `v3/cypress/e2e/about-dialog.spec.ts`

**Step 1: Write the test**

```ts
import { CfmElements as cfm } from "../support/elements/cfm"

context("About CODAP dialog", () => {
  beforeEach(() => {
    cy.visit("?suppressUnsavedWarning#file=examples:Four%20Seals")
  })

  it("opens from the Help menu, switches views, and closes with Escape", () => {
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenu().find(".separator").should("exist")
    cfm.getHelpMenu().contains(".menuItem", "About CODAP").click()

    cy.get("[role=dialog]").should("be.visible")
      .and("contain.text", "Common Online Data Analysis Platform")
      .and("contain.text", "License & Terms of Use")

    cy.get("[data-testid=about-dialog-acknowledgements]").click()
    cy.get("[role=dialog]").should("contain.text", "CODAP is built with these open-source projects")

    cy.get("[data-testid=about-dialog-footer-back]").click()
    cy.get("[role=dialog]").should("contain.text", "License & Terms of Use")

    cy.realPress("Escape")
    cy.get("[role=dialog]").should("not.exist")
    cfm.getHelpMenuButton().should("have.focus")
  })
})
```

**Step 2: Run it**

Start the dev server in one terminal: `npm start`
Run: `npm run test:cypress -- --spec cypress/e2e/about-dialog.spec.ts`
Expected: PASS

Also run the existing Help menu tests, which index menu items by position:
`npm run test:cypress -- --spec cypress/e2e/tool-shelf.spec.ts`
Expected: PASS (the new items come after index 3)

**Step 3: Commit** (after user approves the message)

```bash
git add v3/cypress/e2e/about-dialog.spec.ts
git commit -m "CODAP-1595: add Cypress test for the About dialog"
```

---

### Task 11: Full verification and manual check

**Step 1: Automated checks**

Run: `npm run lint`
Expected: no errors

Run: `npm run build:tsc`
Expected: no errors

Run: `npm test`
Expected: all tests pass

**Step 2: Manual check in the browser** (`npm start`, open CODAP)

- [ ] Help menu: separator above "About CODAP…", with the info icon matching the other menu icons
- [ ] Dialog is centered, can't be dragged, and has no fixed 400px height
- [ ] Header looks like the Insert Link dialog's (Text tile → link button) and the × lines up
- [ ] Logo is sharp at ~240px wide
- [ ] Links are visibly links (color and underline) and open in new tabs; the email link opens a mail client
- [ ] Acknowledgements button → libraries view; header Back and footer Back both return
- [ ] Keyboard only: Tab stays inside the dialog; Esc closes; focus returns to the Help menu button
- [ ] Open another `CodapModal` (e.g. table → Info) to confirm it's still draggable at its usual position
- [ ] The announcement banner's message links still work (if a banner is configured)
- [ ] Screen reader (VoiceOver: Cmd+F5): dialog announced as "About CODAP"; links say "opens in a new tab"

Report any visual issues to the user before changing styles. Per the design, the dialog uses
`codap-modal-v3` styling with no customization.

**Step 3: Wrap up**

Use superpowers:finishing-a-development-branch, then follow CLAUDE.md's PR process (draft PR, `v3` label,
Jira link).

---

## Known limitations (not part of this story)

- The Help menu isn't rebuilt when the language changes (only the File menu is, in `onLangChanged`), so
  the About item's label, like the other Help items, stays in the original language until reload.
- The THIRD-PARTY-NOTICES link 404s until the follow-up library-list task adds the file.
