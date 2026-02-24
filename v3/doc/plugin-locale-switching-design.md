# Plugin Locale-Switching Design (CODAP-1092)

Date: 2026-02-14

## Problem

CODAP V2 performed a full page reload on locale switch (because SproutCore built a separate app instance per locale). This reload naturally updated all plugin iframes with a new `?lang=` URL parameter. V3 uses a single-instance MobX-based locale model (`gLocale`) that switches languages without reloading the page, but currently has no mechanism to inform plugins when the locale changes.

## Goals

1. Plugins receive the current locale at load time via URL parameter (`?lang=<code>`), matching V2 behavior.
2. Plugins can query the current locale via the `interactiveFrame` API.
3. Plugins are notified when the locale changes.
4. Localized plugins that require reload (Importer, TP-Sampler, Scrambler, Story Builder) are reloaded on locale change by default.
5. Plugins can opt out of reload by signaling that they handle locale changes programmatically.

## Design

### 1. Append `?lang=` to plugin iframe URLs

When rendering a plugin iframe, the `src` is the model's `url` with `?lang=<gLocale.current>` appended. This is a derived/computed value — the stored URL in the model remains clean.

- If the URL already has query params, append `&lang=<locale>`
- If not, append `?lang=<locale>`
- Skip for `data:` URLs and image subtypes

**Location:** `web-view.tsx` or a utility function in `web-view-utils.ts`. The iframe `src` attribute uses the computed URL with lang.

### 2. Include locale in `interactiveFrame.get` response

Add a `lang` field to the `DIInteractiveFrame` type and return `gLocale.current` from the `interactiveFrame` get handler:

```typescript
// data-interactive-types.ts
export interface DIInteractiveFrame {
  // ...existing fields...
  lang?: string
}

// interactive-frame-handler.ts get()
const values: DIInteractiveFrame = {
  // ...existing fields...
  lang: gLocale.current,
}
```

### 3. Plugin opt-out via `interactiveFrame.update`

Add a `handlesLocaleChange` property to `DIInteractiveFrame` and `WebViewModel`:

- Plugins send `update("interactiveFrame", { handlesLocaleChange: true })` during initialization
- CODAP stores this flag on the `WebViewModel` volatile state
- Default is `false` — plugins don't handle locale changes unless they say so

```typescript
// WebViewModel additions
.volatile(self => ({
  handlesLocaleChange: false,
  // ...existing volatile state...
}))
.actions(self => ({
  setHandlesLocaleChange(value: boolean) {
    self.handlesLocaleChange = value
  },
}))
```

### 4. Hardcoded localized plugin list

A constant identifying plugins that require reload on locale change:

```typescript
const kLocalizedPluginPatterns = [
  "Importer",
  "TP-Sampler",
  "Scrambler",
  "storyBuilder"
]
```

A plugin "needs reload" if its URL matches one of these patterns AND it has NOT set `handlesLocaleChange: true`. The matching is a simple substring check against the plugin URL.

### 5. Locale change reaction

Each plugin independently reacts to locale changes via a MobX reaction in `useDataInteractiveController`. When `gLocale.current` changes:

1. **If the plugin needs reload** (matches hardcoded list AND `handlesLocaleChange` is false):
   - Update the iframe `src` with the new `?lang=` value, triggering a full reload
   - The iframePhone connection is re-established naturally (the `useEffect` depends on `url`)

2. **For non-localized plugins** (those not reloaded above):
   - Broadcast a notification via the existing `broadcastMessage` mechanism:
     ```typescript
     {
       action: "notify",
       resource: "global",
       values: {
         operation: "localeChanged",
         lang: "es"
       }
     }
     ```

### 6. Data flow summary

```
User selects language in CFM menu
  → gLocale.setCurrent("es")
  → MobX reaction in each WebViewComponent/useDataInteractiveController fires
    → For localized plugins (not opted out): reload iframe with new ?lang=es
    → For non-localized plugins: broadcast localeChanged notification
```

### 7. Files to modify

| File | Change |
|------|--------|
| `v3/src/data-interactive/data-interactive-types.ts` | Add `lang` and `handlesLocaleChange` to `DIInteractiveFrame` |
| `v3/src/data-interactive/handlers/interactive-frame-handler.ts` | Return `lang` in get, handle `handlesLocaleChange` in update |
| `v3/src/components/web-view/web-view-model.ts` | Add `handlesLocaleChange` volatile + setter |
| `v3/src/components/web-view/web-view.tsx` | Compute iframe src with `?lang=` appended |
| `v3/src/components/web-view/web-view-utils.ts` | Add `appendLangParam()` utility |
| `v3/src/components/web-view/use-data-interactive-controller.ts` | Add MobX reaction for locale changes (reload or notify) |
| `v3/src/components/web-view/web-view-defs.ts` | Add `kLocalizedPluginPatterns` constant |

### 8. Testing

- Unit test: `interactiveFrame.get` returns `lang` field
- Unit test: `interactiveFrame.update` with `handlesLocaleChange` stores the flag
- Unit test: URL construction appends `?lang=` correctly (with/without existing params, skip data: URLs)
- Unit test: locale change triggers reload for matching plugins
- Unit test: locale change does NOT reload plugins with `handlesLocaleChange: true`
- Unit test: locale change broadcasts notification to all plugins

### 9. Future work

- Update the 4 localized plugins to listen for `localeChanged` notification and set `handlesLocaleChange: true`
- Once all localized plugins handle locale changes programmatically, the hardcoded reload list becomes a no-op
- Consider a Cypress E2E test with an actual plugin verifying the full round-trip
