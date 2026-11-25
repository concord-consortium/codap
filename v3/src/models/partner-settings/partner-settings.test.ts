import { autorun } from "mobx"
import { kPartnerSettingNames } from "./partner-settings-registry"
import { getPartnerSetting, PartnerSettings, partnerSettings } from "./partner-settings"

const kSettings = {
  hideShare: true,
  partnerName: "Example Publisher",
  partnerTermsUrl: "https://example.org/terms",
  partnerLogo: { file: "logo-1.png", alt: "Example Publisher" },
  partnerDocuments: [{ name: "Mammals", url: "https://example.org/mammals.json" }]
}

describe("PartnerSettings", () => {
  it("reads every setting as unset when no partner config is applied", () => {
    const settings = new PartnerSettings()
    expect(kPartnerSettingNames.length).toBeGreaterThan(0)
    kPartnerSettingNames.forEach(name => expect(settings.get(name)).toBeUndefined())
  })

  it("applies the valid values of a partner config", () => {
    const settings = new PartnerSettings()
    settings.setSettings({ ...kSettings, hidePlugins: "yes", partnerStorageDemoLabel: 7 })
    expect(settings.get("hideShare")).toBe(true)
    expect(settings.get("hidePlugins")).toBeUndefined()
    expect(settings.get("partnerStorageDemoLabel")).toBeUndefined()
    expect(settings.get("partnerName")).toBe("Example Publisher")
    expect(settings.get("partnerTermsUrl")).toBe("https://example.org/terms")
    expect(settings.get("partnerLogo")).toEqual(kSettings.partnerLogo)
    expect(settings.get("partnerDocuments")).toEqual(kSettings.partnerDocuments)
  })

  it("replaces the values on each call", () => {
    const settings = new PartnerSettings()
    settings.setSettings(kSettings)
    settings.setSettings({})
    expect(settings.get("hideShare")).toBeUndefined()
    expect(settings.get("partnerName")).toBeUndefined()
  })

  it("notifies observers when values are applied", () => {
    const settings = new PartnerSettings()
    const observed: Array<string | undefined> = []
    const dispose = autorun(() => observed.push(settings.get("partnerName")))

    settings.setSettings({ partnerName: "Example Publisher" })
    dispose()

    expect(observed).toEqual([undefined, "Example Publisher"])
  })

  describe("getPartnerSetting", () => {
    afterEach(() => {
      partnerSettings.setSettings({})
    })

    it("reads the shared settings", () => {
      partnerSettings.setSettings({ hideShare: true, partnerName: "Example Publisher" })
      expect(getPartnerSetting("hideShare")).toBe(true)
      expect(getPartnerSetting("partnerName")).toBe("Example Publisher")
    })
  })
})
