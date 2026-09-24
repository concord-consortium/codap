# Plan: Bringing the Plugin API Wiki Up to Date

Date: 2026-09-17 (revised 2026-09-23 following review on PR #2704)

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
| Which component types are creatable? | `registerComponentHandler()` call sites (11 public DI types; a 12th, `errorTester`, is gated on `urlParams.errorTester`) |
| Which adornments are addressable? | `registerAdornmentHandler()` call sites (15 types; `adornmentList` splits Count into Count + Percent) |
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
| Attribute drag requires same-origin + an `application/x-codap-attr-<id>` dataTransfer mime type (§ Drag and Drop of Attributes) | v3 adds a cross-origin path: `notify attribute[...]` with `request: "dragStart" \| "dragMove" \| "dragEnd"` plus `mouseX`/`mouseY`/`overlayWidth`/`overlayHeight` | `handlers/attribute-handler.ts:86` |
| Attribute **Supported Actions**: create, update, get, delete | also `notify` (above) | same |
| § API Overview recommends the `openCase` / `createCase` / `closeCase` loop | those verbs do not exist in v3 at all; the modern pattern is `create item` / `create items` (with request coalescing) | `handlers/item-handler.ts` |
| § Configuration implies an open-ended set of names | v3 recognizes exactly one: `gaussianFitEnabled`; anything else returns `unknown configuration "<name>"` | `handlers/configuration-handler.ts:16` |

### 2.2 Resources with no documentation at all

Five registered resources have no section on the page:

| Resource | Actions | Notes |
|---|---|---|
| `adornment` / `adornmentList` | get, create, update, delete | The single largest gap. The page has no section, only one incidental example that uses `component[Diet].adornment` (wiki line 2867). 15 adornment types register DI handlers (Count/Percent, Mean, Median, MAD, StdDev, StdError, BoxPlot, NormalCurve, PlottedValue, PlottedFunction, MovableValue, MovablePoint, MovableLine, LSRL, RegionOfInterest). `adornmentList` is plot-type-filtered and splits Count into Count + Percent. |
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
dropped, or reshaped. Much of the analysis is already done — `doc/v2-v3-compatibility-audit.md`
catalogs every V2 notification and log event against its V3 counterpart, with per-event tables
and a prioritized recommendation section.

**But the audit is itself out of date, and must not be transcribed as-is.** It was last updated
2026-05-08. Six stories were filed from it on 2026-05-22, and three have since shipped:

| Story | Status |
|---|---|
| CODAP-1351 graph adornment/plot notifications (#2600) | Done |
| CODAP-1352 map notifications (#2603) | Done |
| CODAP-1353 case-table/calculator/slider notifications (#2596) | Done |
| CODAP-1354 V2-compatible default undo/redo notifications on the `document` resource | To Do |
| CODAP-1355 align user-analytics log events with V2 (affects plugins matching on `formatStr` via `logMessageMonitor`) | To Do |
| CODAP-1356 V2-compatible item-level `dataContextChangeNotice` operations | To Do |

An earlier draft of this plan illustrated the drift with `titleChange` putting `type` at the
envelope level in V2 but inside `values` in V3 — that has since been fixed. v3 now sets `type`
at **both** the envelope level and inside `values`, and adds `diType`
(`models/tiles/tile-notifications.ts:40-49`). Transcribing the audit unchanged would document
fixed bugs as v3 behavior and push plugin authors into workarounds they no longer need.

Divergences believed to remain: many operations renamed (`toggle connecting line` →
`toggle show connecting lines`); a list of V2 notifications v3 does not emit at all — but each
needs re-checking against current `main` before it is written down.

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

The page is currently V2-flavored prose with V3 patches. This is **two independent
questions**, and an earlier draft of this plan wrongly presented them as one list of
alternatives:

**A. Where do the docs live?**

1. **The wiki** (`concord-consortium/codap.wiki`), as today.
2. **The repo**, with the wiki page reduced to a pointer.

**B. How are they divided up?**

1. **One page**, patched in place — cheapest; leaves the V2 narrative and 4177 lines.
2. **Split per resource**, plus overview/notifications/embedding pages — matches how people
   actually read it (they arrive looking for one resource) and makes per-resource generation
   tractable.

Recommendation: **the repo, split per resource** (A2 + B2), with the per-resource pages
generated (Phase 6) and the narrative chapters hand-written.

The deciding argument is Phase 6. The CI check is the plan's whole anti-rot mechanism, and it
can only verify docs that CI can see. If the docs stay in `codap.wiki`, a check in the `codap`
repo would have to fetch a separate repo to find out whether a matching section exists, and an
edit to the wiki would never re-run the check at all — so the check cannot catch the drift it
exists to prevent. Supporting reasons:

- **Docs change in the same PR as the code.** Adding a handler and documenting it go through
  one review. Nothing connects the two today, which is how five resources shipped undocumented.
- **The wiki's open editing isn't being used.** Every edit to the page since 2024 is by a team
  developer, so moving it gives up nothing in practice.
- **It answers open questions 2 and 4.** The generated markdown, JSON Schema and `llms.txt` get
  a stable, versioned home next to the code, and the current wiki text can be frozen as the V2
  reference.

The cost is findability: existing links point at wiki anchors. The wiki page becomes a pointer
that maps each old section to its new page, keeping those links one click from the right place.

On path: start in `v3/doc/`. The near-term plan is to remove the V2 code from `main` and
promote `v3/` to the top level, after which a top-level `doc/` (or `wiki/`) folder is the
natural home. The final path need not be settled now, but design the split with that
destination in mind.

### Phase 1 — Correctness fixes (do first, small, high value)

Fix everything in §2.1. These are mostly one-line-per-item edits that stop actively misleading
plugin authors.

**Triage each item before labeling it.** Compatibility with the V2 plugin API was an
acceptance criterion for v3, so a name that v3 no longer accepts is not automatically "a v3
change" — it may be a bug. Check each §2.1 row against V2 source (`master`) and sort it into
one of four buckets:

| Bucket | Meaning | Action |
|---|---|---|
| **V2-compat bug** | V2 supported it, v3 was meant to and doesn't | File a code fix; don't document the gap as behavior |
| **Deliberate v3 change** | V2 or a v3 release shipped it; v3 no longer supports it | Support as deprecated, or document as no longer supported |
| **Doc error** | No release ever supported it; the wiki is simply wrong | Correct the doc — nothing to deprecate |
| **V3 addition** | New in v3, no V2 counterpart | Document as new |

Pre-sorted, with the V2 checks already done:

- **`pointConfig`, `pointsFusedIntoBars` — doc errors.** Neither name appears anywhere in V2
  source. Both were added to the wiki on 2024-12-19, during v3 development, and the API
  changed (to `plotType` and `pointsAreFusedIntoBars`) before any release shipped them. No
  released CODAP ever supported them, so there is nothing to deprecate — and no alias is
  needed (this answers open question 3).
- **`openCase` / `createCase` / `closeCase` — deliberate v3 change.** These belong to the
  legacy Game API (`apps/dg/components/game/game_phone_handler.js` in V2), not the Data
  Interactive API, but V2 did support them and v3 does not. Document as unsupported in v3,
  naming the Game API as their source. Separately, the "Communication Patterns" prose presents
  them as *the* way to use the Data Interactive API, so it needs a rewrite around
  `create item` / `create items`.
- **Attribute `notify` drag (`dragStart` / `dragMove` / `dragEnd`) — v3 addition.** No V2
  counterpart; document as new alongside the existing same-origin dataTransfer path.
- **`configuration` accepting only `gaussianFitEnabled` — needs triage.** `configuration` *is*
  a V2 DI resource (`data_interactive_phone_handler.js:255`) and `gaussianFitEnabled` is a V2
  global app setting. Whether V2 accepted other configuration names has not been checked; do
  that before writing "v3 recognizes exactly one" into the docs, since the answer may make
  this a compat bug rather than v3 behavior.

Whatever the bucket, every one of these names belongs in the §4.4 table — they are in the
wiki's history, and therefore in model weights, regardless of whether they were ever real.

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
Phase 6 tooling — consider doing Phase 6 first if the tooling lands quickly.

### Phase 4 — Notifications chapter (§2.4)

**Step one is re-validating the audit against current `main`** — three of the six stories filed
from it have shipped (§2.4), so any finding taken from it unchecked risks documenting a fixed
bug as v3 behavior. Ideally update `doc/v2-v3-compatibility-audit.md` itself as part of this,
so the next reader inherits a current document; that may be worth its own story.

Then rewrite "CODAP-Initiated Actions" from the revalidated audit. Each notification gets:
resource, operation, `values` shape, and an explicit "differs from V2" note where drift
genuinely remains.

On the audit's §5 recommendations: CODAP-1354, CODAP-1355 and CODAP-1356 already cover the
known remaining divergences, which answers open question 1 — they are to be **fixed in code**,
not documented as v3 behavior. Phase 4's dependency is therefore "1354-1356 land or are
explicitly deferred" rather than a fresh triage.

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
- A merge step that diffs that inventory against the reference's current sections and reports
  **NEW** (in code, undocumented), **REMOVED** (documented, no longer in code), and
  **CHANGED** (action set or property set differs) — preserving hand-written prose and
  examples by matching on resource name.
- A `plugin-api-docs` skill wrapping the two, to be run before each release.
- Generators that emit the §4.1 formats from that inventory: the per-resource markdown
  property tables and examples, and the request/response JSON Schema.
- A CI check (advisory, not blocking) that fails loudly when a new `registerDIHandler` or
  `registerComponentHandler` call appears with no corresponding documented section. Note that
  this only works if the docs live where CI can see them — see Phase 0.

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

### 4.1 Generate several formats from one extracted inventory

The Phase 6 extractor has to build a complete inventory of resources → actions → selector
patterns → value/result shapes. Keep that inventory as the **single source of truth** and
generate the published formats from it, in this order of value:

1. **Per-resource markdown** — property tables plus valid `json` examples. This is the primary
   reference for humans *and* models. For a model reading docs, markdown generally beats a JSON
   dump: it spends fewer tokens (no braces, quotes, or a key repeated per property); a heading
   plus a flat property table makes it obvious which object a property belongs to, where deep
   JSON nesting does not; it carries the *why* — when to use `create items`, what triggers each
   error, how coalescing affects response timing — which JSON can only stuff into `description`
   strings; and it splits well, since a retrieved markdown section is still a complete answer
   while a fragment of a large JSON file loses the path that says what it describes. This is
   §4.3 plus the per-resource split, and it is the highest-value LLM change on this list.
2. **JSON Schema** for the request and response envelope (`{action, resource, values}`) — the
   standard format rather than an ad-hoc `plugin-api.json`. This is where machine-readability
   genuinely pays: validating generated requests, CI checks, codegen, and agents that check
   their own output. Models know the format well.
3. **Optionally a `.d.ts`** of the request and value types. For a model *writing* plugin code,
   TypeScript types may be the most compact precise format, and v3's shapes are already
   TypeScript. Caveat: v3's DI types are internal and include plenty that is not public API
   surface, so this means curating and maintaining a public subset — real work, not free
   generation. Treat it as an option to evaluate, not a committed deliverable.

Link the generated artifacts from the top of the reference, in a line saying what they are and
that they are generated. An `llms.txt` at the docs root, listing the canonical pages plus the
schema, is cheap and is the emerging convention for exactly this.

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

**31 of the page's 215 code blocks are untagged, and 26 of those are the object-shape
blocks** — which are not valid JSON:

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
| 4 Notifications chapter | 1–2 days | revalidating the compat audit; CODAP-1354/1355/1356 land or are deferred |
| 5 Architecture chapters | 1 day | 0 |
| 6 Tooling, generated tables/JSON, CI + docs lint | 3–4 days | 0 (can run in parallel) |
| 7 doctoc / sidebar / llms.txt | hours | all |

Phase 1 is worth shipping on its own, immediately, regardless of what Phase 0 decides.

The §4 work is not a separate phase — it changes *how* phases 1–7 are executed: §4.4 lands
with Phase 1, §4.3 shapes Phase 3, §4.1's generators and §4.2/§4.6 are Phase 6 deliverables
(though §4.1's top-ranked format, per-resource markdown, is Phase 3 output), and §4.5 is the
Phase 0 decision plus Phase 7. The added cost over the original plan is roughly one day, and
most of it is generated output.

## 6. Open questions

All four now have proposed answers, arrived at during review. They are kept here as questions
so the answers can be confirmed rather than assumed.

1. Which of the §2.4 notification divergences should be **fixed in v3** rather than documented
   as v3 behavior?
   *Proposed:* fixed in code. CODAP-1354, CODAP-1355 and CODAP-1356 already cover the known
   remaining divergences; three sibling stories (1351-1353) have shipped. Phase 4 documents
   only what survives revalidation against current `main`.
2. Should the reference continue to document V2-only behavior for plugin authors still
   targeting v2, or become v3-only with a pointer to the frozen v2 text?
   *Proposed:* v3-only. Under the Phase 0 recommendation the current wiki page is frozen in
   place as the V2 reference, which gives that pointer a stable target.
3. Is `pointsFusedIntoBars` worth accepting as a v3 alias for `pointsAreFusedIntoBars`?
   *Proposed:* no alias. Neither `pointsFusedIntoBars` nor `pointConfig` ever existed in V2
   source; both were wiki-only entries added 2024-12-19 and superseded before any release
   shipped them. There is no released behavior to stay compatible with — they are doc errors.
4. Where should the generated artifacts live so plugin authors and their tools can fetch them
   at a stable URL?
   *Proposed:* in the repo with the docs (`v3/doc/`, moving with them when `v3/` is promoted to
   the top level) — the Phase 0 recommendation, which is also what makes the Phase 6 CI check
   possible.
