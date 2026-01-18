# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This repository contains two versions of CODAP (Common Online Data Analysis Platform):
- **v2 (legacy)**: Root directory, SproutCore-based, uses `master` branch
- **v3 (active development)**: Located in `/v3`, React/TypeScript/MobX-State-Tree, uses `main` branch

**Active development is in v3.** Most work should be done in the `/v3` directory.

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

# Run tests matching a pattern
npm test -- --testPathPattern="data-set"

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

## ESLint

- No semicolons (enforced by `@stylistic/semi`)
- Max line length: 120 characters
- Uses TypeScript strict mode
