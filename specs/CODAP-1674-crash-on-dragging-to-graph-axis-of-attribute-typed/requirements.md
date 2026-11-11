# Date Axis Freezes on an Attribute With No Usable Dates

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1674
**Repo**: https://github.com/concord-consortium/codap
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

Dragging an attribute typed as *date* onto a graph axis freezes CODAP v3 when none of the attribute's values can be read as a date. The fix gives such an axis the ten days ending now, as CODAP V2 does, and gives an axis whose values are all the same date a range around that date instead of a blank axis.

## Project Owner Overview

A user on the help forum set an attribute's type to *date* while its values were not dates (a, b, c), then dragged it to a graph, and CODAP froze; the only way out is to reload and lose unsaved work. The same freeze happens when the date attribute's values are all empty. The Jira story also notes a related weakness: when every value is the same date, the axis comes up blank.

After this change, a date axis with no usable dates shows the ten days ending now, as V2 does, and a date axis whose values are all one date shows five days either side of that date. When real dates are then typed over the unusable values, the axis fits them, as a numeric axis fits the first numbers typed in. Values that are not dates are left off the graph rather than drawn at the edge of the axis, where today they look like real dates. Otherwise, graphs of ordinary date data, with two or more different dates, look exactly as they do now.

## Background

The story's steps: make a one-attribute table with values a, b and c, set the attribute's type to *date* with **Edit Attribute Properties**, make a graph, and drag the attribute to the graph. CODAP freezes. Reproduced on `main` in the dev build: the freeze happens on the drop, both for values a, b, c and for three empty values. Three values of `1/1/2024` give a blank axis, as the story says.

**Why it freezes.** When an attribute is dropped on a graph axis, `setupAxes` (`v3/src/components/graph/models/graph-model-utils.ts`) creates a `DateAxisModel` with `min: 0, max: 1` and calls `setNiceDomain` with the attribute's values converted by `stringValuesToDateSeconds`, which drops every value that does not parse. With no parseable values the list is empty, and `setNiceDomain` (`v3/src/components/axis/axis-domain-utils.ts`) returns early ("leave things as they are"), so the axis keeps the domain [0, 1] seconds.

`DateAxisHelper.render` (`v3/src/components/axis/helper-models/date-axis-helper.ts`) then turns the domain bounds into `Date`s with `createDate(lowerBoundsSeconds)` and `createDate(upperBoundsSeconds)`. `createDate` (`v3/src/utilities/date-utils.ts`) reads a single number as epoch seconds only when its magnitude is at least 5000 (`defaultToEpochSecs`); below that it reads it as a year. So 0 and 1 become 1 January 2000 and 1 January 2001. Meanwhile `determineLevels` is given the true span, one second, and picks seconds as the tick level. The tick loops then walk second by second from 2000 to 2001, about 31.6 million ticks, each appended to the SVG. A throwaway test confirmed `createDate(0)` and `createDate(1)` give those two dates and that `determineLevels(0, 1000)` gives the seconds level.

**Why the same-date axis is blank.** With every value the same instant, `setNiceDomain`'s date branch pads by 10% of a zero span, so min equals max, and `DateAxisHelper.render` returns early when `min === max`.

**Why unreadable values show as points.** `_caseHasValidValuesForDescriptions` (`v3/src/components/data-display/models/data-configuration-model.ts`) decides which cases a graph plots. A numeric role requires a finite number; a date role falls to the default branch (there is a `TODO: handle "date" type`), which requires only a non-empty value. So a case whose date value is "a" is plotted with no position: on `main`, with values `1/1/2024`, `2/1/2024` and `a`, the "a" point sits on the axis's left edge, beside a "29" (December) tick. Empty values are already left out.

**What V2 does.** V2's `CellLinearAxisModel._computeBoundsAndTickGap` (`apps/dg/components/graph/axes/cell_linear_axis_model.js`) has date defaults: with no usable values the axis runs from ten days ago to now, and with all values equal it extends five days each way (`addend: 5 * 24 * 60 * 60`). V2 then rounds both bounds outward to its tick spacing, which V3 does not do. The story suggested centering on the current date; William Finzer and Kirk Swenson chose V2's range instead (see Open Questions).

## Requirements

- **R1.** Putting a date-typed attribute on a graph's numeric axis (bottom, left, or the right y2 axis) never freezes CODAP, whatever the attribute's values are. Every way of putting it there reaches the axis through `setupAxes`: dropping it on the axis (by mouse or keyboard) or choosing it from the axis's attribute menu, changing a plotted attribute's type to *date*, choosing **Treat as Date** from the axis's menu after **Treat as Categorical**, changing the plot type, and a plugin creating a graph with it.
- **R2.** When none of a date-typed attribute's values can be read as a date (values that do not parse, empty values, or both), the date axis shows the 10 days ending at the current date and time. Axis setup judges this over every case's value, hidden and filtered-out cases included, as it reads values today; **Rescale** and the other refits judge it over the plotted cases.
- **R3.** When the attribute's readable dates all fall on the same instant, the date axis shows a range centered on that instant, extending 5 days on each side, instead of a blank axis.
- **R4.** When the attribute has two or more distinct readable dates, the axis range is unchanged from today's behavior (the data's extent padded by 10% on each side). Unreadable values mixed in with readable ones are ignored as they are now.
- **R5.** **Rescale** on a graph whose date axis has no readable dates gives the R2 range, and on one whose readable dates are all the same instant gives the R3 range.
- **R6.** With no readable dates, the axis's range is replaced only by an axis setup, **Rescale**, or a later refit that is not grow-only and comes before the user has dragged or zoomed the axis. An axis setup refits every numeric axis of the graph whenever any of the graph's attributes is assigned or changes type, or the plot type changes, so assigning another attribute (a legend, say) also moves the axis to end at the current time, just as it refits a date axis with readable dates today. The grow-only resync after a data change never replaces the range when there are no readable dates, and once the user has dragged or zoomed the axis no refit does, as on a numeric axis with no data to fit. A range a plugin sets before such a drag or zoom is replaced by the next refit that is not grow-only (switching a dot plot to bars, say), where a numeric axis would keep it.
- **R6a.** When readable dates first arrive on an axis showing the R2 range (for example, typed over a, b and c), the next refit fits them as R3 or R4 says, including the grow-only resync after the data change, without **Rescale**. This matches a numeric axis, which fits the first numbers typed into an attribute that had none: by CODAP's convention graphs fit inserted data but not changed values, and replacing a missing value with a real one counts as an insertion. R6a holds in the session where the axis was set up: after the document is reopened, or on a graph a plugin created, the first dates widen the stored R2 range instead, until **Rescale**.
- **R7.** The date axis draws a domain whose bounds are small numbers of seconds (within 5000 seconds of 1 January 1970) as those instants, not as calendar years. This is defense in depth: no domain, however it is set, can make the axis walk a span far larger than the one it was given.
- **R8.** A case whose value for a date-typed attribute on a graph axis is not a readable date is not plotted, the same as a case with a non-numeric value on a numeric axis. Such a value is treated as missing. Today such a case is drawn at the left (or bottom) edge of the plot, where it looks like a real date. A date-typed attribute on a split (top or right) is laid out by its values as categories, so there every non-empty value is still plotted.
- **R9.** Automated tests cover R2, R3, R7 and R8, and each fails on `main` without hanging the test run; tests also pin R4, R6 and R6a, which hold on `main` as well. (A test that renders the R7 case on `main` would loop for millions of ticks, and a synchronous loop cannot be stopped by Jest's timeout, so R7's test must reach the defect without drawing an unbounded axis.)

## Technical Notes

- **Files involved:** `v3/src/components/axis/axis-domain-utils.ts` (`setNiceDomain`), `v3/src/components/axis/helper-models/date-axis-helper.ts` (`DateAxisHelper.render`, which uses `createDate` on the bounds, and `drawOuterLabels`, which uses `convertToDate(lower)`), `v3/src/utilities/date-utils.ts` (`createDate`, `createDateFromEpochSeconds`, `defaultToEpochSecs`, `determineLevels`, `stringValuesToDateSeconds`), `v3/src/components/graph/models/graph-model-utils.ts` (`setupAxes`), `v3/src/components/graph/models/graph-content-model.ts` (the grow-only resync and the rescale action, both through `setNiceDomain`).
- **Callers of `setNiceDomain` on a date axis:** `setupAxes` (with `allowRangeToShrink` set true, so it may refit), the graph content model's data-change resync (`growOnly: true`), its rescale action (`allowRangeToShrink` true), the dot plot's display-type reaction, `graph.tsx`'s refit after removing a y attribute, `use-graph-model.ts`'s plot-type action, and `use-sub-axis.ts`'s `updateDomainAndRenderSubAxis` (run when the set of plotted cases changes, with no options). Only the data-change resync passes `growOnly`; `plot.axisDomainOptions` sets only `clampPosMinAtZero`. All but one feed values through `numericValuesForAttribute` or `stringValuesToDateSeconds`, both of which drop unreadable dates, so they see an empty list in the story's case. `use-graph-model.ts` passes the y value of each plotted case, so after R8 it sees only readable dates. A list holding only `undefined` would reach the lone-date branch (`undefined === undefined`); `setDomain` skips the `NaN` bounds but still clears `allowRangeToShrink`, which would end R6a's window.
- **Which reader decides "readable":** `setupAxes` reads the attribute's string values with `parseDate` (through `stringValuesToDateSeconds`), while plotting, Rescale and the other refits read them with `convertToDate` (through `dataDisplayGetNumericValue`). The two agree on ordinary date strings and on non-dates such as "a", but not on bare numbers: "1704067200" is epoch seconds to `convertToDate` and unreadable to `parseDate`, and "7" is 2007 to one and July 2001 to the other. They also read different cases: `setupAxes` reads every case (`attribute.strValues`), the others only the plotted ones. So when the only readable dates are on hidden or filtered-out cases, setup fits those dates (R3 for one date) with no points shown, and **Rescale** gives R2. Making them agree is out of scope (see Out of Scope).
- **Grow-only refits and the same-date pad:** the data-change resync takes the union of the current range with the padded data range, so with all values on one date, a range the user has narrowed to less than 5 days each side is widened again on the next data change. Distinct dates already behave this way inside their 10% pad.
- **Existing `computeNiceNumericBounds`** already gives a numeric axis a fixed range for the empty and single-value cases (and `setNiceDomain` leaves a numeric axis alone when given no values). The date branch has no equivalent.
- **Day length:** the 10-day range and the 5-day pad are fixed multiples of 86,400 seconds, as in V2, not calendar days, so a range crossing a daylight-saving change is off by an hour at one end, which the day-level labels do not show.
- **Which cases are plotted:** `_caseHasValidValuesForDescriptions` in `v3/src/components/data-display/models/data-configuration-model.ts` (caption and legend roles are exempt). A date-typed attribute cannot be dropped on a split, but one already there can have its type changed to *date*; it keeps a categorical split axis, with a column for each value, "a" included, and `setupAxes` sets the split role's type back to *categorical* (`syncAttributeTypeWithAxis`), so the plot filter sees a categorical role there once the axis is set up. `dataDisplayGetNumericValue` (`v3/src/components/data-display/data-display-value-utils.ts`) already turns a date-typed value into epoch seconds, or `undefined` when it does not parse, so a date branch can use the same finite-number check as the numeric branch.
- **Paths into `setupAxes`:** `usePlot`'s attribute assignment/type reaction and its plot-type reaction (`v3/src/components/graph/hooks/use-plot.ts`), `GraphController.handleAttributeAssignment` (`graph-controller.ts`), and plugin graph creation (`graph-component-handler.ts`). Each call sets up every axis place, and the `usePlot` reaction watches the attribute and type of every graph role, legend and splits included; an existing date axis is reused (`getValidNumericDateOrQualitativeAxis`) and refit with `allowRangeToShrink` set.
- **A test for R7 that cannot hang:** on `main`, a domain of [-6000, 100] seconds finishes with 0 ticks (`createDate(-6000)` is read as epoch seconds and `createDate(100)` as the year 100, so the upper bound is before the lower and the loops exit at once), while the fixed helper draws 102 minute-level ticks for it.
- **Tests:** `v3/src/components/axis/axis-domain-utils.test.ts` covers `setNiceDomain`; `v3/src/components/axis/helper-models/date-axis-helper.test.ts` covers the helper. Cypress has date-axis helpers in `v3/cypress/support/elements/axis-elements.ts` (`getDateAxisTickLabels`).

## Out of Scope

- The slider's date axis (`v3/src/components/slider/slider-model.ts`), which sets its own bounds and is not reached by the story's steps.
- Date legends and color scales for date attributes.
- Warning the user that values typed as *date* do not parse, or changing how **Edit Attribute Properties** applies a type.
- Reading bare numbers in a date attribute the same way at axis setup and when plotting (for example, making `setupAxes` use `dataConfig.numericValuesForAttrRole` for dates, which would also make setup skip hidden and filtered-out cases). It changes which values set up every date axis, so it needs its own story; Kirk Swenson wonders whether CODAP should stop converting numbers to dates automatically, now that PR #2781 adds functions that convert epoch seconds explicitly. Until then an attribute of epoch-second numbers gets the R2 range while its points are plotted at their own dates, off the visible axis, until **Rescale** or the next refit that reads the plotted values (after any data change, say), which fits them because the R2 range leaves the axis free to shrink (R6a).
- The existing quirks in the date tick helpers' month and hour rollover arithmetic (`month > 12`, `hour > 24`), which do not cause a freeze.

## Open Questions

### RESOLVED: Should this story also stop plotting a date attribute's non-date values (R8)?
**Context**: The story asks only about the freeze and the blank axis. Today a case whose date value does not parse (such as "a") is drawn at the axis's left edge, where it looks like a real date. A numeric axis already leaves non-numbers off the plot. Keeping R8 changes existing documents that mix dates with non-dates: those points disappear and stop counting toward counts and percents (means and the other univariate measures already skip them).
**Options considered**:
- A) Keep R8 and the implementation spec's third step.
- B) Drop R8 and that step, and record it as a follow-up story.

**Decision**: A, in this story. Kirk Swenson and William Finzer: values that are not plottable should be treated as missing and not plotted.

### RESOLVED: Where the no-dates range sits relative to now
**Context**: V2 shows the last ten days, ending now; the story suggested now in the center with a few days either side.
**Options considered**:
- A) Center on now, 5 days each side.
- B) V2's range: ten days ago to now.

**Decision**: B. Kirk Swenson and William Finzer: a data set rarely mixes past dates (data) with future ones (projections), so ten days ending now is the more natural default. A lone date keeps V2's 5 days each way (R3).

### RESOLVED: Judgment call: the pad for an all-same-date axis
**Context**: `setNiceDomain` pads distinct dates by 10% of their span, which is zero here.
**Options considered**:
- A) A fixed 5 days each side, as V2 does for dates.
- B) A percentage of the value, as V2 does for numbers.

**Decision**: A. A percentage of an epoch-seconds value is about five years for a 2024 date, which tells the user nothing about a single day.

### RESOLVED: Judgment call: fix the helper's date conversion as well as the domain
**Context**: The domain fix alone stops the story's freeze. The helper's `createDate` call on epoch-second bounds is the reason a one-second domain turned into a year of second-level ticks.
**Options considered**:
- A) Fix both (R7).
- B) Fix only the domain.

**Decision**: A. The helper should not misread any domain, however it was set (a plugin or a stored document can set axis bounds), and the change is a one-line swap to `createDateFromEpochSeconds`.

### RESOLVED: Low confidence: the story says an empty date attribute gives a blank axis
**Context**: The story's note says an attribute typed as *date* with no values shows a blank axis. With three cases whose values are empty, `main` freezes, the same as a, b, c.
**Decision**: Treat both as R2. The note may describe an attribute with no cases at all; R2 covers every case where there are no readable dates.

### RESOLVED: Low confidence: whether the data-change resync should also apply the default range
**Context**: The grow-only resync runs on every data change. If it applied R2's range whenever there were no readable dates, it would undo a range the user had dragged or a plugin had set.
**Decision**: Leave the axis alone in grow-only mode and in any refit not allowed to shrink the axis (R6); apply the default only where `setNiceDomain` may refit (axis setup, rescale, and a refit that follows one, R6). The implementation spec explains why the second condition is needed.

## Self-Review

Roles: Senior Engineer, QA Engineer, Product Manager, Teacher, Student, Implementer, Cross-Spec Consistency, WCAG Accessibility Expert, Spec Editor.

### Product Manager

#### RESOLVED: Unreadable date values are drawn as points at the edge of the axis
With the domain fixed, the story's own steps would leave a, b and c drawn as a stray point in the plot's corner, because the plot filter accepts any non-empty value for a date role. On `main` the same filter already draws the "a" in mixed data at the axis's left edge, where it reads as a late-December date. Added R8 (unreadable dates are not plotted, as on a numeric axis) and a Background paragraph; confirmed both pictures in the dev build. This widens the story slightly: in an existing document with mixed values, such points disappear and stop counting toward counts and percents, as non-numeric values already do on a numeric axis.

### QA Engineer

#### RESOLVED: A test of the helper's date conversion cannot render the failing case on `main`
Every domain within 5000 seconds of the epoch is misread as a span of years at the seconds level on `main`, so a render-based test would not fail; it would hang the suite, since Jest's timeout cannot interrupt a synchronous loop. R9 now says each test fails on `main` without hanging, and the implementation spec has to choose a test that reaches the conversion without drawing an unbounded axis.

#### RESOLVED: A narrowed same-date axis is widened by the next data change
On `main` the grow-only resync leaves a zoomed same-date axis alone (the union with a zero-width range); with the 5-day pad it widens it to 5 days each side, as distinct dates are already widened to their 10% pad. Confirmed with throwaway tests of the patched `setNiceDomain`; consistent with existing date behavior, so recorded in Technical Notes rather than changed.

#### RESOLVED: The "Fix confirmed" paragraph described a check of earlier code
The four documents, **Rescale**, the left axis, the *date*-type change, **Treat as Date** and R6a were rerun in the dev build on the current code, and the full Jest suite rerun. The paragraph was later removed (see Spec Editor).

#### RESOLVED: R2 said "plotted values", but axis setup reads every case
`setupAxes` reads `attribute.strValues`, hidden and filtered-out cases included, while **Rescale** reads the plotted cases. With the attribute's only date on a hidden case, a throwaway `GraphController` test of the planned code gave R3's range around the hidden date at setup and R2's range on **Rescale**. It is the same reader split that Out of Scope already defers, so R2, the reader note and the Out of Scope entry now say so rather than changing the plan.

### Senior Engineer

#### RESOLVED: The caller list missed `use-sub-axis.ts` and overstated that every caller drops unreadable dates
`updateDomainAndRenderSubAxis` also calls `setNiceDomain` on a date axis, and `use-graph-model.ts` reads the values of the plotted cases. Both are harmless under the plan; Technical Notes corrected.

#### RESOLVED: Epoch-second values in a date attribute get the "no dates" axis but are still plotted
`setupAxes` reads values with `parseDate`, which rejects a bare number such as "1704067200", while R8's filter and Rescale use `convertToDate`, which reads it as epoch seconds (confirmed with a throwaway test of both readers). On `main` such an attribute freezes; with the plan it gets R2's range while its points are plotted at their own dates, off the visible axis, until **Rescale**. Options: A) leave it out of scope for a separate story; B) make `setupAxes` use `dataConfig.numericValuesForAttrRole` for dates in this story. Decision: A, per Kirk Swenson and William Finzer; recorded in Out of Scope.

#### RESOLVED: R6a does not hold once the document is reopened, or for a graph a plugin created
`allowRangeToShrink` is volatile, so it is not saved, and a plugin-created graph is built from a snapshot of a model set up separately. In both cases a no-dates axis comes back showing its stored R2 range with the flag clear, and the first dates take the union with it: for January 2024 dates, 29 December 2023 to the day the range was set, with the points crowded at the left until **Rescale** (confirmed with a throwaway test that round-trips the axis through its snapshot). A numeric axis reopened with no values is not refit tightly either, but its stored [0, 1] does little harm. Options: A) accept it and say in R6a that it holds in the session where the axis was set up; B) treat a date axis whose span is exactly the R2 span as free to shrink; C) save the flag with the axis. Decision: A (Doug Martin). It follows the agreed rule wherever that is cheap and matches a reopened numeric axis; B guesses from the range's width and C changes the saved document format, for a case one **Rescale** fixes. R6a now states the limit, and the PR description will mention it.

#### RESOLVED: R6 claimed a refit replaces the no-dates range only while the range is unchanged
A plugin that sets bounds through `setMinimum`/`setMaximum` leaves the flag set, so the next refit that is not grow-only (the dot plot's display-type reaction, a y removal) replaces the plugin's range with R2's; a numeric axis keeps it (confirmed with a throwaway test). R6 now says so, and names drag or zoom as what ends the window.

#### RESOLVED: The `use-graph-model.ts` note gave the wrong reason it is harmless
It said that caller passes unreadable dates as `undefined` and that the resulting `NaN` bounds leave the axis alone. It reads only plotted cases, so after R8 it sees only readable dates; and a list of only `undefined` would clear `allowRangeToShrink` while leaving the range (confirmed with a throwaway test: the next grow-only refit then took the union with the default range). Technical Notes corrected; the implementation notes R6a's reliance on R8 here.

### Student

#### RESOLVED: Dates typed in after the no-dates axis appears are squeezed against one end
A likely next step after seeing R2's axis is to fix the values, typing real dates over a, b, c. The data-change resync is grow-only, so with the plan as first written the axis became the union of the default range and the new dates (for January 2024 dates, late December 2023 to now), with the points crowded at the left until **Rescale**. A numeric axis does not do this: `setupAxes` sets `allowRangeToShrink`, `setNiceDomain` returns early with no values and leaves the flag set, so the first values to arrive refit the axis tightly; the date branch's `setDomain` call consumed the flag. Options: A) set `allowRangeToShrink` again after applying the default range, so the first readable dates refit the axis as on a numeric axis; B) note that **Rescale** is needed. Decision: A, per Kirk Swenson and William Finzer (graphs fit inserted data, and replacing a missing value with a real one counts as an insertion). Added R6a and reworded R6.

### Implementer

#### RESOLVED: R8 did not say what happens on a split
The filter switches on the role's type for every role but caption and legend, and an attribute already on a split can have its type changed to *date*. R8 now says splits keep their non-date values. `setupAxes` already guarantees it, by resetting a split role's type to *categorical* when its attribute becomes a date, so the implementation adds no code for it.

### Cross-Spec Consistency

#### RESOLVED: R6 implied only the dropped attribute's axis is set up again
`setupAxes` refits every numeric axis on any attribute or type change in the graph, so assigning a legend moves a no-dates axis to end at the current time, as it already refits a dated axis. R6 and the `setupAxes` note now say so.

### WCAG Accessibility Expert

#### RESOLVED: R1's list of paths left out the axis menu
Choosing the attribute from an axis's attribute menu (the keyboard route) and **Treat as Date** after **Treat as Categorical** also reach `setupAxes`; a throwaway test confirmed **Treat as Date** gives a new date axis of [0, 1] on `main`. R1 now names them, and the implementation's dev-build check covers **Treat as Date**.

### Spec Editor

#### RESOLVED: Background kept a dated log of the browser check
The "Fix confirmed" paragraph carried a run date, test counts and date-specific axis labels that the implementation's final step already states as expected results; it now points there.

#### RESOLVED: Background still held a record of how the fix was checked
The "Fix confirmed" paragraph was a process record. Removed; the implementation's opening line keeps what an implementer needs (the full Jest suite passes with the plan applied, so no existing test changes), and its final step says to type R6a's dates one at a time, the path a user takes.

### Senior Engineer (second pass)

#### RESOLVED: Out of Scope said epoch-second dates stay off the axis until Rescale
The R2 range leaves `allowRangeToShrink` set, so the next refit that reads the plotted values, including the grow-only resync after any data change, fits dates that `convertToDate` reads but `parseDate` does not (a throwaway test of the planned `setNiceDomain` fit epoch-second values on the first grow-only refit). The Out of Scope entry now says so.

#### RESOLVED: A Cross-Spec entry still said a legend re-centers the no-dates axis
It now says the axis moves to end at the current time, as R6 does.
