/*
 * The registry of every feature flag the application knows about.
 *
 * Adding an entry here is what makes a flag real; deleting the entry turns every
 * stale call site into a compile error, so retiring a flag is mechanical rather
 * than archaeological. Pilot flag names arriving from URLs, the server config, or
 * saved documents are matched against this registry and silently ignored if
 * unknown, which is what lets old documents outlive the features they once
 * granted.
 *
 * See docs/feature-flags.md for the lifecycle of a flag.
 */

interface IFeatureFlagInfoBase {
  // what the flag gates, in a sentence
  description: string
  // ISO date the flag was added
  added: string
}

/*
 * A pilot flag gates an in-development feature for a limited audience and is
 * meant to graduate or be retired by its expiration date.
 */
export interface IPilotFlagInfo extends IFeatureFlagInfoBase {
  // the project or grant responsible for the feature, e.g. "ESTEEM"
  owner: string
  // ISO date by which the flag should have graduated or been retired
  expires: string
  kind?: never
  type?: never
}

/*
 * The kinds of value a partner flag holds. These names are also the type names
 * CODAP publishes for partner config authors, so they are part of the contract.
 */
export type PartnerFlagType = "boolean" | "string" | "url" | "image" | "documents"

/*
 * A partner flag is a per-partner setting. It never expires, and only a partner
 * config can set it; the url, documents and the server config ignore it.
 */
export interface IPartnerFlagInfo extends IFeatureFlagInfoBase {
  kind: "partner"
  type: PartnerFlagType
  owner?: never
  expires?: never
}

// The `never` fields make an entry with both kinds' fields, or neither's, a type error.
export type IFeatureFlagInfo = IPilotFlagInfo | IPartnerFlagInfo

/*
 * Keep entries alphabetical. The registry must always hold at least one pilot
 * flag: with none, `PilotFlagName` is `never` and the pilot-only sources in this
 * folder no longer compile.
 */
export const kFeatureFlags = {
  combineDateTime: {
    description: "Attribute menu item that combines a date attribute with a time attribute",
    owner: "MappingTime",
    added: "2026-11-19",
    expires: "2027-11-30"
  },
  hideGoogleDrive: {
    description: "Hides Google Drive in the Open, Save and export dialogs",
    added: "2026-11-25",
    kind: "partner",
    type: "boolean"
  },
  hideLocalFile: {
    description: "Hides local files in the file dialogs, the Import dialog and the graph's background image item",
    added: "2026-11-25",
    kind: "partner",
    type: "boolean"
  },
  hidePlugins: {
    description: "Hides the Plugins button on the tool shelf",
    added: "2026-11-25",
    kind: "partner",
    type: "boolean"
  },
  hideShare: {
    description: "Hides the File menu's Share entry with its items, and Revert to shared view",
    added: "2026-11-25",
    kind: "partner",
    type: "boolean"
  },
  legendBinCount: {
    description: "Number-of-bins control for numeric legends",
    owner: "MappingTime",
    added: "2026-07-24",
    expires: "2027-07-31"
  },
  legendLogarithmic: {
    description: "Logarithmic binning option for numeric legends",
    owner: "MappingTime",
    added: "2026-07-24",
    expires: "2027-07-31"
  },
  legendRange: {
    description: "User-editable Min/Max range for numeric legends",
    owner: "MappingTime",
    added: "2026-07-24",
    expires: "2027-07-31"
  },
  mapHotSpot: {
    description: "Hot spot layer on the map",
    owner: "MappingTime",
    added: "2026-11-04",
    expires: "2027-11-30"
  },
  partnerDocuments: {
    description: "The partner's documents, listed in place of Example Documents",
    added: "2026-11-25",
    kind: "partner",
    type: "documents"
  },
  partnerDocumentsLabel: {
    description: "The label of the Open dialog tab holding the partner's documents",
    added: "2026-11-25",
    kind: "partner",
    type: "string"
  },
  partnerLogo: {
    description: "The partner's logo and its alt text",
    added: "2026-11-25",
    kind: "partner",
    type: "image"
  },
  partnerName: {
    description: "The partner's name, shown in the About dialog",
    added: "2026-11-25",
    kind: "partner",
    type: "string"
  },
  partnerStorageDemoLabel: {
    description: "The label of the demo storage tab in the file dialogs; empty means off",
    added: "2026-11-25",
    kind: "partner",
    type: "string"
  },
  partnerTermsUrl: {
    description: "A link to the partner's terms of use",
    added: "2026-11-25",
    kind: "partner",
    type: "url"
  },
  pointShapes: {
    description: "Per-legend-category point shapes on the graph and map",
    owner: "LEADS",
    added: "2026-09-04",
    expires: "2027-09-30"
  },
  /*
   * DEPRECATED — gates nothing. The residual plot shipped enabled, and its gate was removed
   * rather than switched on by server config, so that the feature cannot silently fail off
   * when the config fetch fails. The entry is retained only because the feature-flag tests
   * use this name as their sample flag; delete it once they are repointed at a live flag.
   */
  residualPlot: {
    description: "Residual plots on the graph (deprecated — no longer gates anything)",
    owner: "ESTEEM",
    added: "2026-07-22",
    expires: "2027-07-31"
  }
} as const satisfies Record<string, IFeatureFlagInfo>

type FeatureFlags = typeof kFeatureFlags

export type FeatureFlagName = keyof FeatureFlags

export type PilotFlagName = {
  [K in FeatureFlagName]: FeatureFlags[K] extends { expires: string } ? K : never
}[FeatureFlagName]

export type PartnerFlagName = Exclude<FeatureFlagName, PilotFlagName>

export type BooleanPartnerFlagName = {
  [K in PartnerFlagName]: FeatureFlags[K] extends { type: "boolean" } ? K : never
}[PartnerFlagName]

// partner flags that hold a value rather than on or off; read with getFeatureValue()
export type ValuePartnerFlagName = Exclude<PartnerFlagName, BooleanPartnerFlagName>

// the flags isFeatureEnabled() can read
export type EnableableFlagName = PilotFlagName | BooleanPartnerFlagName

export function isFeatureFlagName(name: string): name is FeatureFlagName {
  return Object.prototype.hasOwnProperty.call(kFeatureFlags, name)
}

export function isPartnerFlagName(name: string): name is PartnerFlagName {
  return isFeatureFlagName(name) && "kind" in kFeatureFlags[name]
}

export function isPilotFlagName(name: string): name is PilotFlagName {
  return isFeatureFlagName(name) && !isPartnerFlagName(name)
}

export const kFeatureFlagNames = Object.keys(kFeatureFlags) as FeatureFlagName[]

export const kPilotFlagNames = kFeatureFlagNames.filter(isPilotFlagName)

export const kPartnerFlagNames = kFeatureFlagNames.filter(isPartnerFlagName)

export function isFeatureFlagOwner(name: string): boolean {
  return kPilotFlagNames.some(flag => kFeatureFlags[flag].owner === name)
}

export function flagsForOwner(owner: string): PilotFlagName[] {
  return kPilotFlagNames.filter(flag => kFeatureFlags[flag].owner === owner)
}
