//
// The one way both scripts run the extractor. It has already reported whatever is wrong, so
// pass its exit status through and add nothing: `execFileSync` throws on a non-zero exit, and an
// unhandled throw would bury that message under a stack trace.
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
