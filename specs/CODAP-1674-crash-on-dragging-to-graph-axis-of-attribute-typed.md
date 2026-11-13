# Date Axis Freezes on an Attribute With No Usable Dates

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1674

**Status**: **Closed**

## Overview

Dragging an attribute typed as *date* onto a graph axis froze CODAP v3 when none of the attribute's values could be read as a date. The fix gives such an axis the ten days ending now, as CODAP V2 does, and gives an axis whose values are all the same date a range around that date instead of a blank axis. Values that are not dates are left off the graph, and dates typed in afterward fit the axis.

**Why it froze.** `setupAxes` creates a `DateAxisModel` with domain [0, 1] seconds, and `setNiceDomain` left it there when given no values. `DateAxisHelper.render` then turned the bounds into dates with `createDate`, which reads a number below 5000 as a year, so it drew 2000 to 2001 at the seconds level chosen for a one-second span: about 31.6 million ticks.

## Requirements

- **R1.** Putting a date-typed attribute on a graph's numeric axis (bottom, left, or y2) never freezes CODAP, whatever its values. Every route reaches the axis through `setupAxes`: dropping it (mouse or keyboard) or choosing it from the axis menu, changing a plotted attribute's type to *date*, **Treat as Date** after **Treat as Categorical**, changing the plot type, and a plugin creating a graph with it.
- **R2.** With no readable dates (unparseable values, empty values, or both), the date axis shows the 10 days ending at the current date and time. Axis setup judges this over every case, hidden and filtered-out included; **Rescale** and the other refits judge it over the plotted cases.
- **R3.** When the readable dates all fall on one instant, the axis is centered on it, 5 days each side.
- **R4.** With two or more distinct readable dates, the range is unchanged: the data's extent padded by 10% each side.
- **R5.** **Rescale** gives the R2 range with no readable dates and the R3 range with one instant.
- **R6.** With no readable dates, the range is replaced only by an axis setup, **Rescale**, or a later refit that is not grow-only and comes before the user drags or zooms the axis. An axis setup refits every numeric axis on any attribute assignment, type change or plot-type change, so assigning a legend also moves the axis to end at the current time. The grow-only resync after a data change never replaces the range, and after a drag or zoom no refit does. A range a plugin sets before a drag or zoom is replaced by the next refit that is not grow-only, where a numeric axis would keep it.
- **R6a.** When readable dates first arrive on an axis showing the R2 range (typed over a, b and c, say), the next refit fits them as R3 or R4 says, including the grow-only resync, without **Rescale**, as a numeric axis fits the first numbers typed into an attribute that had none. *(Partial by agreement: holds only in the session where the axis was set up. After reopening the document, or on a graph a plugin created, the first dates widen the stored R2 range until **Rescale**.)*
- **R7.** The date axis draws a domain whose bounds are small numbers of seconds (within 5000 seconds of the epoch) as those instants, not as calendar years, so no domain can make the axis walk a span far larger than the one it was given.
- **R8.** A case whose value for a date-typed attribute on a graph axis is not a readable date is not plotted, as with a non-numeric value on a numeric axis. A date-typed attribute on a split is laid out by its values as categories, so there every non-empty value is still plotted.
- **R9.** Automated tests cover R2, R3, R7 and R8, each failing on `main` without hanging the run; tests also pin R4, R6 and R6a.

## Technical Notes

- **Files:** `axis-domain-utils.ts` (`setNiceDomain`, now dispatching to `setNiceDateDomain`), `date-axis-helper.ts` (bounds and outer label read with `createDateFromEpochSeconds`), `data-configuration-model.ts` (`_caseHasValidValuesForDescriptions`, where a date role now takes the numeric branch), and the `growOnly` comment in `axis-types.ts`.
- **The shrink flag:** `BaseNumericAxisModel.allowRangeToShrink` is volatile. `setDomain` takes the union with the current range unless it is set, and clears it after use. `setupAxes` and Rescale set it. After applying the R2 range, `setNiceDateDomain` sets it again so the first dates fit (R6a); a drag or zoom ends in `setDomain` and clears it, while a plugin's `setMinimum`/`setMaximum` does not.
- **Callers of `setNiceDomain` on a date axis:** `setupAxes`, the data-change resync (the only `growOnly` caller), Rescale, the dot plot's display-type reaction, `graph.tsx`'s y-removal refit, `use-graph-model.ts`'s plot-type action and `use-sub-axis.ts`'s `updateDomainAndRenderSubAxis`. `use-graph-model.ts` passes plotted cases' y values, so R6a relies on R8 there: a list of only `undefined` would hit the lone-date branch and clear the flag.
- **Two date readers:** `setupAxes` reads every case's string with `parseDate`; plotting, Rescale and the other refits read plotted cases with `convertToDate`. They agree on date strings and on non-dates, but not on bare numbers ("1704067200" is epoch seconds to `convertToDate` and unreadable to `parseDate`).
- **Day length:** the 10-day range and 5-day pad are fixed multiples of 86,400 seconds, as in V2, so a range crossing a daylight-saving change is off by an hour at one end.
- **Grow-only and the same-date pad:** a same-date axis narrowed below 5 days each side widens again on the next data change, as distinct dates already widen to their 10% pad.
- **No Cypress test of the drop:** on `main` the freeze blocks the browser's main thread, which Cypress shares, so a regression would hang the run rather than fail it. The Jest tests cover each cause; the R7 test renders [-6000, 100] first, which `main` misreads but finishes on, so it fails before reaching a hanging case.

## Out of Scope

- The slider's date axis, which sets its own bounds.
- Date legends and color scales for date attributes.
- Warning that values typed as *date* do not parse, or changing how **Edit Attribute Properties** applies a type.
- Reading bare numbers in a date attribute the same way at axis setup and when plotting. It changes which values set up every date axis, so it needs its own story; Kirk Swenson wonders whether CODAP should stop converting numbers to dates automatically now that PR #2781 adds explicit epoch-second functions. Until then an epoch-second attribute gets the R2 range with its points off the visible axis until **Rescale** or the next refit that reads the plotted values.
- The existing month and hour rollover quirks in the date tick helpers, which do not cause a freeze.

## Decisions

### Should this story also stop plotting a date attribute's non-date values?
**Context**: Today "a" is drawn at the axis's left edge, where it looks like a real date. Leaving such values off changes existing documents that mix dates with non-dates: those points disappear and stop counting toward counts and percents.
**Options considered**:
- A) Leave them off in this story (R8).
- B) Defer to a follow-up story.

**Decision**: A. Kirk Swenson and William Finzer: values that are not plottable are treated as missing.

---

### Where the no-dates range sits relative to now
**Context**: V2 shows the last ten days ending now; the story suggested centering on now.
**Options considered**:
- A) Center on now, 5 days each side.
- B) V2's ten days ending now.

**Decision**: B. Kirk Swenson and William Finzer: a data set rarely mixes past dates with future ones. A lone date keeps V2's 5 days each way.

---

### The pad for an all-same-date axis
**Context**: The 10% pad of a zero span is zero, which gave a blank axis.
**Options considered**:
- A) A fixed 5 days each side, as V2 does for dates.
- B) A percentage of the value, as V2 does for numbers.

**Decision**: A. A percentage of an epoch-seconds value is about five years for a 2024 date.

---

### Fix the helper's date conversion as well as the domain
**Context**: The domain fix alone stops the story's freeze; the helper's `createDate` call is why a one-second domain became a year of second-level ticks.
**Options considered**:
- A) Fix both (R7).
- B) Fix only the domain.

**Decision**: A. A plugin or stored document can set any axis bounds, and the change is a swap to `createDateFromEpochSeconds`.

---

### Whether the data-change resync should also apply the default range
**Context**: The grow-only resync runs on every data change; applying R2 there would undo a range the user dragged or a plugin set.
**Options considered**:
- A) Apply the default only where `setNiceDomain` may refit (setup, Rescale, a refit that follows one).
- B) Apply it on every refit with no dates.

**Decision**: A (R6). The default is skipped when `growOnly` is set or `allowRangeToShrink` is clear.

---

### Dates typed in after the no-dates axis appears
**Context**: With the grow-only resync, typed-in dates took the union with the default range and crowded at one end until **Rescale**; a numeric axis fits its first values tightly.
**Options considered**:
- A) Set `allowRangeToShrink` again after the default range so the first dates fit.
- B) Leave it to **Rescale**.

**Decision**: A, per Kirk Swenson and William Finzer: graphs fit inserted data, and replacing a missing value with a real one counts as an insertion (R6a).

---

### R6a after reopening the document, or for a plugin-created graph
**Context**: The flag is volatile, and a plugin-created graph is built from a snapshot, so in both cases the first dates widen the stored R2 range instead of fitting. A reopened numeric axis is not refit tightly either: the first numbers widen its stored [0, 1], which crowds them unless they lie near 0.
**Options considered**:
- A) Accept it; R6a holds in the session where the axis was set up.
- B) Treat a date axis exactly ten days wide as free to refit.
- C) Save the flag with the axis.

**Decision**: A (Doug Martin; Kirk Swenson agreed in Slack on 13 November 2026). B guesses from the range's width and C changes the saved document format, for a case one **Rescale** fixes. The PR description mentions the limit.

---

### Epoch-second values in a date attribute
**Context**: `setupAxes` rejects bare numbers while plotting reads them as epoch seconds, so such an attribute gets the R2 range with its points off the axis.
**Options considered**:
- A) Leave it for a separate story.
- B) Make `setupAxes` read dates through `dataConfig.numericValuesForAttrRole` here.

**Decision**: A, per Kirk Swenson and William Finzer (see Out of Scope).

---

### R2 reads every case at setup but plotted cases elsewhere
**Context**: With the only date on a hidden case, setup fits that date with no points shown and **Rescale** gives R2.
**Options considered**:
- A) Document it as part of the deferred reader split.
- B) Change setup's reader in this story.

**Decision**: A. It is the same split the epoch-second decision defers.

---

### A plugin-set range on a no-dates axis
**Context**: `setMinimum`/`setMaximum` leave the flag set, so the next refit that is not grow-only replaces a plugin's range, where a numeric axis keeps it.
**Options considered**:
- A) Accept and state it in R6.
- B) Clear the flag when a plugin sets bounds.

**Decision**: A. R6 names drag or zoom as what ends the window.

---

### R8 on a split
**Context**: An attribute already on a split can have its type changed to *date*.
**Options considered**:
- A) Add a split check to the filter.
- B) Rely on `setupAxes`, which resets a split role's type to *categorical* (`syncAttributeTypeWithAxis`).

**Decision**: B. A split check would pin a state reachable only in a bare `DataConfigurationModel`.

---

### Where the "no dates" rule lives
**Context**: Rescale and the plot-type paths also reach `setNiceDomain`.
**Options considered**:
- A) In `setNiceDomain`, so every caller gets it.
- B) In `setupAxes` only.

**Decision**: A. B would leave the other paths on the [0, 1] domain.

---

### The test for R7
**Context**: Rendering a near-epoch domain on `main` loops for millions of ticks, and Jest's timeout cannot stop a synchronous loop.
**Options considered**:
- A) Render [-6000, 100] first (misread but finite on `main`), then [0, 60].
- B) Export the bound conversion and test it alone.

**Decision**: A. It tests the helper as it runs, needs no new export, and fails on `main` before the hanging case.

---

### The filter test's home
**Context**: The change is in the base `DataConfigurationModel`, which has no general test file.
**Options considered**:
- A) A new focused file beside `data-configuration-legend-operability.test.ts`, on its tree harness.
- B) `graph-data-configuration-model.test.ts`.

**Decision**: A. The folder already splits its tests by concern.
