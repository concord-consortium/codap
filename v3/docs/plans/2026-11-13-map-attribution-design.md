# CODAP-1527: Map base layer attribution — Design

**Status:** Approved
**Jira:** [CODAP-1527](https://concord-consortium.atlassian.net/browse/CODAP-1527)
**Branch:** `codap-1527-map-attribution`

## Goal

Show correct attribution for the map tile's base layers:

1. Each base layer (Oceans, Topo, Streets) shows its own attribution, taken from the Esri service's `copyrightText`.
2. Whenever a base layer is shown, the attribution also includes "Powered by Esri".

## Current state

- `v3/src/components/map/map-types.ts:47` defines a single `kMapAttribution`
  (`© <a href="https://static.arcgis.com/attribution/World_Topo_Map">USGS, NOAA</a>`). This is used for all three
  layers, although it only roughly describes the Topo layer.
- `v3/src/components/map/components/codap-map.tsx:146` renders one `<TileLayer>` for the visible base layer, with
  `attribution={kMapAttribution}`. The layer is rendered only when `baseMapLayerIsVisible` is true. Each layer is keyed
  by `mapKey`, so switching layers unmounts one `TileLayer` and mounts another.
- `v3/src/components/map/components/map.scss:92` styles `.leaflet-control-attribution` as a 140px-wide box at 50%
  opacity, with a 10px margin.
- The attribution control keeps Leaflet's default prefix (`Leaflet`). Nothing shows "Powered by Esri".
- Map image export (`save-image-menu-list.tsx`) captures the whole map element with html-to-image, so the attribution
  appears in exported images.

## Attribution sources

The Esri map services return this `copyrightText` (`<service>/MapServer?f=json`, fetched 2026-11-13):

| Key | Service | `copyrightText` |
|---|---|---|
| `oceans` | `Ocean/World_Ocean_Base` | Esri, Garmin, GEBCO, NOAA NGDC, and other contributors |
| `topo` | `World_Topo_Map` | Sources: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), (c) OpenStreetMap contributors, and the GIS User Community |
| `streets` | `World_Street_Map` | Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, (c) OpenStreetMap contributors, and the GIS User Community |

`static.arcgis.com/attribution/<service>` (for Oceans, the path is `Ocean/World_Ocean_Base`) is Esri's *dynamic*
attribution data. It is a JSON list of contributors, each with the zoom ranges and bounding boxes it covers: 1,090
entries for Topo, 666 for Streets and 15 for Oceans. esri-leaflet uses it to show only the contributors for the
visible area. We do not use it here (see "Approaches").

## Approaches considered

1. **Static `copyrightText` strings in code (chosen).** Copy each service's `copyrightText` into `map-types.ts`, with a
   comment giving the service URL it came from. There are no network requests, loading states or failure modes, and it
   works offline and in tests. The cost is updating the strings by hand if Esri changes them, which is rare.
2. **Fetch `copyrightText` at runtime.** The text is always current, but this adds a request per layer type, a loading
   and failure state, and network dependence in Cypress tests. That is a lot of machinery for text that rarely changes.
3. **Dynamic attribution from static.arcgis.com.** This is the most precise option, but it means loading 100–150KB
   files and recalculating on every pan and zoom. It goes beyond the requirement to use `copyrightText`.

## Design

### Data (`map-types.ts`)

- Replace `kMapAttribution` with `kMapAttributions: Record<BaseMapKey, string>`, holding the strings from the table
  above, unchanged. Leaflet renders attribution as HTML. None of the current strings contain HTML-special characters,
  but they should be escaped (or checked) if they change.
- Add `kPoweredByEsriAttribution = 'Powered by <a href="https://www.esri.com">Esri</a>'`. It is not translated, because
  Esri requires this exact wording.

### Rendering (`codap-map.tsx`)

- Each base `<TileLayer>` gets `attribution={kMapAttributions[mapKey]}`. Leaflet adds and removes a layer's
  attribution along with the layer, so switching layers swaps the text and hiding the base map removes it. No extra
  code is needed.
- **"Powered by Esri" goes in the attribution prefix.** Leaflet joins layer attributions with commas, which would read
  badly ("Powered by Esri, Sources: Esri, …"). The prefix is separated from layer attributions by ` | `, so a new
  `useEsriAttributionPrefix(show)` hook will:
  - use `useMap()` to get the Leaflet map and its `attributionControl`. `useMap()` only works inside `MapContainer`,
    so the hook is called from `MapInterior` (alongside `useMapModel()`), with
    `show = mapModel.baseMapLayerIsVisible` (`MapInterior` is a MobX observer)
  - read the default prefix once and store it
  - while `show` is true, call `setPrefix(`${defaultPrefix} | ${kPoweredByEsriAttribution}`)`; otherwise call
    `setPrefix(defaultPrefix)`
  - restore the default prefix on unmount

  This matches esri-leaflet's approach. With the Topo layer, the result is:

  `Leaflet | Powered by Esri | Sources: Esri, HERE, Garmin, …`

  With the base map hidden, only `Leaflet` (plus any other layers' attributions) is shown.

### Display (`map.scss`)

The Topo and Streets strings are about 230 characters, which would wrap to about 10 lines in the current 140px box.
Instead:

- **Collapsed (default):** a single line, no wider than the map, cut off with `text-overflow: ellipsis`, at the current
  reduced opacity.
- **Expanded:** on `:hover` and `:focus-within`, the full text wraps (`white-space: normal`) and opacity goes up for
  readability.
- **Keyboard and touch:** `useEsriAttributionPrefix` sets `tabindex="0"` on the attribution control container, so it can
  be focused with the keyboard, and tapping it on a touch device focuses it and expands it. This matters for students
  on iPads, where there is no hover.
- Links in the attribution stay clickable when the control is expanded.

### Out of scope

- V2 import/export. Attribution is not stored in documents.
- Dynamic attribution based on the visible area (approach 3).
- Changes to image export. The attribution is already captured; exported images will show the collapsed single line
  unless the control happens to be expanded.

## Testing

- **Jest:** every `BaseMapKey` has a non-empty entry in `kMapAttributions`.
- **Jest:** `useEsriAttributionPrefix` sets the prefix to include "Powered by Esri" when the base layer is visible,
  restores the default when it is hidden, and restores it on unmount.
- **Cypress:** with a map tile:
  - the attribution includes "Powered by Esri" and the Topo text by default
  - switching to Oceans and Streets changes the text to match each layer
  - turning off the base map removes "Powered by Esri" and the layer text

## Risks

- **Stale strings.** If Esri changes `copyrightText`, the stored strings fall out of date. The comment giving each
  service URL makes them easy to check.
- **Leaflet internals.** The design relies only on the public `attributionControl.setPrefix` /
  `options.prefix` API and on `getContainer()`, which are stable across Leaflet 1.x.
