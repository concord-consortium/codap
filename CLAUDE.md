# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CODAP (Common Online Data Analysis Platform) is a web-based data analysis and visualization platform built with SproutCore. This is the V2 branch (`master`); the V3 rewrite (React/TypeScript) is on `main`.

## Build Commands

```bash
# Install dependencies (requires --legacy-peer-deps due to older SproutCore dependencies)
npm install --legacy-peer-deps

# Development build
npm run build:dev

# Start local dev server (http://localhost:4020/dg)
npm start

# Production build
npm run build:production

# Lint
npm run lint
npm run lint:fix  # auto-fix

# Run unit tests (PhantomJS)
npm test

# Run Cypress E2E tests
npm run test:cypress        # headless, local
npm run test:local          # interactive GUI, local
npm run test:staging        # interactive GUI, staging

# Build formula parser from PEG.js grammar
npm run build:parser

# Sync all (pull code, update submodules, reinstall deps)
npm run sync:all
```

## Architecture

### Technology Stack
- **Framework**: SproutCore (SC.js) MVC framework
- **UI**: Mix of SproutCore views and React components (React 16)
- **Data Grid**: SlickGrid
- **Visualization**: Custom D3, Leaflet for maps
- **Formula Parser**: PEG.js generated (`apps/dg/formula/formulaParser.js`)

### Key Directories

```
apps/dg/                    # Main application
├── models/                 # Data models (data_set, attribute, case, collection)
├── controllers/            # App logic (app_controller, document_controller, data_context)
├── views/                  # SproutCore views
├── components/             # UI components (graph, case_table, map, slider, text)
├── formula/                # Formula engine (parser, functions, evaluation contexts)
├── utilities/              # Helper functions
├── react/                  # React component wrappers
├── resources/              # Assets, cloud-file-manager integration
├── tests/                  # Unit tests
└── *.lproj/               # Localization (multiple languages)
```

### Data Model
CODAP uses a hierarchical data model:
- **Document** → **DataContext** → **Collection** → **Case** → **Attribute/Values**
- Collections support parent-child relationships (not flat tables)
- Formulas can reference other cases/collections and aggregate across hierarchy

### Formula Engine (`apps/dg/formula/`)
- Grammar: `formulaGrammar.pegjs` → generates `formulaParser.js`
- Contexts: `formula_context.js` (case), `collection_formula_context.js`, `global_formula_context.js`
- 60+ built-in functions across: `basic_functions.js`, `string_functions.js`, `date_time_functions.js`, `univariate_stats_fns.js`, etc.

### Key Patterns
- **SproutCore Globals**: `DG` namespace, `SC` framework, `YES`/`NO` booleans
- **Properties**: Use SproutCore's computed property system with `.property()` and observers
- **React Integration**: React components wrapped via `apps/dg/react/` for use in SproutCore views
- **Data Interactives**: External plugins communicate via iframePhone protocol

## Important Files

| File | Purpose |
|------|---------|
| `apps/dg/main.js` | Application entry point |
| `apps/dg/core.js` | DG namespace and global configuration |
| `apps/dg/models/data_set.js` | Core data structure |
| `apps/dg/formula/formula.js` | Formula evaluation engine |
| `apps/dg/controllers/app_controller.js` | Top-level app orchestration |
| `Buildfile` | SproutCore build configuration |

## Development Notes

- Build scripts in `package.json` set `NODE_OPTIONS=--openssl-legacy-provider` automatically — no need to set it manually
- SproutCore dev server auto-reloads on file changes
- ESLint configured for SproutCore globals (`DG`, `SC`, `YES`, `NO`, etc.)
- Test GUI available at `http://localhost:4020/dg/en/current/tests.html` when server is running
- Production builds require the `makeCodapZip` script which also builds plugins from sibling repositories

## Related Repositories

Full builds require these sibling directories:
- `cloud-file-manager` - File storage integration
- `codap-data-interactives` - Standard plugins
- `codap-data` - Example documents and boundary files
