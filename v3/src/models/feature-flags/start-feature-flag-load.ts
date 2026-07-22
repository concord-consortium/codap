import { fetchFeatureFlagConfig } from "./feature-flag-config"
import { featureFlagManager } from "./feature-flag-manager"

/*
 * Imported for its side effect from the application entry point so that the
 * config fetch begins at module load, racing the CFM document load rather than
 * waiting for React to mount. Kept separate from the manager so that importing
 * the manager — in tests, or from a model — never starts a network request.
 */
featureFlagManager.loadServerConfig(fetchFeatureFlagConfig)
