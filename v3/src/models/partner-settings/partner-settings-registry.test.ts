import { isPartnerSettingName, kPartnerSettingNames, kPartnerSettings } from "./partner-settings-registry"

describe("partner settings registry", () => {
  /*
   * A partner config names its settings, and a name this build doesn't know is
   * dropped silently, so a renamed hide setting would quietly bring back a feature
   * a partner had hidden. Change this list only together with the registry.
   */
  it("freezes the partner setting names and types", () => {
    const actual = Object.fromEntries(kPartnerSettingNames.map(name => [name, kPartnerSettings[name].type]))
    expect(actual).toEqual({
      hideGoogleDrive: "boolean",
      hideLocalFile: "boolean",
      hidePlugins: "boolean",
      hideShare: "boolean",
      partnerDocuments: "documents",
      partnerDocumentsLabel: "string",
      partnerLogo: "image",
      partnerName: "string",
      partnerStorageDemoLabel: "string",
      partnerTermsUrl: "url"
    })
  })

  it("recognizes only its own names", () => {
    expect(isPartnerSettingName("hideShare")).toBe(true)
    expect(isPartnerSettingName("residualPlot")).toBe(false)
    expect(isPartnerSettingName("constructor")).toBe(false)
    expect(isPartnerSettingName("toString")).toBe(false)
  })
})
