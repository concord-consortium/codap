# Plugin Locale-Switching Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Notify and/or reload plugins when the user switches locale in CODAP V3, matching V2's backward-compatible behavior.

**Architecture:** Add `?lang=` URL parameter to all plugin iframes, include locale in the `interactiveFrame` API response, broadcast a `localeChanged` notification on locale switch, and reload localized plugins by default (with an opt-out mechanism via `handlesLocaleChange`).

**Tech Stack:** React 18, MobX, MobX-State-Tree, TypeScript, iframe-phone, Jest

---

### Task 1: Add `appendLangParam` utility to web-view-utils.ts

**Files:**
- Modify: `v3/src/components/web-view/web-view-utils.ts:69` (after `processWebViewUrl`)
- Test: `v3/src/components/web-view/web-view-utils.test.ts`

**Step 1: Write the failing tests**

Add to the end of `v3/src/components/web-view/web-view-utils.test.ts`:

```typescript
describe("appendLangParam", () => {
  it("appends ?lang= to URLs with no query params", () => {
    expect(appendLangParam("https://example.com/plugin/index.html", "es"))
      .toBe("https://example.com/plugin/index.html?lang=es")
  })
  it("appends &lang= to URLs with existing query params", () => {
    expect(appendLangParam("https://example.com/plugin/index.html?foo=bar", "ja"))
      .toBe("https://example.com/plugin/index.html?foo=bar&lang=ja")
  })
  it("replaces existing lang param", () => {
    expect(appendLangParam("https://example.com/plugin/index.html?lang=en-US", "es"))
      .toBe("https://example.com/plugin/index.html?lang=es")
  })
  it("replaces existing lang param among other params", () => {
    expect(appendLangParam("https://example.com/plugin/index.html?foo=bar&lang=en-US&baz=qux", "ja"))
      .toBe("https://example.com/plugin/index.html?foo=bar&lang=ja&baz=qux")
  })
  it("returns the URL unchanged for data: URLs", () => {
    expect(appendLangParam("data:image/png;base64,abc", "es"))
      .toBe("data:image/png;base64,abc")
  })
  it("returns empty string unchanged", () => {
    expect(appendLangParam("", "es")).toBe("")
  })
})
```

Also add `appendLangParam` to the import at the top of the test file:

```typescript
import {
  appendLangParam, getNameFromURL, kRelativeGuideRoot, kRelativePluginRoot, kRelativeURLRoot,
  normalizeUrlScheme, processWebViewUrl
} from "./web-view-utils"
```

**Step 2: Run tests to verify they fail**

Run: `cd v3 && npx jest --testPathPattern="web-view-utils.test" --no-coverage`
Expected: FAIL — `appendLangParam` is not exported

**Step 3: Write the implementation**

Add to `v3/src/components/web-view/web-view-utils.ts` after the `processWebViewUrl` function (after line 69):

```typescript
/**
 * Append or replace the `lang` query parameter on a plugin URL.
 * Skips data: URLs and empty strings.
 */
export function appendLangParam(url: string, lang: string): string {
  if (!url || url.startsWith("data:")) return url
  try {
    const parsed = new URL(url)
    parsed.searchParams.set("lang", lang)
    return parsed.toString()
  } catch {
    // For relative or malformed URLs, fall back to simple string manipulation
    const langParam = `lang=${lang}`
    // Replace existing lang param if present
    const replaced = url.replace(/([?&])lang=[^&]*/, `$1${langParam}`)
    if (replaced !== url) return replaced
    // Otherwise append
    return url + (url.includes("?") ? "&" : "?") + langParam
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd v3 && npx jest --testPathPattern="web-view-utils.test" --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add v3/src/components/web-view/web-view-utils.ts v3/src/components/web-view/web-view-utils.test.ts
git commit -m "feat(CODAP-1092): add appendLangParam utility for plugin locale URLs"
```

---

### Task 2: Append `?lang=` to plugin iframe src in web-view.tsx

**Files:**
- Modify: `v3/src/components/web-view/web-view.tsx:172` (the iframe src)

**Step 1: Update the iframe src to include the lang parameter**

In `v3/src/components/web-view/web-view.tsx`, add the import for `appendLangParam` and `gLocale`:

```typescript
import { gLocale } from "../../utilities/translation/locale"
import { appendLangParam } from "./web-view-utils"
```

Inside the `WebViewComponent` function (after line 148 `if (!isWebViewModel(webViewModel)) return null`), compute the URL with the lang param:

```typescript
  const urlWithLang = webViewModel.isImage ? webViewModel.url : appendLangParam(webViewModel.url, gLocale.current)
```

Then change the iframe `src` on line 172 from:

```typescript
: <iframe className="codap-web-view-iframe" ref={iframeRef} src={webViewModel.url} />
```

to:

```typescript
: <iframe className="codap-web-view-iframe" ref={iframeRef} src={urlWithLang} />
```

**Step 2: Run lint to verify no issues**

Run: `cd v3 && npx eslint src/components/web-view/web-view.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add v3/src/components/web-view/web-view.tsx
git commit -m "feat(CODAP-1092): append ?lang= parameter to plugin iframe URLs"
```

---

### Task 3: Add `lang` to DIInteractiveFrame type and interactiveFrame.get response

**Files:**
- Modify: `v3/src/data-interactive/data-interactive-types.ts:62-84` (DIInteractiveFrame interface)
- Modify: `v3/src/data-interactive/handlers/interactive-frame-handler.ts:10-40` (get handler)
- Test: `v3/src/data-interactive/handlers/interactive-frame-handler.test.ts`

**Step 1: Write the failing test**

In `v3/src/data-interactive/handlers/interactive-frame-handler.test.ts`, add to the existing "get works" test (after line 38, before the closing `})`):

```typescript
    expect((result.values as DIInteractiveFrame).lang).toBeTruthy()
```

**Step 2: Run test to verify it fails**

Run: `cd v3 && npx jest --testPathPattern="interactive-frame-handler.test" --no-coverage`
Expected: FAIL — `lang` is undefined

**Step 3: Add `lang` to the type and handler**

In `v3/src/data-interactive/data-interactive-types.ts`, add inside the `DIInteractiveFrame` interface (after line 83, before the closing `}`):

```typescript
  lang?: string
  handlesLocaleChange?: boolean
```

In `v3/src/data-interactive/handlers/interactive-frame-handler.ts`, add the import:

```typescript
import { gLocale } from "../../utilities/translation/locale"
```

Then add `lang` to the values object in the `get` handler (after line 38 `version,`):

```typescript
      lang: gLocale.current,
```

**Step 4: Run test to verify it passes**

Run: `cd v3 && npx jest --testPathPattern="interactive-frame-handler.test" --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add v3/src/data-interactive/data-interactive-types.ts v3/src/data-interactive/handlers/interactive-frame-handler.ts v3/src/data-interactive/handlers/interactive-frame-handler.test.ts
git commit -m "feat(CODAP-1092): include lang in interactiveFrame.get response"
```

---

### Task 4: Add `handlesLocaleChange` to WebViewModel and interactiveFrame.update

**Files:**
- Modify: `v3/src/components/web-view/web-view-model.ts:63-68` (volatile), `100+` (actions)
- Modify: `v3/src/data-interactive/handlers/interactive-frame-handler.ts:65-107` (update handler)
- Test: `v3/src/data-interactive/handlers/interactive-frame-handler.test.ts`
- Test: `v3/src/components/web-view/web-view-model.test.ts`

**Step 1: Write failing tests**

In `v3/src/data-interactive/handlers/interactive-frame-handler.test.ts`, add a new test after the existing "update" tests (after line 114):

```typescript
  it("update handles handlesLocaleChange", () => {
    const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const webViewContent = tile.content as IWebViewModel
    expect(webViewContent.handlesLocaleChange).toBe(false)

    const result = handler.update?.({ interactiveFrame: tile }, { handlesLocaleChange: true })
    expect(result?.success).toBe(true)
    expect(webViewContent.handlesLocaleChange).toBe(true)
  })
```

In `v3/src/components/web-view/web-view-model.test.ts`, add a new test:

```typescript
  it("supports handlesLocaleChange volatile property", () => {
    const webView = WebViewModel.create({})
    expect(webView.handlesLocaleChange).toBe(false)
    webView.setHandlesLocaleChange(true)
    expect(webView.handlesLocaleChange).toBe(true)
  })
```

**Step 2: Run tests to verify they fail**

Run: `cd v3 && npx jest --testPathPattern="(interactive-frame-handler|web-view-model).test" --no-coverage`
Expected: FAIL — `handlesLocaleChange` not found on WebViewModel

**Step 3: Implement**

In `v3/src/components/web-view/web-view-model.ts`, add `handlesLocaleChange` to the volatile section (line 63-68):

```typescript
  .volatile(self => ({
    dataInteractiveController: undefined as iframePhone.IframePhoneRpcEndpoint | undefined,
    version: kDefaultWebViewVersion,
    autoOpenUrlDialog: false,
    isPluginCandidate: false,
    isPluginCommunicating: false,
    handlesLocaleChange: false
  }))
```

Add the setter action in the first `.actions()` block (after `setVersion` on line 153-155):

```typescript
    setHandlesLocaleChange(value: boolean) {
      self.handlesLocaleChange = value
    },
```

In `v3/src/data-interactive/handlers/interactive-frame-handler.ts`, update the `update` handler.

Add `handlesLocaleChange` to the destructuring on line 72-75:

```typescript
    const {
      allowEmptyAttributeDeletion, blockAPIRequestsWhileEditing, cannotClose, dimensions, handlesLocaleChange, name,
      preventAttributeDeletion, preventBringToFront, preventDataContextReorg, preventTopLevelReorg,
      respectEditableItemAttribute, subscribeToDocuments, title, version
    } = values as DIInteractiveFrame
```

Add handling inside `applyModelChange` (after the `version` handling, before the closing `})`):

```typescript
      if (handlesLocaleChange != null) webViewContent?.setHandlesLocaleChange(handlesLocaleChange)
```

**Step 4: Run tests to verify they pass**

Run: `cd v3 && npx jest --testPathPattern="(interactive-frame-handler|web-view-model).test" --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add v3/src/components/web-view/web-view-model.ts v3/src/data-interactive/handlers/interactive-frame-handler.ts v3/src/data-interactive/handlers/interactive-frame-handler.test.ts v3/src/components/web-view/web-view-model.test.ts
git commit -m "feat(CODAP-1092): add handlesLocaleChange opt-out for plugin reload"
```

---

### Task 5: Add localized plugin list and locale change reaction

**Files:**
- Modify: `v3/src/components/web-view/web-view-defs.ts` (add constants)
- Modify: `v3/src/components/web-view/web-view-model.ts` (add url setter for reload)
- Modify: `v3/src/components/web-view/use-data-interactive-controller.ts` (add MobX reaction)

**Step 1: Add localized plugin patterns to web-view-defs.ts**

In `v3/src/components/web-view/web-view-defs.ts`, add at the end of the file:

```typescript
// Plugins known to be localized that require iframe reload on locale change.
// Plugins can opt out by setting handlesLocaleChange: true via interactiveFrame.update.
export const kLocalizedPluginPatterns = [
  "/Importer/",
  "/TP-Sampler/",
  "/Scrambler/",
  "/storyBuilder/"
]
```

**Step 2: Add `needsLocaleReload` view to WebViewModel**

In `v3/src/components/web-view/web-view-model.ts`, import the patterns:

```typescript
import { kLocalizedPluginPatterns, kWebViewTileType, WebViewSubType, webViewSubTypes } from "./web-view-defs"
```

Add a new view to the `.views()` block (after the existing `isImage` view on line 97-98):

```typescript
    get needsLocaleReload() {
      if (self.handlesLocaleChange) return false
      return kLocalizedPluginPatterns.some(pattern => self.url.includes(pattern))
    },
```

**Step 3: Add locale change reaction to use-data-interactive-controller.ts**

In `v3/src/components/web-view/use-data-interactive-controller.ts`, add imports:

```typescript
import { reaction } from "mobx"
import { gLocale } from "../../utilities/translation/locale"
import { appendLangParam } from "./web-view-utils"
```

Inside the `useEffect` callback (after line 51, before the `// Set up request queue processor` comment), add:

```typescript
      // React to locale changes: reload localized plugins or notify others
      const localeDisposer = reaction(
        () => gLocale.current,
        (lang) => {
          if (webViewModel?.needsLocaleReload) {
            // Reload by updating the URL, which triggers the useEffect to re-run
            webViewModel.setUrl(appendLangParam(webViewModel.url, lang))
          } else {
            // Notify the plugin about the locale change
            webViewModel?.broadcastMessage(
              { action: "notify", resource: "global", values: { operation: "localeChanged", lang } },
              () => debugLog(DEBUG_PLUGINS, `Reply to localeChanged notification`)
            )
          }
        },
        { name: "DataInteractiveController locale change reaction" }
      )
```

Update the cleanup function (the `return` block starting at line 60) to also dispose the locale reaction:

```typescript
      return () => {
        localeDisposer()
        disposer()
        rpcEndpoint.disconnect()
        phone.disconnect()
      }
```

Note: `reaction` is already imported from `mobx` on line 2 of this file... wait, let me check. Actually, looking at the current file, `reaction` is NOT currently imported. The old version had it, but the current version uses `setupRequestQueueProcessor` instead. So we do need to add the `reaction` import.

**Step 4: Run lint**

Run: `cd v3 && npx eslint src/components/web-view/use-data-interactive-controller.ts src/components/web-view/web-view-model.ts src/components/web-view/web-view-defs.ts`
Expected: No errors

**Step 5: Commit**

```bash
git add v3/src/components/web-view/web-view-defs.ts v3/src/components/web-view/web-view-model.ts v3/src/components/web-view/use-data-interactive-controller.ts
git commit -m "feat(CODAP-1092): add locale change reaction to reload or notify plugins"
```

---

### Task 6: Run all tests and verify

**Step 1: Run the full test suite for affected files**

Run: `cd v3 && npx jest --testPathPattern="(web-view|interactive-frame-handler)" --no-coverage`
Expected: All tests PASS

**Step 2: Run lint on all modified files**

Run: `cd v3 && npx eslint src/components/web-view/web-view.tsx src/components/web-view/web-view-model.ts src/components/web-view/web-view-utils.ts src/components/web-view/web-view-defs.ts src/components/web-view/use-data-interactive-controller.ts src/data-interactive/data-interactive-types.ts src/data-interactive/handlers/interactive-frame-handler.ts`
Expected: No errors

**Step 3: Run TypeScript type check**

Run: `cd v3 && npm run build:tsc`
Expected: No type errors

**Step 4: Run full test suite**

Run: `cd v3 && npm test -- --no-coverage`
Expected: All tests PASS

**Step 5: Commit any fixes if needed, then verify clean state**

```bash
git status
```

---

### Task 7: Update design doc and create final commit

**Step 1: Remove standalone design doc**

The design doc `v3/doc/plugin-locale-switching-design.md` can be left as is — it documents the rationale.

**Step 2: Final commit summary**

Verify all commits are in order:

```bash
git log --oneline main..HEAD
```

Expected commits (oldest to newest):
1. `docs: add design for plugin locale-switching (CODAP-1092)`
2. `feat(CODAP-1092): add appendLangParam utility for plugin locale URLs`
3. `feat(CODAP-1092): append ?lang= parameter to plugin iframe URLs`
4. `feat(CODAP-1092): include lang in interactiveFrame.get response`
5. `feat(CODAP-1092): add handlesLocaleChange opt-out for plugin reload`
6. `feat(CODAP-1092): add locale change reaction to reload or notify plugins`
