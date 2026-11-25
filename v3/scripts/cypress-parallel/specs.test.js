const fs = require("fs")
const path = require("path")
const { DEFAULT_BASE_URL, EXCLUDE_SPEC_PATTERNS, SPEC_PATTERN, findSpecs, specSlug } = require("./specs")

const v3Root = path.resolve(__dirname, "../..")

describe("findSpecs", () => {
  it("finds specs in subfolders and the smoke test", () => {
    const specs = findSpecs({ cwd: v3Root })
    expect(specs).toContain("cypress/e2e/smoke/single-codap-smoke.ts")
    expect(specs).toContain("cypress/e2e/pixi-interaction/graph-pixi-interaction.spec.ts")
    expect(specs).toContain("cypress/e2e/formula/formula-errors.spec.ts")
    expect(specs).toContain("cypress/e2e/graph.spec.ts")
  })

  it("leaves out the specs cypress.config.ts excludes", () => {
    expect(findSpecs({ cwd: v3Root })).not.toContain("cypress/e2e/v2-v3-redirect.spec.ts")
  })

  it("returns the specs sorted", () => {
    const specs = findSpecs({ cwd: v3Root })
    expect(specs).toEqual([...specs].sort())
  })

  it("limits the specs to a given pattern", () => {
    const specs = findSpecs({ cwd: v3Root, pattern: "cypress/e2e/formula/*.spec.ts" })
    expect(specs).toContain("cypress/e2e/formula/formula-errors.spec.ts")
    expect(specs.every(spec => spec.startsWith("cypress/e2e/formula/"))).toBe(true)
  })
})

describe("findSpecs matches", () => {
  it("files only, not folders", () => {
    expect(findSpecs({ cwd: v3Root, pattern: "cypress/e2e/smoke" })).toEqual([])
    expect(findSpecs({ cwd: v3Root, pattern: "cypress/e2e/*" })).not.toContain("cypress/e2e/formula")
  })
})

describe("cypress.config.ts", () => {
  // These constants copy cypress.config.ts, which is TypeScript and can't be required from here.
  it("still has the spec pattern, exclusions, and base URL the runner copies", () => {
    const config = fs.readFileSync(path.join(v3Root, "cypress.config.ts"), "utf8")
    expect(config).toContain(`specPattern: '${SPEC_PATTERN}'`)
    expect(config).toContain(`excludeSpecPattern: [${EXCLUDE_SPEC_PATTERNS.map(p => `'${p}'`).join(", ")}]`)
    expect(config).toContain(`const kDefaultBaseUrl = '${DEFAULT_BASE_URL}'`)
  })
})

describe("specSlug", () => {
  it("names a top-level spec by its file name", () => {
    expect(specSlug("cypress/e2e/graph.spec.ts")).toBe("graph.spec")
  })

  it("joins subfolders with a double underscore", () => {
    expect(specSlug("cypress/e2e/formula/formula-errors.spec.ts")).toBe("formula__formula-errors.spec")
  })
})
