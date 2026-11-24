// Stands in for run-one.js in tests: never finishes, and starts a process in its process group
// that ignores SIGTERM, like a wedged browser. Writes that process's pid to <outDir>/grandchild.pid.
// When the spec argument is "ignore-term", this process ignores SIGTERM too.
const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

const [spec, , outDir] = process.argv.slice(2)
if (spec === "ignore-term") process.on("SIGTERM", () => {})
const grandchild = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
  { stdio: "ignore" })
fs.writeFileSync(path.join(outDir, "grandchild.pid"), String(grandchild.pid))
setInterval(() => {}, 1000)
