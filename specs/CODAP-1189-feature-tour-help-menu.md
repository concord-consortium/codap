# Add "Feature Tour" to Help Menu Using driver.js

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1189

**Status**: **Closed**

## Overview

Add a "Feature Tour" item to the Help menu that launches a 21-step driver.js guided tour of the CODAP interface — menu bar, toolbar buttons, and workspace — with student-friendly popover text at each step. The tour configuration is a public TypeScript interface in `src/lib/tour/` designed for reuse by the plugin API in future work.

## Requirements

- Add a "Feature Tour" menu item to the Help dropdown menu (last item in the menu)
- The menu item launches a driver.js guided tour when clicked
- The tour highlights 21 core UI elements in order: menu bar, File menu, document name, CODAP logo, Help menu, Settings menu, Language menu, toolbar, Tables, Graph, Map, Slider, Calculator, Text, Web Page, Plugins, Undo, Redo, Tiles List, workspace, and Help menu (finale)
- Each tour step includes concise, educational, student-friendly descriptive text matching the CODAP help site tone
- The tour is styled to match CODAP's look and feel (teal color palette, Montserrat/museo-sans fonts, CODAP design tokens)
- UI elements targeted by the tour have stable selectors (data-testid or CSS class-based)
- The tour is dismissible at any step (close button, Escape key, or clicking the overlay backdrop)
- The tour works regardless of toolbar position (top or left)
- The tour gracefully skips any step whose target element is not present in the DOM
- Each step supports an optional `skip` property to disable individual steps without removing them from the configuration
- The tour is navigable via keyboard: arrow keys to move between steps, Escape to dismiss, Enter to advance
- The tour popover receives focus on each step for screen reader accessibility
- Step progress is shown (e.g., "3 of 21")
- Users can interact with highlighted elements during the tour
- The final step's "Done" button displays "Got it!"
- driver.js is installed as a project dependency

## Technical Notes

- Help menu integration via CFM's `otherMenus` array in `v3/src/lib/cfm/use-cloud-file-manager.ts`
- Tour icon uses `.nosvgr.svg` convention for CFM menu rendering
- Tour code lives in `src/lib/tour/`, following the pattern of other third-party integrations (`lib/cfm/`, `lib/dnd-kit/`)
- A UI element registry (`tour-elements.ts`) maps human-readable keys to CSS selectors and default descriptions, enabling future plugin API usage
- Tour config type/interface is exported as public API for future plugin API consumption
- The `data-testid="tool-shelf-button-web page"` selector contains a space, which works as a CSS attribute selector

## Out of Scope

- Exposing tour capabilities via the plugin API (future work, separate tickets)
- Custom tours defined by curriculum authors
- Tour state persistence (remembering whether the user has seen the tour)
- Automatic tour launch for first-time users
- Localization/translation of tour step text
