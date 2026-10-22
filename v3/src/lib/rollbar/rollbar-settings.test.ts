import { getRollbarSettings } from "./rollbar-settings"

function settingsFor(url: string) {
  return getRollbarSettings(new URL(url))
}

const codap3 = "https://codap3.concord.org"
const codapApp = "https://codap.concord.org/app"

describe("getRollbarSettings", () => {
  it.each([
    // production
    [`${codap3}`, "production"],
    [`${codap3}/`, "production"],
    [`${codap3}/index.html`, "production"],
    ["https://codap.concord.org/app", "production"],
    [`${codapApp}/`, "production"],
    [`${codapApp}/index.html`, "production"],
    // named release targets, e.g. /<name> and /index-<name>.html
    [`${codap3}/staging`, "staging"],
    [`${codap3}/index-staging.html`, "staging"],
    [`${codapApp}/staging`, "staging"],
    [`${codapApp}/index-staging.html`, "staging"],
    [`${codap3}/beta`, "beta"],
    [`${codapApp}/beta`, "beta"],
    [`${codap3}/ai4vs`, "ai4vs"],
    [`${codapApp}/ai4vs`, "ai4vs"],
    [`${codap3}/NewTarget`, "newtarget"],
    // a one-segment path that only starts with "app" is a named target, not the /app prefix
    [`${codap3}/application`, "application"],
    // main branch
    [`${codap3}/branch/main/`, "main"],
    [`${codap3}/branch/main/index.html`, "main"],
    [`${codapApp}/branch/main/`, "main"]
  ])("reports errors from %s to the %s environment", (url, environment) => {
    expect(settingsFor(url)).toEqual({ enabled: true, environment })
  })

  it.each([
    `${codap3}/branch/CODAP-1556-some-feature/`,
    `${codap3}/version/3.1.0/`,
    `${codapApp}/version/3.1.0/`,
    `${codap3}/some/other/path`,
    // release targets don't have a trailing slash
    `${codap3}/staging/`,
    "https://example.com/",
    "http://localhost:8080/",
    "http://localhost:8080/staging"
  ])("doesn't report errors from %s by default", url => {
    expect(settingsFor(url)).toEqual({ enabled: false, environment: "development" })
  })

  describe("rollbar url parameter", () => {
    it.each([
      ["?rollbar=no", false],
      ["?rollbar=false", false],
      ["?rollbar=0&x=1", false],
      ["?rollbar=NO", false],
      // encoded "no", which booleanParam() decodes
      ["?rollbar=%6e%6f", false],
      ["?rollbar=yes", true],
      // malformed encoding is used unchanged, so it is truthy
      ["?rollbar=%E0%A4%A", true],
      // the last occurrence wins
      ["?rollbar=no&rollbar=yes", true],
      ["?rollbarX=no", true]
    ])("with %s, reporting from production is %s", (search, enabled) => {
      expect(settingsFor(`${codap3}/${search}`)).toEqual({ enabled, environment: "production" })
    })

    it.each([
      ["?rollbar", true],
      ["?rollbar=", true],
      ["?rollbar=yes", true],
      ["?sample=mammals&rollbar=true", true],
      ["?rollbar=%79%65%73", true],
      ["?rollbar=yes&rollbar=no", false],
      ["?rollbarX=yes", false]
    ])("with %s, reporting from a feature branch is %s", (search, enabled) => {
      expect(settingsFor(`${codap3}/branch/x/${search}`)).toEqual({ enabled, environment: "development" })
    })

    it.each([
      "http://localhost:8080/?rollbar=yes",
      "http://127.0.0.1:8080/?rollbar=yes",
      "https://codap2to3.concord.org/app/branch/x/?rollbar=yes",
      "https://concord.org/?rollbar=yes"
    ])("turns reporting on for %s, in the development environment", url => {
      expect(settingsFor(url)).toEqual({ enabled: true, environment: "development" })
    })

    it.each([
      "https://example.com/?rollbar=yes",
      "https://example.github.io/codap/?rollbar=yes",
      // only concord.org itself and its subdomains are trusted
      "https://notconcord.org/?rollbar=yes",
      "https://concord.org.example.com/?rollbar=yes",
      "http://localhost.example.com/?rollbar=yes"
    ])("ignores the parameter on other hosts, like %s", url => {
      expect(settingsFor(url)).toEqual({ enabled: false, environment: "development" })
    })
  })
})
