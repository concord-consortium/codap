import { DriveStep, Config as DriverConfig } from "driver.js"

export interface ITourStep extends DriveStep {
  /** Optional flag to skip this step without removing it from the configuration */
  skip?: boolean
}

export interface ITourConfig {
  /** driver.js configuration options */
  options?: Omit<DriverConfig, "steps">
  /** Ordered list of tour steps */
  steps: ITourStep[]
}

export const defaultTourOptions: ITourConfig["options"] = {
  showProgress: true,
  doneBtnText: "Got it!",
  allowClose: true,
  allowKeyboardControl: true,
  overlayClickBehavior: "close",
  popoverClass: "codap-tour-popover",
}
