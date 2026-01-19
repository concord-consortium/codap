# Implementation Plan: CanvasPointRenderer and SvgPointRenderer

## Overview

Add two new renderers to the point rendering system:
1. **CanvasPointRenderer** - Full interactive renderer using Canvas 2D API as WebGL fallback
2. **SVG Export Utility** - Generates clean SVG output for image export (not a full renderer class)

## Motivation

Browsers limit the number of WebGL contexts to approximately 16. When a CODAP document contains more graphs than available contexts, some graphs cannot render. The current system falls back to `NullPointRenderer` which shows a placeholder message.

Additionally, SVG export is needed for image export functionality. The previous approach using `<foreignObject>` with embedded canvas images has compatibility issues in many applications.

This plan addresses both needs:
- **CanvasPointRenderer** provides a visual fallback when WebGL contexts are exhausted
- **SVG Export Utility** generates clean, native SVG for export

## Design Decisions

### CanvasPointRenderer
- Full renderer class extending `PointRendererBase`
- Uses **d3-quadtree** for efficient hit testing (O(log n) lookups)
- Animation via `requestAnimationFrame` with interpolation (similar to PixiTransition)
- Same event callback API as PixiPointRenderer

### SVG Export
- Implemented as a **utility function** rather than full renderer class
- Reads from `PointsState` and generates SVG elements directly
- No event handling or animation support needed
- Integrates with existing export flow in `image-utils.ts`

### WebGL Fallback Logic
```
hasWebGLContext → PixiPointRenderer
!hasWebGLContext && isVisible → CanvasPointRenderer (new)
!hasWebGLContext && !isVisible → NullPointRenderer
```

### Why Keep PIXI.js?
We considered dropping PIXI.js entirely in favor of a unified WebGL/Canvas abstraction. However, PIXI.js provides significant value:
- Handles complex WebGL concerns (batching, texture management, context loss recovery)
- Battle-tested across browsers
- Our use case benefits from its optimizations

The CanvasPointRenderer provides fallback capability without the risk of reimplementing WebGL rendering from scratch.

## Files to Create

| File | Purpose | ~Lines |
|------|---------|--------|
| `renderer/canvas-point-renderer.ts` | Canvas 2D renderer implementation | 450 |
| `renderer/canvas-point-renderer.test.ts` | Unit tests | 300 |
| `renderer/canvas-transition.ts` | Animation system for Canvas | 80 |
| `renderer/canvas-hit-testing.ts` | Quadtree-based hit testing | 150 |
| `graph/utilities/svg-export-utils.ts` | SVG generation from PointsState | 120 |
| `graph/utilities/svg-export-utils.test.ts` | Unit tests | 80 |

## Files to Modify

| File | Changes |
|------|---------|
| `renderer/index.ts` | Export new renderer and utilities |
| `renderer/use-point-renderer.ts` | Add Canvas fallback logic |
| `renderer/point-renderer-types.ts` | Add `"canvas"` to `RendererCapability` |
| `graph/utilities/image-utils.ts` | Integrate SVG export utility |

## Implementation Order

### Phase 1: Foundation
1. **canvas-transition.ts** - Transition system mirroring PixiTransition
2. **canvas-hit-testing.ts** - Quadtree wrapper using d3-quadtree

### Phase 2: Core Renderer
3. **canvas-point-renderer.ts** - Implement all abstract methods:
   - Canvas context management
   - Render loop with requestAnimationFrame
   - Point rendering (circles and rectangles)
   - Subplot masking using ctx.clip()

### Phase 3: Event Handling
4. Add to canvas-point-renderer.ts:
   - Single canvas event listeners
   - Hit testing integration
   - Hover/drag state management
   - Background event distribution

### Phase 4: Integration
5. **use-point-renderer.ts** - Add Canvas fallback when WebGL denied but visible
6. **point-renderer-types.ts** - Add "canvas" capability
7. **index.ts** - Export new components

### Phase 5: SVG Export
8. **svg-export-utils.ts** - `generateSvgFromPointsState()` function
9. **image-utils.ts** - Integrate with graphSvg() export flow

### Phase 6: Testing
10. Unit tests for all new code
11. Integration testing for renderer switching

## Key Implementation Patterns

### CanvasPointRenderer Structure
```typescript
export class CanvasPointRenderer extends PointRendererBase {
  private _canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private hitTester: CanvasHitTester
  private transitions: CanvasTransition[] = []
  private hoveredPointId: string | null = null
  private dragState: { pointId: string } | null = null
  private rafId: number | null = null
  private needsRender = false
  private subPlotMasks: Path2D[] = []

  get canvas() { return this._canvas }
  get capability(): RendererCapability { return "canvas" }
  get anyTransitionActive() { return this.transitions.length > 0 }
}
```

### Hit Testing
```typescript
export class CanvasHitTester {
  private quadtree: d3.Quadtree<IPointHitData>

  rebuild(state: PointsState): void
  findPointAt(x: number, y: number): string | undefined
  updatePoint(id: string, x: number, y: number): void
}
```

### SVG Export
```typescript
export function generateSvgFromPointsState(
  state: PointsState,
  options: ISvgExportOptions
): SVGSVGElement
```

## Critical Files Reference

- `v3/src/components/data-display/renderer/point-renderer-base.ts` - Base class to extend
- `v3/src/components/data-display/renderer/pixi-point-renderer.ts` - Reference for patterns
- `v3/src/components/data-display/renderer/null-point-renderer.ts` - Minimal implementation reference
- `v3/src/components/data-display/renderer/use-point-renderer.ts` - Hook to modify
- `v3/src/components/graph/utilities/image-utils.ts` - Export integration point

## Verification

### Automated Tests
- [ ] canvas-point-renderer.test.ts passes
- [ ] svg-export-utils.test.ts passes
- [ ] Existing renderer tests still pass
- [ ] `npm run build:tsc` passes
- [ ] `npm run lint` passes

### Manual Testing
- [ ] Create graph, exhaust WebGL contexts (14+ graphs), verify Canvas fallback works
- [ ] Test hover interactions (tooltip appears)
- [ ] Test click selection
- [ ] Test drag interactions
- [ ] Test subplot masking with categorical splits
- [ ] Test display type transitions (points ↔ bars)
- [ ] Test image export generates correct SVG output
- [ ] Compare Canvas vs Pixi rendering fidelity

### Performance Testing
- [ ] Test with 10,000+ points - verify acceptable frame rate
- [ ] Verify quadtree hit testing performance under load

## Open Questions for Discussion

1. **d3-quadtree**: Is this already available as a dependency, or do we need to add it?
2. **Performance threshold**: At what point count should we consider the Canvas renderer "too slow" and show a degraded experience message?
3. **Export priority**: Should SVG export use the CanvasPointRenderer's state or always read directly from PointsState?
