# Graph Image Export Architecture

## Overview

CODAP v3 graphs use a layered rendering model for performance:
- **SVG base layer** — axes, labels, grid lines
- **Canvas layer** — points/bars (WebGL via PixiJS or 2D Canvas fallback)
- **SVG overlay layer** — adornments, selection, marquee
- **SVG legend** — categorical/numeric legends below the plot

Image export composites these layers onto a single destination canvas in z-order,
then converts to PNG. This replaces an earlier `<foreignObject>`-based approach
that had cross-browser issues (Safari positioning bugs, poor rendering in Word/Notes).

## Current Implementation (PNG Export)

**Key file:** `src/components/graph/utilities/image-utils.ts`

### Export Pipeline

1. **Background fill** — `#f8f8f8` rectangle
2. **Base SVG** (`svg.graph-svg`) — axes, grid, labels
3. **Points canvas** (`renderer.canvas`) — PIXI extract API for WebGL, direct copy for Canvas 2D
4. **Overlay SVG** (`svg.overlay-svg`) — above-points content
5a. **Per-cell adornment SVGs** (`.graph-adornments-grid .adornment-wrapper.visible svg`) — movable lines, LSRL, box plots, measure lines, plotted functions, normal curves, standard error bars
5b. **Spanner SVG** (`svg.spanner-svg`) — region of interest, full-height measure lines (painted after per-cell SVGs to match DOM stacking order)
6. **Adornment text** (`.svg-export` HTML elements converted to SVG) — equations, labels, counts
7. **Legend SVGs** (`svg.legend-component`) — one or more legend elements

Each layer is positioned relative to the `.graph-plot` content element using
`getBoundingClientRect()` offsets.

### SVG-to-Canvas Rendering (`renderSvgToCanvas`)

Each SVG layer is rendered to canvas via:
1. Clone the SVG element (to avoid mutating the live DOM)
2. Inline computed styles on shape/text elements (fill, stroke, font, etc.)
3. Remove UI-only elements (droppables, menus, resize handles) — filtered by `disallowedElementClasses`
4. Serialize to a `data:image/svg+xml` URL
5. Load as an `Image` and draw to the destination canvas

Style inlining happens **before** removing disallowed elements to preserve
index-based matching between the clone and the original DOM.

### Points Canvas Handling

The renderer exposes its canvas via `renderer.canvas`. Both WebGL (`PixiPointRenderer`)
and 2D (`CanvasPointRenderer`) provide this interface.

For WebGL/PIXI renderers, the implementation uses `renderer.extract.canvas(stage)` to
extract the rendered content, since the WebGL canvas may not be directly readable.

**devicePixelRatio consideration:** The canvas uses DPR scaling for sharp rendering on
high-DPI displays. When compositing, source dimensions (DPR-scaled) are mapped to
logical destination dimensions.

### Elements Excluded from Export

The `disallowedElementClasses` set filters out interactive/UI-only elements:
- Attribute menus, dropdowns, and icons
- Resize handles and component chrome
- Droppable zones (axis and plot drop targets)
- Empty label placeholders

### Entry Points

- `exportGraphToPng()` — core compositing function, returns a `data:image/png` URL
- `graphSnapshot()` — wrapper used by `DataDisplayRenderState`, returns data URL or Blob
- Camera menu items in `camera-menu-list.tsx` — "Export PNG Image" and "Open in Draw Tool"

## Known Limitations

- **Rich text in equations** — `convertHtmlToSvg` extracts plain `.textContent`, losing HTML
  formatting like `<sub>`, `<sup>`, `<em>` tags used in equations (e.g., R² renders as "R2").
  A future enhancement should walk child nodes and produce `<tspan>` elements with appropriate
  `dy`/`font-style` attributes.
- **Adornment drag handles** — Interactive handles (e.g., `.movable-line-handle`) are included
  in the export. These could be filtered via `disallowedElementClasses` or the
  `show-on-tile-selected` CSS class for cleaner output.
- **High-DPI output** — The export canvas is scaled by `devicePixelRatio` for sharp output
  on Retina displays. The context is pre-scaled so all drawing uses logical coordinates.

## Planned: SVG Export

SVG export is planned for the 3.0 timeframe. The recommended approach:

1. **Composite SVG layers as native SVG elements** — axes, adornments, legend, overlay
   can be combined into a single SVG document while preserving vector quality
2. **Embed the points canvas as an `<image>` element** — extract the canvas content as a
   PNG data URL and embed it as `<image href="data:image/png;base64,...">` with appropriate
   positioning and dimensions
3. **Inline CSS styles** — use the same computed-style inlining approach from `renderSvgToCanvas`
   to ensure styles are preserved in the standalone SVG
4. **Filter UI elements** — reuse `disallowedElementClasses` to remove interactive elements

This approach avoids `<foreignObject>` (which caused the original cross-browser issues)
while preserving vector quality for text and line elements.

### Reference: Style Overrides from Previous Approach

The previous foreignObject-based implementation included CSS overrides that may be useful
when implementing SVG export. These addressed rendering differences when styles are
applied outside their original document context:

```css
/* Font family for the export container */
font-family: Montserrat, sans-serif;

/* Grid tick lines */
.grid .tick line {
  stroke: rgb(211, 211, 211);
  stroke-opacity: 0.7;
}

/* Axis/divider lines */
line.divider, line.axis-line {
  height: 1px;
  stroke: rgb(211, 211, 211);
}

/* Category labels */
text.category-label {
  fill: black;
  font-family: arial, helvetica, sans-serif;
  font-size: 9px;
}
```
