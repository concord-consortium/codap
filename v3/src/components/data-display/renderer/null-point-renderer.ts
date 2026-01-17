import { PointDisplayType } from "../data-display-types"
import { CaseDataWithSubPlot } from "../d3-types"
import { PointRendererBase } from "./point-renderer-base"
import { PointsState } from "./points-state"
import {
  IBackgroundEventDistributionOptions,
  IPointRendererOptions,
  IPointStyle,
  RendererCapability
} from "./point-renderer-types"

/**
 * A no-op renderer that tracks state but doesn't actually render anything.
 * Used when:
 * - A component is minimized or off-screen
 * - WebGL contexts are unavailable (context pool exhausted)
 * - Initial state before a real renderer is ready
 *
 * All state updates are tracked via the base class's PointsState,
 * so when a PixiPointRenderer takes over, it can sync from that state.
 */
export class NullPointRenderer extends PointRendererBase {
  constructor(state?: PointsState) {
    super(state)
  }

  // ===== Abstract property implementations =====

  get canvas(): HTMLCanvasElement | null {
    return null
  }

  get capability(): RendererCapability {
    return "null"
  }

  get anyTransitionActive(): boolean {
    return false
  }

  // ===== Abstract method implementations (all no-ops) =====

  protected async doInit(_options?: IPointRendererOptions): Promise<void> {
    // No initialization needed for null renderer
  }

  protected doDispose(): void {
    // No resources to clean up
  }

  protected doResize(
    _width: number,
    _height: number,
    _xCats: number,
    _yCats: number,
    _topCats: number,
    _rightCats: number
  ): void {
    // No visual representation to resize
  }

  protected doMatchPointsToData(
    _datasetID: string,
    caseData: CaseDataWithSubPlot[],
    _displayType: PointDisplayType,
    style: IPointStyle
  ): void {
    // Sync state - the base class will call this, and we track the data
    // but don't create any visual representation
    this.state.syncWithCaseData(caseData, style)
  }

  protected doSetPointPosition(_pointId: string, _x: number, _y: number): void {
    // Position is tracked in state by base class, nothing visual to update
  }

  protected doSetPointScale(_pointId: string, _scale: number): void {
    // Scale is tracked in state by base class, nothing visual to update
  }

  protected doSetPointStyle(_pointId: string, _style: Partial<IPointStyle>): void {
    // Style is tracked in state by base class, nothing visual to update
  }

  protected doSetPointRaised(_pointId: string, _raised: boolean): void {
    // Raised state is tracked in state by base class, nothing visual to update
  }

  protected doSetPointSubPlot(_pointId: string, _subPlotIndex: number): void {
    // Subplot is tracked in state by base class, nothing visual to update
  }

  protected async doTransition(callback: () => void, _duration: number): Promise<void> {
    // Execute callback immediately without animation
    callback()
  }

  protected doStartRendering(): void {
    // No rendering loop to start
  }

  protected doRemoveMasks(): void {
    // No masks to remove
  }

  protected doSetVisibility(_isVisible: boolean): void {
    // No visual representation to show/hide
  }

  protected async doSetAllPointsScale(_scale: number, _duration: number): Promise<void> {
    // Scale is tracked in state by base class, nothing visual to update
  }

  protected doSetPositionOrTransition(
    _pointId: string,
    _style: Partial<IPointStyle>,
    _x: number,
    _y: number
  ): void {
    // Position and style tracked in state by base class, nothing visual to update
  }

  protected doSetupBackgroundEventDistribution(
    _options: IBackgroundEventDistributionOptions
  ): void {
    // No canvas to set up event distribution on
  }
}
