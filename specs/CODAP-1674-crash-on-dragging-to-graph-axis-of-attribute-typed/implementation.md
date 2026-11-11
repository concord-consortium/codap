# Implementation Plan: Date Axis Freezes on an Attribute With No Usable Dates

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1674
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

Three commits, each with its tests; each builds and passes alone, though one path of R6a relies on the third (see the notes on `allowRangeToShrink`). All paths are under `v3/`. Every snippet below was applied as throwaway code and checked: `npm run build:tsc` and `eslint` were clean, the new tests passed (also with `TZ=UTC`), the four tests marked "fails on `main`" failed against `main`'s source without hanging, and the full Jest suite passed with all three commits applied, so no existing test changes.

### Read date-axis bounds as epoch seconds

**Summary**: `DateAxisHelper` turns its domain bounds into dates with `createDate` and `convertToDate`, which read a number below 5000 as a year. It should use `createDateFromEpochSeconds`, which always reads seconds. This is R7: it removes the mechanism that turned a one-second domain into a year of second-level ticks, independent of how the domain was set.

**Files affected**:
- `src/components/axis/helper-models/date-axis-helper.ts`: three call sites and the import.
- `src/components/axis/helper-models/date-axis-helper.test.ts`: a new `describe` block.

**Estimated diff size**: ~45 lines

```diff
 import {
-  convertToDate, createDate, determineLevels, EDateTimeLevel, shortMonthNames
+  createDateFromEpochSeconds, determineLevels, EDateTimeLevel, shortMonthNames
 } from "../../../utilities/date-utils"
@@ drawOuterLabels
-        let thisLabel = getLevelLabelForValue(level, convertToDate(lower))
+        let thisLabel = getLevelLabelForValue(level, createDateFromEpochSeconds(lower))
@@ render
-      lowerBoundsDate = createDate(lowerBoundsSeconds) as Date,
+      lowerBoundsDate = createDateFromEpochSeconds(lowerBoundsSeconds) as Date,
       upperBoundsMS = 1000 * upperBoundsSeconds,
-      upperBoundsDate = createDate(upperBoundsSeconds) as Date,
+      upperBoundsDate = createDateFromEpochSeconds(upperBoundsSeconds) as Date,
```

`convertToDate` and `createDate` have no other uses in the file, so both leave the import.

**Test** (append to `date-axis-helper.test.ts`, and add `DateAxisModel` to its `numeric-axis-models` import). The file mocks `d3` for its existing tests, so this block takes the real `select` through `jest.requireActual`; a real `DateAxisModel` satisfies the helper's `isDateAxisModel` check without a mock.

```ts
describe("DateAxisHelper.render", () => {
  const { select: realSelect } = jest.requireActual("d3")

  function renderAxis(min: number, max: number) {
    const subAxisElt = document.createElementNS("http://www.w3.org/2000/svg", "g")
    const helper = new DateAxisHelper({
      displayModel: {} as IDataDisplayContentModel,
      subAxisIndex: 0,
      subAxisElt,
      axisModel: DateAxisModel.create({ place: "bottom", min, max }),
      layout: {
        getAxisMultiScale: jest.fn().mockReturnValue({ cellLength: 300 }),
        getComputedBounds: jest.fn().mockReturnValue({ left: 0, top: 0, width: 300, height: 30 }),
        getAxisLength: jest.fn().mockReturnValue(300)
      } as unknown as IAxisLayout,
      isAnimating: jest.fn().mockReturnValue(false),
      showScatterPlotGridLines: false,
      subAxisSelectionRef: { current: realSelect(subAxisElt) }
    })
    helper.render()
    return {
      tickCount: subAxisElt.querySelectorAll("line.tick").length,
      labels: Array.from(subAxisElt.querySelectorAll("text"), text => text.textContent)
    }
  }

  it("reads bounds near the epoch as seconds, not as years", () => {
    // Read as a year, 100 would put the upper bound before the lower one and leave no ticks.
    expect(renderAxis(-6000, 100).tickCount).toBeGreaterThan(0)
    const { tickCount, labels } = renderAxis(0, 60)
    expect(tickCount).toBe(60)
    // The outer label names the day the axis starts on, which is 1969 or 1970 depending on time zone.
    expect(labels[0]).toMatch(/19(69|70)/)
  })
})
```

Fails on `main` (0 ticks for [-6000, 100]). The domain order matters: on `main` the first call must come first, because `renderAxis(0, 60)` loops for about 31.6 million ticks there and would hang the run (R9); the failed `expect` on the first line stops the test before it. What each assertion catches: reverting the upper-bound conversion fails the first line; reverting the lower-bound conversion fails the tick count (lower becomes 1 January 2000, after the upper bound); reverting the outer-label conversion fails the label (it reads "1/1/2000").

---

### Give a date axis a range when it has no distinct dates

**Summary**: `setNiceDomain`'s date branch moves into its own function. With no values, a refit that may shrink the axis shows the ten days ending now (R2, R5) and leaves the axis free to shrink, so the first readable dates to arrive fit it (R6a); any other refit leaves it alone (R6). With all values equal, it pads 5 days each way (R3). Distinct values keep the 10% pad (R4).

**Files affected**:
- `src/components/axis/axis-domain-utils.ts`: new `setNiceDateDomain`, a constant, and the dispatch in `setNiceDomain`.
- `src/components/axis/axis-domain-utils.test.ts`: a new `describe` block.

**Estimated diff size**: ~95 lines

```ts
import { IDateAxisModel, isAnyNumericAxisModel, isDateAxisModel } from "./models/numeric-axis-models"

const kSecondsPerDay = 24 * 60 * 60
// With no dates to fit, a date axis shows the ten days ending now, as in V2
const kNoDatesSpanSeconds = 10 * kSecondsPerDay
// How far a date axis extends each way from a lone date, as in V2
const kLoneDatePadSeconds = 5 * kSecondsPerDay
```

```ts
function setNiceDateDomain(values: number[], axisModel: IDateAxisModel, options?: IAxisDomainOptions) {
  if (values.length === 0) {
    // Only a refit that may shrink the axis replaces its range when there is nothing to fit.
    if (options?.growOnly || !axisModel.allowRangeToShrink) return
    const nowSecs = Date.now() / 1000
    axisModel.setDomain(nowSecs - kNoDatesSpanSeconds, nowSecs)
    // Let the first dates to arrive fit the axis, as the first numbers fit a numeric axis.
    axisModel.setAllowRangeToShrink(true)
    return
  }
  const [minDateAsSecs, maxDateAsSecs] = extent(values, d => d) as [number, number],
    addend = minDateAsSecs === maxDateAsSecs ? kLoneDatePadSeconds : 0.1 * (maxDateAsSecs - minDateAsSecs)
  axisModel.setDomain(minDateAsSecs - addend, maxDateAsSecs + addend)
}

export function setNiceDomain(values: number[], axisModel: IBaseNumericAxisModel, options?: IAxisDomainOptions) {
  if (isDateAxisModel(axisModel)) {
    setNiceDateDomain(values, axisModel, options)
    return
  }
  if (values.length === 0) return // leave things as they are
  if (isAnyNumericAxisModel(axisModel)) {
    // ... the numeric branch, unchanged
```

Notes:
- `secondsConverter` in `date-utils.ts` holds milliseconds despite its name, so the day length is spelled out rather than taken from `secondsConverter.kDay`.
- `Math.abs` on the span is dropped: `extent` guarantees max ≥ min.
- **Why the `allowRangeToShrink` check.** `BaseNumericAxisModel.setDomain` only shrinks a bound when `allowRangeToShrink` is set, and clears the flag after one use; otherwise it takes the union with the current range. `setupAxes` and the rescale action set the flag first, so they get R2's range. The other callers that pass no `growOnly` (`graph.tsx`'s y-attribute removal, the dot plot's display-type reaction, `use-graph-model.ts`'s plot-type action, `use-sub-axis.ts`'s refit when the plotted cases change) do not, and without the check would stretch a user-set range out to today. `use-graph-model.ts` reads the plotted cases' y values, which after the third commit's filter are all readable dates; without the filter, a list of only `undefined` would reach the lone-date branch and clear the flag (`setDomain` skips the `NaN` bounds but not the reset), so the first dates would take the union with the default range. With the check, every refit that is not allowed to shrink the axis leaves it as it is, which is what R6 asks of the grow-only data-change resync too. The `growOnly` test stays meaningful because it sets the flag: deleting the `growOnly` condition fails it.
- **Why set the flag again after the default range.** `setDomain` clears `allowRangeToShrink`, so without the second call the grow-only resync that follows typed-in dates would take the union of the default range and the dates (R6a). With it, the axis behaves like a numeric axis after `setupAxes` with no values, whose flag stays set because `setNiceDomain` returns early: the next refit with readable dates fits them, and a refit with none that is not grow-only moves the range to end at the later now. A drag or zoom of the axis ends in `setDomain` (`numeric-axis-drag-rects.tsx`, `axis-utils.ts`), which clears the flag, so a range the user chose is not replaced. A plugin that sets the bounds through `setMinimum`/`setMaximum` does not clear it, so the first dates still fit the axis, as they do on a numeric axis, but the next refit with none that is not grow-only replaces the plugin's range, where a numeric axis keeps it (R6). The flag is volatile, so it does not survive reopening the document or the snapshot a plugin-created graph is built from (accepted; R6a states the limit).
- With no values the old code returned before the date branch, so the dispatch now comes first.

**Test** (append to `axis-domain-utils.test.ts`, and import `DateAxisModel` beside `NumericAxisModel`). Each test sets `allowRangeToShrink` except the one about it, as `setupAxes` does; without it `setDomain` keeps the union with [0, 1] and the minimum stays 0.

```ts
describe("setNiceDomain on a date axis", () => {
  const kNowSecs = 1762862400 // 11 November 2025 12:00 UTC
  const kDay = 24 * 60 * 60
  const kFiveDays = 5 * kDay
  const kTenDays = 10 * kDay

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(kNowSecs * 1000)
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("shows the ten days ending now when there are no dates", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 0, max: 1 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([], axis)
    expect(axis.domain).toEqual([kNowSecs - kTenDays, kNowSecs])
  })

  it("fits the first dates to arrive after the no-dates range, even in a grow-only refit", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 0, max: 1 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([], axis)
    // 1, 15 and 31 January 2024 00:00 UTC; the 10% pad of their 30-day span is 3 days
    setNiceDomain([1704067200, 1705276800, 1706659200], axis, { growOnly: true })
    expect(axis.domain).toEqual([1703808000, 1706918400])
  })

  it("leaves the axis alone when a grow-only refit has no dates", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 100000, max: 200000 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([], axis, { growOnly: true })
    expect(axis.domain).toEqual([100000, 200000])
  })

  it("leaves the axis alone when a refit that may not shrink it has no dates", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 100000, max: 200000 })
    setNiceDomain([], axis)
    expect(axis.domain).toEqual([100000, 200000])
  })

  it("centers the axis on the date, five days each way, when every date is the same", () => {
    const date = 1704067200 // 1 January 2024 00:00 UTC
    const axis = DateAxisModel.create({ place: "bottom", min: 0, max: 1 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([date, date, date], axis)
    expect(axis.domain).toEqual([date - kFiveDays, date + kFiveDays])
  })

  it("pads distinct dates by a tenth of their span on each side", () => {
    const axis = DateAxisModel.create({ place: "bottom", min: 0, max: 1 })
    axis.setAllowRangeToShrink(true)
    setNiceDomain([1000000, 1100000, 2000000], axis)
    expect(axis.domain).toEqual([900000, 2100000])
  })
})
```

The "no dates" and "same date" tests fail on `main`; the other four pass on both and pin R4, R6 and R6a (on `main` the empty list leaves the flag set, so the first dates fit). Deleting either condition of the early return fails one of the two "leaves the axis alone" tests (the `allowRangeToShrink` one fails because `setDomain` takes the union with the default range). Deleting the second `setAllowRangeToShrink(true)` fails the "first dates" test, whose axis then runs from late December 2023 to now.

---

### Leave cases with unreadable dates off the plot

**Summary**: `_caseHasValidValuesForDescriptions` treats a date role like a numeric one: a case is plotted only when its value converts to a finite number of seconds (R8). `dataDisplayGetNumericValue` already does the conversion for a date-typed attribute (through `convertToDate`, ahead of its `extract` flag), so the date case joins the numeric one.

**Files affected**:
- `src/components/data-display/models/data-configuration-model.ts`: one line.
- `src/components/data-display/models/data-configuration-date-filter.test.ts`: new file.

**Estimated diff size**: ~40 lines

```diff
         switch (self.attributeType(role as AttrRole)) {
-          // TODO: handle "date" type
+          case "date":
           case "numeric":
             return isFiniteNumber(dataDisplayGetNumericValue(data, caseID, attributeID, true))
```

The graph's `GraphDataConfigurationModel.filterCase` calls the same base function, including for its extra y attributes, so one change covers the graph; caption and legend roles stay exempt. A split never reaches the date branch: when a split attribute's type changes to *date*, `setupAxes` builds a categorical split axis and `syncAttributeTypeWithAxis` sets the role's type back to *categorical*, so its non-date values stay plotted (R8's split clause) with no code here.

**Test** (new file, built on the tree harness that `data-configuration-legend-operability.test.ts` uses, because a standalone `DataConfigurationModel` keeps an undefined dataset):

```ts
import { Instance, types } from "@concord-consortium/mobx-state-tree"
import { DataSet, toCanonical } from "../../../models/data/data-set"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { DataConfigurationModel } from "./data-configuration-model"

const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: DataSetMetadata,
  config: DataConfigurationModel
})

describe("a date attribute on an axis role", () => {
  let tree: Instance<typeof TreeModel>

  beforeEach(() => {
    tree = TreeModel.create({ data: {}, metadata: {}, config: {} })
    tree.data.addAttribute({ id: "dateId", name: "when", userType: "date" })
    tree.metadata.setData(tree.data)
    tree.data.addCases(toCanonical(tree.data, [
      { __id__: "c1", when: "1/1/2024" },
      { __id__: "c2", when: "a" },
      { __id__: "c3", when: "" }
    ]))
    tree.config.setDataset(tree.data, tree.metadata)
  })

  it("plots only the cases whose value is a readable date", () => {
    tree.config.setAttribute("x", { attributeID: "dateId" })
    expect(tree.config.attributeType("x")).toBe("date")
    expect(tree.config.filterCase(tree.data, "c1")).toBe(true)
    expect(tree.config.filterCase(tree.data, "c2")).toBe(false)
    expect(tree.config.filterCase(tree.data, "c3")).toBe(false)
  })
})
```

Fails on `main` (the "a" case is plotted).

---

### Check the story's steps in the dev build (no commit)

**Summary**: Run the story's steps after the three commits, since the Jest tests check each piece but not the drop itself.

Load documents (or build them by hand) with one attribute typed *date* whose values are: a, b, c; three empty values; three of `1/1/2024`; and `1/1/2024`, `2/1/2024`, `a`. For each, make a graph, drag the attribute to the bottom axis, then press **Rescale**. Expected: no freeze; the first two show the ten days ending today and no points; the third shows 27 December 2023 to 5 January 2024 with the points in the middle; the fourth shows the same axis as `main` with two points and no point at the left edge. Repeat the a, b, c case by dragging to the left axis, by plotting the attribute while it is categorical and then setting its type to *date*, and by choosing **Treat as Categorical** and then **Treat as Date** from the axis menu. Then, in the a, b, c document, type 1/1/2024, 1/15/2024 and 1/31/2024 over the three values, one at a time in the table: without **Rescale**, the axis fits them, running from late December 2023 to early February 2024 (R6a).

There is no Cypress test of the drop: on `main` the freeze blocks the browser's main thread, which Cypress shares, so a regression would hang the run rather than fail it. The Jest tests cover each cause instead.

## Open Questions

### RESOLVED: Judgment call: where the "no dates" rule lives
**Options considered**:
- A) In `setNiceDomain`, so every caller gets it.
- B) In `setupAxes` only, leaving `setNiceDomain` alone.

**Decision**: A. Rescale (R5) and the plot-type paths also reach `setNiceDomain`, and B would leave them on the [0, 1] domain.

### RESOLVED: Judgment call: the test for R7
**Options considered**:
- A) Render the helper with a domain that `main` misreads but finishes on ([-6000, 100]), then the [0, 60] case.
- B) Extract the bound conversion into an exported function and test it alone.

**Decision**: A. It tests the helper as it runs, needs no new export, and its ordering keeps `main` from reaching the hanging case.

### RESOLVED: Judgment call: the filter test's home
**Options considered**:
- A) A new focused file beside `data-configuration-legend-operability.test.ts`.
- B) `graph-data-configuration-model.test.ts`.

**Decision**: A. The change is in the base model, which has no general test file; the folder already splits its tests by concern.

## Self-Review

Roles: Commit Reviewer, Test Writer, Senior Engineer, QA Engineer, Implementer, PR Diff Reviewer.

### Test Writer

Each mutation named under the steps' tests was applied and run: reverting either bound conversion or the outer-label conversion, and deleting either condition of the empty-values return or the second `setAllowRangeToShrink(true)`, each failed exactly the test the step names. No change.

### Senior Engineer

#### RESOLVED: The `allowRangeToShrink` note missed `use-sub-axis.ts`
`updateDomainAndRenderSubAxis` calls `setNiceDomain` on a date axis with no options when the plotted cases change; it is another caller the condition protects, now listed.

#### RESOLVED: The requirements' list of `setNiceDomain` callers missed one
`use-graph-model.ts`'s plot-type action also calls `setNiceDomain` without setting `allowRangeToShrink`. It is one of the callers the `allowRangeToShrink` condition protects, so it is now listed in the requirements' Technical Notes, which also record that only the data-change resync passes `growOnly`.

#### RESOLVED: The flag note gave only the upside of plugin bounds leaving the flag set
It now also says a later refit with no dates replaces a plugin's range (unlike a numeric axis), and that the volatile flag does not survive reopening or plugin creation, with a pointer to R6a, which states that limit.

#### RESOLVED: `use-graph-model.ts` can clear the flag without the filter
Its list comes from the plotted cases, so before the third commit a y date attribute with no readable dates gives a list of `undefined`, which `setNiceDateDomain` treats as one lone date and whose `setDomain` call clears `allowRangeToShrink` (confirmed with a throwaway test). The filter removes that input, so the code stands; the plan's opening line and the flag note now say R6a relies on the third commit there.

### QA Engineer

#### RESOLVED: The browser check described a draft of the domain patch
The requirements' browser results came from an earlier patch. The current code was run in the dev build: the four documents, **Rescale**, the left axis, a categorical attribute whose type was then set to *date*, **Treat as Categorical** then **Treat as Date**, and R6a's dates all behaved as described. The final step lists what to check.

### PR Diff Reviewer

#### RESOLVED: The filter needs no split check
When a split attribute's type becomes *date*, `setupAxes` makes a new categorical split axis and `syncAttributeTypeWithAxis` sets the role's type back to *categorical*, so the filter never sees a date role on a split once the axes are set up (confirmed with a throwaway test through `GraphController.handleAttributeAssignment`). A split check and its test would pin a state reachable only in a bare `DataConfigurationModel`, so the step has none; R8's split clause holds through `setupAxes`.
