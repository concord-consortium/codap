# CODAP-1527: Map Base Layer Attribution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give each map base layer (Oceans, Topo, Streets) its own attribution from the Esri service's
`copyrightText`, and show "Powered by Esri" whenever a base layer is visible.

**Architecture:** Store the three `copyrightText` strings as constants in `map-types.ts` and pass the matching one to
each `<TileLayer>`. Leaflet already adds and removes a layer's attribution along with the layer. A new
`EsriAttributionPrefix` component, rendered inside `MapContainer`, adds "Powered by Esri" to the attribution control's
prefix while the base map is visible, and makes the control keyboard-focusable. Updated CSS shows the attribution as one
truncated line that expands on hover or focus.

**Design doc:** `v3/docs/plans/2026-11-13-map-attribution-design.md`

**Tech Stack:** React 18, react-leaflet 4, Leaflet 1.9, MobX (`observer`), SCSS, Jest + Testing Library, Cypress.

**Conventions:**
- Run npm, Jest and Cypress commands from `v3/`. Run git commands from the repo root (`v3/..`).
- No semicolons. Maximum line length is 120.
- Show every commit message to the user and get their approval before committing (see `CLAUDE.md`).

---

### Task 1: Per-layer attribution constants

**Files:**
- Modify: `v3/src/components/map/map-types.ts:44-52` (the `export const` block containing `kMapAttribution`)
- Create: `v3/src/components/map/map-types.test.ts`

**Step 1: Write the failing test**

Create `v3/src/components/map/map-types.test.ts`:

```ts
import { BaseMapKeys, kMapAttributions, kPoweredByEsriAttribution } from "./map-types"

describe("map attributions", () => {
  it("has a non-empty attribution for every base map layer", () => {
    BaseMapKeys.forEach(key => {
      expect(kMapAttributions[key]).toBeTruthy()
    })
  })
})
```

**Step 2: Run the test and confirm it fails**

Run: `npm test -- map-types`
Expected: FAIL. TypeScript/Jest reports that `kMapAttributions` and `kPoweredByEsriAttribution` are not exported.

**Step 3: Implement**

In `v3/src/components/map/map-types.ts`, remove the `kMapAttribution` line from the `export const` block. Add this
block directly after `kMapUrls` (around line 22):

```ts
// Attribution for each base map layer is the `copyrightText` reported by its Esri map service
// (`<service URL>/MapServer?f=json`). Leaflet renders attribution as HTML, so escape any HTML-special characters if
// these are updated.
//   oceans:  https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer?f=json
//   topo:    https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer?f=json
//   streets: https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer?f=json
export const kMapAttributions: Record<BaseMapKey, string> = {
  oceans: "Esri, Garmin, GEBCO, NOAA NGDC, and other contributors",
  topo: "Sources: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, " +
    "Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), (c) OpenStreetMap contributors, " +
    "and the GIS User Community",
  streets: "Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, " +
    "Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, (c) OpenStreetMap contributors, " +
    "and the GIS User Community"
}

// Esri requires exactly "Powered by Esri" wherever its basemaps are shown.
export const kPoweredByEsriAttribution = 'Powered by <a href="https://www.esri.com">Esri</a>'
```

Before committing, re-fetch the three `?f=json` URLs and confirm the strings still match their `copyrightText`.

**Step 4: Fix the existing reference so the build still type-checks**

In `v3/src/components/map/components/codap-map.tsx`:

- line 6: change the import to `import {BaseMapKeys, kMapAttributions, kMapUrls} from "../map-types"`
- line 146: change `attribution={kMapAttribution}` to `attribution={kMapAttributions[mapKey]}`

Confirm nothing else references the old name: `grep -rn "kMapAttribution\b" src cypress` should return no matches.

**Step 5: Run the tests and type check**

Run: `npm test -- map-types && npm run build:tsc`
Expected: 3 tests pass, and tsc reports no errors.

**Step 6: Commit** (after the user approves the message)

```bash
git add v3/src/components/map/map-types.ts v3/src/components/map/map-types.test.ts \
  v3/src/components/map/components/codap-map.tsx
git commit -m "CODAP-1527: use each base map layer's own Esri attribution"
```

---

### Task 2: `EsriAttributionPrefix` component

This component adds "Powered by Esri" to the attribution control's prefix while `show` is true. It also gives the
control `tabindex="0"`, so it can be focused (and therefore expanded; see Task 4) with the keyboard or by tapping.

The design doc has the component observe `mapModel.baseMapLayerIsVisible` directly. Here it takes a `show` prop
instead, because `CodapMap` is already an `observer`. This keeps the component free of the map model and easy to
test.

**Files:**
- Create: `v3/src/components/map/components/esri-attribution-prefix.tsx`
- Create: `v3/src/components/map/components/esri-attribution-prefix.test.tsx`

**Step 1: Write the failing test**

Create `v3/src/components/map/components/esri-attribution-prefix.test.tsx`. The mounting pattern follows
`map-hot-spot-layer.test.tsx`.

```tsx
import { render } from "@testing-library/react"
import { Map as LeafletMap } from "leaflet"
import { MapContainer } from "react-leaflet"
import { EsriAttributionPrefix } from "./esri-attribution-prefix"

describe("EsriAttributionPrefix", () => {
  function renderPrefix(props: { mounted?: boolean, show: boolean }) {
    const { mounted = true, show } = props
    let leafletMap: LeafletMap | null = null
    const ui = (mountedNow: boolean, showNow: boolean) => (
      <MapContainer ref={map => { if (map) leafletMap = map }} center={[0, 0]} zoom={1}>
        {mountedNow && <EsriAttributionPrefix show={showNow}/>}
      </MapContainer>
    )
    const result = render(ui(mounted, show))
    const map = () => leafletMap as unknown as LeafletMap
    const container = () => map().attributionControl.getContainer() as HTMLElement
    const rerender = (mountedNow: boolean, showNow: boolean) => result.rerender(ui(mountedNow, showNow))
    return { map, container, rerender }
  }

  it("adds 'Powered by Esri' after Leaflet's default prefix when shown", () => {
    const { container } = renderPrefix({ show: true })
    expect(container().textContent).toMatch(/Leaflet\s*\|\s*Powered by Esri/)
    expect(container().querySelector('a[href="https://www.esri.com"]')).not.toBeNull()
  })

  it("does not add 'Powered by Esri' when not shown", () => {
    const { container } = renderPrefix({ show: false })
    expect(container().textContent).toContain("Leaflet")
    expect(container().textContent).not.toContain("Powered by Esri")
  })

  it("removes 'Powered by Esri' when show becomes false and restores it when true again", () => {
    const { container, rerender } = renderPrefix({ show: true })
    rerender(true, false)
    expect(container().textContent).not.toContain("Powered by Esri")
    rerender(true, true)
    expect(container().textContent).toMatch(/Leaflet\s*\|\s*Powered by Esri/)
    // never duplicated
    expect(container().textContent?.match(/Powered by Esri/g)).toHaveLength(1)
  })

  it("restores the default prefix when unmounted", () => {
    const { container, rerender } = renderPrefix({ show: true })
    rerender(false, true)
    expect(container().textContent).toContain("Leaflet")
    expect(container().textContent).not.toContain("Powered by Esri")
  })

  it("makes the attribution control keyboard-focusable", () => {
    const { container } = renderPrefix({ show: true })
    expect(container().getAttribute("tabindex")).toBe("0")
  })
})
```

If ESLint's `testing-library/no-node-access` rule complains about `querySelector` or `getContainer()`, add
`// eslint-disable-next-line testing-library/no-node-access -- inspecting Leaflet's attribution control DOM`, as
`map-hot-spot-layer.test.tsx` does.

**Step 2: Run the test and confirm it fails**

Run: `npm test -- esri-attribution-prefix`
Expected: FAIL with "Cannot find module './esri-attribution-prefix'".

**Step 3: Implement**

Create `v3/src/components/map/components/esri-attribution-prefix.tsx`:

```tsx
import { useEffect } from "react"
import { useMap } from "react-leaflet"
import { kPoweredByEsriAttribution } from "../map-types"

// Leaflet's own separator between the prefix and the layer attributions
const kAttributionSeparator = ' <span aria-hidden="true">|</span> '

interface IProps {
  show: boolean
}

/**
 * Adds "Powered by Esri" to the Leaflet attribution control's prefix while `show` is true (i.e. while an Esri base
 * map layer is visible), and restores the original prefix otherwise. Also makes the attribution control focusable so
 * keyboard and touch users can expand the (truncated) attribution text.
 */
export function EsriAttributionPrefix({ show }: IProps) {
  const map = useMap()

  // Make the attribution focusable.
  useEffect(() => {
    const container = map.attributionControl?.getContainer()
    container?.setAttribute("tabindex", "0")
  }, [map])

  // Add the esri attribution to leaflet's attribution prefix.
  useEffect(() => {
    const control = map.attributionControl
    if (!show || !control) return

    const defaultPrefix = control.options.prefix
    const esriPrefix = typeof defaultPrefix === "string" && defaultPrefix
      ? `${defaultPrefix}${kAttributionSeparator}${kPoweredByEsriAttribution}`
      : kPoweredByEsriAttribution
    control.setPrefix(esriPrefix)

    return () => {
      control.setPrefix(typeof defaultPrefix === "string" ? defaultPrefix : false)
    }
  }, [map, show])

  return null
}
```

Notes:
- In `@types/leaflet`, `options.prefix` is typed `string | boolean | undefined`, but `setPrefix` accepts only
  `string | false`. The `typeof` checks handle that.
- The cleanup restores the prefix captured when the effect ran. That makes toggling `show` and unmounting both work,
  and it stays correct under React StrictMode's double-invoked effects.

**Step 4: Run the tests and confirm they pass**

Run: `npm test -- esri-attribution-prefix`
Expected: 5 tests pass.

**Step 5: Lint**

Run: `npm run lint`
Expected: no errors.

**Step 6: Commit** (after the user approves the message)

```bash
git add v3/src/components/map/components/esri-attribution-prefix.tsx \
  v3/src/components/map/components/esri-attribution-prefix.test.tsx
git commit -m "CODAP-1527: add EsriAttributionPrefix component for 'Powered by Esri'"
```

---

### Task 3: Render `EsriAttributionPrefix` in the map

**Files:**
- Modify: `v3/src/components/map/components/codap-map.tsx` (imports near line 20, and the `MapContainer` children at
  lines 139-150)

**Step 1: Implement**

Add the import, in alphabetical order with the other local component imports:

```tsx
import {EsriAttributionPrefix} from "./esri-attribution-prefix"
```

Inside `<MapContainer>`, just after the base-layer fragment and before `<MapInterior/>`:

```tsx
          <EsriAttributionPrefix show={mapModel.baseMapLayerIsVisible}/>
          <MapInterior/>
```

`CodapMap` is already an `observer`, so toggling base map visibility re-renders it with the new `show` value.

**Step 2: Check it in the running app**

Run `npm start` (it may already be running) and open the app. Load a dataset with lat/long, such as
`cypress/fixtures/RollerCoastersWithLatLong.csv`, then create a map. Then:
- The attribution in the bottom-right reads `Leaflet | Powered by Esri | Sources: Esri, HERE, …`.
- In the inspector's Layers palette, switching between Oceans, Topo and Streets changes the text.
- Unchecking **Base** leaves only `Leaflet`.

(The text will still wrap in a narrow 140px box. Task 4 fixes the layout.)

**Step 3: Type check and run the map tests**

Run: `npm run build:tsc && npm test -- components/map`
Expected: no tsc errors, and all map tests pass.

**Step 4: Commit** (after the user approves the message)

```bash
git add v3/src/components/map/components/codap-map.tsx
git commit -m "CODAP-1527: show 'Powered by Esri' when a base map layer is visible"
```

---

### Task 4: Truncated attribution that expands on hover or focus

**Files:**
- Modify: `v3/src/components/map/components/map.scss:92-96`

**Step 1: Implement**

Replace the existing rule:

```scss
.leaflet-container .leaflet-control-attribution {
  margin: 10px;
  opacity: .5;
  width: 140px;
}
```

with:

```scss
// Stretch the bottom-right control area across the map so the attribution can use the map's full width.
// (Leaflet sets pointer-events: none on this area, and only the controls themselves receive events.)
.leaflet-container .leaflet-bottom.leaflet-right {
  left: 0;
}

// Base map attribution: a single truncated line, expanded to the full text on hover or keyboard/touch focus
.leaflet-container .leaflet-control-attribution {
  margin: 10px;
  max-width: calc(100% - 20px);
  opacity: .5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover, &:focus-within {
    opacity: .9;
    white-space: normal;
  }

  &:focus-visible {
    outline: 2px solid #0081ff;
    outline-offset: 1px;
  }
}
```

If the codebase has a shared focus-outline color variable (check `v3/src/components/vars.scss`), use it in place of
`#0081ff`.

**Step 2: Check it in the running app**

With the map from Task 3:
- **Collapsed:** the attribution is one line, ends in `…`, and is no wider than the map, at any map width (resize the
  tile both narrow and wide).
- **Hover:** the full text wraps and grows upward from the bottom edge, and the links are clickable.
- **Keyboard:** Tab to the attribution. It shows a focus outline and expands. Tab away and it collapses.
- **Touch** (device emulation in DevTools, or an iPad): tapping the attribution expands it.
- **No regressions:** zoom controls, the grid slider and the marquee-select button still work. Dragging and clicking
  the map still work near the bottom edge (the full-width control area must not block events).
- **Image export:** use the camera menu to save a PNG. The attribution appears as the collapsed line.

**Step 3: Lint**

Run: `npm run lint`
Expected: no errors (this also runs stylelint, if configured).

**Step 4: Commit** (after the user approves the message)

```bash
git add v3/src/components/map/components/map.scss
git commit -m "CODAP-1527: truncate map attribution to one line, expand on hover/focus"
```

---

### Task 5: Cypress coverage

**Files:**
- Modify: `v3/cypress/support/elements/map-tile.ts` (add getters)
- Modify: `v3/cypress/e2e/map.spec.ts` (add a test to the `"Map UI"` context, after `"checks heatmap"`)

**Step 1: Add element getters**

In `MapTileElements` in `v3/cypress/support/elements/map-tile.ts`:

```ts
  getAttribution() {
    return this.getMapTile().find(".leaflet-control-attribution")
  },
  getBaseLayerCheckbox() {
    return cy.get("[data-testid=map-layers-checkbox-base]")
  },
  getBaseLayerButton(layer: "oceans" | "topo" | "streets") {
    return cy.get(`[data-testid=map-layers-base-${layer}]`)
  },
```

(The Layers palette may render outside the inspector panel's DOM, so these use `cy.get` instead of
`c.getInspectorPanel().find`.)

**Step 2: Write the test**

In `v3/cypress/e2e/map.spec.ts`, inside `context("Map UI", …)`:

```ts
  it("shows the base map layer's attribution with 'Powered by Esri'", () => {
    cfm.openLocalDoc(filename1)
    c.getIconFromToolShelf("map").click()
    cy.wait(1000)  // Wait for map to be created
    c.selectTile("map", 0)
    cy.wait(500)  // Wait for inspector panel to update after tile selection

    cy.log("default (Topo) layer shows its attribution and 'Powered by Esri'")
    map.getAttribution().should("contain.text", "Powered by Esri")
    map.getAttribution().should("contain.text", "Intermap, increment P Corp.")
    map.getAttribution().find('a[href="https://www.esri.com"]').should("exist")

    cy.log("each base layer shows its own attribution")
    map.getDisplayConfigButton().should("exist").click()
    map.getBaseLayerButton("oceans").click()
    map.getAttribution().should("contain.text", "NOAA NGDC, and other contributors")
    map.getAttribution().should("not.contain.text", "Intermap")
    map.getAttribution().should("contain.text", "Powered by Esri")

    map.getBaseLayerButton("streets").click()
    map.getAttribution().should("contain.text", "Esri (Thailand)")
    map.getAttribution().should("contain.text", "Powered by Esri")

    cy.log("hiding the base layer removes the Esri attribution")
    map.getBaseLayerCheckbox().click()
    map.getAttribution().should("not.contain.text", "Powered by Esri")
    map.getAttribution().should("not.contain.text", "Esri (Thailand)")

    cy.log("showing it again restores the Esri attribution")
    map.getBaseLayerCheckbox().click()
    map.getAttribution().should("contain.text", "Powered by Esri")
    map.getAttribution().should("contain.text", "Esri (Thailand)")
  })
```

The attribution is truncated with CSS only, so `textContent` (which `contain.text` checks) still has the full string.

**Step 3: Run the test**

The dev server must be running (`npm start`). See the memory note: in a VS Code terminal, run `unset
ELECTRON_RUN_AS_NODE` first, or Cypress won't start.

Run: `npm run test:cypress -- --spec cypress/e2e/map.spec.ts`
Expected: the new test passes, and existing map tests still pass.

If `getBaseLayerCheckbox().click()` doesn't toggle (the test id may sit on a wrapper and not on the clickable input),
look at the `PaletteCheckbox` DOM. Target the inner checkbox, or click with `{ force: true }` on the input.

**Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

**Step 5: Commit** (after the user approves the message)

```bash
git add v3/cypress/support/elements/map-tile.ts v3/cypress/e2e/map.spec.ts
git commit -m "CODAP-1527: add Cypress test for map base layer attribution"
```

---

### Task 6: Final verification

**Step 1:** Run `npm run lint && npm run build:tsc && npm test -- components/map`. Expected: everything passes.

**Step 2:** Run `npm run build` to confirm the production build succeeds.

**Step 3:** Re-check the design doc's requirements:
- [ ] Each base layer shows its own `copyrightText`.
- [ ] "Powered by Esri" (linked to esri.com) is shown whenever a base layer is visible, and only then.
- [ ] The attribution is one truncated line, and expands on hover, keyboard focus and tap.
- [ ] Map image export still works.

**Step 4:** Follow the PR steps in `CLAUDE.md`: a draft PR titled `CODAP-1527: …` with the `v3` label, and the PR
description shown to the user for approval before it is created.
