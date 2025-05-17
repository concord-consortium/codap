/**
 * This singleton class manages the pointer state for the application. The instigating reason
 * for creating this class is to prevent pixi points from displaying data tips when the pointer is down.
 */
export class PointerState {
  private static instance: PointerState
  private isPointerDown = false

  private constructor() {
    window.addEventListener("pointerdown", this.handlePointerDown)
    window.addEventListener("pointerup", this.handlePointerUp)
  }

  public static getInstance(): PointerState {
    if (!PointerState.instance) {
      PointerState.instance = new PointerState()
    }
    return PointerState.instance
  }

  private handlePointerDown = () => {
    this.isPointerDown = true
  }

  private handlePointerUp = () => {
    this.isPointerDown = false
  }

  public pointerIsDown(): boolean {
    return this.isPointerDown
  }

  public destroy(): void {
    window.removeEventListener("pointerdown", this.handlePointerDown)
    window.removeEventListener("pointerup", this.handlePointerUp)
    PointerState.instance = undefined!
  }
}

// Ensure the PointerState instance is created at startup
PointerState.getInstance()
