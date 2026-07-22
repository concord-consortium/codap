/*
 * The registry of every feature flag the application knows about.
 *
 * Adding an entry here is what makes a flag real; deleting the entry turns every
 * stale call site into a compile error, so retiring a flag is mechanical rather
 * than archaeological. Flag names arriving from URLs, the server config, or saved
 * documents are matched against this registry and silently ignored if unknown,
 * which is what lets old documents outlive the features they once granted.
 *
 * See docs/feature-flags.md for the lifecycle of a flag.
 */

export interface IFeatureFlagInfo {
  // what the flag gates, in a sentence
  description: string
  // the project or grant responsible for the feature, e.g. "ESTEEM"
  owner: string
  // ISO date the flag was added
  added: string
  // ISO date by which the flag should have graduated or been retired
  expires: string
}

/*
 * Keep entries alphabetical. The registry must never be empty; `keyof {}` is
 * `never`, which would make every call to isFeatureEnabled() a type error.
 */
export const kFeatureFlags = {
  residualPlot: {
    description: "Residual plots on the graph",
    owner: "ESTEEM",
    added: "2026-07-22",
    expires: "2027-01-22"
  }
} as const satisfies Record<string, IFeatureFlagInfo>

export type FeatureFlagName = keyof typeof kFeatureFlags

export function isFeatureFlagName(name: string): name is FeatureFlagName {
  return Object.prototype.hasOwnProperty.call(kFeatureFlags, name)
}

export const kFeatureFlagNames = Object.keys(kFeatureFlags) as FeatureFlagName[]
