# Inbounds Mode (`?inbounds=true`)

## Overview

The `inbounds` URL parameter enables a "keep components in bounds" mode designed for embedded CODAP usage. When active, components are constrained to stay within the visible container, and the entire layout scales down uniformly when the container is too small.

## User-Facing Behavior

When `?inbounds=true` is set:

1. **No scrollbars** - The container never shows scrollbars
2. **Drag constraints** - Components cannot be dragged outside the container boundaries
3. **Resize constraints** - Components cannot be resized beyond the container boundaries
4. **Automatic scaling** - When the container is smaller than needed to display all components at full size, everything scales down uniformly

### Scaling Behavior

- Components scale uniformly (both width and height by the same factor)
- The scale factor is the minimum of width ratio and height ratio
- Minimum scale factor is 0.1 (components never shrink below 10% of original size)
- When the container is large enough, components display at 100% (no scaling)

**Important**: This is tile-by-tile *layout* scaling, not a CSS transform. Only the tile positions and dimensions are scaled down. Text size, UI chrome (buttons, menus, title bars), and content rendering remain at their normal size. This keeps text readable even when tiles are scaled to fit a smaller container. A CSS `transform: scale()` approach would shrink everything including text, making it potentially unreadable.

## Implementation Architecture

### Coordinate System

The implementation uses a dual coordinate system:

- **Unscaled (Model) Coordinates**: Stored in MST models (`FreeTileLayout.x`, `y`, `width`, `height`). These are the "source of truth" and are serialized to documents. They represent the intended layout at 100% scale.

- **Scaled (Rendered) Coordinates**: Computed ephemerally for rendering. Calculated as `scaled = unscaled * scaleFactor`. Never serialized.

This design means:
- Window resizing does NOT modify the document (no serialization changes)
- Undo/redo operates on unscaled coordinates naturally
- Opening the same document in different window sizes produces consistent layouts

### Key Files

| File | Purpose |
|------|---------|
| `src/utilities/url-params.ts` | Defines `inbounds` URL parameter |
| `src/models/ui-state.ts` | `inboundsMode` getter from URL param |
| `src/models/document/inbounds-scaling.ts` | `InBoundsScaling` class - ephemeral scaling state |
| `src/utilities/inbounds-utils.ts` | Scaling algorithms and utility functions |
| `src/hooks/use-inbounds-scaling.ts` | Hook that manages scaling lifecycle |
| `src/components/container/free-tile-component.tsx` | Renders tiles with scaled coordinates |
| `src/components/container/use-tile-drag.ts` | Drag handling with inbounds constraints |
| `src/components/container/use-tile-resize.ts` | Resize handling with inbounds constraints |
| `src/components/container/free-tile-row.scss` | CSS for hiding scrollbars |

### InBoundsScaling Class

The `InBoundsScaling` class (`src/models/document/inbounds-scaling.ts`) is a MobX observable singleton that manages:

```typescript
class InBoundsScaling {
  scaleFactor: number      // Current scale (0.1 to 1.0)
  scaleBoundsX: number     // Required width at 100%
  scaleBoundsY: number     // Required height at 100%
  containerWidth: number   // Current container width
  containerHeight: number  // Current container height
  isResizing: boolean      // True during window resize (disables animations)
}
```

The `isResizing` flag is used to disable CSS transitions during window resize, preventing laggy animations. It's set when the container size changes (after initial measurement) and cleared after a 150ms debounce.

### Scaling Algorithm

1. **Compute Scale Bounds**: Find the bounding box of all visible tiles at 100% scale
   - For each tile: `rightEdge = x + width + inspectorWidth`
   - `scaleBoundsX = max(rightEdge)` across all tiles
   - `scaleBoundsY = max(bottomEdge)` across all tiles

2. **Compute Scale Factor**:
   ```
   widthRatio = containerWidth / scaleBoundsX
   heightRatio = containerHeight / scaleBoundsY
   scaleFactor = max(0.1, min(widthRatio, heightRatio, 1.0))
   ```

3. **Apply to Rendering**: Each tile's position and size is multiplied by `scaleFactor` before rendering

### User Interaction Flow

**Dragging a tile:**
1. Work in scaled coordinates during drag
2. Apply inbounds constraints (0 ≤ x ≤ maxX, 0 ≤ y ≤ maxY)
3. On drop, convert back to unscaled: `unscaled = scaled / scaleFactor`
4. Store unscaled coordinates in MST model

**Resizing a tile:**
1. Work in scaled coordinates during resize
2. Constrain dimensions to stay within container bounds
3. On release, convert back to unscaled coordinates
4. Store unscaled dimensions in MST model

### Inspector Panel Handling

Components with inspector panels (graph, table, etc.) need extra space on the right. The constant `kInspectorPanelWidth` (72px) is added to width calculations:

- When computing scale bounds: `rightEdge = x + width + inspectorWidth`
- When constraining drag: `maxX = containerWidth - tileWidth - inspectorWidth`

## CSS Classes

- `.codap-app.inbounds-mode` - Applied to root when inbounds mode is active
- `.disable-animation` - Applied to tiles during window resize to prevent transition lag

## Testing

Unit tests cover:
- `src/utilities/inbounds-utils.test.ts` - Scaling algorithms (35 tests)
- `src/models/document/inbounds-scaling.test.ts` - InBoundsScaling class (23 tests)

To test manually:
1. Start dev server: `npm start`
2. Open with parameter: `http://localhost:8080/?inbounds=true`
3. Test scenarios:
   - Drag tiles to edges (should stop at boundary)
   - Resize tiles beyond container (should be constrained)
   - Resize browser window smaller (tiles should scale down)
   - Resize browser window larger (tiles scale up, max 100%)
   - Verify no scrollbars appear

## V2 Compatibility

This feature ports the V2 `inBounds` URL parameter behavior. The V2 implementation used similar concepts but with different architecture. Key behavioral parity:
- Grid snapping (5px) for positions
- Uniform scaling
- Inspector panel width handling
- No scrollbars in container
