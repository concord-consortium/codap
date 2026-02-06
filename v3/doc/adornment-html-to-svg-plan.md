# Adornment HTML-to-SVG Conversion Plan

This document provides the implementation plan for converting HTML adornment text to SVG at export time. This addresses the "HTML adornment elements" limitation noted in `graph-image-export.md`.

## Approach Summary

**Convert HTML to SVG only during export**, leaving the live rendering unchanged.

1. **Keep current HTML rendering** - No changes to how adornments render in the app
2. **At export time**, walk the LIVE DOM to find HTML text elements and compute their positions
3. **Parse each element's content** and generate equivalent SVG `<text>` elements with `<tspan>`s
4. **Create a temporary SVG** containing the converted text elements
5. **Render this SVG as an additional layer** in the canvas compositing pipeline

**Why this approach:**
- No runtime performance impact
- No risk of introducing bugs in the live rendering path
- Export performance is not a concern (one-time operation)
- Conversion logic is centralized in one place

**Critical implementation note:** Position calculation via `getBoundingClientRect()` must happen on the LIVE DOM. The converted SVG text elements need positions relative to the graph content area.

---

## Current State: HTML Usage in Adornments

### Summary of HTML Elements Used

| Adornment | Container Elements | Inline Formatting Elements | Visual Effect |
|-----------|-------------------|---------------------------|---------------|
| Movable Line | `<div>`, `<p>` | `<em>`, `<sup>`, `<sub>`, `<br>`, `<span class="units">` | Italics, superscripts, subscripts, line breaks, gray units |
| LSRL | `<div>`, `<p>` | `<em>`, `<sup>`, `<sub>`, `<br>`, `<span class="units">` | Italics, superscripts, subscripts, line breaks, gray units; also has confidence band tooltip |
| Plotted Function | `<div>`, `<p>` | `<br>`, `<span class="units">` | Line breaks, gray units |
| Count | `<div>` (via JSX) | (none) | Plain text only; uses flexbox centering |
| Movable Value | `<div>` | (none) | Plain text only |
| Univariate Measures | `<div>` | `<span class="units">` | Gray units |
| Standard Error | `<div>` | `<span class="units">` | Gray units |
| Normal Curve | `<div>` | `<p style="...">`, `<span class="units">` | Inline-styled paragraphs with underline and color, gray units, Greek letters (µ, σ) |
| Box Plot | `<div>` | (none) | Plain text labels |
| Movable Point | `<p>` | `<br>` | Line breaks (tooltip only, excluded from export) |

**Note on Count adornment**: Unlike other adornments that use D3 to append HTML elements, Count uses React JSX to render its `<div>` elements directly. The conversion logic will need to handle both patterns.

### Formatting Features to Support

1. **Subscripts**: `σ<sub>slope</sub>`, `σ<sub>intercept</sub>` - used for standard error labels
2. **Superscripts**: `r<sup>2</sup>` - used for R-squared values
3. **Italics/Emphasis**: `<em>x</em>`, `<em>y</em>` - used for variable names
4. **Line breaks**: `<br>` or `<br />` - used for multi-line equations
5. **Paragraph blocks**: `<p>...</p>` - used by Normal Curve for stacked labels; each `<p>` should start a new line
6. **Units styling**: `<span class="units">kg</span>` - units displayed in gray (styling in `adornments.scss`)
7. **Unicode characters**: Minus sign (−), Greek letters (µ, σ)
8. **Inline styles on paragraphs**: `<p style="color:...">` and `<p style="text-decoration-line:underline;color:...">` - used by Normal Curve

### Selectors for Adornment Text Elements

The following CSS selectors identify the text elements that need conversion:

```
.graph-count .count
.graph-count .sub-count
.lsrl-equation-container p
.movable-line-equation-container p
.plotted-function-equation-container p
.movable-value-equation-container p
.measure-labels-tip
.normal-curve-equation-container p
```

**Important filtering rules:**
- Skip elements with `display: none` or `visibility: hidden` (these are tooltips, not export content)
- Skip elements with classes: `graph-d3-tip`, `data-tip`, `tooltip`
- Skip elements with no text content

### Additional Requirements

- **RTL language support**: CODAP supports Farsi and Hebrew. SVG text must handle RTL direction correctly.
- **Tooltips excluded**: Tooltips should not appear in exports (simplifies conversion).

### Current Export Architecture

See `graph-image-export.md` for full details on the export pipeline.

The PNG export (`image-utils.ts`) uses **layered canvas compositing**. The `exportGraphToCanvas()` function renders each layer in z-order:

1. **Background fill** - solid color
2. **Base SVG** (`svg.graph-svg`) - axes, grid, labels
3. **Points canvas** - case dots/bars from PIXI renderer
4. **Overlay SVG** (`svg.overlay-svg`) - selection shapes
5. **Adornments SVG** (`svg.spanner-svg`) - adornment lines/shapes
6. **Legend SVG** (`svg.legend-component`) - legend content

Each SVG layer is rendered to canvas via `renderSvgToCanvas()`, which clones the SVG, inlines computed styles, and draws it as an image.

### Current Export Problem

**HTML adornment text is not rendered.** The canvas compositing only handles SVG elements. HTML elements (equations, labels in `<div>` and `<p>` tags) are completely missing from PNG exports.

**SVG export is currently disabled.** The old foreignObject-based approach was removed due to Safari and Word compatibility issues. SVG export will need a new implementation.

The solution for including HTML adornment elements in the export is to convert HTML adornment text to SVG. For PNG export, this SVG is rendered as an additional canvas layer. For SVG export (future), the converted text will be included directly in the output.

---

## Semantic CSS Classes for Export

To simplify conversion and reduce dynamic computation, add semantic CSS classes to HTML elements that communicate rendering intent to the export converter.

**Recommended classes:**

| Class | Purpose | Example Usage |
|-------|---------|---------------|
| `.svg-exportable` | Marks an element that should be converted to SVG | `<div class="svg-exportable">...</div>` |
| `.text-right` | Right-aligned text | `<div class="svg-exportable text-right">...</div>` |
| `.text-center` | Centered text (alternative to flexbox detection) | `<div class="svg-exportable text-center">...</div>` |
| `.multiline` | Contains line breaks; handle as multiple `<tspan>` elements | `<div class="svg-exportable multiline">...</div>` |
| `.has-background` | Element has a visible background that needs a `<rect>` in SVG | `<div class="svg-exportable has-background">...</div>` |

**Benefits:**
- Explicit intent (no guessing layout behavior)
- Decouples implementation from detection
- Easier debugging
- Reduces complexity

**Implementation note:** The current implementation uses selector-based detection (e.g., `.lsrl-equation-container p`) combined with `getComputedStyle()`, which works without these classes. However, adding semantic classes is still recommended for clarity and maintainability. The `shouldConvertElement()` function already checks for `.svg-exportable` as an explicit opt-in.

---

## Implementation Plan

### Phase 1: Core HTML-to-SVG Conversion Utility (1-2 days)

**Goal**: Create a standalone utility function that converts simple HTML text to SVG.

**Tasks**:
1. Create new file `v3/src/components/graph/utilities/html-to-svg.ts`
2. Implement core function with signature:
   ```typescript
   interface IHtmlToSvgOptions {
     element: HTMLElement
     containerElement?: HTMLElement  // For relative positioning
   }
   function convertHtmlToSvg(options: IHtmlToSvgOptions): { svgElements: SVGElement[], bounds: DOMRect }
   ```
3. Handle basic cases first:
   - Plain text content via `element.textContent`
   - Read position from LIVE DOM using `getBoundingClientRect()`
   - Calculate position relative to `containerElement` if provided
   - SVG text y-coordinate is baseline, not top—add ~80% of font size to top position
   - Use `getComputedStyle()` to read font styles (family, size, weight, color)
   - Specify fallback system fonts (e.g., `Lato, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`)
   - Map CSS `text-align` to SVG `text-anchor` (left→start, center→middle, right→end)
4. Implement `shouldConvertElement(element)` helper to filter out:
   - Hidden elements (`display: none`, `visibility: hidden`)
   - Tooltip elements (classes: `graph-d3-tip`, `data-tip`, `tooltip`)
   - Empty elements (no text content)
5. Write unit tests for basic conversion

**Deliverable**: A tested utility that converts simple HTML divs to SVG text elements.

---

### Phase 2: Integration with Export Pipeline (0.5-1 day)

**Goal**: Wire the conversion utility into the existing export code to produce a working (low-fidelity) export as early as possible.

**Rationale**: By integrating with the export pipeline early, we get a functional end-to-end export sooner. The initial export may lack rich formatting (subscripts, superscripts, etc.), but it provides a working foundation that can be iteratively improved.

**Architecture context**: The export uses layered canvas compositing. We need to add adornment text as a new layer rendered after the adornments SVG layer.

**Tasks**:
1. Modify `image-utils.ts`:
   - Import `convertHtmlToSvg` and `shouldConvertElement` from `html-to-svg.ts`
   - Define `adornmentTextSelectors` array with the selectors listed above
   - Create `createAdornmentTextSvg(contentElement)` function that:
     - Gets the graph content rect for relative positioning
     - Queries for elements matching each selector
     - Filters using `shouldConvertElement()`
     - Converts each element using `convertHtmlToSvg({ element, containerElement: contentElement })`
     - Creates an SVG element containing all converted text
     - Returns the SVG element (or null if no text to convert)
2. Modify `exportGraphToCanvas()` function:
   - After rendering adornments SVG (step 5), add a new step:
   - Call `createAdornmentTextSvg(contentElement)` to get the text SVG
   - If not null, call `renderSvgToCanvas()` to draw it at position (0, 0)
3. Test with Count adornment (simplest case—plain text)
4. Accept that complex adornments will export with plain text initially (formatting added in Phase 3)

**Deliverable**: Export pipeline produces working PNG for simple adornments; complex adornments export with plain text (formatting added in Phase 3).

**Note on SVG export**: SVG export is currently disabled. When implemented (see `graph-image-export.md`), the converted adornment text from this plan will be included as SVG `<text>` elements rather than being rasterized.

---

### Phase 3: Rich Text Formatting Support (1-2 days)

**Goal**: Iteratively improve export fidelity by adding support for formatting tags used in adornments.

**Rationale**: With the export pipeline already working (Phase 2), this phase focuses on improving visual fidelity. Each formatting feature can be added and tested independently.

**Implementation approach**:
1. Add `hasRichFormatting(element)` function to detect if element contains formatting tags
2. Add `parseHtmlFormatting(element)` function to recursively walk child nodes and extract text segments with their formatting styles
3. Add `createRichSvgTextElement(segments, x, y, style)` to build SVG `<text>` with `<tspan>` children
4. Modify `convertHtmlToSvg()` to use rich formatting when detected, plain text otherwise

**Formatting mappings**:
| HTML | SVG |
|------|-----|
| `<em>`, `<i>` | `<tspan font-style="italic">` |
| `<sup>` | `<tspan baseline-shift="super" font-size="70%">` |
| `<sub>` | `<tspan baseline-shift="sub" font-size="70%">` |
| `<br>` | Line break: next tspan gets `dy` (line height) and `x` (reset to start) |
| `<p>` | Block element: insert line break before content (except first `<p>`) |
| `<span class="units">` | `<tspan fill="[computed color]">` |

**Tasks**:
1. Implement formatting detection and parsing
2. Build tspan-based SVG text elements
3. Handle multi-line text via `dy` attribute on tspans (not separate `<text>` elements)
4. For line height, use ~1.2× font size
5. Write unit tests for each formatting type

**Deliverable**: A fully-featured HTML-to-SVG converter handling all adornment text patterns with high fidelity.

---

### Phase 4: Validate All Adornment Types (1-2 days)

**Goal**: Ensure every adornment type exports correctly.

**Tasks**:
1. Test and fix each adornment type:
   - Count (plain text, uses flexbox centering—requires manual position calculation)
   - Movable Value (simple labels)
   - Univariate Measures (labels with units)
   - Standard Error, Normal Curve, Box Plot (similar to univariate)
   - Plotted Function (formula + residuals)
   - Movable Line (equations with sub/superscripts)
   - LSRL (most complex—multiple equations, confidence bands)
2. Document any adornment-specific handling required
3. Create visual comparison tests (screenshot original vs export) to catch regressions

**Deliverable**: All adornments export with correct text rendering.

---

### Phase 5: RTL Language Support (0.5-1 day)

**Goal**: Ensure exports work correctly for Farsi and Hebrew users.

**Tasks**:
1. Add `direction="rtl"` attribute support to SVG text elements
2. Test with RTL content in various adornments
3. Verify text alignment and positioning in RTL mode
4. Handle mixed LTR/RTL content if applicable (e.g., equations with RTL labels)

**Deliverable**: Exports render correctly for RTL languages.

---

### Phase 6: Cross-Platform Testing & Polish (1-2 days)

**Goal**: Verify exports work across all target platforms.

**Tasks**:
1. Test in browsers: Chrome, Firefox, Safari, Edge
2. Test in document apps: Word, PowerPoint, Google Docs
3. Test in design tools: Illustrator, Inkscape
4. Fix any platform-specific rendering issues
5. Compare export fidelity with on-screen display
6. Performance validation (export should complete quickly)
7. Update documentation

**Deliverable**: Exports verified working across all platforms.

---

### Effort Summary

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1 | Core conversion utility | 1-2 days |
| 2 | Export pipeline integration | 0.5-1 day |
| 3 | Rich text formatting | 1-2 days |
| 4 | Validate all adornments | 1-2 days |
| 5 | RTL language support | 0.5-1 day |
| 6 | Cross-platform testing | 1-2 days |
| **Total** | | **5-10 days** |

**Note on phase ordering**: Phases 2 and 3 are intentionally ordered to produce a low-fidelity working export early (Phase 2), then iteratively improve fidelity (Phase 3). This allows stakeholders to see progress sooner and catches integration issues before investing in formatting details.

---

## SVG Export (Future)

SVG export is currently disabled. See `graph-image-export.md` for the planned SVG export approach.

The HTML-to-SVG conversion utility from Phases 1-3 will be reused for SVG export—the converted adornment text will be included directly in the SVG output as `<text>` elements rather than being rasterized to canvas.

---

## Browser Compatibility Notes

### SVG Text Features

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| `<tspan>` | ✅ | ✅ | ✅ | ✅ |
| `baseline-shift="super"` | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| `baseline-shift="sub"` | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| `dy` attribute | ✅ | ✅ | ✅ | ✅ |
| `foreignObject` | ✅ | ✅ | ⚠️ | ✅ |

⚠️ = Works but with variations in exact positioning

**Note:** `baseline-shift` has inconsistent baseline calculations across browsers. Using `dy` (vertical offset) with `font-size` reduction is more reliable for subscripts/superscripts.

### Safari SVG Rendering Issue

When viewing exported SVG files directly in Safari, converted text elements (in a `<g class="adornment-text-svg">` group) may not render, even though they are present in the SVG source. Chrome renders the same SVG correctly. This appears to be a Safari-specific rendering limitation with dynamically-positioned SVG text. The text IS present in the file and will render correctly when the SVG is:
- Opened in Chrome or other browsers
- Imported into design tools (Illustrator, Inkscape)
- Embedded in documents (Word, Google Docs)

**Note:** This issue applies to SVG export (future feature), not PNG export which renders to canvas.

---

## Key Constraints (from Team Decisions)

### Export Targets
Exports must work across:
- Web browsers (including Safari)
- Design software (Illustrator, Inkscape)
- Document applications (Word, PowerPoint, Google Docs)

### Fidelity Requirements
- **Text editability**: Not required (read-only export)
- **Positioning accuracy**: "As close as reasonably possible without too much effort" (pixel-perfect not required)
- **Subscript/superscript appearance**: Minor positioning differences acceptable
- **Vector vs. bitmap**: Prefer vector graphics

### Runtime Performance
- Adding overhead to live rendering is NOT acceptable
- Export-time performance is not a concern (one-time operation)
