import {
  isValidPartnerImageFile, isValidPartnerUrl, kMaxPartnerFolderDepth, validatePartnerFlags
} from "./partner-flag-values"

const kDocUrl = "https://example.org/mammals.json"

function folderChain(depth: number): unknown[] {
  let items: unknown[] = [{ name: "leaf", url: kDocUrl }]
  for (let level = depth; level >= 1; level--) {
    items = [{ name: `level ${level}`, type: "folder", children: items }]
  }
  return items
}

function chainDepth(items: unknown): number {
  let depth = 0
  let current = items as any[] | undefined
  while (current?.[0]?.type === "folder") {
    depth++
    current = current[0].children
  }
  return depth
}

describe("isValidPartnerUrl", () => {
  it.each([
    "https://example.org/a.json",
    "HTTPS://example.org/a.json",
    // `=?` followed by something other than `&` or the end isn't a jsonp callback
    "https://example.org/a?b=?c"
  ])("accepts %s", url => {
    expect(isValidPartnerUrl(url)).toBe(true)
  })

  it.each([
    "http://example.org/a.json",
    "/a.json",
    "a.json",
    "//example.org/a.json",
    "javascript:alert(1)",
    // these parse as absolute on their own, but a page resolves them against its own host
    "https:example.org/a.json",
    "https:/example.org/a.json",
    " https://example.org/a.json",
    // these start with `https://` but don't parse
    "https://",
    "https://exa mple.org/a.json",
    // jQuery turns these into a <script> load
    "https://example.org/a.json?callback=?",
    "https://example.org/a.json?callback=?&x=1",
    "https://example.org/a.json#=?",
    "https://example.org/a.json??",
    ""
  ])("rejects %s", url => {
    expect(isValidPartnerUrl(url)).toBe(false)
  })

  it("rejects a value that isn't a string", () => {
    expect(isValidPartnerUrl(42)).toBe(false)
    expect(isValidPartnerUrl({ href: kDocUrl })).toBe(false)
  })
})

describe("isValidPartnerImageFile", () => {
  it.each(["logo-1.png", "Logo.JPG", "logo_2.jpeg", "a.gif", "b.webp"])("accepts %s", file => {
    expect(isValidPartnerImageFile(file)).toBe(true)
  })

  it.each([".", "..", "a/b.png", "../logo.png", ".png", "logo", "logo.svg", "logo.png.svg", "-logo.png", "logo.png\n"])(
    "rejects %j", file => {
      expect(isValidPartnerImageFile(file)).toBe(false)
    })
})

describe("validatePartnerFlags", () => {
  it("keeps valid values of every type", () => {
    const flags = {
      hideShare: true,
      hidePlugins: false,
      partnerName: "Example Publisher",
      partnerTermsUrl: "https://example.org/terms",
      partnerLogo: { file: "logo-1.png", alt: "Example Publisher" },
      partnerDocuments: [{ name: "Mammals", url: kDocUrl, description: "Mammal data" }]
    }
    expect(validatePartnerFlags(flags)).toEqual(flags)
  })

  it("drops an invalid value on its own and keeps the rest", () => {
    expect(validatePartnerFlags({ hideShare: "on", partnerName: "Example Publisher" }))
      .toEqual({ partnerName: "Example Publisher" })
  })

  it("ignores unknown names and pilot flag names", () => {
    expect(validatePartnerFlags({ noSuchFlag: true, residualPlot: true, hideShare: true })).toEqual({ hideShare: true })
  })

  it("returns no values for a payload that isn't an object", () => {
    expect(validatePartnerFlags(null)).toEqual({})
    expect(validatePartnerFlags([{ hideShare: true }])).toEqual({})
    expect(validatePartnerFlags("hideShare")).toEqual({})
  })

  it("accepts only JSON booleans for on or off flags", () => {
    expect(validatePartnerFlags({ hideShare: "on", hidePlugins: "true", hideLocalFile: 1 })).toEqual({})
  })

  it("treats empty and whitespace-only text as not set", () => {
    expect(validatePartnerFlags({ partnerStorageDemoLabel: "", partnerDocumentsLabel: "  ", partnerName: 7 }))
      .toEqual({})
  })

  it("keeps text exactly as written", () => {
    expect(validatePartnerFlags({ partnerStorageDemoLabel: " Classroom " }))
      .toEqual({ partnerStorageDemoLabel: " Classroom " })
  })

  it("drops a terms link that fails the link checks", () => {
    expect(validatePartnerFlags({ partnerTermsUrl: "https://example.org/terms#=?" })).toEqual({})
  })

  describe("partnerLogo", () => {
    it("keeps only the file and alt text", () => {
      expect(validatePartnerFlags({ partnerLogo: { file: "logo-1.png", alt: "Logo", width: 9 } }))
        .toEqual({ partnerLogo: { file: "logo-1.png", alt: "Logo" } })
    })

    it.each([
      { file: "logo-1.png", alt: "" },
      { file: "logo-1.png", alt: "  " },
      { file: "logo-1.png" },
      { file: "logo.svg", alt: "Logo" },
      { file: "../logo.png", alt: "Logo" },
      "logo-1.png"
    ])("drops %j", partnerLogo => {
      expect(validatePartnerFlags({ partnerLogo })).toEqual({})
    })
  })

  describe("partnerDocuments", () => {
    it("rebuilds documents and folders from their allowed keys", () => {
      const partnerDocuments = [
        { name: "Mammals", url: kDocUrl, description: "Mammal data", content: { evil: true }, location: "x" },
        { name: "Unit 1", type: "folder", url: "https://example.org/list.json", children: [
          { name: "Roller Coasters", url: kDocUrl, type: "file", mimeType: "text/html" }
        ] }
      ]
      expect(validatePartnerFlags({ partnerDocuments })).toEqual({ partnerDocuments: [
        { name: "Mammals", url: kDocUrl, description: "Mammal data" },
        { name: "Unit 1", type: "folder", children: [{ name: "Roller Coasters", url: kDocUrl }] }
      ] })
    })

    it("drops a description that isn't text and keeps its document", () => {
      expect(validatePartnerFlags({ partnerDocuments: [{ name: "Mammals", url: kDocUrl, description: 3 }] }))
        .toEqual({ partnerDocuments: [{ name: "Mammals", url: kDocUrl }] })
    })

    it("drops items that fail their checks and keeps the rest", () => {
      const partnerDocuments = [
        { name: "Good", url: kDocUrl },
        { name: "Callback", url: "https://example.org/a.json?cb=?" },
        { name: "Insecure", url: "http://example.org/a.json" },
        // cloud-file-manager would load this by `location`, unchecked
        { name: "Location only", location: kDocUrl },
        // cloud-file-manager loops forever on a file with neither url nor content
        { name: "Content only", content: { type: "CODAP" } },
        { name: "", url: kDocUrl },
        { name: "  ", url: kDocUrl },
        { url: kDocUrl },
        // cloud-file-manager would fetch the folder's list from its url, unchecked
        { name: "Linked folder", type: "folder", url: "https://example.org/list.json" },
        { name: "Object children", type: "folder", children: { a: "b" } },
        null,
        "Mammals",
        [kDocUrl]
      ]
      expect(validatePartnerFlags({ partnerDocuments })).toEqual({ partnerDocuments: [{ name: "Good", url: kDocUrl }] })
    })

    it("keeps a folder whose children were all dropped", () => {
      const partnerDocuments = [{ name: "Unit 1", type: "folder", children: [{ name: "Bad", url: "http://x.org/a" }] }]
      expect(validatePartnerFlags({ partnerDocuments }))
        .toEqual({ partnerDocuments: [{ name: "Unit 1", type: "folder", children: [] }] })
    })

    // cloud-file-manager reads a list that isn't an array as its older format, with inline content
    it("drops a list that isn't an array", () => {
      expect(validatePartnerFlags({ partnerDocuments: { "Mammals": "{}" } })).toEqual({})
    })

    it("treats a list left with no items as not set", () => {
      expect(validatePartnerFlags({ partnerDocuments: [] })).toEqual({})
      expect(validatePartnerFlags({ partnerDocuments: [{ name: "Bad", url: "http://x.org/a" }] })).toEqual({})
    })

    it(`keeps folders ${kMaxPartnerFolderDepth} levels deep and drops deeper ones`, () => {
      const kept = validatePartnerFlags({ partnerDocuments: folderChain(kMaxPartnerFolderDepth) })
      expect(chainDepth(kept.partnerDocuments)).toBe(kMaxPartnerFolderDepth)

      const trimmed = validatePartnerFlags({ partnerDocuments: folderChain(kMaxPartnerFolderDepth + 1) })
      expect(chainDepth(trimmed.partnerDocuments)).toBe(kMaxPartnerFolderDepth)
    })

    it("doesn't throw on extreme nesting", () => {
      const depth = 100000
      const nestedArrays = JSON.parse(`${"[".repeat(depth)}${"]".repeat(depth)}`)
      expect(validatePartnerFlags({ partnerDocuments: nestedArrays })).toEqual({})
      expect(chainDepth(validatePartnerFlags({ partnerDocuments: folderChain(20000) }).partnerDocuments))
        .toBe(kMaxPartnerFolderDepth)
    })
  })
})
