# CODAP V3 Release Plan

This story tracks the official transition from CODAP V2 to V3 in the wild — the "big bang" switch from V2 as the default to V3 as the default. The work captured here is what must happen to make that flip safely. Items are organized by phase; each item that requires actual work links to a child story (created on demand). Items that are pure decisions or conversations are resolved inline in this story (via comments or edits to this description).

Parent epic: CODAP-1070 (Release processes).

## Decisions logged

- **Release shape:** big bang (single switch-flip, not phased ramp).
- **V3 file format:** V3 reads both V2 and V3 documents. V3 writes native V3 by default at release (currently writes V2 in public beta). V3 retains optional V2 export.
- **V2 file format:** V2 cannot read V3 documents. A final V2 release will detect V3 documents and show a useful error ("This document was created with a newer version of CODAP…").
- **Plugin API:** stable as of V3.0 release; no further API changes planned for cutover.
- **System requirements:** frozen for V3.0 (ES2020).
- **V3 "final" release candidate build:** **Friday, May 22, 2026** — hard cutoff for new V3 code in the cutover.
- **Official release / flip day:** **Sunday, June 7, 2026** — when V2 redirects to V3 in the wild.

## Key dates

| Date | Milestone |
|---|---|
| Fri, May 22, 2026 | V3 "final" RC build — Phase 1 work must be complete |
| May 22 → Jun 7 | Phase 2 validation soak (~16 days) — testing checklist runs end-to-end |
| Sun, Jun 7, 2026 | Phase 3 flip day — redirects activated, content team updates, comms go out |

V2 final release with V3-document detection must be live before flip day with enough soak time to detect issues — ideally also before or around May 22.

## Phase 1 — Pre-release

Can run in parallel; mostly independent.

**Implementation stories in Phase 1:**

| Story | Summary | Pts |
|---|---|---:|
| [CODAP-1319](https://concord-consortium.atlassian.net/browse/CODAP-1319) | Change the banner at the top of V3 (welcome banner) | 2 |
| [CODAP-1323](https://concord-consortium.atlassian.net/browse/CODAP-1323) | Build CloudFront Function for V2 → V3 redirects | 3 |
| [CODAP-1324](https://concord-consortium.atlassian.net/browse/CODAP-1324) | Mirror V2's launchFromLara/lara/interactiveApi parameter handling in V3 | 1 |
| [CODAP-1325](https://concord-consortium.atlassian.net/browse/CODAP-1325) | Set up /v2 symlink and update SageModeler CloudFront redirects | 2 |
| [CODAP-1326](https://concord-consortium.atlassian.net/browse/CODAP-1326) | Flip V3 release switches for production | 2 |
| [CODAP2-287](https://concord-consortium.atlassian.net/browse/CODAP2-287) | Final V2 release: detect V3 documents and show a useful error | 2 |
| [CFM-8](https://concord-consortium.atlassian.net/browse/CFM-8) ✅ | CODAP V2 should show V3 banner (shipped) | 2 |

### URL routing & redirects

Items grouped by where the fix lives — different items will likely be owned by different people. Most items require both **pre-flip preparation** (build/stage/test) and **flip-day activation** (Phase 3) — that split is noted per item where it matters.

#### CloudFront Function — V2 → V3 redirects (DevOps)

- [ ] **CloudFront Function deployment** — A single CloudFront Function on the `codap.concord.org` distribution handles every V2 → V3 redirect by returning inline HTML+JS at the viewer-request stage. The HTML runs client-side, reads `window.location.search` and `window.location.hash`, constructs the V3 URL with both preserved, and calls `window.location.replace(v3Url)`. This consolidates everything PR #2340 originally specified (HTML files deployed via the V2 release process) plus the catch-all paths into one mechanism — no V2 release-process coupling, no symlink choreography, fully owned at the CloudFront layer. Canonical redirect *strategy* from [PR #2340](https://github.com/concord-consortium/codap/pull/2340); the *mechanism* deviates from that PR's implementation spec (which the team selected before this CloudFront-Functions-returning-HTML option was on the table). — **[CODAP-1323](https://concord-consortium.atlassian.net/browse/CODAP-1323)**

**Why client-side and not HTTP 301/302**

Browsers do not send URL hash fragments to the server, so any redirect computed at the server (HTTP 301/302) drops the hash. CODAP URLs heavily use hash fragments for document references (`#shared=…`, `#file=googleDrive:…`, etc.), so hash preservation is non-negotiable. A CloudFront Function that returns inline HTML+JS gets the HTML to the browser, where JavaScript can read the hash and assemble the destination URL. The HTML body fits well within CloudFront's 10 KB response-size limit (template is roughly 50 lines).

**Redirect mapping** (strategy informed by PR #2340; data points from CODAP-1090 and CODAP-1091)

| Source path on `codap.concord.org` | Destination | Reason |
|---|---|---|
| `/` (V2 root) | V3 root (no `?lang=`) | Let V3 auto-detect from browser |
| `/app` and other English-default entry points | V3 root (no `?lang=`) | Don't force English over browser preference |
| `/static/dg/en/cert/...` | V3 root (no `?lang=`) | English often the default users landed on, not an explicit choice |
| `/app/static/dg/en/cert/index.html` (with `#file=googleDrive:{id}` hash) | V3 root, hash preserved | Google Drive "Open URL" — clicking a Drive-saved CODAP file opens it via this exact URL (CODAP-1094) |
| `/static/dg/{non-en-lang}/cert/...` | V3 with `?lang={lang}` | Non-English bookmarks represent deliberate language choice |
| `/releases/latest/...` (and nested language paths) | Follow language mapping or V3 root | Highest-traffic V2 path (CODAP-1090: 3.3M requests, 5× `/releases/latest`) |
| `/releases/{launchable subpath}/...` | V3 root | Old build paths (`build_NNNN`, `codap_y2`, `ukde`) and personal/project folders (`dsg`, `dmartin`, `zisci`) surfaced in CODAP-1090 + CODAP-1091 |

**Not everything under `/releases/*` should be redirected.** CODAP-1090's CloudFront log analysis surfaced a few non-launchable paths that should fall through to origin: `/releases/.gapikey` (Google API key file used by V2 for Drive integration), `/releases/staging` (staging environment alias), `/releases/zips` (downloadable artifacts), `/releases/var` (infrastructure path, verify), `/releases/apple-touch-icon.png` (icon file). The catch-all rule needs to be careful — either a whitelist of known launchable names, or a pattern that matches only path-shapes that look like launches (e.g., `/releases/{name}/index.html` or `/releases/{name}/` with trailing slash and no file extension).

Query strings (`?url=…`, `?launchFromLara=…`, `?documentServer=…`, etc.) and hash fragments (`#shared=…`, `#file=googleDrive:…`) are preserved through every redirect.

Language codes supported by the function — match V3's full set from `v3/src/utilities/translation/languages.ts` (17 non-English + `en-US`):

`de`, `el`, `en-US`, `es`, `fa`, `fr`, `he`, `ja`, `ko`, `nb`, `nl`, `nn`, `pl`, `pt-BR`, `th`, `tr`, `zh-Hans`, `zh-TW`

V2 historically built only 13 of these (`de`, `el`, `en`, `es`, `he`, `ja`, `nb`, `nn`, `pt-BR`, `th`, `tr`, `zh-Hans`, `zh-TW`) per PR #2340. The function should match all 18 for safety — cheap insurance in case any V2 URL exists with a lang segment outside the historical 13 (e.g., from a non-prod build, a hand-edited URL, or a future build that never went GA). The function may use a generic regex (`/static/dg/[a-zA-Z-]+/cert/...`) and pass any matched code through as `?lang=`, which avoids hard-coding the list and tolerates additions without function changes.

The `en` ↔ `en-US` mismatch is handled inside V3 already — `languages.ts` registers both keys to the same translations.

**Components**

1. HTML+JS redirect template (~50 lines, parameterized over `lang`).
2. CloudFront Function code — viewer-request handler that pattern-matches the request path and returns the template with the appropriate `?lang=` value substituted.
3. CloudFront distribution config — attach the function to the production behavior at the viewer-request stage.

**Deployment and flip-day mechanics**

- Function code deployed to a test distribution first; verify hash + query-string preservation across the full path matrix.
- Once verified, function deployed to the production distribution but **gated** so it doesn't fire until flip day (e.g., associated with a non-default behavior, or guarded by a feature flag inside the function).
- Flip-day activation is a single configuration change — associate the function with the production cache behavior, or flip the gate.
- No EC2 changes for the redirect mechanism. No HTML-file cache invalidation needed (function returns fresh HTML per request).

**Rollback**

If something breaks on flip day, detach the function from the production behavior — single CloudFront console action. Traffic resumes passing through to EC2, restoring V2 at every V2 URL. No cache invalidation required.

#### `/~user/...` tilde paths — not supported, no work item

The `~user` paths under `codap.concord.org` (e.g., `~bfinzer/ukde/`, `~kswenson/runKey/`) were local developer builds set up for limited ad-hoc sharing ("try out this new feature I'm working on") and were never intended to be maintained indefinitely. CODAP-1090's CloudFront log analysis (Feb 2025 → Jan 2026) shows **zero traffic** to any tilde path across 715 distinct URL categories. Decision: do not match `/~*` in the CloudFront Function. Residual requests fall through to origin and behave exactly as they do today.

#### Google Drive double-click — handled by the CloudFront Function

The current Drive "Open URL" stored in Google config is `http://codap.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:{ids}`. After cutover, the CloudFront Function ([CODAP-1323](https://concord-consortium.atlassian.net/browse/CODAP-1323)) matches this path and redirects to V3 root, preserving the `#file=googleDrive:` hash via client-side JS. **CODAP-1094 confirmed end-to-end Drive double-click works through this redirect chain** — V3 is already in Google's OAuth authorized origins, no re-verification needed, file format compatible.

**Cutover (Option A) does NOT change Google config** — handled entirely by the CloudFront Function. A follow-up Drive config cleanup (Option B) lives in Phase 4 Post-release to remove the long-term `codap.concord.org` dependency for Drive.

Specific test case to include in CODAP-1323's path matrix: `/app/static/dg/en/cert/index.html#file=googleDrive:abcd1234` → V3 root with the hash preserved, V3 opens the Drive file successfully.

#### SageModeler (Sage team) — verify Sage-specific redirect targets, set up `/v2/`

SageModeler uses its own Sage-specific CloudFront redirects to launch V2. These redirects currently target some V2 URL on `codap.concord.org`. **If those targets are paths that the new V2 → V3 CloudFront Function (CODAP-1323) will match — e.g., `/releases/latest`, `/releases/stable`, or `/releases/build_NNNN` — Sage launches will get swept up in the V3 redirect and break.** Before cutover, Sage's redirect targets need to be verified and, if necessary, repointed at `codap.concord.org/v2/...` (which the CloudFront Function deliberately does not match, so traffic there continues to serve V2 via the EC2 origin).

SageModeler is currently the only known client of `codap.concord.org/v2/...`, so the `/v2` symlink setup naturally lives with this work.

- [ ] **Set up `/v2` symlink on the EC2 origin** — Create a symlink from `/v2` to the appropriate V2 build directory under `/releases/build_NNNN/`, following the same convention as `/releases/latest` and `/releases/stable`. No file copy required. The CloudFront Function does not match `/v2/*`, so requests there pass through to origin and serve V2 normally. — **[CODAP-1325](https://concord-consortium.atlassian.net/browse/CODAP-1325)**

- [ ] **Verify and update Sage's CloudFront redirect targets** — Inspect Sage's CloudFront redirects, identify which `codap.concord.org` paths they target, and repoint any that the V2 → V3 CloudFront Function would match to `codap.concord.org/v2/...` instead. Depends on the `/v2` symlink being in place. Owned by the Sage team (or whoever maintains Sage's CloudFront config). — **[CODAP-1325](https://concord-consortium.atlassian.net/browse/CODAP-1325)**

Flipping Sage itself to V3 is a separate, independent decision owned by the Sage team and tracked in Phase 4.

#### Activity Player — V3-side autolaunch compatibility

The AP carve-out idea was a hedge from CODAP-1091 ("if we want to redirect some users to V3 while not forcing AP users to confront V3"). More recent thinking — including PR #2340's redirect strategy — treats AP as flipping along with everyone else: AP-embedded CODAP hits V3 URLs (or follows the V2 → V3 redirect), and existing student work continues to function because V3 reads V2 documents.

The CFM autolaunch (`autolaunch.ts` in the CFM repo) and the document-store launch endpoints both default to launching CODAP at `https://codap.concord.org/releases/latest/`. **Once that path redirects to V3 via the CloudFront Function above, autolaunch transparently launches V3** — no code change needed in CFM autolaunch. What remains is making sure V3 itself handles the autolaunch handshake correctly.

- [ ] **V3 autolaunch handshake — protocol verification** — The protocol part of the handshake (`?documentServer=`, `cfm::getCommands` / `cfm::commands` / `cfm::autosave` / `cfm::autosaved` / `cfm::event` / `cfm::setDirty` / `cfm::iframedClientConnected` window messages) is implemented in **CFM**, not in CODAP. V3 registers the `lara` and `documentStore` providers in `v3/src/lib/cfm/use-cloud-file-manager.ts:349`, so it inherits the protocol via CFM 2.2.11 the same way V2 inherits it via CFM 1.9.x. Confirm via end-to-end autolaunch test and verify CFM 1.9.x and 2.2.x autolaunch behavior haven't diverged. — *[needs verification; story only if behavior differs]*

- [ ] **V3 `launchFromLara` / `lara` URL parameter recognition** — V2 treats `launchFromLara`, `lara`, and `interactiveApi` as equivalent context signals (single check in `apps/dg/core.js:365`). V3 only recognizes `interactiveApi` (used in `v3/src/lib/cfm/handle-cfm-event.ts:122` to control auto-save). When autolaunch launches V3 with `?launchFromLara=<base64>` (no `interactiveApi` param), V3-side code that gates CFM menu visibility and auto-save behavior won't recognize the embedded context. **Fix:** Make V3 also recognize `launchFromLara` and `lara` — V3-only change in `url-params.ts` + `handle-cfm-event.ts`, mirrors V2 behavior exactly. — **[CODAP-1324](https://concord-consortium.atlassian.net/browse/CODAP-1324)**
- [ ] **End-to-end autolaunch verification** — exercise the `document-store.{concord.org|herokuapp.com}/document/launch` and `/v2/documents/{ID}/launch` paths after the codap.concord.org redirects are staged, to confirm those endpoints (~75 AP activities per CODAP-1091) load V3 cleanly through the redirect chain. If the document-store backend hardcodes anything that bypasses the codap.concord.org redirect, surface and fix in document-store. — *[needs research + story]*

AP-specific verification work (existing linked interactives still load, iframe embedding works, teacher dashboard reports) lives in the Phase 2 validation checklist below.

#### codap.concord.org website (content team, not dev)

- [ ] **"Launch CODAP" button → V3** — managed/updated by the content team on the codap.concord.org marketing site (separate from the app). Not dev work; tracked here for completeness. — *[needs story]*

### V3 Release Switches

Application-internal switches that flip in the V3 release build. Not infrastructure changes — these are V3 codebase changes that distinguish the production release from staging/beta builds. Most are tiny once the decisions are made, so all three switches below are bundled into a single story.

- [ ] **Flip V3 release switches for production** — **[CODAP-1326](https://concord-consortium.atlassian.net/browse/CODAP-1326)**

**Switch 1: Log destination.** V3 currently sends logs to the staging log server (for the beta period); flip to the production log server.

**Switch 2: Default save extension.** V3 currently saves with `.codap3` (an intentional precaution during the period when the V3 file format wasn't standardized); flip to `.codap` so V3 documents have the same extension as V2 documents.

**Switch 3: Default behavior when opening a V2 document.** Decide and implement how V3 handles auto-save when a V2 doc is loaded. Current behavior: silent auto-save off, no user message. Three options, possibly context-dependent:

1. **Silent auto-save off** (status quo)
2. **Auto-save off + user message** offering explicit save-as-V3 *(messaging UI lives in In-app messaging > V3 codebase below)*
3. **Auto-save on + silent V2 → V3 conversion** on save

Sketch of likely outcome (decision to confirm):
- **User-controlled storage** (Google Drive, local file): Option 2 — give the user agency
- **AP/LARA storage** (user doesn't control where the doc lives): Option 3 — disabling auto-save is a disservice for student work, and a notification would be confusing
- **Other contexts** (CFM document store, etc.): TBD

### In-app messaging

Grouped by where the fix lives. The CFM banner mechanism reads banner content from a file in an S3 bucket (by design), so banner content updates don't require code releases.

#### V2 / CFM codebase (V2 release required)

- [x] **V2 banner announcing V3** — **CFM-8** ✅ (already shipped)
- [ ] **Final V2 release with V3-document detection error** — V2 detects V3 documents and shows a useful error ("This document was created with a newer version of CODAP…"). Implemented as a V2 parser change; requires a new V2 release. **Must ship before V3 cutover** with enough soak time to detect issues. The `/v2` symlink setup that supports this build lives in the SageModeler section under URL routing & redirects above ([CODAP-1325](https://concord-consortium.atlassian.net/browse/CODAP-1325)). — **[CODAP2-287](https://concord-consortium.atlassian.net/browse/CODAP2-287)**

#### V3 codebase

- [ ] **"V2 doc opened in V3" user message** — If the V3 Release Switches auto-save decision (above) lands on **Option 2** (auto-save off + user message) for any storage context, the message UI lives here. The full decision and the auto-save behavior are in V3 Release Switches; this item is the messaging aspect only. — *[depends on V3 Release Switches decision]*

- [ ] **V3 welcome banner via CFM mechanism** — Replace V3's existing `/beta`-only banner with a general welcome banner routed through the CFM banner mechanism (dynamic content via S3) so the banner content can be changed without a V3 release. Banner copy specified in the story; implementation notes (use CFM mechanism vs. extend the /beta-only mechanism; whether to remove the /beta-only mechanism as cleanup) added as a comment on the story. — **[CODAP-1319](https://concord-consortium.atlassian.net/browse/CODAP-1319)**

#### Banner content updates (no code work — S3 file edits by whoever owns banner content)

- [ ] **V2 banner copy escalation** — Update the V2 banner S3 file as flip approaches and after: e.g., "try V3" → "V2 is being replaced soon" → "V2 redirects to V3 now". Spans pre-flip, flip-day, and post-flip. — *[ongoing content task; no dev work]*

#### Already covered by existing mechanism

- ~~Server-driven message channel in V3~~ — The original endgame doc raised "V3 should be able to query a server so time-sensitive messages can be presented to users without requiring a new release." The CFM S3-driven banner mechanism already satisfies this. **No new work needed.**

## Phase 2 — Pre-flip validation

Test-area checklist. Stories created on demand for areas that need scheduled work or a specific owner; areas that just need a smoke test by an internal user don't need their own story.

- [ ] API surface (incl. enclosing-page parent calls, not just iframed-plugin calls)
- [ ] V2 and V3 file format load/save; Google Drive integration with both
- [ ] Import: drag-and-drop, URL, File menu (drag-and-drop, URL, file selector); large file sizes
- [ ] Plugins: File-menu, plugin-database, external (Purple Air, Sharing, Sage-as-plugin, Sensor, [Josh Rosenberg's credible-local-data](https://ed-analytics.shinyapps.io/credible-local-data/), [codap.xyz](https://codap.xyz/) listings); large data transfer; state save/restore
- [ ] Performance on 50k–100k row datasets (import, graph, map, selection, formulas)
- [ ] Activity Player embedded (small + large docs, save/restore, teacher dashboard, embed wrapper, linked interactives)
- [ ] Smoke test all graph & map types (drag/drop, axis-from-menu, multi-table docs, date/numerical/categorical/qualitative combinations, tool features)
- [ ] All formulas (incl. aggregate with filters)
- [ ] All URL parameters
- [ ] SageModeler continues to work with CODAP V2 (Sage stays on V2; verify Sage's repointed CloudFront redirects — see Phase 1 — successfully serve V2 via `codap.concord.org/v2/...` and Sage launches correctly after the broader cutover)

## Phase 3 — Flip

Activation of work prepared in Phase 1. By this point all code is released and all redirect rules are staged. The flip is a coordinated sequence of activation steps, not new development.

- [ ] Activate V2 → V3 redirects (attach the gated CloudFront Function to the production `codap.concord.org` cache behavior, or flip the in-function gate)
- [ ] Verify Google Drive double-click works through the CloudFront Function (Drive Open URL pattern → V3 with hash preserved); Drive config cleanup (Option B) deferred to Phase 4
- [ ] Content team updates "Launch CODAP" button destination on the marketing site
- [ ] **Already live before Phase 3:** V2 final release with V3-doc detection; V3 writing native V3 format; V2 application preserved at `/v2/`
- [ ] User-facing launch communications — *[needs story]*

## Phase 4 — Post-release

### Observability

- [ ] Error tracking — Rollbar or alternative — *[needs story]*
- [ ] Usage telemetry / document-open & plugin-usage logging — *[needs story]*

### Shared-document hygiene

- [ ] Active/inactive document inventory — *[needs story]*
- [ ] Retention policy (auto-delete after N years of inactivity?) — *[needs story]*

### Cleanup

- [ ] **Update Google Drive "Open URL" config to V3 directly** (Option B from CODAP-1094) — Once the cutover is stable (a couple weeks of soak), update the Drive Open URL in the Google Cloud Console from `http://codap.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:{ids}` to `https://codap3.concord.org/`. Removes the long-term `codap.concord.org` dependency for Drive double-click. Per CODAP-1094 research, no Google re-verification required. Single Google admin action. — *[needs story; small]*
- [ ] **New LARA library interactives pointing at V3 directly** — A LARA admin creates a new library interactive entry (or updates the existing entry) to point at `codap3.concord.org/` instead of a `codap.concord.org/...` URL. Authors picking the entry in LARA's picker get V3 directly without going through the CloudFront redirect. Existing activities continue to use whatever library entry they were authored with (which still redirects correctly via the CloudFront Function). Includes the sub-task from the original endgame doc: "ensure that a new iFrame interactive can be created and used successfully using V3 embed URLs." Owned by the LARA/Portal team, not CODAP team. — *[needs story; small]*

### Eventual carve-out migration (no commitment to timeline)

- [ ] When/whether AP URLs flip to V3
- [ ] When/whether SageModeler URLs flip to V3

## How this story is used

- Treat this description as the living tracker. Update checkboxes and Jira links as items move.
- New child stories should reference this story (e.g., in description) so the link is bidirectional.
- Decisions and discussion happen as **comments on this story** — keeps the audit trail co-located with the plan.
