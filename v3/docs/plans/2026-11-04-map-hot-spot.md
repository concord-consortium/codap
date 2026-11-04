# Map Hot Spot Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the `mapHotSpot` feature flag, a `MapHotSpotModel` on each map point layer, a flag-gated "Hot spot" checkbox in the map layers palette, and a placeholder map layer drawn between the boundary and point layers.

**Architecture:** `MapHotSpotModel` (MST, one `isVisible` prop) is a child of `MapPointLayerModel`, registered unconditionally. The inspector checkbox and the drawn layer read `isFeatureEnabled("mapHotSpot")`. The layer draws into a custom Leaflet pane placed right after `overlayPane`, which puts it above boundary polygons and below the point canvas. See `docs/plans/2026-11-04-map-hot-spot-design.md`.

**Tech Stack:** TypeScript, React 18, MobX-State-Tree, Leaflet / react-leaflet, react-aria-components, Jest + Testing Library.

**Conventions:** Run npm/jest from `v3/`. Run git from the repo root (`/Users/tealefristoe/concord/codap`). No semicolons; 120-char lines. Per CLAUDE.md, show the user every commit message and get approval before committing.

---

### Task 1: Feature flag

**Files:**
- Modify: `v3/src/models/feature-flags/feature-flag-registry.ts` (the `kFeatureFlags` object; keep entries alphabetical)

**Step 1: Add the entry** between `legendRange` and `pointShapes`:

```ts
  mapHotSpot: {
    description: "Hot spot layer on the map",
    owner: "MappingTime",
    added: "2026-11-04",
    expires: "2027-11-30"
  },
```

**Step 2: Type check**

Run: `npm run build:tsc`
Expected: no errors.

No test: the registry is data, and the flag manager's behavior is already covered.

---

### Task 2: MapHotSpotModel

**Files:**
- Create: `v3/src/components/map/models/map-hot-spot-model.ts`
- Create: `v3/src/components/map/models/map-hot-spot-model.test.ts`
- Modify: `v3/src/components/map/models/map-point-layer-model.ts`

**Step 1: Write the failing test** (`map-hot-spot-model.test.ts`)

```ts
import { getSnapshot } from "mobx-state-tree"
import { MapHotSpotModel } from "./map-hot-spot-model"
import { MapPointLayerModel } from "./map-point-layer-model"

describe("MapHotSpotModel", () => {
  it("is hidden by default and can be shown", () => {
    const hotSpot = MapHotSpotModel.create()
    expect(hotSpot.isVisible).toBe(false)
    hotSpot.setIsVisible(true)
    expect(hotSpot.isVisible).toBe(true)
  })

  it("is created with each point layer and round-trips through its snapshot", () => {
    const layer = MapPointLayerModel.create()
    expect(layer.hotSpotModel.isVisible).toBe(false)
    layer.hotSpotModel.setIsVisible(true)
    const restored = MapPointLayerModel.create(getSnapshot(layer))
    expect(restored.hotSpotModel.isVisible).toBe(true)
  })
})
```

**Step 2: Run it to verify it fails**

Run: `npm test -- map-hot-spot-model`
Expected: FAIL, cannot find module `./map-hot-spot-model`.

**Step 3: Create the model** (`map-hot-spot-model.ts`)

```ts
import { Instance, types } from "mobx-state-tree"
import { applyModelChange } from "../../../models/history/apply-model-change"

/**
 * Hot spot settings for a map point layer. Gated by the `mapHotSpot` feature flag
 * at the affordances (inspector control, drawn layer); the model itself is always present.
 */
export const MapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false
})
  .actions(self => ({
    setIsVisible(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))
  .actions(applyModelChange)

export interface IMapHotSpotModel extends Instance<typeof MapHotSpotModel> {}
```

**Step 4: Add it to the point layer** (`map-point-layer-model.ts`)

Import:

```ts
import {MapHotSpotModel} from "./map-hot-spot-model"
```

In `.props({...})`, after `gridModel`:

```ts
    hotSpotModel: types.optional(MapHotSpotModel, () => MapHotSpotModel.create()),
```

**Step 5: Run the test to verify it passes**

Run: `npm test -- map-hot-spot-model`
Expected: PASS (2 tests).

**Step 6: Run the map tests for snapshot fallout**

Run: `npm test -- src/components/map`
Expected: PASS. If a test compares a full point-layer snapshot, add `hotSpotModel: { isVisible: false }` to its expected value.

**Step 7: Commit** (after the user approves the message)

```bash
git add v3/src/models/feature-flags/feature-flag-registry.ts v3/src/components/map/models/map-hot-spot-model.ts \
  v3/src/components/map/models/map-hot-spot-model.test.ts v3/src/components/map/models/map-point-layer-model.ts
git commit -m "CODAP-1670: add mapHotSpot feature flag and MapHotSpotModel"
```

---

### Task 3: Strings

**Files:**
- Modify: `v3/src/utilities/translation/lang/en-US.json5`

Only `en-US.json5` is edited; other languages come from POEditor.

**Step 1:** Next to the `V3.Undo.map.hideLayer` / `V3.Redo.map.hideLayer` entries (around line 1442), add:

```json5
    "V3.Undo.map.showHotSpot": "Undo showing hot spot on map",
    "V3.Redo.map.showHotSpot": "Redo showing hot spot on map",
    "V3.Undo.map.hideHotSpot": "Undo hiding hot spot on map",
    "V3.Redo.map.hideHotSpot": "Redo hiding hot spot on map",
```

Near the other `V3.Inspector.*` entries (for example after `V3.Inspector.graph.legendBins`, around line 1379), add:

```json5
    "V3.Inspector.map.hotSpot": "Hot spot",
```

---

### Task 4: Inspector control

**Files:**
- Create: `v3/src/components/map/components/inspector-panel/map-hot-spot-control.tsx`
- Create: `v3/src/components/map/components/inspector-panel/map-hot-spot-control.test.tsx`
- Modify: `v3/src/components/map/components/inspector-panel/map-layers-palette.tsx`
- Modify: `v3/src/components/map/components/inspector-panel/map-inspector.scss`

**Step 1: Write the failing test** (`map-hot-spot-control.test.tsx`)

```tsx
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { featureFlagManager } from "../../../../models/feature-flags/feature-flag-manager"
import { MapHotSpotModel } from "../../models/map-hot-spot-model"
import { MapHotSpotControl } from "./map-hot-spot-control"

jest.mock("../../../../utilities/translation/translate", () => ({
  t: (key: string) => key,
  translate: (key: string) => key
}))

describe("MapHotSpotControl", () => {
  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  it("renders nothing when the mapHotSpot flag is off", () => {
    const { container } = render(<MapHotSpotControl hotSpotModel={MapHotSpotModel.create()}/>)
    expect(container.innerHTML).toBe("")
  })

  it("toggles the hot spot when the flag is on", async () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const user = userEvent.setup()
    const hotSpotModel = MapHotSpotModel.create()
    render(<MapHotSpotControl hotSpotModel={hotSpotModel}/>)

    const checkbox = screen.getByRole("checkbox", { name: "V3.Inspector.map.hotSpot" })
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(hotSpotModel.isVisible).toBe(true)
    expect(checkbox).toBeChecked()
  })
})
```

**Step 2: Run it to verify it fails**

Run: `npm test -- map-hot-spot-control`
Expected: FAIL, cannot find module `./map-hot-spot-control`.

**Step 3: Create the control** (`map-hot-spot-control.tsx`)

```tsx
import { observer } from "mobx-react-lite"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { isFeatureEnabled } from "../../../../models/feature-flags/feature-flag-manager"
import { t } from "../../../../utilities/translation/translate"
import { PaletteCheckbox } from "../../../palette-checkbox"
import { IMapHotSpotModel } from "../../models/map-hot-spot-model"

interface IProps {
  hotSpotModel: IMapHotSpotModel
}

export const MapHotSpotControl = observer(function MapHotSpotControl({ hotSpotModel }: IProps) {
  if (!isFeatureEnabled("mapHotSpot")) return null

  const handleChange = (checked: boolean) => {
    const op = checked ? "show" : "hide"
    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setIsVisible(checked)
    }, {
      undoStringKey: `V3.Undo.map.${op}HotSpot`,
      redoStringKey: `V3.Redo.map.${op}HotSpot`,
      log: logMessageWithReplacement("Map hot spot changed: %@", { op })
    })
  }

  return (
    <div className="map-hot-spot-controls">
      <PaletteCheckbox
        data-testid="map-layers-checkbox-hot-spot"
        isSelected={hotSpotModel.isVisible}
        onChange={handleChange}
      >
        {t("V3.Inspector.map.hotSpot")}
      </PaletteCheckbox>
    </div>
  )
})
```

**Step 4: Run the test to verify it passes**

Run: `npm test -- map-hot-spot-control`
Expected: PASS (2 tests). If the checkbox's accessible name doesn't match, check how `PaletteCheckbox` is queried in other tests and adjust the query, not the component.

**Step 5: Use it in the palette** (`map-layers-palette.tsx`)

Import:

```tsx
import {MapHotSpotControl} from "./map-hot-spot-control"
```

In `renderOneFormatControl`, return a fragment so the hot spot control follows the point controls:

```tsx
      const mapPointLayerModel = isMapPointLayerModel(layer) ? layer : undefined
      return (
        <>
          <DisplayItemFormatControl
            dataConfiguration={layer.dataConfiguration}
            displayItemDescription={layer.displayItemDescription}
            mapPointLayerModel={mapPointLayerModel}
          >
          </DisplayItemFormatControl>
          {mapPointLayerModel && <MapHotSpotControl hotSpotModel={mapPointLayerModel.hotSpotModel}/>}
        </>)
```

**Step 6: Style the divider** (`map-inspector.scss`, inside `.map-layer-controls`, after `.palette-row`)

```scss
      .map-hot-spot-controls {
        margin-top: 10px;
        border-top: 1px solid vars.$charcoal-light-2;
        padding-top: 10px;
        font-weight: 500;
      }
```

**Step 7: Commit** (after the user approves the message)

```bash
git add v3/src/utilities/translation/lang/en-US.json5 v3/src/components/map/components/inspector-panel
git commit -m "CODAP-1670: add flag-gated Hot spot checkbox to the map layers palette"
```

---

### Task 5: Placeholder map layer

**Files:**
- Create: `v3/src/components/map/components/map-hot-spot-layer.tsx`
- Modify: `v3/src/components/map/components/map-point-layer.tsx` (import list and the returned JSX, around line 586)

No tests: everything in this task is a temporary placeholder.

**Step 1: Create the component** (`map-hot-spot-layer.tsx`)

```tsx
import { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Map as LeafletMap, rectangle } from "leaflet"
import { useMap } from "react-leaflet"
import { isFeatureEnabled } from "../../../models/feature-flags/feature-flag-manager"
import { IMapPointLayerModel } from "../models/map-point-layer-model"

export const kHotSpotPaneName = "codapHotSpotPane"

/**
 * Returns the hot spot pane, creating it if necessary. The pane sits immediately after
 * Leaflet's overlayPane (which holds boundary polygons) so it draws above the boundaries.
 * The points are drawn on a canvas above the whole map pane, so they remain on top.
 * CODAP's CSS gives every .leaflet-pane the same z-index, so DOM order decides the stacking;
 * appending at the end would cover the popup pane.
 */
function getHotSpotPane(leafletMap: LeafletMap) {
  let pane = leafletMap.getPane(kHotSpotPaneName)
  if (!pane) {
    pane = leafletMap.createPane(kHotSpotPaneName)
    pane.style.pointerEvents = "none"
    leafletMap.getPanes().overlayPane.after(pane)
  }
  return pane
}

interface IProps {
  mapLayerModel: IMapPointLayerModel
}

export const MapHotSpotLayer = observer(function MapHotSpotLayer({ mapLayerModel }: IProps) {
  const leafletMap = useMap()
  const show = isFeatureEnabled("mapHotSpot") && mapLayerModel.isVisible && mapLayerModel.hotSpotModel.isVisible

  useEffect(() => {
    if (!show) return
    getHotSpotPane(leafletMap)
    // TEMPORARY placeholder: a translucent white plane over the whole world (with longitudes
    // widened to cover repeated world copies at low zoom). Replace with real hot spot rendering.
    const placeholder = rectangle([[-90, -720], [90, 720]], {
      pane: kHotSpotPaneName, interactive: false, stroke: false, fillColor: "white", fillOpacity: 0.5
    }).addTo(leafletMap)
    return () => { placeholder.remove() }
  }, [leafletMap, show])

  return null
})
```

**Step 2: Render it from the point layer** (`map-point-layer.tsx`)

Import next to `MapPointGrid`:

```tsx
import {MapHotSpotLayer} from "./map-hot-spot-layer"
```

In the returned JSX, after `<MapPointGrid mapLayerModel={mapLayerModel} />`:

```tsx
      <MapHotSpotLayer mapLayerModel={mapLayerModel} />
```

**Step 3: Type check and lint**

Run: `npm run build:tsc && npm run lint`
Expected: no errors.

**Step 4: Check it in the browser** (`npm start`, open with `?features=mapHotSpot`)

1. Open a map with boundaries and points (for example, drag a dataset with a boundary attribute and lat/long attributes onto a map).
2. Layers palette: under the point layer's controls there is a divider and a "Hot spot" checkbox.
3. Check it: a translucent white plane covers the boundaries; points stay on top and fully visible. Pan and zoom: the plane moves with the map.
4. Click a boundary through the plane: it still selects. Turn on the grid and hover a cell: the popup is above the plane.
5. Undo/redo toggles the plane. Hiding the point layer hides the plane.
6. Reload without `?features=mapHotSpot`: no checkbox and no plane, even in a document saved with the hot spot on.

**Step 5: Commit** (after the user approves the message)

```bash
git add v3/src/components/map/components/map-hot-spot-layer.tsx v3/src/components/map/components/map-point-layer.tsx
git commit -m "CODAP-1670: draw placeholder hot spot layer between boundaries and points"
```

---

### Task 6: Final verification

Run: `npm test -- src/components/map src/models/feature-flags && npm run lint && npm run build:tsc`
Expected: all pass.
