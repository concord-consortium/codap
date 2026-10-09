# Conventions for the Plugin API reference

How pages in this reference are structured, and why. This page is for people **writing** the
reference; plugin authors want [the index](README.md).

These conventions exist to satisfy three constraints at once:

1. **One page is one complete answer.** Someone arriving to use `adornment` should not have to
   read three other pages first.
2. **Parts of each page are generated.** A resource's supported actions, selector patterns and
   property table are derived from `src/data-interactive/`, so they must sit in blocks a tool can
   rewrite without touching hand-written prose.
3. **The pages are read by models as well as people.** Exact names, complete examples and
   explicit tables serve both.

---

## Folder layout

```
doc/plugin-api/            (currently under v3/, moving with it)
  README.md           index: terminology, request envelope, selector rules, resource table
  conventions.md      this page
  resources/          one page per resource
  guides/             narrative chapters spanning resources
  notifications.md    catalog of notifications CODAP sends           (not yet created)
```

`resources/` holds reference pages, one per resource, following the layout below. `guides/`
holds the chapters that cannot be attached to a single resource — embedded-server mode, request
processing and coalescing, undo and redo, locale. `notifications.md` is a single catalog rather
than per-resource pages, because plugin authors arrive at it asking "what does CODAP send me?"
rather than "what does this resource send?".

Whole-folder rule: everything here is **external-facing** reference for plugin authors. The rest
of the enclosing `doc/` folder is internal design documentation for CODAP developers. Keep the two
separate — the audiences and the tolerance for implementation detail differ. In particular, do not
cite internal issue-tracker ids on these pages: a plugin author cannot open them. Say "a known
limitation" and describe it. For the same reason, do not cite source `file:line` locations — they
rot on the next edit, and a statement of behavior should stand on its own. The provenance header
records which commit the page was verified against; that is the audit trail.

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
## Known limitations      (optional)
## Notifications
## Errors
## See also               (optional)
```

Sections may be omitted only when they genuinely do not apply — a read-only resource has no
`create` values, for instance. Do not omit a section merely because it is brief.

**Extra sections are allowed**, and several resources need them: a long-form explanation of one
action (`## get — subscribing to document state`), a catalog the standard sections cannot hold
(`## Adornment types`), a caveat that is not an error (`## Known limitations`), or pointers
(`## See also`). Place them so the required order still reads top to bottom: sections expanding
on an action go after **Resource selector patterns** and before **Values**; `## Known
limitations` goes after **Examples**; `## See also` goes last. Keep the required headings
present and in order around them.

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

Mechanical content lives between markers so the generator can replace it without disturbing
anything a person wrote:

```markdown
<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
<!-- END GENERATED: actions -->
```

Rules:

- **A marker declares the block machine-owned, whether or not the tool can fill it yet.** The
  generator writes the blocks it can produce completely and leaves the rest alone, reporting them
  as hand-maintained. So content you write inside markers is *provisional*: it survives until the
  generator learns that block, and is then replaced — reported as CHANGED, and failing
  `--check`, so the replacement is never silent. Run
  `npm run plugin-api:generate` to see which blocks are written and which are still yours.
- **Never hand-edit a block the generator writes.** Fix the extractor or the code instead; the
  next run discards the edit and reports the block as CHANGED.
- **Never put prose inside the markers** — and read this strictly. A generated block holds only
  what the extractor can derive from source: names, types, action support, selector patterns and
  error strings. Anything requiring judgment — why a property is useful, what a value is good for,
  the *condition* that produces an error, how two failure causes differ — goes immediately before
  or after the block. If it is inside the markers and not derivable, the generator deletes it and
  reports the block as CHANGED — recoverable from git, but gone from the page.
  When in doubt, ask whether a script reading `src/data-interactive/` could produce the cell.
- Current block names: `actions`, `selectors`, `scope`, `values`, `values-write`, `errors`, and
  on the quick reference `adornment-types`, `resource-actions`, `selector-grammar`,
  `error-catalog`.
- A page may carry **more than one property table** when the shape differs by action — the result
  of a `get` versus the values `create`/`update` accept. Mark both, with distinct names: `values`
  for the result shape and `values-write` for accepted input. Block names must be unique within a
  page, since the generator targets them by name.
- A page written before the generator exists still uses the markers, with the content written by
  hand. That is the point — the generator takes over later with no restructuring.
- **A marker shown as an example is still a marker.** The tools scan the raw file, so a marker
  inside a code fence counts as a real one — the example above works only because it is a
  well-formed pair. Never illustrate a *malformed* marker: the lint would report it, and on a
  resource page the generator would refuse to rewrite the whole page.

---

## Repeat rather than cross-reference

Each resource page **restates** the selector patterns that apply to it and the default
data-context rule, rather than linking back to a shared page.

This is deliberate. A reader who arrives at one page has a complete answer, and a retrieved
fragment carries the rules needed to use what it describes.

The duplication is owned by the generator, not by authors: the restated data-context rule lives
in a `scope` generated block, so 38 copies stay consistent because one tool writes them all.
Do not hand-edit it, and do not replace it with a link.

The exception is genuinely shared narrative — request coalescing, undo/redo, embedded-server mode
— which lives in its own chapter and is linked, not restated.

---

## Examples must be real

- **Error strings are shown as a plugin receives them**, with `<type>`-style placeholders — not
  CODAP's internal `%@` / `%@1` i18n notation, which means nothing to a plugin author. The
  extractor reads `en-US.json5`, which uses the `%@` form, and the generator substitutes neutral
  placeholders on the way out.
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
