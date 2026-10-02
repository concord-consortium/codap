//
// markers.mjs already holds the marker grammar; this holds the one way both scripts run the
// extractor. `execFileSync` throws on a non-zero exit, which printed the extractor's own message
// a second time under a stack trace and then exited 1 instead of its exit code. The extractor has
// already said what is wrong, so pass its status through and say nothing more.
//
import { execFileSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

export function readInventory() {
  try {
    return JSON.parse(execFileSync(process.execPath, [join(here, "extract-plugin-api.mjs")],
                                   { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }))
  } catch (err) {
    if (err?.status) process.exit(err.status)
    console.error(`could not run the extractor: ${err?.message ?? err}`)
    process.exit(1)
  }
}
