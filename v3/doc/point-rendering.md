# Point Rendering Architecture

This document describes the point rendering system used by graphs and maps in CODAP v3. The system provides an abstraction layer over PIXI.js (WebGL) rendering with automatic context pooling to handle browser limitations.

## Motivation

Browsers limit the number of WebGL contexts to approximately 16. When a CODAP document contains more than 16 graphs, some graphs would fail to render silently because they couldn't acquire a WebGL context. Additionally, minimized or off-screen graphs were holding onto contexts unnecessarily.

The refactoring addresses these issues by:
1. Pooling WebGL contexts with a configurable maximum (default 14, leaving headroom)
2. Providing priority-based context allocation (graphs with more points get priority)
3. Supporting user interaction priority (clicking a graph bumps it to the top)
4. Gracefully degrading when contexts are unavailable (showing a placeholder message)
5. Preserving point state across renderer switches (so graphs restore correctly when contexts become available)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   WebGLContextManager (singleton)               │
│   - Tracks active contexts (max ~14)                            │
│   - Priority queue for context requests                         │
│   - Notifies consumers when context granted/revoked             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     usePointRenderer hook                       │
│   - Observes visibility (IntersectionObserver)                  │
│   - Observes minimized state                                    │
│   - Requests/releases context from manager                      │
│   - Creates appropriate renderer based on context availability  │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────────────┐
│   NullPointRenderer       │ │     PixiPointRenderer             │
│   - Tracks state          │ │     - Full PIXI.js rendering      │
│   - No actual rendering   │ │     - WebGL context consumer      │
│   - Instant transitions   │ │     - Syncs from shared state     │
└───────────────────────────┘ └───────────────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                ┌─────────────────────────────┐
                │         PointsState         │
                │    - Canonical point data   │
                │    - Survives renderer swap │
                └─────────────────────────────┘
```

## Key Components

### File Locations

Renderer core classes are in `src/components/data-display/renderer/`:

| File | Purpose |
|------|---------|
| `point-renderer-types.ts` | Core type definitions (`IPoint`, `IPointStyle`, `IPointMetadata`, etc.) |
| `points-state.ts` | `PointsState` class - canonical point data that survives renderer switches |
| `point-renderer-base.ts` | `PointRendererBase` abstract class with shared logic |
| `null-point-renderer.ts` | `NullPointRenderer` - no-op renderer for context-starved graphs |
| `pixi-point-renderer.ts` | `PixiPointRenderer` - full PIXI.js/WebGL rendering |
| `webgl-context-manager.ts` | `WebGLContextManager` singleton managing context pool |
| `use-point-renderer.ts` | React hook: `usePointRenderer` |
| `use-point-renderer-array.ts` | React hook: `usePointRendererArray` for multi-layer support |
| `point-renderer-context.tsx` | React context for renderer access |
| `index.ts` | Public API exports |

Additional hooks are in `src/components/data-display/hooks/`:

| File | Purpose |
|------|---------|
| `use-renderer-pointer-down.ts` | `useRendererPointerDown` - handles pointer down events on renderer canvas |
| `use-renderer-pointer-down-deselect.ts` | `useRendererPointerDownDeselect` - deselection behavior on background click |

### PointRendererBase

Abstract base class that defines the renderer interface. Uses the Template Method pattern:
- Base class manages `PointsState` and provides concrete implementations for state operations
- Subclasses implement `do*` methods for renderer-specific behavior

```typescript
abstract class PointRendererBase {
  // Shared state
  protected state: PointsState

  // Abstract methods subclasses must implement
  protected abstract doInit(options?: IPointRendererOptions): Promise<void>
  protected abstract doDispose(): void
  protected abstract doSetPointPosition(pointId: string, x: number, y: number): void
  protected abstract doSetPointStyle(pointId: string, style: Partial<IPointStyle>): void
  // ... etc

  // Template methods that update state then delegate
  setPointPosition(point: IPoint, x: number, y: number): void {
    this.state.updatePointPosition(point.id, x, y)
    this.doSetPointPosition(point.id, x, y)
  }

  // Post-init configuration (used by maps)
  setupResizeObserver(resizeTo: HTMLElement): void
  setupBackgroundEventDistribution(options: IBackgroundEventDistributionOptions): void
}
```

### IPoint (Opaque Handle)

Points are represented by opaque handles to avoid exposing PIXI.js internals:

```typescript
interface IPoint {
  readonly id: string
}
```

Consumers work with `IPoint` handles and pass them to renderer methods. The renderer looks up the actual sprite/graphics object internally.

### PointsState

Canonical storage for point data that survives renderer switches:

```typescript
class PointsState {
  // Maps point ID to state
  private points: Map<string, IPointState>
  // Maps case data key to point ID
  private caseDataToPointId: Map<string, string>

  // State includes position, style, selection, subplot assignment
  interface IPointState {
    id: string
    x: number
    y: number
    scale: number
    style: IPointStyle
    isRaised: boolean  // selected points are "raised" for z-ordering
    subPlotIndex: number
    metadata: IPointMetadata
  }
}
```

When switching from `PixiPointRenderer` to `NullPointRenderer` (context revoked) or vice versa (context granted), the new renderer inherits the same `PointsState` instance. This allows the graph to continue tracking point positions even without rendering, and restore correctly when a context becomes available.

### WebGLContextManager

Singleton that manages the pool of WebGL contexts:

```typescript
class WebGLContextManager {
  readonly maxContexts = 14  // Leave headroom below browser limit

  // Request a context for a consumer
  requestContext(consumer: IContextConsumer): boolean

  // Yield context (still registered, but available for others)
  yieldContext(consumerId: string): void

  // Fully release (unregister) a consumer
  releaseContext(consumerId: string): void

  // Update priority (for dynamic priority changes)
  updatePriority(consumerId: string, priority: number): void

  // Get next user interaction priority (incrementing counter)
  getNextUserInteractionPriority(): number
}

interface IContextConsumer {
  readonly id: string
  readonly priority: number
  onContextGranted(): void
  onContextRevoked(): void
}
```

**Priority System:**
- Base priority is typically the point count (graphs with more data get priority)
- User interaction (clicking/selecting a graph) assigns a very high priority (1 billion+, incrementing)
- When the pool is full and a higher-priority consumer requests a context, the lowest-priority active consumer is evicted

### usePointRenderer Hook

React hook that integrates visibility observation, context management, and renderer lifecycle:

```typescript
function usePointRenderer(options: IUsePointRendererOptions): IUsePointRendererResult

interface IUsePointRendererOptions {
  id: string                                    // Unique identifier (tile ID)
  isMinimized?: boolean                         // Whether component is minimized
  priority?: number                             // Priority for context allocation
  containerRef?: React.RefObject<HTMLElement>   // For visibility observation
  onRendererChange?: (renderer: PointRendererBase) => void
  rendererOptions?: IPointRendererOptions       // Options for renderer init
  skipContextRegistration?: boolean             // Skip WebGL context management
}

interface IUsePointRendererResult {
  renderer: PointRendererBase      // Current renderer (Pixi or Null)
  hasWebGLContext: boolean         // Whether we have a WebGL context
  contextWasDenied: boolean        // Whether a request was denied (for placeholder)
  isVisible: boolean               // Whether component is visible
  isReady: boolean                 // Whether renderer is initialized
  state: PointsState               // Shared state
  requestContextWithHighPriority: () => void  // For user interaction
}
```

The hook:
1. Sets up an `IntersectionObserver` to track visibility
2. Requests/yields contexts based on visibility and minimized state
3. Creates the appropriate renderer (`PixiPointRenderer` or `NullPointRenderer`)
4. Handles renderer switching when context availability changes

### usePointRendererArray Hook

For components that need multiple renderers (e.g., maps with multiple data sets):

```typescript
function usePointRendererArray(options: IUsePointRendererArrayOptions): IUsePointRendererArrayResult

interface IUsePointRendererArrayOptions {
  baseId: string                                // Base ID for renderers (suffixed with layer index)
  isMinimized?: boolean                         // Whether component is minimized
  priority?: number                             // Priority for context allocation
  containerRef?: React.RefObject<HTMLElement>   // For visibility observation
  addInitialRenderer?: boolean                  // Whether to create a primary renderer (graphs: true, maps: false)
}

interface IUsePointRendererArrayResult {
  rendererArray: Array<PointRendererBase | undefined>
  setRendererLayer: (renderer: PointRendererBase, layerIndex: number) => void
  hasAnyWebGLContext: boolean
  contextWasDenied: boolean
  isVisible: boolean
  requestContextWithHighPriority: () => void
  contextValue: IPointRendererArrayContextValue  // For PointRendererArrayContext.Provider
}
```

The hook returns a `contextValue` that should be passed to `PointRendererArrayContext.Provider` to enable child components to use `useLayerRenderer`.

### useLayerRenderer Hook

For child components (e.g., map point layers) that need their own context-managed renderer:

```typescript
function useLayerRenderer(layerIndex: number, options?: IUseLayerRendererOptions): IUseLayerRendererResult

interface IUseLayerRendererOptions {
  layerPriority?: number                        // Optional priority override for this layer
  rendererOptions?: IPointRendererOptions       // Options for renderer init
}

interface IUseLayerRendererResult {
  renderer: PointRendererBase | undefined
  isReady: boolean
  hasWebGLContext: boolean
}
```

This hook must be used within a `PointRendererArrayContext.Provider`. It:
1. Creates a context-managed renderer using settings from the parent context
2. Automatically registers the renderer with the parent via `setRendererLayer`
3. Participates in WebGL context pooling

## Placeholder UI

When a graph cannot get a WebGL context, it displays a placeholder message instead of rendering nothing. The placeholder:
- Explains that rendering is paused due to too many graphs
- Instructs the user to close/minimize other graphs or click to prioritize
- Is clickable to request a high-priority context

The placeholder is only shown when `contextWasDenied` is true, which prevents flashing during initial render before the first context request completes.

## Usage Examples

### Graph Component

```typescript
// In graph-component.tsx
const {
  rendererArray,
  hasAnyWebGLContext,
  contextWasDenied,
  isVisible,
  requestContextWithHighPriority
} = usePointRendererArray({
  baseId: tileId,
  isMinimized,
  priority: dataConfiguration.filteredCases[0]?.caseIds.length ?? 0,
  containerRef: graphRef,
  addInitialRenderer: true
})

// Pass to child components
<Graph
  rendererArray={rendererArray}
  contextWasDenied={contextWasDenied}
  isRendererVisible={isVisible}
  onRequestContext={requestContextWithHighPriority}
/>
```

### Map Component

Maps use `usePointRendererArray` with `addInitialRenderer: false` and provide context for child layers:

```typescript
// In map-component.tsx
const { rendererArray, contextValue } = usePointRendererArray({
  baseId: tileId,
  isMinimized,
  containerRef: mapRef
  // Note: addInitialRenderer defaults to false for maps
})

// Wrap children in context provider
<PointRendererArrayContext.Provider value={contextValue}>
  <CodapMap rendererArray={rendererArray} />
</PointRendererArrayContext.Provider>

// In map-point-layer.tsx - each layer gets its own context-managed renderer
const { renderer } = useLayerRenderer(layerIndex)

// Configure renderer after it's available
useEffect(function configureRenderer() {
  if (!renderer || !containerRef.current) return
  renderer.setupResizeObserver(containerRef.current)
  renderer.setupBackgroundEventDistribution({
    elementToHide: containerRef.current
  })
}, [renderer])
```

This approach ensures map point layers participate in WebGL context pooling, allowing them to gracefully yield and reacquire contexts as graphs are created/closed.

## Event Handling

Point renderers support the following event callbacks:

```typescript
// Optional event handlers (assign to renderer instance)
renderer.onPointerOver = (event, point, metadata) => { ... }
renderer.onPointerLeave = (event, point, metadata) => { ... }
renderer.onPointerClick = (event, point, metadata) => { ... }
renderer.onPointerDragStart = (event, point, metadata) => { ... }
renderer.onPointerDrag = (event, point, metadata) => { ... }
renderer.onPointerDragEnd = (event, point, metadata) => { ... }
```

Event handlers receive:
- `event`: The browser `PointerEvent`
- `point`: An `IPoint` handle (use with renderer methods)
- `metadata`: `IPointMetadata` with `caseID`, `plotNum`, `datasetID`, `x`, `y`

## Animation and Transitions

The renderer supports animated transitions:

```typescript
renderer.transition(() => {
  // Update point positions/styles inside callback
  renderer.forEachPoint((point, metadata) => {
    renderer.setPositionOrTransition(point, style, x, y)
  })
}, { duration: 500 })
```

The `NullPointRenderer` completes transitions instantly since there's nothing to animate.

## Subplot Masking

For graphs with categorical splits, points are assigned to subplots and masked:

```typescript
// Resize creates subplot masks
renderer.resize(width, height, xCats, yCats, topCats, rightCats)

// Each point is assigned to a subplot
renderer.setPointSubPlot(point, subPlotIndex)
```

## Type Guards

For code that needs to check renderer types:

```typescript
import { isPixiPointRenderer } from "./renderer"

if (isPixiPointRenderer(renderer)) {
  // Access PixiPointRenderer-specific functionality
}
```

## Future Considerations

1. **SVG Fallback**: The architecture supports adding an `SvgPointRenderer` for environments without WebGL, though this is not currently implemented.

2. **Performance Monitoring**: The `WebGLContextManager` could be extended to track context usage statistics for debugging.

3. **Context Recovery**: The current system handles context switching when the `WebGLContextManager` revokes/grants contexts (priority-based pooling). However, browser-level context loss events (e.g., GPU reset, system-wide WebGL resource pressure) are not explicitly handled. A future enhancement could listen for `webglcontextlost` events and automatically recreate the renderer.

4. **Dynamic Context Limit**: The current implementation assumes browsers support ~16 WebGL contexts and sets a conservative limit of 14. However, some browsers or devices may support fewer contexts. A future enhancement could listen for `webglcontextlost` events to detect when the actual browser limit has been exceeded and dynamically reduce `maxContexts` accordingly.
