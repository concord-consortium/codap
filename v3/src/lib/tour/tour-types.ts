import { EngineOptions } from "@concord-consortium/coachmarks"

export interface ITourPopover {
  title?: string
  description?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

/** The engine options a tour configuration or a plugin may set. */
export type ITourOptions = Pick<EngineOptions,
  "showButtons" | "disableButtons" | "showProgress" | "allowKeyboardControl" | "allowClose" |
  "animate" | "smoothScroll" | "popoverOffset" | "progressText" | "nextBtnText" | "prevBtnText" |
  "doneBtnText">

export interface ITourStep {
  /**
   * Config-layer element reference. Strings are CSS selectors resolved to
   * HTMLElement by runInternalTour() before the step is handed to the engine.
   */
  element: string | HTMLElement
  popover?: ITourPopover
  /** Optional flag to skip this step without removing it from the configuration */
  skip?: boolean
}

export interface ITourConfig {
  /** Tour engine options */
  options?: ITourOptions
  /** Ordered list of tour steps */
  steps: ITourStep[]
}

export const defaultTourOptions: ITourOptions = {
  showProgress: true,
  allowClose: true,
  allowKeyboardControl: true,
}
