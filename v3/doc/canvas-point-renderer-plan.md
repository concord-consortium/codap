# Canvas 2D Fallback Renderer Implementation Plan

## Overview

Implement a `CanvasPointRenderer` class that extends `PointRendererBase` to provide a Canvas 2D fallback when WebGL is unavailable. The Canvas renderer will be used when:
- The WebGLContextManager denies a context (too many graphs)
- WebGL is not supported by the browser/device

This provides a middle ground between full WebGL rendering (`PixiPointRenderer`) and no rendering (`NullPointRenderer`), allowing users to see their data even when WebGL resources are exhausted.

---

## Remaining To Do
- [ ] Hover cursor change on point hover in Canvas mode
- [ ] Brief appearance on refresh document of some kind of rendering indication in graph before points display
- [ ] Hover animation when mouse goes over a point is different (missing?) in Canvas mode vs WebGL mode
- [ ] Some plots (perhaps dots with top/right splits) don't animate when swapping axes or other changes

## Files to Create

| File | Purpose |
|------|---------|
| `v3/src/components/data-display/renderer/canvas-point-renderer.ts` | Main CanvasPointRenderer class |
| `v3/src/components/data-display/renderer/canvas-point-renderer.test.ts` | Jest unit tests |
| `v3/src/components/data-display/renderer/canvas/canvas-transition.ts` | Animation/transition system |
| `v3/src/components/data-display/renderer/canvas/canvas-hit-tester.ts` | Spatial hit testing for mouse interactions |
| `v3/src/components/data-display/renderer/canvas/index.ts` | Exports for canvas subfolder |

## Files to Modify

| File | Changes |
|------|---------|
| `v3/src/components/data-display/renderer/point-renderer-types.ts` | Add `"canvas"` to `RendererCapability` type |
| `v3/src/components/data-display/renderer/use-point-renderer.ts` | Add Canvas fallback logic when WebGL unavailable |
| `v3/src/components/data-display/renderer/use-point-renderer-array.ts` | Expose `useCanvasFallback` state for UI indicator |
| `v3/src/components/data-display/renderer/index.ts` | Export `CanvasPointRenderer` and type guard |
| `v3/src/components/graph/components/graph.tsx` | Add subtle Canvas mode indicator badge |
| `v3/src/components/map/components/codap-map.tsx` | Add subtle Canvas mode indicator badge (if applicable) |
| `v3/doc/point-rendering.md` | Document Canvas fallback behavior and update architecture diagram |

---

## Architecture Design

### Renderer Fallback Hierarchy

```
                              ┌─────────────────────────────────────────────────────────────────┐
                              │                   WebGLContextManager (singleton)               │
                              │   - Tracks active WebGL contexts (max ~14)                      │
                              │   - Priority queue for context requests                         │
                              └─────────────────────────────────────────────────────────────────┘
                                                            │
                                                            ▼
                              ┌─────────────────────────────────────────────────────────────────┐
                              │                     usePointRenderer hook                       │
                              │   - Observes visibility (IntersectionObserver)                  │
                              │   - Requests/releases context from manager                      │
                              │   - Creates appropriate renderer based on context availability  │
                              └─────────────────────────────────────────────────────────────────┘
                                                            │
                              ┌─────────────────────────────┼─────────────────────────────┐
                              ▼                             ▼                             ▼
                ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
                │   PixiPointRenderer       │ │   CanvasPointRenderer     │ │   NullPointRenderer       │
                │   - Full WebGL rendering  │ │   - Canvas 2D rendering   │ │   - Tracks state only     │
                │   - Best performance      │ │   - Hit testing           │ │   - No actual rendering   │
                │   - Context pooled        │ │   - Animated transitions  │ │   - Instant transitions   │
                └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
                              │                             │                             │
                              └─────────────────────────────┼─────────────────────────────┘
                                                            ▼
                                              ┌─────────────────────────────┐
                                              │         PointsState         │
                                              │    - Canonical point data   │
                                              │    - Survives renderer swap │
                                              └─────────────────────────────┘
```

### Fallback Logic

1. If `hasWebGLContext` is true → `PixiPointRenderer`
2. If WebGL was denied (`contextWasDenied`) or WebGL not supported → `CanvasPointRenderer`
3. If Canvas init fails (very rare) → `NullPointRenderer`

**Key decisions**:
- Canvas renderer does NOT participate in WebGLContextManager since Canvas 2D contexts are unlimited
- Show a subtle indicator (badge/tooltip) when using Canvas mode for transparency

### Canvas Mode Indicator

When a graph falls back to Canvas rendering, display a subtle visual indicator:
- Small badge in corner of graph (e.g., "2D" or canvas icon)
- Tooltip on hover explaining "Using Canvas 2D rendering (WebGL unavailable)"
- Non-intrusive - doesn't block any graph functionality

---

## CanvasPointRenderer Class Design

### Core Structure

```typescript
export class CanvasPointRenderer extends PointRendererBase {
  // Canvas elements
  private _canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  // Hit testing
  private hitTester: CanvasHitTester | null = null

  // Transition state
  private transitionManager: CanvasTransitionManager | null = null
  private renderLoopActive = false
  private animationFrameId: number | null = null

  // Rendering state
  private needsRedraw = false
  private subPlotClipRects: Array<{ x: number, y: number, width: number, height: number }> = []

  // Resize observer
  private resizeObserver?: ResizeObserver

  // Disposed flag
  private isDisposed = false

  get canvas(): HTMLCanvasElement | null { return this._canvas }
  get capability(): RendererCapability { return "canvas" }
  get anyTransitionActive(): boolean {
    return this.transitionManager?.hasActiveTransitions() ?? false
  }
}
```

### Key Abstract Method Implementations

| Method | Implementation Approach |
|--------|------------------------|
| `doInit` | Create canvas element, get 2D context, initialize hit tester and transition manager, set up event listeners |
| `doDispose` | Clean up canvas, disconnect resize observer, cancel animation frames |
| `doResize` | Resize canvas, recalculate subplot clip rectangles |
| `doMatchPointsToData` | Sync state, mark for redraw |
| `doSetPointPosition/Scale/Style` | Update state, mark for redraw (or start transition if active) |
| `doTransition` | Begin transition with duration, schedule render loop |
| `doStartRendering` | Start requestAnimationFrame loop, process transitions, redraw canvas |
| `doSetupBackgroundEventDistribution` | Set up pointer event handlers to forward to underlying elements |
| `doSetupResizeObserver` | Create ResizeObserver to auto-resize canvas |

### Rendering Loop

```typescript
private renderFrame = (): void => {
  if (this.isDisposed) {
    this.renderLoopActive = false
    return
  }

  // Process transitions
  if (this.transitionManager?.hasActiveTransitions()) {
    this.transitionManager.step()
    this.needsRedraw = true
  }

  // Render if needed
  if (this.needsRedraw) {
    this.drawAllPoints()
    this.needsRedraw = false
  }

  // Continue loop if transitions active
  if (this.transitionManager?.hasActiveTransitions()) {
    this.animationFrameId = requestAnimationFrame(this.renderFrame)
  } else {
    this.renderLoopActive = false
  }
}
```

### Point Drawing

```typescript
private drawPoint(point: IPointState): void {
  const { x, y, scale, style } = point

  this.ctx.save()
  this.ctx.translate(x, y)
  this.ctx.scale(scale, scale)

  if (this._displayType === 'bars' && style.width && style.height) {
    // Draw rectangle
    const rectX = -this._anchor.x * style.width
    const rectY = -this._anchor.y * style.height
    this.ctx.fillStyle = style.fill
    this.ctx.fillRect(rectX, rectY, style.width, style.height)
    // stroke...
  } else {
    // Draw circle
    this.ctx.beginPath()
    this.ctx.arc(0, 0, style.radius, 0, Math.PI * 2)
    this.ctx.fillStyle = style.fill
    this.ctx.fill()
    // stroke...
  }

  this.ctx.restore()
}
```

---

## Transition System

### CanvasTransitionManager

Create a canvas-specific transition system that:
- Uses the **same interpolation function** as `PixiTransition` for visual consistency
- Updates `PointsState` directly (not sprite properties)
- Tracks active transitions by `pointId:prop` key

```typescript
export class CanvasTransitionManager {
  private activeTransitions = new Map<string, ICanvasTransitionTarget>()
  private currentTransition: CanvasTransition | null = null

  beginTransition(duration: number, onEnd?: () => void): void
  endTransition(): void
  setTarget(pointId: string, prop: CanvasTransitionProp, startValue: number, targetValue: number): void
  hasActiveTransitions(): boolean
  step(): void  // Called each frame to interpolate values
}
```

**Key design decision**: Create new transition manager rather than reuse `PixiTransition` because:
1. `PixiTransition` is tightly coupled to `PIXI.Sprite` objects
2. Canvas uses immediate-mode rendering, updating `PointsState` directly
3. Interpolation function (`smoother`) is identical for visual consistency

---

## Hit Testing Strategy

### Grid-Based Spatial Hash

Use a grid-based spatial hash for efficient hit testing:
- Cell size: 50 pixels
- O(1) average lookup time
- Rebuilt after each render from current positions

```typescript
export class CanvasHitTester {
  private readonly cellSize = 50
  private grid = new Map<string, IHitTestEntry[]>()

  updateFromPoints(points: IPointState[], displayType, anchor): void
  hitTest(x: number, y: number): string | undefined  // Returns pointId or undefined
}
```

**Why spatial hash over alternatives**:
- Simple iteration: O(n) per hit test, too slow with 10K+ points
- Quadtree: Complex, rebalancing overhead
- Spatial hash: O(1) lookup, simple to implement, fast updates during animations

**Handling overlapping points (z-ordering)**:
- Each grid cell stores an array of all overlapping points
- Hit test returns the topmost point based on:
  - Raised (selected) points always on top
  - Among same-raised-state points, last in render order wins (matches visual order)

---

## Hook Modifications

### Updated usePointRenderer

```typescript
// Add WebGL support detection
const webGLSupported = useMemo(() => {
  try {
    const testCanvas = document.createElement('canvas')
    return !!(testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
  } catch { return false }
}, [])

// Three-tier fallback logic
useEffect(() => {
  let newRenderer: PointRendererBase

  if (hasWebGLContext) {
    newRenderer = new PixiPointRenderer(stateRef.current)
  } else if (webGLSupported && !contextWasDenied) {
    newRenderer = new NullPointRenderer(stateRef.current)  // Temporary
  } else {
    newRenderer = new CanvasPointRenderer(stateRef.current)  // Fallback
  }

  // ... init and error handling
}, [hasWebGLContext, contextWasDenied, webGLSupported])
```

---

## Testing Approach

### Jest Unit Tests

1. **CanvasPointRenderer tests** (similar structure to `null-point-renderer.test.ts`):
   - Construction (creates/uses PointsState)
   - Capability reports "canvas"
   - Canvas element creation
   - Point drawing (circles, bars)
   - Hit testing
   - Transitions
   - Subplot clipping
   - State sharing between renderers

2. **CanvasHitTester tests**:
   - Grid population
   - Hit detection accuracy
   - Z-ordering (raised points prioritized)

3. **CanvasTransitionManager tests**:
   - Transition interpolation
   - Multiple concurrent transitions
   - Completion callbacks

### Canvas Mocking

Use `jest-canvas-mock` or minimal mocks:
```typescript
const mockContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  // ...
}
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext)
```

### Cypress Integration Tests

1. Force Canvas mode (exhaust WebGL contexts with 15+ graphs)
2. Verify point interactions (click, hover)
3. Verify transitions work smoothly

---

## Implementation Phases

### Phase 1: Core Infrastructure (1-2 days) - **Sequential**
1. Add `"canvas"` to `RendererCapability` type
2. Create `canvas/index.ts` with placeholder exports
3. Define interfaces for hit tester and transition manager

*Both developers should complete this together to establish shared contracts.*

### Phase 2: Renderer Skeleton (1-2 days) - **Sequential**
4. Create `canvas-point-renderer.ts` skeleton with all `do*` method stubs
5. Implement `doInit`, `doDispose`, `doResize`
6. Implement `doMatchPointsToData` and basic point sync
7. Implement basic rendering loop (`drawAllPoints`, `drawPoint`) without transitions

*Creates the foundation that both parallel workstreams will integrate with.*

---

### ⚡ PARALLEL WORK BEGINS HERE

After Phase 2 is complete, development can split into two parallel tracks:

```
                    ┌──────────────────────────────────────────┐
                    │          Phase 2 Complete                │
                    │   (Basic renderer draws static points)   │
                    └──────────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
    ┌──────────────────────────────┐       ┌──────────────────────────────┐
    │   TRACK A: Hit Testing +     │       │   TRACK B: Transitions +     │
    │   Interactivity (Developer 1)│       │   Animations (Developer 2)   │
    │                              │       │                              │
    │   • canvas-hit-tester.ts     │       │   • canvas-transition.ts     │
    │   • Pointer event listeners  │       │   • doTransition()           │
    │   • Hover effects            │       │   • Position/scale animate   │
    │   • Click/drag handling      │       │   • Display type transitions │
    │   • Hit tester unit tests    │       │   • Transition unit tests    │
    └──────────────────────────────┘       └──────────────────────────────┘
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │           Integration Point              │
                    │   (Merge tracks, verify both work)       │
                    └──────────────────────────────────────────┘
```

### Phase 3A: Hit Testing (Track A - Developer 1, 1-2 days)
8. Create `canvas/canvas-hit-tester.ts` with spatial hash implementation
9. Implement `updateFromPoints()` - rebuild spatial hash from point state
10. Implement `hitTest(x, y)` - find topmost point at coordinates
11. Handle z-ordering (raised points on top)
12. Write unit tests for hit tester

### Phase 3B: Interactivity (Track A - Developer 1, 1 day)
13. Set up canvas pointer event listeners in `doInit`
14. Integrate hit tester for hover detection
15. Implement hover effects (scale up for points, stroke change for bars)
16. Implement click handling (call `onPointerClick` callback)
17. Implement drag support (pointerdown → pointermove → pointerup)

### Phase 4A: Transition System (Track B - Developer 2, 1 day)
18. Create `canvas/canvas-transition.ts` with `CanvasTransition` class
19. Implement smoother interpolation (same as PixiTransition)
20. Create `CanvasTransitionManager` class
21. Implement `beginTransition()`, `endTransition()`, `setTarget()`
22. Implement `step()` to interpolate values each frame
23. Write unit tests for transition manager

### Phase 4B: Renderer Transition Integration (Track B - Developer 2, 1 day)
24. Implement `doTransition()` using `CanvasTransitionManager`
25. Modify rendering loop to call `transitionManager.step()`
26. Implement `doSetPointPosition` with transition support
27. Implement `doSetPointScale` with transition support
28. Implement `doSetPositionOrTransition` for display type changes
29. Implement `doSetAllPointsScale` with animation

---

### Phase 5: Integration & Merge (0.5 day) - **Sequential**
30. Merge both tracks into main branch
31. Verify hit testing and transitions work together
32. Handle edge cases (e.g., clicking during transition)

### Phase 6: Hook Integration & UI (1 day) - **Can start during Phase 3/4**
*This can begin once Phase 2 is done, in parallel with Phases 3-4*

33. Modify `use-point-renderer.ts` for Canvas fallback
34. Add WebGL support detection
35. Expose `useCanvasFallback` state in hook results
36. Add Canvas mode indicator badge to graph component
37. Add Canvas mode indicator badge to map component (if applicable)
38. Update exports in `index.ts`

### Phase 7: Testing & Documentation (1-2 days) - **Parallel tasks available**

```
    ┌────────────────────────┐     ┌────────────────────────┐
    │  Test Writing (Dev 1)  │     │ Documentation (Dev 2)  │
    │                        │     │                        │
    │  • Jest integration    │     │  • point-rendering.md  │
    │  • Cypress E2E tests   │     │  • Architecture docs   │
    └────────────────────────┘     └────────────────────────┘
```

39. Write Jest integration tests for full CanvasPointRenderer
40. Write Cypress tests for Canvas fallback behavior
41. Update `point-rendering.md` with Canvas renderer documentation
42. Update architecture diagrams

### Phase 8: Polish (0.5 day) - **Sequential**
43. Performance testing (1K, 5K, 10K points)
44. Edge case handling
45. Code review cleanup

---

## Parallelization Summary

| Phase | Developer 1 | Developer 2 | Notes |
|-------|------------|-------------|-------|
| 1-2 | Both | Both | Sequential - establish foundation |
| 3A/3B | Hit testing + Interactivity | - | Independent track |
| 4A/4B | - | Transitions + Animation | Independent track |
| 5 | Both | Both | Integration point |
| 6 | Can start early | Can start early | Independent of 3/4 |
| 7 | Testing | Documentation | Can split |
| 8 | Both | Both | Final polish |

**Key handoff points:**
- After Phase 2: Define clear interfaces for `CanvasHitTester` and `CanvasTransitionManager`
- After Phase 3A/4A: Both tracks can write unit tests independently
- Before Phase 5: Code review each track before merging

---

## Documentation Updates

### point-rendering.md additions

1. Add `CanvasPointRenderer` to Key Components section
2. Update architecture diagram to show three-tier fallback
3. Document performance characteristics:
   - Suitable for up to ~5,000 points
   - Immediate-mode rendering
   - O(1) hit testing via spatial hash
4. Document limitations vs WebGL:
   - No hardware acceleration
   - Slower transitions with many points
5. Remove/update "SVG Fallback" from Future Considerations (Canvas is now the fallback)

---

## Verification Plan

### Manual Testing
1. Create 16+ graphs to exhaust WebGL contexts
2. Verify graphs 15+ use Canvas renderer (check `renderer.capability`)
3. Test point interactions in Canvas mode (hover, click, drag)
4. Test transitions (add/remove data, resize)
5. Test with different point counts (100, 1000, 5000)

### Automated Testing
1. Run Jest tests: `npm test -- canvas-point-renderer`
2. Run Cypress tests: `npm run test:cypress -- --spec "**/*canvas*"`
3. Type check: `npm run build:tsc`

---

## Critical Files

- `v3/src/components/data-display/renderer/point-renderer-base.ts` - Base class defining abstract methods
- `v3/src/components/data-display/renderer/pixi-point-renderer.ts` - Reference implementation
- `v3/src/components/data-display/renderer/use-point-renderer.ts` - Hook to modify
- `v3/src/components/data-display/renderer/point-renderer-types.ts` - Types to extend
- `v3/src/components/data-display/pixi/pixi-transition.ts` - Transition pattern reference
- `v3/doc/point-rendering.md` - Documentation to update
