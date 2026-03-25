import { featureTourConfig } from "./feature-tour-config"
import { runTour } from "./tour-runner"

export function runFeatureTour() {
  runTour(featureTourConfig)
}
