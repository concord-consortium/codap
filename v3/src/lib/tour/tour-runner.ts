import { driver } from "driver.js"
import "driver.js/dist/driver.css"  // base styles — must load before CODAP overrides
import "./tour-styles.scss"          // CODAP-themed overrides
import { ITourConfig } from "./tour-types"

export function runTour(config: ITourConfig) {
  const activeSteps = config.steps.filter(tourStep => {
    if (tourStep.skip) return false
    if (typeof tourStep.element === "string" && !document.querySelector(tourStep.element)) return false
    return true
  })

  if (activeSteps.length === 0) return

  const driverObj = driver({
    ...config.options,
    steps: activeSteps
  })

  driverObj.drive()
}
