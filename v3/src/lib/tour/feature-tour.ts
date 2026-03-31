import { featureTourConfig } from "./feature-tour-config"
import { tourManager } from "./tour-manager"

export function runFeatureTour() {
  tourManager.runInternalTour(featureTourConfig)
}
