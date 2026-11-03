# CODAP-1595: About Dialog Welcome View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Welcome view to the About dialog that opens automatically on load (on top of the entry modal),
with "Don't show this again", "About & licensing", and "Get started".

**Architecture:** `uiState.initialAboutDialogView` replaces `showAboutDialog`; the dialog is open whenever it's
set, and starts on that view. A one-time effect in `App` opens the welcome view when `shouldShowWelcome()` allows
it. "Don't show this again" is `persistentState.hideWelcome`. Cypress presets `hideWelcome` so existing specs
aren't covered by the welcome view.

**Tech Stack:** React 18, TypeScript, MobX, MobX-State-Tree, Chakra UI v2, Jest + React Testing Library, Cypress.

**Design doc:** `v3/docs/plans/2026-11-02-codap-1595-welcome-view-design.md`

---

## Conventions for every task

- Run npm/jest/lint commands from `v3/`. Run git commands from the repo root (`v3`'s parent).
- No semicolons; max line length 120.
- **Commits:** per CLAUDE.md, show the user the proposed commit message and get explicit approval before
  every commit. The messages below are proposals. End each with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **Cypress from Claude Code in VS Code:** run with `env -u ELECTRON_RUN_AS_NODE`, or Cypress won't start.
- **Dev server:** the user runs it (http://localhost:8080).

## Implementation notes (decided while planning)

1. **Resetting the view on open.** The dialog currently resets its view in an effect after opening. Chakra
   focuses `initialRef` when the modal opens, so on a reopen the welcome view's "Get started" button wouldn't
   exist yet. The view is reset during render instead (React's "adjust state when a prop changes" pattern), so
   the right view is rendered before Chakra moves focus.
2. **Focus after switching views** depends on where the user came from (libraries → About focuses the
   acknowledgements button; welcome → About focuses ×), so `showView()` takes the element to focus.
3. **Checkbox state** is local to the welcome view and written through to `persistentState` on change. The
   welcome view only opens automatically when `hideWelcome` is unset, so it always starts unchecked.
4. **One view type.** `AboutDialogView` (`"welcome" | "about" | "libraries"`) moves to
   `src/models/ui-state-types.ts`, so `uiState` doesn't import from a component. The dialog's current view and
   the view it opens on share this type, so the dialog could also be opened on the libraries view.
5. **Where focus returns is decided by the opener.** `openAboutDialog(view, returnFocusTo?)` stores a ref to
   the element to focus when the dialog closes. The Help menu passes its button; the startup effect passes
   nothing, so Chakra's default restores whatever had focus before (e.g. the entry modal). The dialog no longer
   knows about the Help menu. The ref isn't observable (MobX shouldn't wrap a DOM element) and is cleared on
   close so `uiState` doesn't hold on to a stale element.

---

### Task 1: `uiState.initialAboutDialogView`

Replaces `showAboutDialog` and updates its three callers in the same commit, so the build stays green.

**Files:**
- Modify: `v3/src/models/ui-state-types.ts`
- Modify: `v3/src/models/ui-state.ts` (`_showAboutDialog` ~line 39; getter/action ~line 245)
- Modify: `v3/src/models/ui-state.test.ts` (`describe("showAboutDialog")` ~line 478)
- Modify: `v3/src/lib/cfm/use-cloud-file-manager.ts:256`
- Modify: `v3/src/lib/cfm/use-cloud-file-manager.test.tsx:116,127`
- Modify: `v3/src/components/app.tsx:282`

**Step 1: Update the tests**

In `ui-state.test.ts`, replace the `describe("showAboutDialog", ...)` block with:

```ts
  describe("About dialog", () => {
    it("should be closed by default and follow open and close", () => {
      const uiState = new UIState()
      expect(uiState.initialAboutDialogView).toBeUndefined()
      uiState.openAboutDialog("welcome")
      expect(uiState.initialAboutDialogView).toBe("welcome")
      uiState.openAboutDialog("about")
      expect(uiState.initialAboutDialogView).toBe("about")
      uiState.closeAboutDialog()
      expect(uiState.initialAboutDialogView).toBeUndefined()
    })

    it("should remember where to return focus until the dialog closes", () => {
      const uiState = new UIState()
      const opener = document.createElement("button")
      uiState.openAboutDialog("about", opener)
      expect(uiState.aboutDialogReturnFocusRef?.current).toBe(opener)
      uiState.closeAboutDialog()
      expect(uiState.aboutDialogReturnFocusRef).toBeUndefined()
      uiState.openAboutDialog("welcome")
      expect(uiState.aboutDialogReturnFocusRef).toBeUndefined()
    })
  })
```

In `use-cloud-file-manager.test.tsx`, replace the `describe("getMenuBar", ...)` block with:

```tsx
describe("getMenuBar", () => {
  afterEach(() => {
    uiState.closeAboutDialog()
    document.body.innerHTML = ""
  })

  it("ends the Help menu with a separator and an About CODAP item that opens the About dialog", () => {
    // the Help menu button that focus should return to when the dialog closes
    document.body.innerHTML = `<div class="help-menu"><button class="menu-anchor">Help</button></div>`
    const menuBar = getMenuBar({} as CloudFileManager)
    const helpMenu = menuBar.otherMenus.find(menu => menu.className === "help-menu")!
    const separator = helpMenu.menu.at(-2)
    const aboutItem = helpMenu.menu.at(-1) as { name: string, action: () => void }
    expect(separator).toEqual({ separator: true })
    expect(aboutItem.name).toBe("About CODAP...")
    aboutItem.action()
    expect(uiState.initialAboutDialogView).toBe("about")
    expect(uiState.aboutDialogReturnFocusRef?.current).toBe(screen.getByRole("button", { name: "Help" }))
  })
})
```

(`screen` is already imported in that file. If lint flags `document.body.innerHTML` under
`testing-library/no-node-access`, render the markup with `render(<div className="help-menu">…</div>)` instead.)

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/models/ui-state.test.ts use-cloud-file-manager`
Expected: FAIL (`openAboutDialog` / `closeAboutDialog` don't exist)

**Step 3: Implement**

In `ui-state-types.ts`, add:

```ts
export type AboutDialogView = "welcome" | "about" | "libraries"
```

In `ui-state.ts`, add `AboutDialogView` to the `./ui-state-types` import, add `import { RefObject } from "react"`,
then replace

```ts
  @observable
  private _showAboutDialog = false
```

with

```ts
  // the About dialog is open whenever this is set; it's the view the dialog opened on
  @observable
  private _initialAboutDialogView: Maybe<AboutDialogView>
  // Where focus goes when the About dialog closes. When undefined, Chakra decides what should have focus.
  // Not observable, since MobX shouldn't wrap a DOM element.
  private _aboutDialogReturnFocusRef: Maybe<RefObject<HTMLElement>>
```

and replace the `showAboutDialog` getter and `setShowAboutDialog` action with:

```ts
  get initialAboutDialogView() {
    return this._initialAboutDialogView
  }

  get aboutDialogReturnFocusRef() {
    return this._aboutDialogReturnFocusRef
  }

  @action
  openAboutDialog(view: AboutDialogView, returnFocusTo?: HTMLElement | null) {
    this._initialAboutDialogView = view
    this._aboutDialogReturnFocusRef = returnFocusTo ? { current: returnFocusTo } : undefined
  }

  @action
  closeAboutDialog() {
    this._initialAboutDialogView = undefined
    this._aboutDialogReturnFocusRef = undefined
  }
```

In `use-cloud-file-manager.ts`, the About item's action:

```ts
            // the menu item is gone once the menu closes, so return focus to the Help menu button
            action: () => uiState.openAboutDialog("about", document.querySelector<HTMLElement>(".help-menu .menu-anchor"))
```

(Wrap the line if it exceeds 120 characters.)

In `app.tsx`, temporarily keep the dialog on the About view (Task 6 adds `initialView`):

```tsx
            <AboutDialog isOpen={!!uiState.initialAboutDialogView} onClose={() => uiState.closeAboutDialog()}/>
```

**Step 4: Verify**

Run: `npm test -- src/models/ui-state.test.ts use-cloud-file-manager`
Expected: PASS

Run: `npm run build:tsc`
Expected: no errors (and `grep -rn "showAboutDialog" src` finds nothing)

**Step 5: Commit** (after user approves the message)

```bash
git add v3/src/models/ui-state-types.ts v3/src/models/ui-state.ts v3/src/models/ui-state.test.ts \
  v3/src/lib/cfm/use-cloud-file-manager.ts v3/src/lib/cfm/use-cloud-file-manager.test.tsx v3/src/components/app.tsx
git commit -m "CODAP-1595: track which view the About dialog opens on in uiState"
```

---

### Task 2: `persistentState.hideWelcome`

**Files:**
- Modify: `v3/src/models/persistent-state.ts`
- Test: `v3/src/models/persistent-state.test.ts`

**Step 1: Write the failing test**

Add to `describe("PersistentState", ...)`:

```ts
  it("can toggle hideWelcome and saves it", () => {
    applySnapshot(persistentState, { toolbarPosition: persistentState.toolbarPosition })
    expect(persistentState.hideWelcome).toBeUndefined()
    persistentState.setHideWelcome(true)
    expect(persistentState.hideWelcome).toBe(true)
    expect(JSON.parse(localStorage.getItem("persistentState")!).hideWelcome).toBe(true)
    persistentState.setHideWelcome(false)
    expect(persistentState.hideWelcome).toBe(false)
  })
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/models/persistent-state.test.ts`
Expected: FAIL (`setHideWelcome` is not a function)

**Step 3: Implement**

Add to the model's properties:

```ts
  disableGraphicsAcceleration: types.maybe(types.boolean),
  hideWelcome: types.maybe(types.boolean)
```

Add to the second `.actions` block:

```ts
  setHideWelcome(hide: boolean) {
    self.hideWelcome = hide
    self.save()
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/models/persistent-state.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit** (after user approves the message)

```bash
git add v3/src/models/persistent-state.ts v3/src/models/persistent-state.test.ts
git commit -m "CODAP-1595: add hideWelcome to persistent state"
```

---

### Task 3: `shouldShowWelcome()`

**Files:**
- Create: `v3/src/components/about-dialog/should-show-welcome.ts`
- Test: `v3/src/components/about-dialog/should-show-welcome.test.ts`

**Step 1: Write the failing tests**

```ts
import { persistentState } from "../../models/persistent-state"
import { UIState } from "../../models/ui-state"
import { setUrlParams } from "../../utilities/url-params"
import { shouldShowWelcome } from "./should-show-welcome"

function checkWithParams(params: string) {
  setUrlParams(params)
  return shouldShowWelcome(new UIState())
}

describe("shouldShowWelcome", () => {
  beforeEach(() => {
    setUrlParams("")
    persistentState.setHideWelcome(false)
  })

  afterAll(() => {
    setUrlParams("")
  })

  it("shows by default", () => {
    expect(checkWithParams("")).toBe(true)
  })

  it("doesn't show after \"Don't show this again\"", () => {
    persistentState.setHideWelcome(true)
    expect(checkWithParams("")).toBe(false)
  })

  it.each(["?componentMode=yes", "?embeddedMode=yes", "?standalone=true", "?interactiveApi", "?noEntryModal"])(
    "doesn't show with %s", params => {
      expect(checkWithParams(params)).toBe(false)
    })

  it.each(["?url=https://example.com/shared.codap", "?sample=mammals"])(
    "still shows when a document opens automatically (%s)", params => {
      expect(checkWithParams(params)).toBe(true)
    })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- should-show-welcome`
Expected: FAIL (cannot find module `./should-show-welcome`)

**Step 3: Implement**

```ts
import { persistentState } from "../../models/persistent-state"
import { UIState, uiState } from "../../models/ui-state"
import { booleanParam, hasInteractiveApiContext, urlParams } from "../../utilities/url-params"

// Whether the About dialog should open on its welcome view when CODAP loads. It still opens when a document
// opens automatically, but not in embedded contexts, when startup dialogs are suppressed, or when the user has
// asked not to see it again.
export function shouldShowWelcome(ui: UIState = uiState) {
  return !persistentState.hideWelcome && !ui.minimalChrome && !ui.standaloneMode &&
    !hasInteractiveApiContext() && !booleanParam(urlParams.noEntryModal)
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- should-show-welcome`
Expected: PASS (9 tests)

**Step 5: Commit** (after user approves the message)

```bash
git add v3/src/components/about-dialog/should-show-welcome.ts \
  v3/src/components/about-dialog/should-show-welcome.test.ts
git commit -m "CODAP-1595: add shouldShowWelcome"
```

---

### Task 4: Strings

**Files:**
- Modify: `v3/src/utilities/translation/lang/en-US.json5` (end of file)

**Step 1: Add strings**

After `"V3.AboutDialog.libraries.loadError": "The library list couldn't be loaded."` (add a comma to that
line):

```json5
    "V3.AboutDialog.welcome.title": "Welcome to CODAP",
    "V3.AboutDialog.welcome.intro": "Explore, analyze, and visualize data right in your browser. New here? Take the quick tour, or dive into a sample document.",
    "V3.AboutDialog.welcome.dontShowAgain": "Don’t show this again",
    "V3.AboutDialog.welcome.aboutButton": "About & licensing",
    "V3.AboutDialog.welcome.getStarted": "Get started"
```

**Step 2: Verify**

Run: `npm test -- translate`
Expected: PASS

**Step 3: Commit** (after user approves the message)

```bash
git add v3/src/utilities/translation/lang/en-US.json5
git commit -m "CODAP-1595: add About dialog welcome view strings"
```

---

### Task 5: Welcome view in `AboutDialog`

**Files:**
- Modify: `v3/src/components/about-dialog/about-dialog.tsx`
- Modify: `v3/src/components/about-dialog/about-dialog.test.tsx`

**Step 1: Update existing tests and write the failing tests**

In `about-dialog.test.tsx`:

- Add imports:

  ```tsx
  import { persistentState } from "../../models/persistent-state"
  import { AboutDialogView } from "../../models/ui-state-types"
  ```

- Give `setup()` an `initialView` parameter, defaulting to `"about"` so existing tests are unchanged:

  ```tsx
  async function setup(initialView: AboutDialogView = "about") {
    const user = userEvent.setup()
    const onClose = jest.fn()
    const view = render(<AboutDialog isOpen={true} initialView={initialView} onClose={onClose}/>)
    await flushFetch()
    return { user, onClose, ...view }
  }
  ```

- Add `initialView="about"` to both `rerender` calls in "reopens to the About view".

- The dialog no longer finds the Help menu button itself; the opener passes `returnFocusRef`. Replace the
  "returns focus to the Help menu button" test with these two:

  ```tsx
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
  ```

  Add `useRef` to the `react` import.

- Add a new `describe` inside `describe("AboutDialog", ...)`:

  ```tsx
  describe("welcome view", () => {
    beforeEach(() => {
      persistentState.setHideWelcome(false)
    })

    it("is named by its title and shows the logo and intro", async () => {
      await setup("welcome")
      expect(screen.getByRole("dialog", { name: "Welcome to CODAP" })).toBeInTheDocument()
      expect(screen.getByRole("img", { name: "CODAP, a product of The Concord Consortium" })).toBeInTheDocument()
      expect(screen.getByText(/Explore, analyze, and visualize data right in your browser/)).toBeInTheDocument()
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
  ```

**Step 2: Run tests to verify they fail**

Run: `npm test -- about-dialog.test`
Expected: FAIL (TypeScript: `initialView` isn't a prop)

**Step 3: Implement**

In `about-dialog.tsx`:

Imports: add `Checkbox` to the Chakra import, `RefObject` to the React import, and:

```tsx
import { persistentState } from "../../models/persistent-state"
import { AboutDialogView } from "../../models/ui-state-types"
```

Delete the file's local `type AboutDialogView = "about" | "libraries"` (it now comes from `ui-state-types`), and
update the props:

```tsx
interface IProps {
  isOpen: boolean
  initialView: AboutDialogView
  returnFocusRef?: RefObject<HTMLElement>
  onClose: () => void
}
```

Replace the top of `AboutDialog`, through `showView`, with:

```tsx
export function AboutDialog({ isOpen, initialView, returnFocusRef, onClose }: IProps) {
  const [view, setView] = useState<AboutDialogView>(initialView)

  // Reset the view during render when the dialog opens, rather than in an effect, so the initial view is
  // rendered before Chakra moves focus into the dialog.
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) setView(initialView)
  }

  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const headerBackButtonRef = useRef<HTMLButtonElement>(null)
  const acknowledgementsButtonRef = useRef<HTMLButtonElement>(null)
  const getStartedButtonRef = useRef<HTMLButtonElement>(null)
  const pendingFocusRef = useRef<RefObject<HTMLElement>>()
  const librariesState = useOssLibraries(isOpen)

  // Move focus to the element `showView()` asked for once the new view has rendered.
  useEffect(() => {
    pendingFocusRef.current?.current?.focus()
    pendingFocusRef.current = undefined
  }, [view])

  function showView(newView: AboutDialogView, focusTarget: RefObject<HTMLElement>) {
    pendingFocusRef.current = focusTarget
    setView(newView)
  }

  const titles: Record<AboutDialogView, string> = {
    welcome: t("V3.AboutDialog.welcome.title"),
    about: t("DG.AppController.showAboutTitle"),
    libraries: t("V3.AboutDialog.libraries.title")
  }
```

Update the existing `showView` calls:
- header and footer Back buttons: `showView("about", acknowledgementsButtonRef)`
- `AboutView`'s `onShowLibraries`: `showView("libraries", headerBackButtonRef)`

`CodapModal` props: replace `finalFocusRef={helpMenuButtonRef}` with

```tsx
      initialRef={initialView === "welcome" ? getStartedButtonRef : undefined}
      finalFocusRef={returnFocusRef}
```

Header: `{title}` → `{titles[view]}`, and give the close button the ref:

```tsx
        <ModalCloseButton ref={closeButtonRef} data-testid="modal-close-button"/>
```

Body: render the welcome view:

```tsx
        <div className="about-dialog-body">
          {view === "welcome" && <WelcomeView/>}
          {view === "about" &&
            <AboutView
              acknowledgementsButtonRef={acknowledgementsButtonRef}
              librariesState={librariesState}
              onShowLibraries={() => showView("libraries", headerBackButtonRef)}
            />
          }
          {view === "libraries" && <LibrariesView librariesState={librariesState}/>}
        </div>
```

Footer: welcome view has its own footer contents:

```tsx
      <ModalFooter>
        {view === "welcome"
          ? <WelcomeFooter
              getStartedButtonRef={getStartedButtonRef}
              onShowAbout={() => showView("about", closeButtonRef)}
              onClose={onClose}
            />
          : <>
              {view === "libraries" &&
                <Button size="xs" variant="v3Clear" ml="3" onClick={() => showView("about", acknowledgementsButtonRef)}
                    data-testid="about-dialog-footer-back">
                  {backButtonContent}
                </Button>
              }
              <Button size="xs" variant="v3Default" ml="3" onClick={onClose} data-testid="about-dialog-close-button">
                {t("V3.general.close")}
              </Button>
            </>
        }
      </ModalFooter>
```

Shared logo, above `AboutView`:

```tsx
function CodapLogo() {
  return <img className="about-dialog-logo" src={AboutScreenLogo} alt={t("V3.AboutDialog.logoAlt")}/>
}
```

In `AboutView`, replace the `<img .../>` with `<CodapLogo/>`.

Welcome view components, after `AboutView`:

```tsx
function WelcomeView() {
  return (
    <div className="about-dialog-identity">
      <CodapLogo/>
      <p className="about-dialog-text">{t("V3.AboutDialog.welcome.intro")}</p>
    </div>
  )
}

interface IWelcomeFooterProps {
  getStartedButtonRef: RefObject<HTMLButtonElement>
  onShowAbout: () => void
  onClose: () => void
}

function WelcomeFooter({ getStartedButtonRef, onShowAbout, onClose }: IWelcomeFooterProps) {
  // The welcome view only opens automatically when hideWelcome is unset, so it always starts unchecked.
  const [hideWelcome, setHideWelcome] = useState(false)

  function handleHideWelcomeChange(hide: boolean) {
    setHideWelcome(hide)
    persistentState.setHideWelcome(hide)
  }

  return (
    <>
      <Checkbox size="sm" mr="auto" isChecked={hideWelcome} onChange={e => handleHideWelcomeChange(e.target.checked)}
          data-testid="about-dialog-hide-welcome">
        {t("V3.AboutDialog.welcome.dontShowAgain")}
      </Checkbox>
      <Button size="xs" variant="v3Clear" ml="3" onClick={onShowAbout} data-testid="about-dialog-show-about">
        {t("V3.AboutDialog.welcome.aboutButton")}
      </Button>
      <Button ref={getStartedButtonRef} size="xs" variant="v3Default" ml="3" onClick={onClose}
          data-testid="about-dialog-get-started">
        {t("V3.AboutDialog.welcome.getStarted")}
      </Button>
    </>
  )
}
```

Keep lines within 120 characters; wrap JSX props as needed.

**Step 4: Run tests to verify they pass**

Run: `npm test -- about-dialog`
Expected: PASS (all dialog, hook, and `should-show-welcome` tests), with no `act()` warnings.

Run: `npm run build:tsc && npx eslint src/components/about-dialog/`
Expected: `build:tsc` fails only in `app.tsx` (missing `initialView`); Task 6 fixes that. Lint is clean.

**Step 5: Commit**

Don't commit yet: `app.tsx` doesn't build until Task 6. Commit Tasks 5 and 6 together (see Task 6).

---

### Task 6: Open the welcome view at startup

**Files:**
- Modify: `v3/src/components/app.tsx`

**Step 1: Implement**

Import:

```tsx
import { shouldShowWelcome } from "./about-dialog/should-show-welcome"
```

Next to the other startup `useEffect`s (e.g. before the data broker effect ~line 151):

```tsx
  // open the About dialog's welcome view when CODAP loads
  useEffect(() => {
    if (shouldShowWelcome()) uiState.openAboutDialog("welcome")
  }, [])
```

Replace the dialog element:

```tsx
            <AboutDialog
              isOpen={!!uiState.initialAboutDialogView}
              initialView={uiState.initialAboutDialogView ?? "about"}
              returnFocusRef={uiState.aboutDialogReturnFocusRef}
              onClose={() => uiState.closeAboutDialog()}
            />
```

**Step 2: Verify**

Run: `npm run build:tsc && npx eslint src/components/app.tsx src/components/about-dialog/`
Expected: no errors

Run: `npm test -- about-dialog src/components/app use-cloud-file-manager`
Expected: PASS

**Step 3: Check in the browser** (dev server, http://localhost:8080 with no URL parameters)

- The welcome view appears on top of the entry modal ("What would you like to do?").
- Focus is on Get started; Esc or Get started closes the welcome view and focus moves to the entry modal.
- The entry modal still works.

If the welcome view appears *under* the entry modal, STOP and report to the user (the design calls for
revisiting the stacking).

**Step 4: Commit Tasks 5 and 6** (after user approves the message)

```bash
git add v3/src/components/about-dialog/about-dialog.tsx v3/src/components/about-dialog/about-dialog.test.tsx \
  v3/src/components/app.tsx
git commit -m "CODAP-1595: add the About dialog welcome view and open it at startup"
```

---

### Task 7: Cypress

**Files:**
- Modify: `v3/cypress/support/e2e.ts`
- Modify: `v3/cypress/e2e/about-dialog.spec.ts`

**Step 1: Hide the welcome view in existing specs**

In `cypress/support/e2e.ts`, after the announcement-banner `beforeEach`:

```ts
// Hide the About dialog's welcome view, which opens on every load and would cover what tests interact with.
// Tests of the welcome view set Cypress.env("showWelcome", true) first.
Cypress.on("window:before:load", (win) => {
  if (Cypress.env("showWelcome")) return
  const kPersistentStateKey = "persistentState"
  const stored = JSON.parse(win.localStorage.getItem(kPersistentStateKey) || "{}")
  win.localStorage.setItem(kPersistentStateKey, JSON.stringify({ ...stored, hideWelcome: true }))
})
```

**Step 2: Add the welcome test**

At the end of `about-dialog.spec.ts`, a separate `context` (the existing one visits a document in `beforeEach`):

```ts
context("About CODAP dialog welcome view", () => {
  beforeEach(() => {
    Cypress.env("showWelcome", true)
  })

  afterEach(() => {
    Cypress.env("showWelcome", false)
  })

  it("opens on top of the entry modal and can be turned off", () => {
    cy.visit("?suppressUnsavedWarning")
    cy.get(".user-entry-modal-container").should("be.visible")
    cy.contains("[role=dialog]", "Welcome to CODAP").should("be.visible")
    cy.get("[data-testid=about-dialog-get-started]").should("have.focus")

    cy.get("[data-testid=about-dialog-hide-welcome]").click()
    cy.get("[data-testid=about-dialog-get-started]").click()
    cy.contains("[role=dialog]", "Welcome to CODAP").should("not.exist")

    // the entry modal underneath still works
    cy.contains(".user-entry-modal-container button", "Create New Document").click()
    cy.get(".user-entry-modal-container").should("not.exist")

    cy.reload()
    cy.get(".user-entry-modal-container").should("be.visible")
    cy.contains("[role=dialog]", "Welcome to CODAP").should("not.exist")
  })
})
```

**Step 3: Run the About dialog spec**

Run: `env -u ELECTRON_RUN_AS_NODE npm run test:cypress -- --spec cypress/e2e/about-dialog.spec.ts`
Expected: PASS (3 tests)

**Step 4: Run the broader suite**

The preset affects every spec. Run the full suite (it takes a while; run it in the background):

Run: `env -u ELECTRON_RUN_AS_NODE npm run test:cypress`
Expected: no new failures. If something fails, check whether it also fails on the previous commit before
changing anything.

**Step 5: Commit** (after user approves the message)

```bash
git add v3/cypress/support/e2e.ts v3/cypress/e2e/about-dialog.spec.ts
git commit -m "CODAP-1595: add Cypress coverage for the welcome view"
```

---

### Task 8: Docs and full verification

**Files:**
- Modify: `v3/docs/plans/2026-10-30-codap-1595-about-dialog-design.md`

**Step 1: Update the About dialog design doc**

In the Goal section's list of views, add:

```markdown
3. **Welcome** — opens automatically when CODAP loads; see
   [the welcome view design](2026-11-02-codap-1595-welcome-view-design.md).
```

and change "The dialog has two views:" to "The dialog has three views:".

**Step 2: Automated checks**

- `npm run lint` — no errors
- `npm run build:tsc` — no errors
- `npm test` — all pass

**Step 3: Manual check in the browser**

- [ ] Plain load: the welcome view appears on top of the entry modal; layout matches the mockup (logo, intro,
      checkbox left, two buttons right)
- [ ] Get started, ×, and Esc close it; focus moves to the entry modal
- [ ] About & licensing shows the About view; × and Close close the dialog
- [ ] "Don't show this again" + reload: the welcome view doesn't appear; Help → About CODAP… still works
- [ ] Clear `persistentState` in localStorage + reload with `?noEntryModal`: no welcome view
- [ ] A shared or `#file=` document load: the welcome view appears over the document
- [ ] VoiceOver: announced as "Welcome to CODAP"; checkbox and buttons are named

**Step 4: Commit** (after user approves the message)

```bash
git add v3/docs/plans/2026-10-30-codap-1595-about-dialog-design.md
git commit -m "CODAP-1595: link the welcome view design from the About dialog design"
```
