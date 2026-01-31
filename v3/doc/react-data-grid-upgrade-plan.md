# React-Data-Grid Upgrade Plan

## Current Status

- **Current version:** 7.0.0-beta.44
- **Target version:** 7.0.0-beta.47 (React 18 compatible)
- **Latest version:** 7.0.0-beta.56 (requires React 19)

## Why We're Stuck on beta.44

Versions beta.45+ require modern browser features that conflict with our browser support policy (`> 0.2%, last 5 versions, Firefox ESR, not dead, not ie > 0`). Our users include students with older computers and schools with outdated browsers.

### Required Browser Features in beta.45+

| Feature | Chrome | Firefox | Safari | Edge | Firefox ESR 115 |
|---------|--------|---------|--------|------|-----------------|
| `Array.toSorted()` | 110+ | 115+ | 16.0+ | 110+ | ✅ |
| `Array.toSpliced()` | 110+ | 115+ | 16.0+ | 110+ | ✅ |
| `Object.groupBy()` | 117+ | 119+ | 17.4+ | 117+ | ❌ |
| `light-dark()` CSS | 123+ | 120+ | 17.5+ | 123+ | ❌ |

The CSS `light-dark()` function is the most restrictive, requiring browsers from early 2024.

### React Version Constraints

- **beta.44-47:** React 18 compatible
- **beta.48+:** Requires React 19

Since we're on React 18.3.1, the maximum version we can upgrade to is **beta.47**, even with polyfills.

## Changes in beta.45-47

Based on the changelog:

- **beta.45:** Introduced ES2024 requirements (Object.groupBy, Array.toSorted, Array.toSpliced, CSS light-dark)
- **beta.46:** "Only update changed rows" optimization in `onRowsChange` handler
- **beta.47:**
  - Added third generic parameter for specifying row key type on `<DataGrid />`
  - Introduced `useRowSelection` hook for custom cell renderers
  - Modified `HeaderRendererProps.allRowsSelected` behavior (returns `false` when rows are empty)
  - Optional DataGrid props now accept `null` in addition to `undefined`

## Upgrade Approach: Polyfills

### JavaScript Polyfills

Install [core-js](https://github.com/zloirock/core-js):

```bash
npm install core-js
```

Add to entry point (e.g., `src/index.tsx`):

```typescript
import "core-js/actual/array/to-sorted"
import "core-js/actual/array/to-spliced"
import "core-js/actual/object/group-by"
import "core-js/actual/map/group-by"
```

Alternative: [groupby-polyfill](https://github.com/jimmywarting/groupby-polyfill) for just Object.groupBy/Map.groupBy (smaller footprint).

### CSS `light-dark()` Transformation

CSS cannot be polyfilled at runtime. Options:

#### Option A: PostCSS Plugin (Recommended)

Install [@csstools/postcss-light-dark-function](https://github.com/csstools/postcss-plugins):

```bash
npm install @csstools/postcss-light-dark-function
```

Configure in PostCSS config:

```javascript
module.exports = {
  plugins: [
    require('@csstools/postcss-light-dark-function'),
    // existing plugins...
  ]
}
```

This transforms `light-dark(light-val, dark-val)` into CSS variable fallbacks.

#### Option B: Custom CSS Override

Since CODAP only uses light mode (`className="rdg-light"`):

1. Don't import `react-data-grid/lib/styles.css`
2. Create a custom stylesheet extracting only light mode values
3. Maintain as part of patch-package workflow

#### Option C: Lightning CSS

[Lightning CSS](https://lightningcss.dev/transpilation.html) can transform `light-dark()` automatically based on browser targets. Would require webpack config changes.

## Current Customizations (patch-package)

Our current patch (`patches/react-data-grid+7.0.0-beta.44.patch`) includes:

1. **Column width persistence:** Added `columnWidths` prop to DataGrid
2. **Column resize completion signal:** Added `isComplete` parameter to `handleColumnResize()`
3. **TextEditor class export:** Exports `textEditorClassname` for custom editor styling

These patches would need to be updated/recreated for the new version.

## Implementation Steps

1. **Add JavaScript polyfills**
   - Install core-js
   - Add imports to entry point
   - Test in older browsers (Firefox ESR, older Chrome/Safari)

2. **Add CSS transformation**
   - Install PostCSS plugin
   - Configure in build pipeline
   - Verify transformed CSS works correctly with `rdg-light` class

3. **Update react-data-grid**
   - Bump version to 7.0.0-beta.47 in package.json
   - Recreate patch-package patches for new version
   - Test customizations still work

4. **Testing**
   - Run full Jest test suite
   - Run Cypress e2e tests
   - Manual testing in Firefox ESR and older browsers
   - Verify column resize, cell editing, selection all work

## Risks

1. **Patch compatibility:** Internal APIs may have changed, requiring patch updates
2. **CSS variable fallbacks:** PostCSS transform requires `color-scheme` on ancestor element
3. **Bundle size:** core-js polyfills add ~2-3KB gzipped
4. **Maintenance:** Must maintain polyfills until browser support improves

## Alternative: Wait

Given the modest feature additions in beta.45-47, it may be worth waiting until:

1. **React 19 migration** - Would unlock beta.48+ with more features
2. **Browser adoption improves** - Firefox ESR 128+ supports all required features
3. **Specific need arises** - If we need `useRowSelection` hook or other features

## References

- [react-data-grid GitHub](https://github.com/adazzle/react-data-grid)
- [Object.groupBy - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy)
- [Array.toSorted - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted)
- [light-dark() - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)
- [core-js](https://github.com/zloirock/core-js)
- [PostCSS light-dark plugin](https://github.com/csstools/postcss-plugins)
- [Can I Use - Object.groupBy](https://caniuse.com/mdn-javascript_builtins_object_groupby)
- [Can I Use - light-dark()](https://caniuse.com/mdn-css_types_color_light-dark)

---

*Document created: January 2025*
