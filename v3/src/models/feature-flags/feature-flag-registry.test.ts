import {
  flagsForOwner, IFeatureFlagInfo, isFeatureFlagName, isFeatureFlagOwner, isPartnerFlagName, isPilotFlagName,
  kFeatureFlagNames, kFeatureFlags, kPartnerFlagNames, kPilotFlagNames
} from "./feature-flag-registry"

const kLegendFlags = ["legendBinCount", "legendLogarithmic", "legendRange"] as const

describe("feature flag registry", () => {
  it("registers the MappingTime legend flags", () => {
    kLegendFlags.forEach(name => {
      expect(isFeatureFlagName(name)).toBe(true)
      expect(kFeatureFlags[name].owner).toBe("MappingTime")
    })
  })
})

describe("owner helpers", () => {
  it("recognizes a registered owner and rejects an unknown one", () => {
    expect(isFeatureFlagOwner("MappingTime")).toBe(true)
    expect(isFeatureFlagOwner("NoSuchProject")).toBe(false)
  })

  it("returns every flag owned by a project", () => {
    expect([...flagsForOwner("MappingTime")].sort())
      .toEqual(["combineDateTime", "legendBinCount", "legendLogarithmic", "legendRange", "mapHotSpot"])
  })

  it("returns an empty array for an unknown owner", () => {
    expect(flagsForOwner("NoSuchProject")).toEqual([])
  })

  /*
   * A url token is matched as a flag name before an owner name, so a name that is
   * both would silently never expand to its group. Nothing in the type system
   * enforces the two namespaces staying disjoint, so assert the convention here.
   */
  it("keeps flag names and owner names disjoint", () => {
    kFeatureFlagNames.forEach(name => expect(isFeatureFlagOwner(name)).toBe(false))
  })
})

describe("partner flags", () => {
  /*
   * A partner config names its flags, and a name this build doesn't know is dropped
   * silently, so a renamed hide flag would quietly bring back a feature a partner
   * had hidden. Change this list only together with the registry, deliberately.
   */
  it("freezes the partner flag names and types", () => {
    const actual = Object.fromEntries(kPartnerFlagNames.map(name => [name, kFeatureFlags[name].type]))
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

  it("splits every flag into exactly one kind", () => {
    expect(kPilotFlagNames.length).toBeGreaterThan(0)
    expect(kPartnerFlagNames.length).toBeGreaterThan(0)
    expect([...kPilotFlagNames, ...kPartnerFlagNames].sort()).toEqual([...kFeatureFlagNames].sort())
    expect(isPartnerFlagName("noSuchFlag")).toBe(false)
    expect(isPilotFlagName("noSuchFlag")).toBe(false)
  })

  // checked by the type checker (npm run build:tsc), not at runtime
  it("rejects an entry of both kinds or neither", () => {
    const typeChecks = () => {
      const pilotAndPartner =
        { description: "", added: "", owner: "X", expires: "", kind: "partner", type: "url" } as const
      const noKind = { description: "", added: "" }
      // @ts-expect-error an entry can't be both a pilot and a partner flag
      const both: IFeatureFlagInfo = pilotAndPartner
      // @ts-expect-error an entry must be one kind or the other
      const neither: IFeatureFlagInfo = noKind
      return [both, neither]
    }
    expect(typeChecks).toBeInstanceOf(Function)
  })
})
