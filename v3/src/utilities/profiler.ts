/*
  Profiler

  The Profiler facilitates the measurement/recording/reporting the number of calls and time spent
  in various blocks of code. It requires explicitly inserting profiler calls into the code, which
  isn't ideal, but has the distinct advantages that it measures exactly what we want to measure,
  including call counts, which can be tremendously informative.

  Usage:

  prf.measure("MyComponent.myCode", () => {
    ... some code to measure ...
  })

  or

  prf.begin("MyComponent.myCode")
  ... some code to measure ...
  prf.end("MyComponent.myCode")

  Then later:

  prf.beginProfiling()
  ... do some user actions to be profiled ...
  prf.endProfiling()
  prf.report()  // logs results to the console

  Path strings are {Component}.{Descriptor}. Only two levels are supported, but you can
  use strings like "MyComponent.myMethod[part1]", etc. to distinguish blocks.

  The report output looks something like:

Profiler Report
---------------
Total time: 35.31s

Graph
 dragDots: count: 253, time: 8.4307s
 render: count: 99, time: 0.0141s
 dragMarquee: count: 107, time: 7.6184s
 dragMarquee[setRect]: count: 97, time: 3.38s
 dragMarquee[diff]: count: 97, time: 0.006s
 dragMarquee[selectCases]: count: 97, time: 4.2311s
 useSelection[onAction]: count: 228, time: 4.1814s
 refreshPoints: count: 226, time: 13.8668s
 setPointCoordinates: count: 226, time: 13.8652s
 setPointCoordinates[selection]: count: 226, time: 1.671s
 setPointCoordinates[position]: count: 226, time: 10.1467s
 setPointCoordinates[raise]: count: 226, time: 2.0441s
 dragDotsStart: count: 2, time: 0.0234s
 dragDotsEnd: count: 2, time: 0.1174s
 refreshPoints[onComplete]: count: 1, time: 0.0005s

Table
 useSelectedRows[appModeReaction]: count: 6, time: 0.0014s
 useRows[appModeReaction]: count: 6, time: 0.0072s
 useRows[onAction]: count: 228, time: 0.1294s
 useSelectedRows[onAction]: count: 228, time: 0.0261s
 syncRowSelectionToDom: count: 116, time: 0.0251s
 syncRowSelectionToRdg: count: 3, time: 0.0013s
 syncRowSelectionToRdg[reaction-copy]: count: 3, time: 0.0011s
 syncRowSelectionToRdg[reaction-set]: count: 3, time: 0.0001s
 useRows[syncRowsToRdg]: count: 3, time: 0.0072s
 useRows[syncRowsToRdg-copy]: count: 3, time: 0.0071s
 useRows[syncRowsToRdg-set]: count: 3, time: 0.0001s
 render: count: 3, time: 0.0005s
 useRows[syncRowsToDom]: count: 108, time: 0.0977s
 */
interface ProfileEntry {
  count: number
  begin: number[]
  time: number
}

type ProfilePath = string
type ComponentRecord = Map<ProfilePath, ProfileEntry>

class Profiler {

  profilingCount = 0
  beginTime = 0
  totalTime = 0
  profile = new Map<string, ComponentRecord>()

  logging = false

  get isProfiling() {
    return this.profilingCount > 0
  }

  beginProfiling() {
    ++this.profilingCount
    this.beginTime = performance.now()
  }

  endProfiling() {
    this.totalTime = performance.now() - this.beginTime
    --this.profilingCount
  }

  begin(path: string) {
    // eslint-disable-next-line no-console
    if (this.logging) console.log(path)
    if (!this.isProfiling) return
    const [component, part] = path.split(".")
    let componentEntry = this.profile.get(component)
    if (!componentEntry) {
      componentEntry = new Map<ProfilePath, ProfileEntry>()
      this.profile.set(component, componentEntry)
    }
    let partEntry = componentEntry.get(part)
    if (!partEntry) {
      partEntry = { count: 0, begin: [], time: 0 }
      componentEntry.set(part, partEntry)
    }
    ++partEntry.count
    partEntry.begin.push(performance.now())
  }

  end(path: string) {
    const [component, part] = path.split(".")
    const entry = this.profile.get(component)?.get(part)
    if (!entry) {
      this.isProfiling && console.warn("Profiler.end:", `no entry for path '${path}'`)
      return
    }
    const t0 = entry.begin.pop()
    t0 && (entry.time += performance.now() - t0)
  }

  measure<T>(path: string, callback: () => T) {
    try {
      this.begin(path)
      return callback()
    }
    finally {
      this.end(path)
    }
  }

  clear() {
    this.profile.clear()
  }

  report() {
    const lines: string[] = []
    lines.push("Profiler Report")
    lines.push("---------------")
    lines.push(`Total time: ${Math.round(prf.totalTime / 10) / 100}s\n`)
    this.profile.forEach((component, name) => {
      lines.push(name)
      component.forEach((entry, part) => {
        if (entry.begin.length > 0) {
          console.warn(`Profiler: ${part} has ${entry.begin.length} incomplete calls`)
        }
        lines.push(` ${part}: count: ${entry.count}, time: ${Math.round(entry.time * 1000) / 1000000}s`)
      })
      lines.push("\n")
    })
    // eslint-disable-next-line no-console
    console.log(lines.join("\n"))
  }

  // Shorter alias methods when used in dev tools console:
  start() {
    this.beginProfiling()
  }

  stop() {
    this.endProfiling()
    this.report()
  }
}

export const prf = new Profiler()
;(window as any).prf = prf
