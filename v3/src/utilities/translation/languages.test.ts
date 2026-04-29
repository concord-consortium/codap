import fs from "fs"
import path from "path"
import { kBundledLanguageKeys } from "./languages"

describe("bundled languages", () => {
  it("stay in sync with the POEditor pull script", () => {
    const scriptPath = path.join(__dirname, "../../../scripts/strings-pull-project.sh")
    const scriptContent = fs.readFileSync(scriptPath, "utf8")

    const match = scriptContent.match(/^\s*LANGUAGES\s*=\s*\(([\s\S]*?)\)/m)
    expect(match).not.toBeNull()
    const pulledLangs = Array.from(match![1].matchAll(/"([^"]+)"/g))
      .map(m => m[1])
      .sort()

    // V3 owns en-US and pushes it to POEditor; the pull script fetches only
    // the translations, so exclude en-US from the bundled set for comparison.
    const bundledNonEnglish = kBundledLanguageKeys.filter(k => k !== "en-US").sort()

    expect(bundledNonEnglish).toEqual(pulledLangs)
  })
})
