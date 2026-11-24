// Stands in for run-one.js in tests: never finishes, and starts a process in its process group
// that ignores SIGTERM, like a wedged browser. That process writes its pid to <outDir>/grandchild.pid
// once it's ignoring SIGTERM. When the spec argument is "ignore-term", this process ignores SIGTERM too.
const { spawn } = require("child_process")
const path = require("path")

const [spec, , outDir] = process.argv.slice(2)
if (spec === "ignore-term") process.on("SIGTERM", () => {})
const pidFile = JSON.stringify(path.join(outDir, "grandchild.pid"))
spawn(process.execPath, ["-e", `
  process.on("SIGTERM", () => {})
  require("fs").writeFileSync(${pidFile}, String(process.pid))
  setInterval(() => {}, 1000)
`], { stdio: "ignore" })
setInterval(() => {}, 1000)
