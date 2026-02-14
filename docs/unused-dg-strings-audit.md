# Audit: Unused DG.* Strings in `lang/strings/en-US.json`

**Date:** 2026-02-14
**Branch:** master
**Context:** CODAP-1112 (string ownership model for V2/V3 shared POEditor project)

## Methodology

1. Extracted all 1,144 `DG.*` keys from `lang/strings/en-US.json`
2. Extracted all `DG.*` string literals from `.js` files under `apps/dg/` (excluding `*.lproj/` locale files)
3. Identified dynamic key construction patterns (15 prefix patterns like `"DG.Undo.map." + op`)
4. A key is "used" if: (a) it appears as a full string literal in non-locale JS, or (b) it starts with a known dynamic prefix
5. Excluded `DG.plugin.*` keys (used by separate plugin repos, not the main CODAP app)
6. Manually verified each candidate group for missed dynamic construction

## Results Summary

- **Total DG.\* keys:** 1,144
- **Used (direct or dynamic prefix):** 832
- **DG.plugin.\* keys (used by plugins):** 212
- **Confirmed unused:** ~85 keys (see below)
- **Bugs found:** 2 key mismatch/wrong-key bugs

## Confirmed Unused Keys

### DG.mainPage.* (4 keys)

```
DG.mainPage.mainPane.versionString
DG.mainPage.mainPane.versionString.IS_BUILD
DG.mainPage.mainPane.versionString.SRRI_BUILD
DG.mainPage.titleBar.saved
```

### DG.AppController.* (14 keys)

```
DG.AppController.resetData.title
DG.AppController.resetData.toolTip
DG.AppController.resetData.warnMessage
DG.AppController.resetData.warnDescription
DG.AppController.resetData.okButtonTitle
DG.AppController.resetData.cancelButtonTitle
DG.AppController.optionMenuItems.about
DG.AppController.optionMenuItems.releaseNotes
DG.AppController.exportDocument.prompt
DG.AppController.showWebSiteTitle
DG.AppController.showAboutTitle
DG.AppController.showReleaseNotesTitle
DG.AppController.dropFile.unknownFileType
DG.AppController.validateDocument.invalidDocument
```

### DG.DocumentController.* (2 keys)

```
DG.DocumentController.caseTableTitle
DG.DocumentController.sliderTitle
```

### DG.Document.* (1 key)

```
DG.Document.documentName.toolTip
```

### DG.CaseCard.* (1 key)

```
DG.CaseCard.indexString
```

### DG.Undo/Redo toggle keys (8 keys)

These undo/redo strings exist in `en-US.json` but nothing in the codebase constructs these key names. The corresponding menu items use `DG.DataDisplayMenu.enableNumberToggle` etc., but no undo/redo action references these strings.

```
DG.Undo.enableNumberToggle
DG.Redo.enableNumberToggle
DG.Undo.disableNumberToggle
DG.Redo.disableNumberToggle
DG.Undo.enableMeasuresForSelection
DG.Redo.enableMeasuresForSelection
DG.Undo.disableMeasuresForSelection
DG.Redo.disableMeasuresForSelection
```

### DG.DataContext.* (2 keys)

```
DG.DataContext.collapsedRowString
DG.DataContext.noData
```

### DG.CollectionClient.* (2 keys)

```
DG.CollectionClient.cantEditFormulaErrorMsg
DG.CollectionClient.cantEditFormulaErrorDesc
```

### DG.Utilities.date.* (3 keys)

```
DG.Utilities.date.localDatePattern
DG.Utilities.date.timePattern
DG.Utilities.date.iso8601Pattern
```

### DG.TableController.* (7 keys)

```
DG.TableController.newAttrDlg.defaultAttrName
DG.TableController.renameAttributeInvalidMsg
DG.TableController.renameAttributeInvalidDesc
DG.TableController.renameAttributeDuplicateMsg
DG.TableController.renameAttributeDuplicateDesc
DG.TableController.setScoreDlg.applyTooltip
DG.TableController.setScoreDlg.formulaHint
```

### DG.AttributeFormat.DatePrecision.* (14 keys)

These date format pattern strings exist in `en-US.json` and all locale files, but no code in `apps/dg/` references them (not even dynamically). They may be vestigial from a removed date formatting feature.

```
DG.AttributeFormat.DatePrecision.year
DG.AttributeFormat.DatePrecision.month
DG.AttributeFormat.DatePrecision.day
DG.AttributeFormat.DatePrecision.hour
DG.AttributeFormat.DatePrecision.minute
DG.AttributeFormat.DatePrecision.second
DG.AttributeFormat.DatePrecision.millisecond
DG.AttributeFormat.DatePrecisionShort.year
DG.AttributeFormat.DatePrecisionShort.month
DG.AttributeFormat.DatePrecisionShort.day
DG.AttributeFormat.DatePrecisionShort.hour
DG.AttributeFormat.DatePrecisionShort.minute
DG.AttributeFormat.DatePrecisionShort.second
DG.AttributeFormat.DatePrecisionShort.millisecond
```

### DG.DataDisplayModel.* (3 keys)

```
DG.DataDisplayModel.rescaleToData
DG.DataDisplayModel.ShowConnectingLine
DG.DataDisplayModel.HideConnectingLine
```

### DG.PlotModel.* (3 keys)

```
DG.PlotModel.mixup
DG.PlotModel.showCount
DG.PlotModel.hideCount
```

### DG.HistogramView.* (2 keys)

```
DG.HistogramView.barTipPlural
DG.HistogramView.barTipSingular
```

### DG.PlottedAverageAdornment.* (2 keys)

```
DG.PlottedAverageAdornment.iqrValueTitle
DG.PlottedAverageAdornment.boxPlotTitle
```

### DG.GraphView.* (1 key)

```
DG.GraphView.rescale
```

### DG.MapView.* (4 keys)

```
DG.MapView.showGrid
DG.MapView.hideGrid
DG.MapView.showPoints
DG.MapView.hidePoints
```

### DG.Inspector.* (4 keys)

```
DG.Inspector.transparency
DG.Inspector.deleteDataSet
DG.Inspector.graphMovableValue
DG.Inspector.graphPlottedIQR
```

### DG.GameController.* (1 key)

```
DG.GameController.continuityError
```

### DG.Locale.name.* (13 keys)

No code in `apps/dg/` constructs or references these locale name keys.

```
DG.Locale.name.de
DG.Locale.name.el
DG.Locale.name.en
DG.Locale.name.es
DG.Locale.name.he
DG.Locale.name.ja
DG.Locale.name.ko
DG.Locale.name.nb
DG.Locale.name.nn
DG.Locale.name.pl
DG.Locale.name.tr
DG.Locale.name.zh
DG.Locale.name.zh-Hans
```

## Bugs Found

### 1. Wrong redo key for resizeColumn

**File:** `apps/dg/components/case_table/case_table_controller.js:901-903`

```js
name: 'caseTable.resizeColumn',
undoString: 'DG.Undo.caseTable.resizeColumn',
redoString: 'DG.Undo.caseTable.resizeColumn',  // BUG: should be DG.Redo.caseTable.resizeColumn
```

The redo action displays the undo string instead of the redo string.

### 2. Key mismatch for componentTitleChange

**File:** `apps/dg/views/component_view.js:292-293`

```js
undoString: 'DG.Undo.componentTitleChange',
redoString: 'DG.Redo.componentTitleChange',
```

**File:** `lang/strings/en-US.json:468-469`

```json
"DG.Undo.component.componentTitleChange": "Undo changing the component title",
"DG.Redo.component.componentTitleChange": "Redo changing the component title",
```

The code references `DG.Undo.componentTitleChange` but the string file defines `DG.Undo.component.componentTitleChange` (with extra `.component.` segment). The undo/redo strings for component title changes are never displayed. Fix either the code or the string keys to match.

## Notes

- Dynamic key construction patterns verified: `DG.PlotBackgroundView.msg` + i (msg0-msg5), `DG.AxisView.` + suffix, `DG.CaseTable.attribute.type.` + type, `DG.DataDisplayMenu.` + item, `DG.Undo/Redo.graph.` + op, `DG.Undo/Redo.map.` + op, `DG.Undo/Redo.toggleComponent.` + action
- `DG.plugin.*` keys (212 total) are intentionally excluded — they are consumed by plugin code in separate repositories (codap-data-interactives, story-builder, etc.)
