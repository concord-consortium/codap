/*
 * The partner settings CODAP knows about: the branding and hidden features of one
 * partner's CODAP, set only by that partner's config. A name a partner config
 * uses that isn't here is ignored. See docs/partner-settings.md.
 */

/*
 * The kinds of value a partner setting holds. These names are also the type names
 * CODAP publishes for partner config authors, so they are part of the contract.
 */
export type PartnerSettingType = "boolean" | "string" | "url" | "image" | "documents"

export interface IPartnerSettingInfo {
  // what the setting controls, in a sentence
  description: string
  type: PartnerSettingType
}

// Keep entries alphabetical.
export const kPartnerSettings = {
  hideGoogleDrive: {
    description: "Hides Google Drive in the Open, Save and export dialogs",
    type: "boolean"
  },
  hideLocalFile: {
    description: "Hides local files in the file dialogs, the Import dialog and the graph's background image item",
    type: "boolean"
  },
  hidePlugins: {
    description: "Hides the Plugins button on the tool shelf",
    type: "boolean"
  },
  hideShare: {
    description: "Hides the File menu's Share entry with its items, and Revert to shared view",
    type: "boolean"
  },
  partnerDocuments: {
    description: "The partner's documents, listed in place of Example Documents",
    type: "documents"
  },
  partnerDocumentsLabel: {
    description: "The label of the Open dialog tab holding the partner's documents",
    type: "string"
  },
  partnerLogo: {
    description: "The partner's logo and its alt text",
    type: "image"
  },
  partnerName: {
    description: "The partner's name, shown in the About dialog",
    type: "string"
  },
  partnerStorageDemoLabel: {
    description: "The label of the demo storage tab in the file dialogs; empty means off",
    type: "string"
  },
  partnerTermsUrl: {
    description: "A link to the partner's terms of use",
    type: "url"
  }
} as const satisfies Record<string, IPartnerSettingInfo>

export type PartnerSettingName = keyof typeof kPartnerSettings

export function isPartnerSettingName(name: string): name is PartnerSettingName {
  return Object.prototype.hasOwnProperty.call(kPartnerSettings, name)
}

export const kPartnerSettingNames = Object.keys(kPartnerSettings) as PartnerSettingName[]
