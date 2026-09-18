# Plan: Bringing the Plugin API Wiki Up to Date

Date: 2026-09-17

Target document: [CODAP Data Interactive Plugin API](https://github.com/concord-consortium/codap/wiki/CODAP-Data-Interactive-Plugin-API)
(wiki repo `concord-consortium/codap.wiki`, file `CODAP-Data-Interactive-Plugin-API.md`,
4177 lines, last substantive edit 2025-10-01).

This plan is the output of a systematic comparison of that page against v3's
`src/data-interactive/` implementation as of `main` @ `adce94a85`.

---

## 1. What was compared

**Wiki side:** every `###`/`####` section of the page — 15 documented resources, 10 component
object shapes, the CODAP-initiated notification catalog, and the narrative chapters.

**Code side:**

| Question | Source of truth in the repo |
|---|---|
| Which resources exist? | `src/data-interactive/register-handlers.ts` (38 handlers) |
| Which actions does each support? | the `DIHandler` object in each `src/data-interactive/handlers/*.ts` |
| Which resource selectors parse? | `DIResourceSelector` in `data-interactive-types.ts`; `resolveResources()` in `resource-parser.ts` |
| Which values are accepted/returned? | `data-interactive-types.ts`, `data-interactive-data-set-types.ts`, `data-interactive-component-types.ts`, `data-interactive-adornment-types.ts` |
| Which component types are creatable? | `registerComponentHandler()` call sites (10 DI types) |
| Which adornments are addressable? | `registerAdornmentHandler()` call sites (14 types + `Percent` alias) |
| Which notifications does CODAP send? | `models/data/data-set-notifications.ts`, `models/tiles/tile-notifications.ts`, `lib/dnd-kit/dnd-notifications.ts`, per-component `*-notifications.ts` |
| Where do V2 and V3 disagree? | `doc/v2-v3-compatibility-audit.md` (already written, 2026-05-08) |

---

## 2. Findings: how the document has drifted

Five distinct kinds of drift, in descending order of harm to plugin authors.

### 2.1 Documented names that are simply wrong in v3 (breaks working plugins)

These are the most damaging, because a plugin author follows the doc and gets silence.

| Wiki says | v3 implements | Where |
|---|---|---|
| graph `pointsFusedIntoBars` | `pointsAreFusedIntoBars` | `components/graph/graph-component-handler.ts:350` |
| graph `pointConfig` | *(no such property)* — use `plotType` | `data-interactive-component-types.ts` |
| Attribute drag requires same-origin + an `application/x-codap-attr-<id>` dataTransfer mime type (§ Drag and Drop of Attributes) | v3 adds a cross-origin path: `notify attribute[...]` with `request: "dragStart" \| "dragEnd"` plus `mouseX`/`mouseY`/`overlayWidth`/`overlayHeight` | `handlers/attribute-handler.ts:86` |
| Attribute **Supported Actions**: create, update, get, delete | also `notify` (above) | same |
| § API Overview recommends the `openCase` / `createCase` / `closeCase` loop | those verbs do not exist in v3 at all; the modern pattern is `create item` / `create items` (with request coalescing) | `handlers/item-handler.ts` |
| § Configuration implies an open-ended set of names | v3 recognizes exactly one: `gaussianFitEnabled`; anything else returns `unknown configuration "<name>"` | `handlers/configuration-handler.ts:16` |

### 2.2 Resources with no documentation at all

Five registered resources have **zero** coverage on the page:

| Resource | Actions | Notes |
|---|---|---|
| `adornment` / `adornmentList` | get, create, update, delete | The single largest gap. 14 adornment types register DI handlers (Count/Percent, Mean, Median, MAD, StdDev, StdError, BoxPlot, NormalCurve, PlottedValue, PlottedFunction, MovableValue, MovablePoint, MovableLine, LSRL, RegionOfInterest). `adornmentList` is plot-type-filtered and splits Count into Count + Percent. |
| `document` | get, update | Gets/replaces the whole document as V2 JSON; brackets the update with `updateDocumentBegun` / `updateDocumentEnded` notices (`handlers/document-handler.ts:202-271`). |
| `dataDisplay` | get | Returns `exportDataUri` — a PNG snapshot of a graph or map. |
| `interactiveApi` | get (async) | Returns `{available, initInteractive}` or `{available:false, notAvailableReason}`; gated on the `interactiveApi` URL parameter. |
| `tourElements` | get | Returns the namespaced registry of tourable UI elements. Design doc already exists: `doc/plugin-tour-api.md` (576 lines). |

### 2.3 Documented resources missing v3 properties and component types

**Component types absent from the page:** `caseCard`, `game`, `imageComponentView`
(the page documents only graph, caseTable, map, slider, calculator, text, webView, guide).

**Property gaps in documented component objects:**

- *graph*: `plotType`, `barChartFormula`, `barChartScale`, `primaryAxis`,
  `showConnectingLines`, `rightNumericAttributeID`/`Name`.
- *slider*: `multipleOf`, `dateMultipleOfUnit`, `scaleType`, `animationRate`, `value`.
- *map*: `geoRaster` (`{type, url, opacity}`).
- *interactiveFrame*: `allowEmptyAttributeDeletion`, `blockAPIRequestsWhileEditing`,
  `preventAttributeDeletion`, `preventTopLevelReorg`, `respectEditableItemAttribute`,
  `subscribeToDocuments`, `codapVersion`, `lang`, `locale`, `handlesLocaleChange`.
  (`lang` vs `locale` is a real trap — see `doc/plugin-locale-switching-design.md`.)
- *attribute*: `deleteProtected`, `renameProtected` (explicitly marked "v3 addition" in
  `data-interactive-data-set-types.ts:36`).
- *selectionList*: create/update now also accept `{collection?, expression}` to select by
  formula (`DISelectionExpression`), not just an array of case IDs.
- *dataContext* update: `managingController`, `sort: {attr, isDescending}`, `rerandomize`.

### 2.4 The CODAP-initiated notification catalog is stale

The page's "CODAP-Initiated Actions" half lists notification operations that v3 renamed,
dropped, or reshaped. **This work is already done** — `doc/v2-v3-compatibility-audit.md`
catalogs every V2 notification and log event against its V3 counterpart, with per-event
tables and a prioritized recommendation section. It needs to be *transcribed into the wiki*,
not re-derived.

Concrete examples from that audit: `titleChange` puts `type` at the envelope level in V2 but
inside `values` in V3; many operations were renamed (`toggle connecting line` →
`toggle show connecting lines`); a long list of V2 notifications v3 does not emit at all.

### 2.5 Architecture the page predates

None of the following is mentioned, and all of it changes how a plugin should be written:

- **Embedded-server mode** (`lib/embedded-mode/embedded-server.ts`): CODAP itself can run in
  an iframe and expose the *same* Data Interactive API to its parent page, no plugin tile
  involved. Driven by the `embeddedMode` / `embeddedServer` URL params. Design doc exists:
  `doc/embedding-codap.md`.
- **Request coalescing** (`data-interactive-request-processor.ts`, `request-coalescer.ts`):
  consecutive single-item `create` requests are batched into one model change. Plugin authors
  streaming cases need to know the batching and response-timing behavior. Design doc exists:
  `doc/plugin-request-processing.md`.
- **`blockAPIRequestsWhileEditing`**: API requests are deferred while a user is editing a
  table cell. A plugin that polls will see delayed responses.
- **`register` / `unregister` as first-class actions**: `ActionName` is now
  `get | create | update | delete | notify | register | unregister`. The page's "Structure of
  Messages" chapter lists only the first five, though the LogMessageMonitor section uses the
  new two.
- **Undo/redo**: `doc/plugin-undo-redo.md` describes v3's model; the page's
  UndoChangeNotices section predates it.

---

## 3. Plan

### Phase 0 — Decide the destination (blocking, needs a human call)

The page is currently V2-flavored prose with V3 patches. Three options:

1. **Patch in place.** Cheapest; leaves the V2 narrative and the 4177-line single page.
2. **Split into a set of wiki pages** — one per resource, plus overview/notifications/embedding.
   Matches how people actually read it (they arrive looking for one resource) and makes
   per-resource generation tractable.
3. **Move the reference into `v3/doc/` and publish from the repo**, leaving the wiki as a
   pointer. Puts the docs under PR review next to the code they describe.

Recommendation: **2**, with the per-resource pages generated (Phase 4) and the narrative
chapters hand-written. Option 3 is the better long-term home but is a bigger change to how
plugin authors find things; worth raising separately.

### Phase 1 — Correctness fixes (do first, small, high value)

Fix everything in §2.1. These are one-line-per-item edits that stop actively misleading
plugin authors. Add a "V3 changes" callout box at the top of the page noting that v3 renamed
`pointsFusedIntoBars`, dropped `pointConfig`, and dropped the Game-API case verbs.

### Phase 2 — Fill the five missing resources (§2.2)

One new `###` section each, following the page's existing template (prose → **Supported
Actions** → **Resource Selector Patterns** → object shape → worked examples). Order by
demand: `adornment`/`adornmentList` first (it is the one plugin authors are asking for),
then `document`, `dataDisplay`, `tourElements`, `interactiveApi`.

For `tourElements` and the embedding/coalescing chapters, adapt the existing `doc/*.md`
files rather than writing from scratch — they are already written for an external audience.

### Phase 3 — Property and component-type sweep (§2.3)

Regenerate each component object block from `data-interactive-component-types.ts` and each
values block from `data-interactive-data-set-types.ts`. Add the `caseCard`, `game`, and
`imageComponentView` objects. This is mechanical and is the natural first customer of the
Phase 4 tooling — consider doing Phase 4 first if the tooling lands quickly.

### Phase 4 — Notifications chapter (§2.4)

Rewrite "CODAP-Initiated Actions" from `doc/v2-v3-compatibility-audit.md`. Each notification
gets: resource, operation, `values` shape, and an explicit "differs from V2" note where the
audit found drift. The audit's §5 recommendations should be triaged with the plugin team
first — some drift may be fixed in code rather than documented.

### Phase 5 — Architecture chapters (§2.5)

New top-level chapters: "Embedded Server Mode", "Request Processing and Coalescing",
"Undo and Redo", "Locale and Internationalization". Each adapted from its existing `doc/`
design document, trimmed of implementation detail.

### Phase 6 — Keep it from rotting

Model this on the existing, proven `generate-log-events-csv` skill
(`.claude/skills/generate-log-events-csv/`), which solves the identical problem for log
events: a committed TypeScript-compiler-API extractor + a merge step that preserves curated
prose + a skill to drive it and author what the extractor cannot.

Deliverables:

- `v3/scripts/extract-plugin-api.mjs` — walks `src/data-interactive/` and the
  `registerComponentHandler` / `registerAdornmentHandler` call sites, emitting a JSON
  inventory: resource → supported actions → selector patterns → value/result type shapes.
- A merge step that diffs that inventory against the wiki's current sections and reports
  **NEW** (in code, undocumented), **REMOVED** (documented, no longer in code), and
  **CHANGED** (action set or property set differs) — preserving hand-written prose and
  examples by matching on resource name.
- A `plugin-api-docs` skill wrapping the two, to be run before each release.
- A CI check (advisory, not blocking) that fails loudly when a new `registerDIHandler` or
  `registerComponentHandler` call appears with no corresponding wiki section.

That last item is what actually prevents recurrence: today nothing connects adding a handler
to updating the doc, which is exactly how `adornment`, `document`, `dataDisplay`,
`tourElements`, and `interactiveApi` all shipped undocumented.

### Phase 7 — Mechanical finish

Re-run doctoc to regenerate the TOC (the page keeps the doctoc markers), and refresh the
`_Sidebar.md` if Phase 0 chose the split.

---

## 4. Making the docs usable by LLMs as well as humans

Plugin authors increasingly write plugins *with* an LLM, and the LLM reads this page. The
good news is that almost nothing here trades off against human readability — the changes that
help a model (exact names, complete examples, explicit tables, self-contained sections) are
the same ones that help a person skimming for one answer. Ranked by leverage:

### 4.1 Ship a machine-readable companion to the prose (highest value)

The Phase 6 extractor already has to build a complete inventory of resources → actions →
selector patterns → value/result shapes. **Publish that inventory as a committed artifact**,
not just as an internal diffing intermediate:

- `plugin-api.json` — the full inventory. A model can load this in a few thousand tokens and
  never has to guess a property name. This is the single highest-value change on this list,
  and Phase 6 gets it nearly for free.
- Optionally a JSON Schema for the request envelope (`{action, resource, values}`), which
  makes generated requests checkable rather than merely plausible.
- Link it from the top of the page, in a line that says what it is and that it is generated.

An `llms.txt` at the docs root, listing the canonical pages plus this JSON, is cheap and is
the emerging convention for exactly this.

### 4.2 Add the three compact tables that prevent the most common model errors

All three are generated by the Phase 6 extractor, so they cost little and never go stale.

1. **Resource × action matrix** — all 38 resources against the 7 actions
   (`get`/`create`/`update`/`delete`/`notify`/`register`/`unregister`), ✓ or —. Calling an
   unsupported action is the most common failure, and today the answer is spread across 15
   "**Supported Actions**" lines in a 4177-line page.
2. **The resource-selector grammar, stated** — not only exemplified. The page teaches
   selectors entirely by example (`dataContext[DataCard2].collection[Measurements].attribute`),
   and models over-generalize from examples into selectors that do not parse. Give the actual
   grammar, the complete list of valid selector keys (from `DIResourceSelector` in
   `data-interactive-types.ts`), and the `#default` data-context defaulting rule from
   `resolveResources()`.
3. **The error catalog** — v3 returns a closed set of roughly 45 errors
   (`handlers/di-results.ts` plus the `V3.DI.Error.*` keys in `en-US.json5`). Listing each
   error string against the condition that produces it lets a model diagnose a pasted error
   directly instead of speculating.

### 4.3 Fix the pseudo-JSON, which actively misleads models

**246 of the page's 430 code fences are untagged**, and those are precisely the object-shape
blocks — which are not valid JSON:

```
pointColor: /* {String} The color of the graph's points in hex format */
```

A model reading this has no reliable way to tell the type annotation from the value, and
copies the comment into generated requests. For each object shape, replace that single block
with two things:

- a **property table** (property | type | actions | default | notes) — better for a human
  skimming than a comment-laden block, and unambiguous for a model; and
- a **valid minimal `json` example** that would actually succeed if sent.

Optionally include the real TypeScript interface in a ```ts fence — v3's shapes *are*
TypeScript (`data-interactive-component-types.ts`), so it is both accurate and generatable.
Tag every remaining fence with its language.

### 4.4 Write the negative space explicitly

This is the one genuinely LLM-specific recommendation. Models have absorbed the v2 docs, the
Game API page, and older revisions of this very page during pretraining, so they emit
`pointsFusedIntoBars`, `pointConfig`, and `openCase` with complete confidence. Prose that
simply documents the correct name does not reliably displace that.

Add an explicit **"Renamed, removed, and non-existent"** table — old name, status, v3
replacement, one line of "if you saw this elsewhere, it is wrong." Every item in §2.1 belongs
in it. Explicit negative statements are one of the few things that reliably suppress a
confidently wrong recall, and they help humans migrating v2 plugins for the same reason.

While there: **state the ID representation.** The § *Names, IDs, and Titles* section explains
the name/id duality but never says the type. The API speaks **numeric** ids; v3 internally
uses prefixed strings (`toV2Id` / `toV3Id` in `utilities/codap-utils.ts`). A model that
assumes v3's internal string ids will generate requests that silently fail to resolve.

### 4.5 Chunking and retrieval hygiene

This reinforces Phase 0 option 2 (split into per-resource pages) for a second, independent
reason: retrieval. A 4177-line page retrieves as arbitrary fragments, and the fragment that
matches "adornment" may not carry the selector rules needed to use it.

- Split so that **one page is one complete, self-contained answer** for a resource.
- Repeat, per resource page, the selector patterns and the default-data-context rule rather
  than referring back. The page has only 2 "as described above" style back-references today;
  the risk is *adding* them during the split.
- Keep heading text stable so anchors survive and citations keep working.
- Put a one-line provenance header on each page — which CODAP version it describes and that
  it is partly generated — so a model can qualify its answer instead of implying timelessness.
- Add a short canonical-terminology table ("data interactive" = "plugin" = "DI";
  "dataContext" = "data set"). The page currently alternates freely, which splits retrieval
  matches and encourages models to treat synonyms as distinct concepts.

### 4.6 Extend the Phase 6 CI check into a docs lint

Since the checker is being built anyway, have it also assert that:

- every ` ```json ` block in the docs parses as JSON;
- every property name appearing in a property table exists in the extracted inventory; and
- every resource in the inventory has a documented section (already in Phase 6).

That converts "the docs are accurate" from a review-time judgment into a build-time fact,
which is what both audiences actually depend on.

### 4.7 What not to do

Do not add LLM-only hidden content — HTML comments, invisible preamble blocks, or a separate
"instructions for AI" section. It is not reliably read, it rots faster than the visible text
because nobody reviews it, and it splits the page into two sources of truth. Everything above
is visible content that serves both readers.

---

## 5. Effort and sequencing

| Phase | Size | Depends on |
|---|---|---|
| 0 Destination decision | discussion | — |
| 1 Correctness fixes | hours | 0 |
| 2 Five missing resources | 2–3 days | 0 |
| 3 Property sweep (as tables + valid examples, §4.3) | 1–2 days, less with Phase 6 tooling | 0 |
| 4 Notifications chapter | 1–2 days | triage of the compat audit |
| 5 Architecture chapters | 1 day | 0 |
| 6 Tooling, generated tables/JSON, CI + docs lint | 3–4 days | 0 (can run in parallel) |
| 7 doctoc / sidebar / llms.txt | hours | all |

Phase 1 is worth shipping on its own, immediately, regardless of what Phase 0 decides.

The §4 work is not a separate phase — it changes *how* phases 1–7 are executed: §4.4 lands
with Phase 1, §4.3 shapes Phase 3, §4.1/§4.2/§4.6 are Phase 6 deliverables, and §4.5 is the
Phase 0 decision plus Phase 7. The added cost over the original plan is roughly one day, and
most of it is generated output.

## 6. Open questions

1. Which of the §2.4 notification divergences should be **fixed in v3** rather than
   documented as v3 behavior? That triage (audit §5) gates Phase 4.
2. Should the page continue to document V2-only behavior for plugin authors still targeting
   v2, or become v3-only with a pointer to the frozen v2 text?
3. Is `pointsFusedIntoBars` worth accepting as a v3 alias for `pointsAreFusedIntoBars` (cheap
   backward compatibility), or is documenting the rename enough?
4. Where should the generated `plugin-api.json` live so plugin authors and their tools can
   fetch it at a stable URL — the wiki repo, `v3/doc/`, or published with the build?
