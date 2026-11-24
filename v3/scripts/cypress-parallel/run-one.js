// Child process for the parallel runner: runs a single spec through the Cypress Module API and
// writes what cypress.run() resolved with to a JSON file.
// Usage: node run-one.js <spec> <baseUrl> <outDir> <resultFile>

const fs = require("fs")
const path = require("path")
const cypress = require("cypress")
const { specSlug } = require("./specs")

async function main() {
  const [spec, baseUrl, outDir, resultFile] = process.argv.slice(2)
  let result
  try {
    result = await cypress.run({
      browser: "chrome",
      spec,
      config: {
        baseUrl,
        video: false,
        // By default every Cypress process empties the screenshots folder when it starts,
        // which would delete the screenshots of specs running alongside it.
        trashAssetsBeforeRuns: false,
        // Cypress puts each spec's screenshots in a folder named after the spec.
        screenshotsFolder: path.join(outDir, "screenshots"),
        // A spec may empty the downloads folder (graph.spec.ts has such a test), so each spec gets its own.
        downloadsFolder: path.join(outDir, "downloads", specSlug(spec))
      }
    })
  } catch (error) {
    result = { status: "failed", failures: 1, message: String(error) }
  }
  fs.writeFileSync(resultFile, JSON.stringify(result))
}

main()
