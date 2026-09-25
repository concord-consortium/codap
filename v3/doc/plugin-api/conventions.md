# Conventions for the Plugin API reference

How pages in this reference are structured, and why. This page is for people **writing** the
reference; plugin authors want [the index](README.md).

These conventions exist to satisfy three constraints at once:

1. **One page is one complete answer.** Someone arriving to use `adornment` should not have to
   read three other pages first.
2. **Parts of each page are generated.** A resource's supported actions, selector patterns and
   property table are derived from `v3/src/data-interactive/`, so they must sit in blocks a tool
   can rewrite without touching hand-written prose.
3. **The pages are read by models as well as people.** Exact names, complete examples and
   explicit tables serve both.

---

## Folder layout

```
v3/doc/plugin-api/
  README.md           index: terminology, request envelope, selector rules, resource table
  conventions.md      this page
  resources/          one page per resource                          (filling in: Phases 2-3)
  guides/             narrative chapters spanning resources          (filling in: Phase 5)
  notifications.md    catalog of notifications CODAP sends           (not yet created: Phase 4)
```

`resources/` holds reference pages, one per resource, following the layout below. `guides/`
holds the chapters that cannot be attached to a single resource — embedded-server mode, request
processing and coalescing, undo and redo, locale. `notifications.md` is a single catalog rather
than per-resource pages, because plugin authors arrive at it asking "what does CODAP send me?"
rather than "what does this resource send?".

Whole-folder rule: everything here is **external-facing** reference for plugin authors. The rest
of `v3/doc/` is internal design documentation for CODAP developers. Keep the two separate — the
audiences and the tolerance for implementation detail differ.

---

## Page layout

Every resource page follows the same section order. Keep it, even when a section is short —
predictable structure is most of what makes a reference usable.

```markdown
# <resourceName>

> <provenance header — see below>

<One or two paragraphs: what this resource is, and when a plugin would reach for it.>

## Supported actions
## Resource selector patterns
## Values
## Examples
## Notifications
## Errors
```

Sections may be omitted only when they genuinely do not apply — a read-only resource has no
`create` values, for instance. Do not omit a section merely because it is brief.

### Provenance header

Every page opens with one, directly under the title:

```markdown
> **Applies to:** CODAP v3 · **Verified:** 2026-09-25 against `main` @ `ae2105cf4`
> · Parts of this page are generated — see [conventions](../conventions.md).
```

A reader — human or model — can then qualify what they are reading instead of assuming it is
current. Update the date and commit when you re-verify the page, not when you merely edit prose.

---

## Generated blocks

Mechanical content lives between markers so the Phase 6 generator can replace it without
disturbing anything a person wrote:

```markdown
<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
<!-- END GENERATED: actions -->
```

Rules:

- **Never hand-edit inside the markers.** Fix the extractor or the code instead; a hand edit will
  be silently overwritten.
- **Never put prose inside the markers.** Explanation goes immediately before or after the block,
  where it survives regeneration.
- Current block names: `actions`, `selectors`, `values`, `errors`.
- A page written before the generator exists still uses the markers, with the content written by
  hand. That is the point — the generator takes over later with no restructuring.

---

## Repeat rather than cross-reference

Each resource page **restates** the selector patterns that apply to it and the default
data-context rule, rather than linking back to a shared page.

This is deliberate and it is not an accident of drafting. A reader who arrives at one page has a
complete answer, and a retrieved fragment carries the rules needed to use what it describes. The
cost is duplication that the generator maintains anyway.

The exception is genuinely shared narrative — request coalescing, undo/redo, embedded-server mode
— which lives in its own chapter and is linked, not restated.

---

## Examples must be real

- Every ` ```json ` block must parse as JSON. No comments, no `/* {String} ... */` annotations, no
  ellipses. The old wiki page's object-shape blocks were none of these things, and plugin authors
  copied the annotations into real requests.
- Every request example must be one that would actually succeed if sent, against a document whose
  setup the surrounding prose describes.
- Show the response too when its shape is not obvious.
- Type and default information belongs in the **Values** property table, not in a comment inside
  an example.
- **JavaScript examples must not assume a helper library.** This reference documents the API, not
  any particular client. Write `sendRequest(...)` with a comment saying it stands for however the
  plugin sends requests, and show receiving notifications through a `requestHandler(command,
  callback)` — the iframe-phone shape CODAP actually delivers to. Do not write
  `codapInterface.sendRequest`: that is a separate helper this reference does not document, and
  an example that assumes it is wrong for anyone not using it.

---

## Headings and anchors

- Heading text is an API. External links and citations point at it, so changing a heading breaks
  them. Rename only with a reason.
- Use sentence case for section headings, and the exact resource name for the page title —
  `dataDisplay`, not `Data Display`.
- One `#` title per page.

---

## Naming

- Files are kebab-case of the resource name: `dataDisplay` → `resources/data-display.md`,
  `interactiveFrame` → `resources/interactive-frame.md`.
- A resource and its list variant share one page, named for the primary resource: `adornment`
  and `adornmentList` are both documented in `resources/adornment.md`. Give the list variant its
  own section, and list it in the index table pointing at that page. On a shared page the
  **Supported actions** table gains a column per resource rather than a single Supported column.

---

## Terminology

Use the canonical term from the table on [the index](README.md#terminology), not the synonym that
reads better in the sentence. The old page alternated freely between "data interactive", "plugin"
and "DI", which splits retrieval matches and invites readers to treat synonyms as distinct
concepts.
