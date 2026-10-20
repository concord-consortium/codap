# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About CODAP

CODAP (Common Online Data Analysis Platform) is an educational technology tool designed to help teach and learn data analysis and graphing. It is primarily used in classroom environments with students ranging from middle school through college. UI/UX recommendations and security considerations should account for this educational context and age range.

## Public-Facing Messages

When performing an action that includes a message visible to others — git commit messages, PR descriptions, PR review comments, Jira comments, Slack messages, etc. — always show the proposed message text to the user and get explicit confirmation before submitting. Authorizing an action (e.g., "yes, commit" or "yes, post the review") is NOT the same as approving the message content. The user must always have the opportunity to read, edit, or rewrite the message before it goes out.

## Repository Structure

This repository contains two versions of CODAP (Common Online Data Analysis Platform):
- **v2 (legacy)**: Root directory, SproutCore-based, uses `master` branch
- **v3 (active development)**: Located in `/v3`, React/TypeScript/MobX-State-Tree, uses `main` branch

**Active development is in v3.** Most work should be done in the `/v3` directory.

**Important:** Git commands must be run from the repository root (`/v3`'s parent), not from inside `/v3`. Since npm/jest/lint commands run from `/v3`, the working directory often drifts there. Always use absolute paths or `cd` back to the repo root before running git commands to avoid `v3/v3/...` path errors.

## Development Workflow

### Branch Policy

**Never commit directly to `main` or push to `main`.** All work must be done on a feature/PR branch, reviewed via pull request, and merged through GitHub. This applies even for small fixes, review feedback, or single-commit changes. If you're about to commit and the current branch is `main`, stop and create a branch first.

### Starting Work on a Jira Story

When the user says "Let's start work on CODAP-XXX" (or similar):

1. **Ask about the base branch**: Usually `main`, but occasionally work builds on a previous PR branch. Confirm before creating the branch.

2. **Create a feature branch**:
   - Branch name format: `{JIRA-ID}-{short-description}`
   - Example: `CODAP-1027-inbounds-url-param`
   - Use lowercase kebab-case for the description
   - Keep it concise but descriptive
   - **Always propose the branch name and get user approval before creating it**

3. **Update Jira status**: Transition the story to "In Progress"

### Creating a Pull Request

When the work is ready for initial CI validation:

1. **Create a PR**:
   - Title format: `{JIRA-ID}: {description}` (e.g., `CODAP-1027: add inbounds URL parameter`)
   - Description should include:
     - Summary of the changes
     - Reference to the Jira story (e.g., `Fixes CODAP-1027` or link to the story) so Jira links it automatically
   - Apply the `v3` label
   - **For PRs with code changes**: Create as a draft PR. Mark as "Ready for Review" only after CI passes.
   - **For docs-only PRs** (no code changes): Create as a regular (non-draft) PR — no need for CI validation.

2. **Initial CI validation** (code PRs only):
   - CI runs automatically on PRs (lint, build, limited Cypress tests)
   - Review CI results and fix any issues

3. **Finalize the PR**:
   - Request Copilot review
   - When PR is nearly ready for human review, apply the `run regression` label
   - The `run regression` label triggers the full Cypress test suite (we don't run it automatically to conserve our Cypress quota)

4. **Ready for review**:
   - Once full Cypress tests pass on CI:
     - Mark PR as "Ready for Review" (no longer draft)
     - Assign to another developer for review
     - Transition the Jira story to "In Code Review"
   - Ensure Jira story has approvers specified:
     - **Developer Approver**: The code reviewer
     - **Project Team Approver**: Someone to verify the fix/feature
   - If approvers aren't specified, ask the user about them

5. **After code review approval**:
   - Mark PR as approved
   - Transition Jira story to "Ready for Merge"

6. **After merge**:
   - Once the PR is merged and builds successfully on `main`
   - Transition Jira story to "In Project Team Review"

7. **Project team review**:
   - Project Team Approver verifies the fix/feature
   - If approved: Transition Jira story to "Done"
   - If rejected: Either stay in current status (for discussion) or transition back to "In Progress" if more work is required

8. **Rejection at any review stage**:
   - If Developer Approver or Project Team Approver rejects:
     - Stay in current review status if there's ongoing discussion
     - Transition back to "In Progress" if more work is needed

### Jira Integration

- The project uses Jira for issue tracking at `concord-consortium.atlassian.net`
- Stories are typically in the CODAP project (e.g., CODAP-1027)
- Use the Atlassian MCP tools to read/update Jira issues
- Jira status transitions:
  - **To Do** → **In Progress**: When starting work on a story
  - **In Progress** → **In Code Review**: When PR is ready for human review
  - **In Code Review** → **Ready for Merge**: When code review is approved
  - **Ready for Merge** → **In Project Team Review**: After merge and successful build on `main`
  - **In Project Team Review** → **Done**: When Project Team Approver approves
  - **Any review status** → **In Progress**: If more work is required after rejection

## Build and Development Commands (v3)

All commands should be run from the `/v3` directory:

```bash
# Install dependencies
npm install

# Start development server (http)
npm start

# Start development server (https, requires mkcert setup)
npm run start:secure

# Production build
npm run build

# TypeScript type check only (fast, no webpack)
npm run build:tsc

# Lint
npm run lint
npm run lint:fix
```

## Testing Commands (v3)

```bash
# Run all Jest unit tests
npm test

# Run a specific test file
npm test -- path/to/file.test.ts

# Run tests matching a pattern (pass the pattern directly, NOT via --testPathPattern which is deprecated)
npm test -- data-set

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run Cypress e2e tests (requires dev server running)
npm run test:cypress

# Run specific Cypress test
npm run test:cypress -- --spec cypress/e2e/specific-test.spec.ts

# Open Cypress test runner GUI
npm run test:cypress:open
```

## Architecture Overview (v3)

### Technology Stack
- **React 18** with TypeScript
- **MobX-State-Tree (MST)** for state management (using `@concord-consortium/mobx-state-tree` fork)
- **MobX** for reactivity
- **D3** for data visualization
- **Chakra UI** for UI components
- **Webpack** for bundling

### Core Concepts

**Document Model** (`src/models/document/`):
- `DocumentContentModel` is the root of the document tree
- Contains a `rowMap` (tile layouts) and `tileMap` (tile instances)
- `FreeTileRow` manages freely-positioned tiles in the workspace

**Data Model** (`src/models/data/`):
- `DataSet` is the core data structure representing a flat collection of cases/items
- `Attribute` stores column data in frozen arrays
- `Collection` groups attributes into hierarchical levels
- Cases use canonical format (attribute IDs as keys) internally, traditional format (attribute names) for display
- `__id__` property identifies cases; auto-generated using ULID

**Tile System** (`src/models/tiles/` and `src/components/`):
- Each tile type (graph, table, map, etc.) has a registration file (e.g., `graph-registration.ts`)
- Registration connects: content model, React component, inspector panel, icons, and V2 import/export
- `registerTileContentInfo()` registers the model; `registerTileComponentInfo()` registers the UI
- All tile types are imported in `src/register-tile-types.ts`

**Shared Models** (`src/models/shared/`):
- `SharedDataSet` wraps a `DataSet` for sharing between tiles
- `DataSetMetadata` stores display properties (colors, selection, hidden cases)
- `SharedModelManager` coordinates shared models across the document

**Formula System** (`src/models/formula/`):
- Formula adapters manage formulas by type (attribute, filter, graph, etc.)
- `FormulaManager` coordinates all adapters and handles dependency tracking
- Uses Lezer parser for formula syntax

**Data Interactive API** (`src/data-interactive/`):
- Handles communication with embedded plugins/iframes via iframe-phone
- `handlers/` contains request handlers for different resource types
- Maintains v2 API compatibility for plugins

### V2 Compatibility (`src/v2/`)

- `import-v2-document.ts` and `export-v2-document.ts` handle document conversion
- `codap-v2-tile-importers.ts` and `codap-v2-tile-exporters.ts` handle per-tile conversion
- Each tile registers its own V2 importer/exporter in its registration file

### Key Patterns

**Creating a new tile type:**
1. Create content model extending `TileContentModel`
2. Create React component
3. Create registration file that calls `registerTileContentInfo()` and `registerTileComponentInfo()`
4. Import registration in `src/register-tile-types.ts`
5. Add V2 import/export if needed

**MST Actions:**
- Use `applyModelChange` for actions that need undo/redo support
- Actions should use canonical case format (attribute IDs, not names)

### Debugging

Set `debug` key in localStorage with space-separated flags:
- `document` - adds `window.currentDocument` for inspection
- `history` - logs undo/redo history
- `formulas` - logs formula recalculation
- `plugins` - logs plugin communication
- `caseIds` - shows case IDs in table index column

### File Naming Conventions
- Components: `component-name.tsx`, `component-name.scss`
- Models: `model-name.ts`, `model-name.test.ts`
- Test files alongside source files with `.test.ts` suffix

## Testing & testid Conventions

- **Required coverage.** Every user-visible interactive or semantic UI element carries a `data-testid`: native `<button>`, `<input>`, `<select>`, `<textarea>`, Chakra `<MenuList>` / `<MenuItem>` / `<MenuButton>` / `<ModalContent>`, React-Aria `<Button>` / `<MenuItem>` / `<Tab>` / `<TabPanel>` / `<Dialog>` / `<Popover>`, clickable anchors, dialog/panel wrappers, and MenuItem-classed divs.
- **Shape.** Lowercase kebab-case. Locale-independent — derive from action/role identifiers, never translated text. The ESLint rule `codap/require-testid` enforces presence on the listed elements and kebab-case on statically-resolvable values.
- **Extend existing prefixes — don't fork them.** When an element joins a family with an existing prefix (same modal, same toolbar, same menu list), its testid should extend that prefix rather than introduce a parallel one. Only introduce a new prefix when a new family begins. The ESLint rule can't enforce this; it's a reviewer / contributor check.
- **Tile-root prefix.** Tile root elements use `codap-{tile-type}` (e.g. `codap-graph`, `codap-case-table`). Inner testids do NOT contain the tile instance id. Plugins resolve tile identity via the CODAP-1232 `componentId` payload; tests select tile roots directly via `[data-testid="codap-{tile-type}"]`. The `codap-` prefix is also used on many non-tile element families (menu bar, modal headers, attribute buttons, inspector palette), so prefix-match selectors like `[data-testid^="codap-"]` are NOT reliable tile-root anchors.
- **Index conventions.** Indexed testids (`{attrIndex}`, `{collectionIndex}`, `{index}`) are zero-based, in render order within the visible collection, and exclude hidden/set-aside items. Fixed semantic indices (e.g. axis drag rects `{zoneIndex}` with 0/1/2 for lower/mid/upper) follow their fixed role rather than render order.
- **Accessible name.** Elements with indexed testids should have an accessible name source — visible text content, `aria-label`, or `aria-labelledby`. SVG swatches and icon-only controls that have no natural text source add `aria-label`. Don't add `aria-label` where visible text already serves.
- **`data-role` for non-ARIA classification.** D3/SVG elements that CODAP-1232 needs to classify but lack a natural ARIA role (e.g. axis drag rects) carry `data-role="{kind}"` instead of a misleading ARIA `role`. Use ARIA `role` where it's genuinely semantic (e.g. `role="img"` on legend swatches).
- **Chakra `<Menu>` and `<Modal>` themselves render no DOM.** Setting `data-testid` on them is a no-op — put it on `<MenuList>` / `<ModalContent>` etc.
- **`IMenuItem.dataTestId`.** Menu items defined via an `IMenuItem` config object carry a required `dataTestId: string` field, distinct from `itemKey` (the i18n translation key). `dataTestId` is the stable kebab-case action identifier.

## ESLint

- No semicolons (enforced by `@stylistic/semi`)
- Max line length: 120 characters
- Uses TypeScript strict mode
