SC.stringsFor("en", {
    // CFM/File menu
    "DG.fileMenu.menuItem.newDocument": "New",
    "DG.fileMenu.menuItem.openDocument": "Open...",
    "DG.fileMenu.menuItem.closeDocument": "Close",
    "DG.fileMenu.menuItem.importFile": "Import...",
    "DG.fileMenu.menuItem.revertTo": "Revert...",
    "DG.fileMenu.menuItem.revertToOpened": "Recently opened state",
    "DG.fileMenu.menuItem.revertToShared": "Shared view",
    "DG.fileMenu.menuItem.saveDocument": "Save...",
    "DG.fileMenu.menuItem.copyDocument": "Create a copy",
    "DG.fileMenu.menuItem.share": "Share...",
    "DG.fileMenu.menuItem.shareGetLink": "Get link to shared view",
    "DG.fileMenu.menuItem.shareUpdate": "Update shared view",
    "DG.fileMenu.menuItem.renameDocument": "Rename",
    "DG.fileMenu.provider.examples.displayName": "Example Documents",

    // main.js
    "DG.main.page.title": "%@1 - %@2", // document name, CODAP
    "DG.main.userEntryView.title": "What would you like to do?",
    "DG.main.userEntryView.openDocument": "Open Document or Browse Examples",
    "DG.main.userEntryView.newDocument": "Create New Document",

    // mainPage.js
    "DG.mainPage.mainPane.undoButton.title": "Undo",
    "DG.mainPage.mainPane.undoButton.toolTip": "Undo the last action",
    "DG.mainPage.mainPane.redoButton.title": "Redo",
    "DG.mainPage.mainPane.redoButton.toolTip": "Redo the last undone action",
    "DG.mainPage.mainPane.versionString": "Version %@ (%@)", // DG.VERSION, DG.BUILD_NUM
    "DG.mainPage.mainPane.messageView.value": "Unfortunately, CODAP is not currently supported on your browser. CODAP is supported on Firefox 46+, Chrome 50+, Windows Edge 14+, and Safari 10+. CODAP is not actively supported on other browsers at this time.",
    "DG.mainPage.titleBar.saved": "Document Saved!",
    "DG.mainPage.exceptionMessage": "An error has occurred that may affect how this program behaves. You may wish to reload this page after you save your work. (Error: %@)",

    // IS_BUILD variants of strings for InquirySpace
    "DG.mainPage.mainPane.versionString.IS_BUILD": "Version %@ (%@ IS)",

    // DG.IS_SRRI_BUILD variants of strings for SRRI build
    "DG.mainPage.mainPane.versionString.SRRI_BUILD": "Version %@ (%@.srri10)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.

    // DG.AppController
    "DG.AppController.resetData.title": "Clear Data...",
    "DG.AppController.resetData.toolTip": "Delete all data from current document",
    "DG.AppController.resetData.warnMessage": "Do you really want to delete all the data in this document?",
    "DG.AppController.resetData.warnDescription": "This action is not undoable.",
    "DG.AppController.resetData.okButtonTitle": "Yes, delete the data",
    "DG.AppController.resetData.cancelButtonTitle": "No, keep the data",
    "DG.AppController.closeDocument.warnMessage": "Close the current document without saving?",
    "DG.AppController.closeDocument.warnDescription": "This action is not undoable.",
    "DG.AppController.closeDocument.okButtonTitle": "Close",
    "DG.AppController.closeDocument.cancelButtonTitle": "Cancel",
    "DG.AppController.beforeUnload.confirmationMessage": "The document contains unsaved changes.",
    "DG.AppController.optionMenuItems.reportProblem": "Send Feedback...",
    "DG.AppController.optionMenuItems.viewWebPage": "Display Web Page...",
    "DG.AppController.optionMenuItems.configureGuide": "Configure Guide...",
    "DG.AppController.optionMenuItems.about": "About CODAP...",
    "DG.AppController.optionMenuItems.releaseNotes": "What's New?",
    "DG.AppController.optionMenuItems.help": "Help Pages and Videos...",
    "DG.AppController.optionMenuItems.help-forum":  "Help Forum...",
    "DG.AppController.optionMenuItems.toWebSite": "The CODAP Project",
    "DG.AppController.exportDocument.prompt": "Filename:",
    "DG.AppController.exportCaseData.prompt": "Export the case data, from:",
    "DG.AppController.exportDocument.exportTitle": "Export",
    "DG.AppController.exportDocument.exportTooltip": "Export data to a file",
    "DG.AppController.exportDocument.cancelTitle": "Cancel",
    "DG.AppController.exportDocument.cancelTooltip": "Cancel the export",
    "DG.AppController.feedbackDialog.dialogTitle": "Provide Feedback",
    "DG.AppController.feedbackDialog.subHeaderText": "Your feedback is important to us!",
    "DG.AppController.feedbackDialog.messageText": "Please help us continue to improve our product. Questions, bug reports and feature requests are all welcome. Thank you!",
    "DG.AppController.feedbackDialog.subjectHint": "What is your feedback about",
    "DG.AppController.feedbackDialog.feedbackHint": "Details",
    "DG.AppController.feedbackDialog.submitFeedbackButton": "Submit",
    "DG.AppController.feedbackDialog.cancelFeedbackButton": "Cancel",
    "DG.AppController.showWebSiteTitle": "About CODAP",
    "DG.AppController.showHelpTitle": "Help with CODAP",
    "DG.AppController.showHelpForumTitle": "Help Forum",
    "DG.AppController.showAboutTitle": "About CODAP",
    "DG.AppController.showReleaseNotesTitle": "CODAP Release Notes",
    "DG.AppController.dropFile.error": "Error: %@1", // Error: <error text>
    "DG.AppController.dropFile.unknownFileType": "You cannot import the type of file dropped",
    "DG.AppController.validateDocument.missingRequiredProperty": "Required property not found: %@1",
    "DG.AppController.validateDocument.unexpectedProperty": "Unexpected top-level property: %@1",
    "DG.AppController.validateDocument.unresolvedID": "Unresolved id: %@1",
    "DG.AppController.validateDocument.parseError": "Parse error in document: %@1",
    "DG.AppController.validateDocument.invalidDocument": "Invalid JSON Document: %@1",
    "DG.AppController.openDocument.error.general": "Unable to open document",
    "DG.AppController.openDocument.error.invalid_format": "CODAP can not read this type of document",
    "DG.AppController.createDataSet.initialAttribute": "AttributeName",
    "DG.AppController.createDataSet.name": "New Dataset",
    "DG.AppController.createDataSet.collectionName": "Cases",
    "DG.AppController.caseTableMenu.openCaseTableToolTip": "Open case table for this data set",
    "DG.AppController.caseTableMenu.newDataSet": "-- new --",
    "DG.AppController.caseTableMenu.newDataSetToolTip": "Create a new data set",
    "DG.AppController.caseTableMenu.deleteDataSetToolTip": "Delete and destroy this data set",

    "DG.SingleTextDialog.okButton.title": "OK",
    "DG.SingleTextDialog.cancelButton.title": "Cancel",
    "DG.SingleTextDialog.cancelButton.toolTip": "Dismiss the dialog without making any changes",

    // DG.DocumentController
    "DG.DocumentController.calculatorTitle": "Calculator",
    "DG.DocumentController.caseCardTitle": "Case Card",
    "DG.DocumentController.caseTableTitle": "Case Table",
    "DG.DocumentController.graphTitle": "Graph",
    "DG.DocumentController.sliderTitle": "Slider",
    "DG.DocumentController.textTitle": "Text",
    "DG.DocumentController.mapTitle": "Map",
    "DG.DocumentController.enterURLPrompt": "Enter the URL of a web page to display",
    "DG.DocumentController.enterViewWebPageOKTip": "Displays the web page given by the URL",
    "DG.DocumentController.toggleToCaseCard": "Switch to case card view of the data",
    "DG.DocumentController.toggleToCaseTable": "Switch to case table view of the data",

    // DG.Document
    "DG.Document.defaultDocumentName": "Untitled Document",
    "DG.Document.documentName.toolTip": "Click to edit document name",

    // DG.SliderView
    "DG.SliderView.thumbView.toolTip": "Drag to change the slider's value",
    "DG.SliderView.startButton.toolTip": "Start/stop animation",

    // DG.CaseCard
    "DG.CaseCard.indexString": "1 of %@ %@",    // number of cases, Name
    "DG.CaseCard.namePlusCaseCount": "%@ %@",    // <num>, Name; e.g. 27 Mammals
    "DG.CaseCard.namePlusSelectionCount": "%@ selected of %@ %@",    // number selected, number of cases, Name
    "DG.CaseCard.summaryValues": "%@ values",    // number of unique values when categorical
    "DG.CaseCard.summaryRange": "%@–%@ %@",    // min, max, unit (if any)
    "DG.CaseCard.navNextCase": "Select and show next case",
    "DG.CaseCard.navPrevCase": "Select and show previous case",
    "DG.CaseCard.navFirstCase": "Select and show first case",
    "DG.CaseCard.navLastCase": "Select and show last case",
    "DG.CaseCard.attrHintPlain": "%@",
    "DG.CaseCard.attrHintUnitsOnly": "%@1 in %@2",
    "DG.CaseCard.attrHintDescription": "%@1: %@2",
    "DG.CaseCard.attrHintFormula": "%@1 = %@2",
    "DG.CaseCard.attrHintDescriptionAndFormula": "%@1: %@2\n%@1 = %@3",
    "DG.CaseCard.newCaseToolTip": "Add an empty case to this collection",
    "DG.CaseCard.addCaseButton": "add case",    // Expected to be two short words separated by a space

    "DG.Collection.joinTip": "Join %@ in %@ to %@ in %@ by matching %@ with %@",    // Join <sourceCollection> in <sourceContext> to <destCollection> in <destContext> by matching <sourceAttribute> with <destAttribute>

    // DG.ToolButtonData
    "DG.ToolButtonData.tableButton.title": "Tables",
    "DG.ToolButtonData.tableButton.toolTip": "Open a case table for each data set(ctrl-alt-t)",
    "DG.ToolButtonData.graphButton.title": "Graph",
    "DG.ToolButtonData.graphButton.toolTip": "Make a graph (ctrl-alt-g)",
    "DG.ToolButtonData.sliderButton.title": "Slider",
    "DG.ToolButtonData.sliderButton.toolTip": "Make a slider (ctrl-alt-s)",
    "DG.ToolButtonData.calcButton.title": "Calc",
    "DG.ToolButtonData.calcButton.toolTip": "Open/close the calculator (ctrl-alt-c)",
    "DG.ToolButtonData.textButton.title": "Text",
    "DG.ToolButtonData.textButton.toolTip": "Make a text object (ctrl-alt-shift-t)",
    "DG.ToolButtonData.mapButton.title": "Map",
    "DG.ToolButtonData.mapButton.toolTip": "Make a map",
    "DG.ToolButtonData.optionMenu.title": "Options",
    "DG.ToolButtonData.optionMenu.toolTip": "Display a website, configure guide...",
    "DG.ToolButtonData.tileListMenu.title": "Tiles",
    "DG.ToolButtonData.tileListMenu.toolTip": "Show the list of tiles in the document",
    "DG.ToolButtonData.guideMenu.title": "Guide",
    "DG.ToolButtonData.guideMenu.toolTip": "Show the guide for this activity and navigate within it",
    "DG.ToolButtonData.guideMenu.showGuide": "Show Guide",
    "DG.ToolButtonData.help.title": "Help",
    "DG.ToolButtonData.help.toolTip": "Help for CODAP, learn about CODAP project",
    "DG.ToolButtonData.pluginMenu.title": "Plugins",
    "DG.ToolButtonData.pluginMenu.toolTip": "Open a plugin component",

    // DG.Slider
    "DG.Slider.multiples": "Restrict to Multiples of:",
    "DG.Slider.maxPerSecond": "Maximum Animation Frames/sec:",
    "DG.Slider.direction": "Animation Direction:",
    "DG.Slider.backAndForth": "Back and Forth",
    "DG.Slider.lowToHigh": "Low to High",
    "DG.Slider.highToLow": "High to Low",
    "DG.Slider.mode": "Animation Repetition:",
    "DG.Slider.nonStop": "Non-Stop",
    "DG.Slider.onceOnly": "Once Only",

    // Undo / Redo
    "DG.Undo.exceptionOccurred": "An error occurred while trying to undo.",
    "DG.Redo.exceptionOccurred": "An error occurred while trying to redo.",
    "DG.Undo.componentMove": "Undo moving the component",
    "DG.Redo.componentMove": "Redo moving the component",
    "DG.Undo.componentResize": "Undo resizing the component",
    "DG.Redo.componentResize": "Redo resizing the component",
    "DG.Undo.axisDilate": "Undo rescaling the axis",
    "DG.Redo.axisDilate": "Redo rescaling the axis",
    "DG.Undo.axisRescaleFromData": "Undo rescaling the axis",
    "DG.Redo.axisRescaleFromData": "Redo rescaling the axis",
    "DG.Undo.axisDrag": "Undo dragging the axis",
    "DG.Redo.axisDrag": "Redo dragging the axis",
    "DG.Undo.axisAttributeChange": "Undo changing the axis attribute",
    "DG.Redo.axisAttributeChange": "Redo changing the axis attribute",
    "DG.Undo.axisAttributeAdded": "Undo adding an axis attribute",
    "DG.Redo.axisAttributeAdded": "Redo adding an axis attribute",
    "DG.Undo.toggleComponent.add.calcView": "Undo showing the calculator",
    "DG.Redo.toggleComponent.add.calcView": "Redo showing the calculator",
    "DG.Undo.toggleComponent.delete.calcView": "Undo hiding the calculator",
    "DG.Redo.toggleComponent.delete.calcView": "Redo hiding the calculator",
    "DG.Undo.caseTable.open": "Undo showing case tables",
    "DG.Redo.caseTable.open": "Redo showing case tables",
    "DG.Undo.caseTable.editAttribute": "Undo editing case table attribute",
    "DG.Redo.caseTable.editAttribute": "Redo editing case table attribute",
    "DG.Undo.caseTable.createAttribute": "Undo creating case table attribute",
    "DG.Redo.caseTable.createAttribute": "Redo creating case table attribute",
    "DG.Undo.caseTable.editAttributeFormula": "Undo editing case table attribute formula",
    "DG.Redo.caseTable.editAttributeFormula": "Redo editing case table attribute formula",
    "DG.Undo.caseTable.editCellValue": "Undo editing case table cell value",
    "DG.Redo.caseTable.editCellValue": "Redo editing case table cell value",
    "DG.Undo.caseTable.sortCases": "Undo sorting cases",
    "DG.Redo.caseTable.sortCases": "Redo sorting cases",
    "DG.Undo.caseTable.hideAttribute": "Undo hiding attribute",
    "DG.Redo.caseTable.hideAttribute": "Redo hiding attribute",
    "DG.Undo.caseTable.deleteAttribute": "Undo deleting case table attribute",
    "DG.Redo.caseTable.deleteAttribute": "Redo deleting case table attribute",
    "DG.Undo.caseTable.createCollection": "Undo create new collection",
    "DG.Redo.caseTable.createCollection": "Redo create new collection",
    "DG.Undo.caseTable.collectionNameChange": "Undo rename collection",
    "DG.Redo.caseTable.collectionNameChange": "Redo rename collection",
    "DG.Undo.caseTable.createNewCase": "Undo create new case",
    "DG.Redo.caseTable.createNewCase": "Redo create new case",
    "DG.Undo.caseTable.insertCases": "Undo insert cases",
    "DG.Redo.caseTable.insertCases": "Redo insert cases",
    "DG.Undo.caseTable.groupToggleExpandCollapseAll": "Undo toggle expand/collapse all",
    "DG.Redo.caseTable.groupToggleExpandCollapseAll": "Redo toggle expand/collapse all",
    "DG.Undo.caseTable.expandCollapseOneCase": "Undo expand or collapse of a group",
    "DG.Redo.caseTable.expandCollapseOneCase": "Redo expand or collapse of a group",
    "DG.Undo.caseTable.resizeColumns": "Undo auto-resize all columns",
    "DG.Redo.caseTable.resizeColumns": "Redo auto-resize all columns",
    "DG.Undo.caseTable.resizeColumn": "Undo fit width to content",
    "DG.Redo.caseTable.resizeColumn": "Redo fit width to content",
    "DG.Undo.caseTable.showAllHiddenAttributes": "Undo show all hidden attributes",
    "DG.Redo.caseTable.showAllHiddenAttributes": "Redo show all hidden attributes",
    "DG.Undo.document.share": "Undo sharing the document",
    "DG.Redo.document.share": "Redo sharing the document",
    "DG.Undo.document.unshare": "Undo stop sharing the document",
    "DG.Redo.document.unshare": "Redo stop sharing the document",
    "DG.Undo.game.add": "Undo adding a game to the document",
    "DG.Redo.game.add": "Redo adding a game to the document",
    "DG.Undo.graph.showCount": "Undo showing count",
    "DG.Redo.graph.showCount": "Redo showing count",
    "DG.Undo.graph.hideCount": "Undo hiding count",
    "DG.Redo.graph.hideCount": "Redo hiding count",
    "DG.Undo.graph.showPercent": "Undo showing percent",
    "DG.Redo.graph.showPercent": "Redo showing percent",
    "DG.Undo.graph.hidePercent": "Undo hiding percent",
    "DG.Redo.graph.hidePercent": "Redo hiding percent",
    "DG.Undo.graph.showMovablePoint": "Undo showing movable point",
    "DG.Redo.graph.showMovablePoint": "Redo showing movable point",
    "DG.Undo.graph.hideMovablePoint": "Undo hiding movable point",
    "DG.Redo.graph.hideMovablePoint": "Redo hiding movable point",
    "DG.Undo.graph.showMovableLine": "Undo showing movable line",
    "DG.Redo.graph.showMovableLine": "Redo showing movable line",
    "DG.Undo.graph.hideMovableLine": "Undo hiding movable line",
    "DG.Redo.graph.hideMovableLine": "Redo hiding movable line",
    "DG.Undo.graph.lockIntercept": "Undo locking line intercept",
    "DG.Redo.graph.lockIntercept": "Redo locking line intercept",
    "DG.Undo.graph.unlockIntercept": "Undo unlocking line intercept",
    "DG.Redo.graph.unlockIntercept": "Redo unlocking line intercept",
    "DG.Undo.graph.showPlotFunction": "Undo showing plotted function",
    "DG.Redo.graph.showPlotFunction": "Redo showing plotted function",
    "DG.Undo.graph.hidePlotFunction": "Undo hiding plotted function",
    "DG.Redo.graph.hidePlotFunction": "Redo hiding plotted function",
    "DG.Undo.graph.changePlotFunction": "Undo change plotted function",
    "DG.Redo.graph.changePlotFunction": "Redo change plotted function",
    "DG.Undo.graph.showPlotValue": "Undo showing plotted value",
    "DG.Redo.graph.showPlotValue": "Redo showing plotted value",
    "DG.Undo.graph.hidePlotValue": "Undo hiding plotted value",
    "DG.Redo.graph.hidePlotValue": "Redo hiding plotted value",
    "DG.Undo.graph.changePlotValue": "Undo change plotted value",
    "DG.Redo.graph.changePlotValue": "Redo change plotted value",
    "DG.Undo.graph.showConnectingLine": "Undo showing connecting line",
    "DG.Redo.graph.showConnectingLine": "Redo showing connecting line",
    "DG.Undo.graph.hideConnectingLine": "Undo hiding connecting line",
    "DG.Redo.graph.hideConnectingLine": "Redo hiding connecting line",
    "DG.Undo.graph.showLSRL": "Undo showing least squares line",
    "DG.Redo.graph.showLSRL": "Redo showing least squares line",
    "DG.Undo.graph.hideLSRL": "Undo hiding least squares line",
    "DG.Redo.graph.hideLSRL": "Redo hiding least squares line",
    "DG.Undo.graph.showSquares": "Undo showing squares",
    "DG.Redo.graph.showSquares": "Redo showing squares",
    "DG.Undo.graph.hideSquares": "Undo hiding squares",
    "DG.Redo.graph.hideSquares": "Redo hiding squares",
    "DG.Undo.graph.showPlottedMean": "Undo showing mean",
    "DG.Redo.graph.showPlottedMean": "Redo showing mean",
    "DG.Undo.graph.hidePlottedMean": "Undo hiding mean",
    "DG.Redo.graph.hidePlottedMean": "Redo hiding mean",
    "DG.Undo.graph.showPlottedMedian": "Undo showing median",
    "DG.Redo.graph.showPlottedMedian": "Redo showing median",
    "DG.Undo.graph.hidePlottedMedian": "Undo hiding median",
    "DG.Redo.graph.hidePlottedMedian": "Redo hiding median",
    "DG.Undo.graph.showPlottedStDev": "Undo showing standard deviation",
    "DG.Redo.graph.showPlottedStDev": "Redo showing standard deviation",
    "DG.Undo.graph.hidePlottedStDev": "Undo hiding standard deviation",
    "DG.Redo.graph.hidePlottedStDev": "Redo hiding standard deviation",
    "DG.Undo.graph.showPlottedIQR": "Undo showing inter-quartile range",
    "DG.Redo.graph.hidePlottedIQR": "Redo hiding inter-quartile range",
    "DG.Undo.graph.hidePlottedIQR": "Undo hiding inter-quartile range",
    "DG.Redo.graph.showPlottedIQR": "Redo showing inter-quartile range",
    "DG.Undo.graph.showPlottedBoxPlot": "Undo showing box plot",
    "DG.Redo.graph.hidePlottedBoxPlot": "Redo hiding box plot",
    "DG.Undo.graph.hidePlottedBoxPlot": "Undo hiding box plot",
    "DG.Redo.graph.showPlottedBoxPlot": "Redo showing box plot",
    "DG.Undo.graph.showOutliers": "Undo showing outliers",
    "DG.Redo.graph.hideOutliers": "Redo hiding outliers",
    "DG.Undo.graph.hideOutliers": "Undo hiding outliers",
    "DG.Redo.graph.showOutliers": "Redo showing outliers",
    "DG.Undo.graph.showAsBarChart": "Undo fusing dots into bars",
    "DG.Redo.graph.showAsBarChart": "Redo fusing dots into bars",
    "DG.Undo.graph.showAsDotChart": "Undo dispersing bars into dots",
    "DG.Redo.graph.showAsDotChart": "Redo dispersing bars into dots",
    "DG.Undo.graph.fuseDotsToRectangles": "Undo fusing dots into rectangles",
    "DG.Redo.graph.fuseDotsToRectangles": "Redo fusing dots into rectangles",
    "DG.Undo.graph.dissolveRectanglesToDots": "Undo dissolving rectangles into dots",
    "DG.Redo.graph.dissolveRectanglesToDots": "Redo dissolving rectangles into dots",
    "DG.Undo.graph.changeBreakdownType": "Undo changing scale type",
    "DG.Redo.graph.changeBreakdownType": "Undo changing scale type",
    "DG.Undo.graph.showAsBinnedPlot": "Undo grouping dots into bins",
    "DG.Redo.graph.showAsBinnedPlot": "Redo grouping dots into bins",
    "DG.Undo.graph.showAsDotPlot": "Undo ungrouping dots from bins",
    "DG.Redo.graph.showAsDotPlot": "Redo ungrouping dots from bins",
    "DG.Undo.graph.dragBinBoundary": "Undo dragging bin boundary",
    "DG.Redo.graph.dragBinBoundary": "Redo dragging bin boundary",
    "DG.Undo.graph.changeBinWidth": "Undo changing bin width",
    "DG.Redo.graph.changeBinWidth": "Redo changing bin width",
    "DG.Undo.graph.changeBinAlignment": "Undo changing bin alignment",
    "DG.Redo.graph.changeBinAlignment": "Redo changing bin alignment",
    "DG.Undo.graph.addMovableValue": "Undo adding movable value",
    "DG.Redo.graph.addMovableValue": "Redo adding movable value",
    "DG.Undo.graph.removeMovableValue": "Undo removing movable value",
    "DG.Redo.graph.removeMovableValue": "Redo removing movable value",
    "DG.Undo.graph.moveMovableValue": "Undo moving movable value",
    "DG.Redo.graph.moveMovableValue": "Redo moving movable value",
    "DG.Undo.graph.moveMovablePoint": "Undo moving movable point",
    "DG.Redo.graph.moveMovablePoint": "Redo moving movable point",
    "DG.Undo.graph.repositionEquation": "Undo repositioning equation",
    "DG.Redo.graph.repositionEquation": "Redo repositioning equation",
    "DG.Undo.graph.changePointColor": "Undo changing data color",
    "DG.Redo.graph.changePointColor": "Redo changing data color",
    "DG.Undo.graph.changeStrokeColor": "Undo changing stroke color",
    "DG.Redo.graph.changeStrokeColor": "Redo changing stroke color",
    "DG.Undo.graph.changePointSize": "Undo changing point size",
    "DG.Redo.graph.changePointSize": "Redo changing point size",
    "DG.Undo.graph.changeAttributeColor": "Undo changing attribute color",
    "DG.Redo.graph.changeAttributeColor": "Redo changing attribute color",
    "DG.Undo.graph.changeBackgroundColor": "Undo changing graph background color",
    "DG.Redo.graph.changeBackgroundColor": "Redo changing graph background color",
    "DG.Undo.graph.addBackgroundImage": "Undo adding graph background image",
    "DG.Redo.graph.addBackgroundImage": "Redo adding graph background image",
    "DG.Undo.graph.removeBackgroundImage": "Undo removing graph background image",
    "DG.Redo.graph.removeBackgroundImage": "Redo removing graph background image",
    "DG.Undo.graph.lockBackgroundImage": "Undo locking background image to axes",
    "DG.Redo.graph.lockBackgroundImage": "Redo locking background image to axes",
    "DG.Undo.graph.unlockBackgroundImage": "Undo unlocking background image from axes",
    "DG.Redo.graph.unlockBackgroundImage": "Redo unlocking background image from axes",
    "DG.Undo.graph.makeStrokeSameAsFill": "Undo making stroke same as fill",
    "DG.Redo.graph.makeStrokeSameAsFill": "Redo making stroke same as fill",
    "DG.Undo.graph.makeStrokeIndependent": "Undo making stroke independent of fill",
    "DG.Redo.graph.makeStrokeIndependent": "Redo making stroke independent of fill",
    "DG.Undo.graph.toggleTransparent": "Undo toggling plot transparency",
    "DG.Redo.graph.toggleTransparent": "Redo toggling plot transparency",
    "DG.Undo.graph.swapCategories": "Undo reordering categories",
    "DG.Redo.graph.swapCategories": "Redo reordering categories",
    "DG.Undo.guide.show": "Undo showing the guide",
    "DG.Redo.guide.show": "Redo showing the guide",
    "DG.Undo.guide.navigate": "Undo changing the guide page",
    "DG.Redo.guide.navigate": "Redo changing the guide page",
    "DG.Undo.hideSelectedCases": "Undo hiding selected cases",
    "DG.Redo.hideSelectedCases": "Redo hiding selected cases",
    "DG.Undo.hideUnselectedCases": "Undo hiding unselected cases",
    "DG.Redo.hideUnselectedCases": "Redo hiding unselected cases",
    "DG.Undo.enableNumberToggle": "Undo Show Parent Visibility Toggles",
    "DG.Redo.enableNumberToggle": "Redo Show Parent Visibility Toggles",
    "DG.Undo.disableNumberToggle": "Undo Hide Parent Visibility Toggles",
    "DG.Redo.disableNumberToggle": "Redo Hide Parent Visibility Toggles",
    "DG.Undo.enableMeasuresForSelection": "Undo Show Measures For Selection",
    "DG.Redo.enableMeasuresForSelection": "Redo Show Measures For Selection",
    "DG.Undo.disableMeasuresForSelection": "Undo Hide Measures For Selection",
    "DG.Redo.disableMeasuresForSelection": "Redo Hide Measures For Selection",
    "DG.Undo.interactiveUndoableAction": "Undo an action in the interactive",
    "DG.Redo.interactiveUndoableAction": "Redo an action in the interactive",
    "DG.Undo.showAllCases": "Undo showing all cases",
    "DG.Redo.showAllCases": "Redo showing all cases",
    "DG.Undo.map.create": "Undo adding map",
    "DG.Redo.map.create": "Redo adding map",
    "DG.Undo.map.fitBounds": "Undo resizing map",
    "DG.Redo.map.fitBounds": "Redo resizing map",
    "DG.Undo.map.pan": "Undo panning map",
    "DG.Redo.map.pan": "Redo panning map",
    "DG.Undo.map.zoom": "Undo zooming map",
    "DG.Redo.map.zoom": "Redo zooming map",
    "DG.Undo.map.showGrid": "Undo showing grid on map",
    "DG.Redo.map.showGrid": "Redo showing grid on map",
    "DG.Undo.map.hideGrid": "Undo hiding grid on map",
    "DG.Redo.map.hideGrid": "Redo hiding grid on map",
    "DG.Undo.map.changeGridSize": "Undo changing map grid size",
    "DG.Redo.map.changeGridSize": "Redo changing map grid size",
    "DG.Undo.map.showPoints": "Undo showing points on map",
    "DG.Redo.map.showPoints": "Redo showing points on map",
    "DG.Undo.map.hidePoints": "Undo hiding points on map",
    "DG.Redo.map.hidePoints": "Redo hiding points on map",
    "DG.Undo.map.showLines": "Undo showing lines on map",
    "DG.Redo.map.showLines": "Redo showing lines on map",
    "DG.Undo.map.hideLines": "Undo hiding lines on map",
    "DG.Redo.map.hideLines": "Redo hiding lines on map",
    "DG.Undo.map.changeBaseMap": "Undo changing map background",
    "DG.Redo.map.changeBaseMap": "Redo changing map background",
    "DG.Undo.textComponent.create": "Undo adding text object",
    "DG.Redo.textComponent.create": "Redo adding text object",
    "DG.Undo.textComponent.edit": "Undo editing text",
    "DG.Redo.textComponent.edit": "Redo editing text",
    "DG.Undo.sliderComponent.create": "Undo adding a slider",
    "DG.Redo.sliderComponent.create": "Redo adding a slider",
    "DG.Undo.slider.change": "Undo slider value change",
    "DG.Redo.slider.change": "Redo slider value change",
    "DG.Undo.slider.changeMultiples": "Undo change to slider multiples restriction",
    "DG.Redo.slider.changeMultiples": "Redo change to slider multiples restriction",
    "DG.Undo.slider.changeSpeed": "Undo change to slider max frames/sec",
    "DG.Redo.slider.changeSpeed": "Redo change to slider max frames/sec",
    "DG.Undo.slider.changeDirection": "Undo change to slider animation direction",
    "DG.Redo.slider.changeDirection": "Redo change to slider animation direction",
    "DG.Undo.slider.changeRepetition": "Undo change to slider animation repetition",
    "DG.Redo.slider.changeRepetition": "Redo change to slider animation repetition",
    "DG.Undo.graphComponent.create": "Undo adding a graph",
    "DG.Redo.graphComponent.create": "Redo adding a graph",
    "DG.Undo.dataContext.create": "Undo creating a data set",
    "DG.Redo.dataContext.create": "Redo creating a data set",
    "DG.Undo.data.deleteCases": "Undo deleting cases",
    "DG.Redo.data.deleteCases": "Redo deleting cases",
    "DG.Undo.component.close": "Undo closing component",
    "DG.Redo.component.close": "Redo closing component",
    "DG.Undo.component.minimize": "Undo minimizing component",
    "DG.Redo.component.minimize": "Redo minimizing component",
    "DG.Undo.dataContext.moveAttribute": "Undo moving case table attribute",
    "DG.Redo.dataContext.moveAttribute": "Redo moving case table attribute",
    "DG.Undo.component.toggleTableToCard": "Undo changing case table to case card",
    "DG.Redo.component.toggleTableToCard": "Redo changing case table to case card",
    "DG.Undo.component.toggleCardToTable": "Undo changing case card to case table",
    "DG.Redo.component.toggleCardToTable": "Redo changing case card to case table",

    // DG.DataContext
    "DG.DataContext.singleCaseName": "case",
    "DG.DataContext.pluralCaseName": "cases",
    "DG.DataContext.caseCountString": "%@1 %@2", // %@1: count, %@2: case name string
    "DG.DataContext.setOfCasesLabel": "a collection",
    "DG.DataContext.collapsedRowString": "%@1 of %@2",
    "DG.DataContext.noData": "No Data",
    "DG.DataContext.baseName": "Data_Set_%@1",

    // DG.CollectionClient
    "DG.CollectionClient.cantEditFormulaErrorMsg": "The formula for attribute \"%@\" is not editable.",
    "DG.CollectionClient.cantEditFormulaErrorDesc": "Create a new attribute to be able to specify a formula.",

    // DG.Formula
    "DG.Formula.FuncCategoryArithmetic": "Arithmetic Functions",
    "DG.Formula.FuncCategoryConversion": "Other Functions", // put into "Other" for now
    "DG.Formula.FuncCategoryDateTime": "Date/Time Functions",
    "DG.Formula.FuncCategoryLookup": "Lookup Functions",
    "DG.Formula.FuncCategoryOther": "Other Functions",
    "DG.Formula.FuncCategoryRandom": "Other Functions", // put into "Other" for now
    "DG.Formula.FuncCategoryStatistical": "Statistical Functions",
    "DG.Formula.FuncCategoryString": "String Functions",
    "DG.Formula.FuncCategoryTrigonometric": "Trigonometric Functions",

    "DG.Formula.DateLongMonthJanuary": "January",
    "DG.Formula.DateLongMonthFebruary": "February",
    "DG.Formula.DateLongMonthMarch": "March",
    "DG.Formula.DateLongMonthApril": "April",
    "DG.Formula.DateLongMonthMay": "May",
    "DG.Formula.DateLongMonthJune": "June",
    "DG.Formula.DateLongMonthJuly": "July",
    "DG.Formula.DateLongMonthAugust": "August",
    "DG.Formula.DateLongMonthSeptember": "September",
    "DG.Formula.DateLongMonthOctober": "October",
    "DG.Formula.DateLongMonthNovember": "November",
    "DG.Formula.DateLongMonthDecember": "December",

    "DG.Formula.DateShortMonthJanuary": "Jan",
    "DG.Formula.DateShortMonthFebruary": "Feb",
    "DG.Formula.DateShortMonthMarch": "Mar",
    "DG.Formula.DateShortMonthApril": "Apr",
    "DG.Formula.DateShortMonthMay": "May",
    "DG.Formula.DateShortMonthJune": "Jun",
    "DG.Formula.DateShortMonthJuly": "Jul",
    "DG.Formula.DateShortMonthAugust": "Aug",
    "DG.Formula.DateShortMonthSeptember": "Sep",
    "DG.Formula.DateShortMonthOctober": "Oct",
    "DG.Formula.DateShortMonthNovember": "Nov",
    "DG.Formula.DateShortMonthDecember": "Dec",

    "DG.Formula.DateLongDaySunday": "Sunday",
    "DG.Formula.DateLongDayMonday": "Monday",
    "DG.Formula.DateLongDayTuesday": "Tuesday",
    "DG.Formula.DateLongDayWednesday": "Wednesday",
    "DG.Formula.DateLongDayThursday": "Thursday",
    "DG.Formula.DateLongDayFriday": "Friday",
    "DG.Formula.DateLongDaySaturday": "Saturday",

    "DG.Formula.DateShortDaySunday": "Sun",
    "DG.Formula.DateShortDayMonday": "Mon",
    "DG.Formula.DateShortDayTuesday": "Tue",
    "DG.Formula.DateShortDayWednesday": "Wed",
    "DG.Formula.DateShortDayThursday": "Thu",
    "DG.Formula.DateShortDayFriday": "Fri",
    "DG.Formula.DateShortDaySaturday": "Sat",

    /* "dd-mmm-yyyy", "mmm dd, yyyy", "dd-mmm-yy", "mm/dd/yy", "mm/dd/yyyy" */
    "DG.Utilities.date.localDatePattern": "(?:(?:[0-3]?\\d-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\\d{2}(?:\\d{2})?)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec) \\d{1,2}( |,) *\\d{4}|(?:[01]?\\d/[0-3]?\\d/\\d{2}(?:\\d{2})?))",
                                     /* "hh:mm", "hh:mm:ss", "hh:mm:ss.ddd" */
    "DG.Utilities.date.timePattern": "(?:[0-2]?\\d:[0-5]?\\d(?::[0-5]\\d(?:\\.\\d{3})?)? ?(?:[ap]m)?)",
                                        /* "yyyy-mm-dd", "yyyy-mm-ddThh:mm:ss", "yyyy-mm-ddThh:mm:ssZ" "yyyy-mm-ddThh:mm:ss+hh:mm"*/
    "DG.Utilities.date.iso8601Pattern": "^\\d{4}-[01]\\d-[0-3]\\d(?:[T ][0-2]\\d:[0-5]\\d(?::[0-5]\\d(?:\\.\\d{3,6})?)?(?:Z|(?:[-+]?[01]\\d:[0-5]\\d)|(?: ?[-+][0-2]\\d{3}))?)?$",
                                 /* "rgb(nnn,nnn,nnn)" "rgba(nnn,nnn,nnn,0.n)" "#ffffff" */
    "DG.Utilities.colorPattern": "(?:rgb\\((?:\\d{1,3},){2}\\d{1,3}\\))|(?:rgba\\((?:\\d{1,3},){3}[\\d\\.]*\\))|(?:#[\\da-f]{6})",

    "DG.Formula.SyntaxErrorMiddle": "Syntax error: '%@'",
    "DG.Formula.SyntaxErrorEnd": "Incomplete expression",
    "DG.Formula.SyntaxErrorInvalidOperator": "invalid operator '%@'",
    "DG.Formula.TypeError.name": "❌",
    "DG.Formula.TypeError.message": "invalid type(s) for '%@'",
    "DG.Formula.TypeError.description": "invalid type(s) for '%@'",
    "DG.Formula.VarReferenceError.name": "❌",
    "DG.Formula.VarReferenceError.message": "'%@' is unrecognized",
    "DG.Formula.VarReferenceError.description": "variable '%@' is unrecognized",
    "DG.Formula.HierReferenceError.name": "❌",
    "DG.Formula.HierReferenceError.message": "invalid reference to child attribute '%@'",
    "DG.Formula.HierReferenceError.description": "'%@' is a child attribute that can only be referenced in an aggregate function",
    "DG.Formula.FuncReferenceError.name": "❌",
    "DG.Formula.FuncReferenceError.message": "'%@()' is unrecognized",
    "DG.Formula.FuncReferenceError.description": "function '%@()' is unrecognized",
    "DG.Formula.FuncArgsError.name": "❌",
    "DG.Formula.FuncArgsErrorSingle.message": "'%@()' expects 1 argument",
    "DG.Formula.FuncArgsErrorSingle.description": "The '%@()' function expects 1 argument",
    "DG.Formula.FuncArgsErrorPlural.message": "'%@()' expects %@ arguments",
    "DG.Formula.FuncArgsErrorPlural.description": "The '%@()' function expects %@ arguments",
    "DG.Formula.FuncArgsErrorRange.message": "'%@()' expects %@-%@ arguments",
    "DG.Formula.FuncArgsErrorRange.description": "The '%@()' function expects %@-%@ arguments",
    "DG.Formula.PendingRequest.name": "⌛",
    "DG.Formula.PendingRequest.message": "request pending...",
    "DG.Formula.PendingRequest.description": "request pending...",
    "DG.Formula.FailedRequest.name": "❌",
    "DG.Formula.FailedRequest.message": "request failed (%@)",
    "DG.Formula.FailedRequest.description": "request failed (%@)",
    "DG.Formula.PendingBoundaries.name": "⌛",
    "DG.Formula.PendingBoundaries.message": "boundaries pending...",
    "DG.Formula.PendingBoundaries.description": "boundaries pending...",
    "DG.Formula.FailedBoundaries.name": "❌",
    "DG.Formula.FailedBoundaries.message": "boundaries failed (%@)",
    "DG.Formula.FailedBoundaries.description": "boundaries failed (%@)",
    "DG.Formula.LookupDataSetError.message": "'%@': unrecognized data set",
    "DG.Formula.LookupDataSetError.description": "Data set '%@' is unrecognized",
    "DG.Formula.LookupAttrError.message": "'%@' not found in data set '%@'",
    "DG.Formula.LookupAttrError.description": "Attribute '%@' not found in data set '%@'",

    // DG.TableController
    "DG.TableController.headerMenuItems.editAttribute": "Edit Attribute Properties...",
    "DG.TableController.headerMenuItems.editFormula": "Edit Formula...",
    "DG.TableController.headerMenuItems.deleteFormula": "Delete Formula (Keeping Values)",
    "DG.TableController.headerMenuItems.recoverFormula": "Recover Deleted Formula",
    "DG.TableController.headerMenuItems.randomizeAttribute": "Rerandomize",
    "DG.TableController.headerMenuItems.sortAscending": "Sort Ascending (A→Z, 0→9)",
    "DG.TableController.headerMenuItems.sortDescending": "Sort Descending (9→0, Z→A)",
    "DG.TableController.headerMenuItems.hideAttribute": "Hide Attribute",
    "DG.TableController.headerMenuItems.deleteAttribute": "Delete Attribute",
    "DG.TableController.headerMenuItems.renameAttribute": "Rename",
    "DG.TableController.headerMenuItems.resizeColumn": "Fit width to content",
    "DG.TableController.newAttrDlg.defaultAttrName": "new_attr",
    "DG.TableController.newAttrDlg.attrNameHint": "Enter a name for the new attribute",
    "DG.TableController.newAttrDlg.formulaHint": "If desired, type a formula for computing values of this attribute",
    "DG.TableController.newAttrDlg.applyTooltip": "Define the new attribute using the name and (optional) formula",
    "DG.TableController.newAttrDlg.mustEnterAttrNameMsg": "Please enter a name for the new attribute",
    "DG.TableController.newAttrDialog.AttributesCategory": "Attributes",
    "DG.TableController.newAttrDialog.SpecialCategory": "Special",
    "DG.TableController.newAttrDialog.GlobalsCategory": "Globals",
    "DG.TableController.newAttrDialog.ConstantsCategory": "Constants",  // Set to "Special" to combine with 'caseIndex'
    "DG.TableController.newAttrDialog.FunctionsCategory": "Functions",
    "DG.TableController.renameAttributeInvalidMsg": "Attribute names may not be empty",
    "DG.TableController.renameAttributeInvalidDesc": "Please enter a valid attribute name",
    "DG.TableController.renameAttributeDuplicateMsg": "An attribute with that name already exists",
    "DG.TableController.renameAttributeDuplicateDesc": "Please enter a unique attribute name",
    "DG.TableController.deleteAttribute.confirmMessage": "Delete the attribute '%@'?",
    "DG.TableController.deleteAttribute.confirmDescription": "This action cannot be undone.",
    "DG.TableController.deleteAttribute.okButtonTitle": "Delete Attribute",
    "DG.TableController.deleteAttribute.cancelButtonTitle": "Cancel",
    "DG.TableController.deleteDataSet.confirmMessage": "Delete and destroy this data set: '%@'?",
    "DG.TableController.deleteDataSet.confirmDescription": "This action cannot be undone.",
    "DG.TableController.deleteDataSet.okButtonTitle": "Delete Data Set",
    "DG.TableController.deleteDataSet.cancelButtonTitle": "Cancel",
    "DG.TableController.attrEditor.precisionNumericHint": "Number of digits after decimal point",
    "DG.TableController.attrEditor.precisionDateHint": "Determines how much of the date is displayed",
    "DG.TableController.attrEditor.unitHint": "Unit of measure, if applicable",
    "DG.TableController.attrEditor.descriptionHint": "Describe the attribute",
    "DG.TableController.attrEditor.typeHint": "Set to force the attribute to be treated as a certain type",
    "DG.TableController.attrEditor.nameHint": "The attribute name appears in the case table, case card, and on graph axes",
    "DG.TableController.attrEditor.editableHint": "If the attribute is not editable, its values and/or formula cannot be changed",
    "DG.TableController.setScoreDlg.applyTooltip": "Set the formula for the '%@' attribute",
    "DG.TableController.setScoreDlg.formulaHint": "Type a formula for computing values of this attribute",
    "DG.TableController.newAttributeTooltip": "Add a new attribute to this table",
    "DG.TableController.collectionTitleText": "%@1 (%@2 cases)", /* %@1 replaced with case table title, %@2 replaced with case count */
    "DG.TableController.collectionTitleTextWithSetAside": "%@1 (%@2 cases, %@3 set aside)", /* %@1 replaced with case table title, %@2 replaced with case count, %@3 with set-aside count */

    "DG.TableController.attributeEditor.title": "Attribute Properties",

    // DG.CaseTableDropTarget
    "DG.CaseTableDropTarget.dropMessage": "drop attribute to create new collection",
    "DG.CaseTable.defaultAttrName": "newAttr",

    // DG.CaseTable
    "DG.CaseTable.indexColumnName": "index",
    "DG.CaseTable.indexColumnTooltip": "The row number (caseIndex) within the collection",
    "DG.CaseTable.indexMenu.insertCase": "Insert Case",
    "DG.CaseTable.indexMenu.insertCases": "Insert Cases...",
    "DG.CaseTable.indexMenu.deleteCase": "Delete Case",
    "DG.CaseTable.indexMenu.deleteCases": "Delete Cases",
    "DG.CaseTable.attribute.type.none": "",
    "DG.CaseTable.attribute.type.nominal": "categorical",
    "DG.CaseTable.attribute.type.categorical": "categorical",
    "DG.CaseTable.attribute.type.numeric": "numeric",
    "DG.CaseTable.attribute.type.date": "date",
    "DG.CaseTable.attribute.type.qualitative": "qualitative",
    "DG.CaseTable.attribute.type.boundary": "boundary",
    "DG.CaseTable.attributeEditor.name": "name",
    "DG.CaseTable.attributeEditor.description": "description",
    "DG.CaseTable.attributeEditor.type": "type",
    "DG.CaseTable.attributeEditor.unit": "unit",
    "DG.CaseTable.attributeEditor.precision": "precision",
    "DG.CaseTable.attributeEditor.datePrecisionOptions": "year month day hour minute second millisecond",
    "DG.CaseTable.attributeEditor.editable": "editable",
    "DG.CaseTable.insertCasesDialog.title": "Insert Cases",
    "DG.CaseTable.insertCasesDialog.numCasesPrompt": "# cases to insert:",
    "DG.CaseTable.insertCasesDialog.beforeAfter.prompt": "location:",
    "DG.CaseTable.insertCasesDialog.beforeAfter.before": "before",
    "DG.CaseTable.insertCasesDialog.beforeAfter.after": "after",
    "DG.CaseTable.insertCasesDialog.applyBtnTitle": "Insert Cases",
    "DG.CaseTable.insertCasesDialog.applyBtnTooltip": "Insert the specified number of cases",
    "DG.CaseTable.dividerView.expandAllTooltip": "expand all groups",
    "DG.CaseTable.dividerView.expandGroupTooltip": "expand group",
    "DG.CaseTable.dividerView.collapseAllTooltip": "collapse all groups",
    "DG.CaseTable.dividerView.collapseGroupTooltip": "collapse group",

    // DG.CaseTableController
    "DG.CaseTableController.allTables": "All tables",

    // DG.DataContext
    "DG.Undo.DataContext.join": "Undo join of %@ to %@",    // Undo join of <source> to <destination>
    "DG.Redo.DataContext.join": "Redo join of %@ to %@",

    // DG.AttributeFormat
    // See docs at https://momentjs.com/docs/#/displaying/format/
    "DG.AttributeFormat.DatePrecision.year": "YYYY",
    "DG.AttributeFormat.DatePrecision.month": "MMM YYYY",
    "DG.AttributeFormat.DatePrecision.day": "MMM D, YYYY",
    "DG.AttributeFormat.DatePrecision.hour": "MMM D, YYYY HH:00",
    "DG.AttributeFormat.DatePrecision.minute": "MMM D, YYYY HH:mm",
    "DG.AttributeFormat.DatePrecision.second": "MMM D, YYYY HH:mm:ss",
    "DG.AttributeFormat.DatePrecision.millisecond": "MMM D, YYYY HH:mm:ss.SSS",

    // DG.AttributeFormulaView
    "DG.AttrFormView.attrNamePrompt": "Attribute Name:",
    "DG.AttrFormView.formulaPrompt": "Formula:",
    "DG.AttrFormView.operandMenuTitle": "--- Insert Value ---",
    "DG.AttrFormView.functionMenuTitle": "--- Insert Function ---",
    "DG.AttrFormView.applyBtnTitle": "Apply",
    "DG.AttrFormView.cancelBtnTitle": "Cancel",
    "DG.AttrFormView.cancelBtnTooltip": "Dismiss the dialog without making any changes",

    // DG.GuideConfigurationView
    "DG.GuideConfigView.titlePrompt": "Guide Title",
    "DG.GuideConfigView.titleHint": "Activity Name",
    "DG.GuideConfigView.itemTitleHint": "Section Name",
    "DG.GuideConfigView.itemURLHint": "URL of section",
    "DG.GuideConfigView.okBtnTitle": "OK",
    "DG.GuideConfigView.okBtnToolTip": "Accept the Guide menu items",
    "DG.GuideConfigView.cancelBtnTitle": "Cancel",
    "DG.GuideConfigView.cancelBtnTooltip": "Dismiss the dialog without making any changes",
    "DG.GuideConfigView.httpWarning": "The URL must start with either http:// or https://",

    "DG.DataDisplayModel.rescaleToData": "Rescale to Data",
    "DG.DataDisplayModel.ShowConnectingLine": "Show Connecting Lines",
    "DG.DataDisplayModel.HideConnectingLine": "Hide Connecting Lines",

    // DG.AxisView
    "DG.AxisView.emptyGraphCue": "Click here, or drag an attribute here.",

    // DG.CellAxis
    "DG.CellAxis.other": "OTHER",

    // DG.CellLinearAxisView
    "DG.CellLinearAxisView.midPanelTooltip": "Drag to translate axis scale",
    "DG.CellLinearAxisView.lowerPanelTooltip": "Drag to change axis lower bound",
    "DG.CellLinearAxisView.upperPanelTooltip": "Drag to change axis upper bound",

    // DG.CountAxisView
    "DG.CountAxisView.countLabel": "Count",
    "DG.CountAxisView.countLabelDescription": "Number of cases in the bar along this axis",
    "DG.CountAxisView.percentLabel": "Percent",
    "DG.CountAxisView.percentLabelDescription": "Percent of cases in the bar along this axis",

    // DG.PlotModel
    "DG.PlotModel.mixup": "Mix Up the Plot",
    "DG.PlotModel.showCount": "Show Count",
    "DG.PlotModel.hideCount": "Hide Count",

    // DG.ScatterPlotModel
    "DG.ScatterPlotModel.sumSquares": ",\nSum of squares = %@", // sumOfResidualsSquared
    "DG.ScatterPlotModel.rSquared": ",\nr^2 = %@", // r-squared
    "DG.ScatterPlotModel.slopeIntercept": "%@ = %@ %@ %@ %@", // y,slope,x,signInt,Int
    "DG.ScatterPlotModel.infiniteSlope": "%@ = %@ %@", // x,constant,unit
    "DG.ScatterPlotModel.slopeOnly": "slope = %@ %@", // numeric slope
    "DG.ScatterPlotModel.yearsLabel": "per year", // used in equation for line when x is a datetime axis
    "DG.ScatterPlotModel.daysLabel": "per day", // used in equation for line when x is a datetime axis
    "DG.ScatterPlotModel.hoursLabel": "per hour", // used in equation for line when x is a datetime axis
    "DG.ScatterPlotModel.minutesLabel": "per minute", // used in equation for line when x is a datetime axis
    "DG.ScatterPlotModel.secondsLabel": "per seconds", // used in equation for line when x is a datetime axis

    // DG.BarChartModel
    "DG.BarChartModel.cellTipPlural": "%@ of %@ %@ (%@%) are %@",  // "<n> of <m> <X>s (<p>%) are <Y>"
    "DG.BarChartModel.cellTipSingular": "%@ of %@ %@ (%@%) is %@",
    "DG.BarChartModel.cellTipNoLegendSingular": "%@ of %@ (%@%) is %@", // "<n=1> of <total> (<p>%) is <X>"
    "DG.BarChartModel.cellTipNoLegendPlural": "%@ of %@ (%@%) are %@", // "<n> of <total> (<p>%) are <X>"

    // DG.BinnedPlotModel
    "DG.BinnedPlotModel.dragBinTip": "Drag to change bin width",  // "Drag to change bin width"
    "DG.BinnedPlotModel.binLabelTip": "Values in this bin are ≥ %@ and < %@",  // "Values in this bin are ≥ <lower> and < <upper>"

    // DG.HistogramView
    "DG.HistogramView.barTipPlural": "%@ of %@ %@ (%@%) are ≥ %@ and < %@",  // "<n> of <m> <X>s (<p>%) are ≥ L and < U"
    "DG.HistogramView.barTipSingular": "%@ of %@ %@ (%@%) is ≥ %@ and < %@",
    "DG.HistogramView.barTipNoLegendSingular": "%@ of %@ (%@%) is ≥ %@ and < %@", // "<n=1> of <total> (<p>%) is ≥ L and < U"
    "DG.HistogramView.barTipNoLegendPlural": "%@ of %@ (%@%) are ≥ %@ and < %@", // "<n> of <total> (<p>%) are ≥ L and < U"

    // DG.LegendView
    "DG.LegendView.attributeTooltip": "Click to change legend attribute",

    // DG.NumberToggleView
    "DG.NumberToggleView.showAll": "Show All –", // \u2013
    "DG.NumberToggleView.hideAll": "Hide All –", // \u2013
    "DG.NumberToggleView.lastDash": "–", // \u2013
    "DG.NumberToggleView.lastUnchecked": "☐",
    "DG.NumberToggleView.lastChecked": "☒",
    "DG.NumberToggleView.lastLabel": "Last",
    "DG.NumberToggleView.showAllTooltip": "Click to show all cases\nClick parent case labels to toggle visibility",
    "DG.NumberToggleView.hideAllTooltip": "Click to hide all cases\nClick parent case labels to toggle visibility",
    "DG.NumberToggleView.enableLastModeTooltip": "Click to show last parent case only",
    "DG.NumberToggleView.disableLastModeTooltip": "Click to exit last parent case mode",
    "DG.NumberToggleView.indexTooltip": "Click to toggle visibility",

    // DG.PlottedAverageAdornment
    "DG.PlottedAverageAdornment.meanValueTitle": "mean=%@", // "mean=123.456"
    "DG.PlottedAverageAdornment.medianValueTitle": "median=%@", // "median=123.456"
    "DG.PlottedAverageAdornment.stDevValueTitle": "±1 SD, %@", // "±1 SD, 123.456"
    "DG.PlottedAverageAdornment.madValueTitle": "±1 MAD, %@", // "±1 MAD, 123.456"
    "DG.PlottedAverageAdornment.iqrValueTitle": "IQR=%@", // "iqr=123.456"
    "DG.PlottedAverageAdornment.boxPlotTitle": "lower=%@\nQ1=%@\nmedian=%@\nQ3=%@\nupper=%@\nIQR=%@", // "lower=%@\nQ1=%@\nmedian=%@\nQ3=\nIQ=%@\nupper=%@"
    "DG.PlottedCountAdornment.title": "%@ %@, %@%", // "12 cases, 50%"
    "DG.PlottedCount.withoutSelection": "%@", // "<nn>"
    "DG.PlottedCount.withSelection": "%@ selected", // "<nn> selected"
    "DG.PlottedPercent.withoutSelection": "%@%", // "<nn>%"
    "DG.PlottedPercent.withSelection": "%@% selected", // "<nn>% selected"
    "DG.PlottedCountPercent.withoutSelection": "%@ (%@%)", // "<nn> (<pp>%)"
    "DG.PlottedCountPercent.withSelection": "%@ of %@ (%@%) selected", // ""<nn> of <count> (<pp>%) selected"

    // DG.GraphModel
    "DG.DataDisplayMenu.attribute_x": "X: %@", // %@ = attribute name
    "DG.DataDisplayMenu.attribute_y": "Y: %@", // %@ = attribute name
    "DG.DataDisplayMenu.attribute_y2": "Y: %@", // %@ = attribute name
    "DG.DataDisplayMenu.attribute_legend": "Legend: %@", // %@ = attribute name
    "DG.DataDisplayMenu.remove": "Remove Attribute",
    "DG.DataDisplayMenu.removeAttribute_x": "Remove X: %@", // %@ = attribute name
    "DG.DataDisplayMenu.removeAttribute_y": "Remove Y: %@", // %@ = attribute name
    "DG.DataDisplayMenu.removeAttribute_y2": "Remove Y: %@", // %@ = attribute name
    "DG.DataDisplayMenu.removeAttribute_legend": "Remove Legend: %@", // %@ = attribute name
    "DG.DataDisplayMenu.removeAttribute_top": "Remove Side-by-side Layout by %@", // %@ = attribute name
    "DG.DataDisplayMenu.removeAttribute_right": "Remove Vertical Layout by %@", // %@ = attribute name
    "DG.DataDisplayMenu.treatAsCategorical": "Treat as Categorical",
    "DG.DataDisplayMenu.treatAsNumeric": "Treat as Numeric",
    "DG.DataDisplayMenu.hide": "Hide and Show",
    "DG.DataDisplayMenu.hideSelectedPlural": "Hide Selected Cases",
    "DG.DataDisplayMenu.hideUnselectedPlural": "Hide Unselected Cases",
    "DG.DataDisplayMenu.hideSelectedSing": "Hide Selected Case",
    "DG.DataDisplayMenu.hideUnselectedSing": "Hide Unselected Case",
    "DG.DataDisplayMenu.enableNumberToggle": "Show Parent Visibility Toggles",
    "DG.DataDisplayMenu.disableNumberToggle": "Hide Parent Visibility Toggles",
    "DG.DataDisplayMenu.enableMeasuresForSelection": "Show Measures for Selection",
    "DG.DataDisplayMenu.disableMeasuresForSelection": "Hide Measures for Selection",
    "DG.DataDisplayMenu.showAll": "Show All Cases",
    "DG.DataDisplayMenu.snapshot": "Make Snapshot",
    "DG.DataDisplayMenu.copyAsImage": "Open in Draw Tool",
    "DG.DataDisplayMenu.exportImage": "Export Image...",
    "DG.DataDisplayMenu.imageOfTitle": "Image of %@",
    "DG.DataDisplayMenu.addBackgroundImage": "Add Background Image",
    "DG.DataDisplayMenu.lockImageToAxes": "Lock Background Image to Axes",
    "DG.DataDisplayMenu.unlockImageFromAxes": "Unlock Background Image from Axes",
    "DG.DataDisplayMenu.removeBackgroundImage": "Remove Background Image",

    // DG.GraphView
    "DG.GraphView.replaceAttribute": "Replace %@ with %@",
    "DG.GraphView.addAttribute": "Add attribute %@",
    "DG.GraphView.layoutPlotsSideBySide": "Layout side-by-side by %@",
    "DG.GraphView.layoutPlotsVertically": "Layout vertically by %@",
    "DG.GraphView.addToEmptyPlace": "Create axis with %@",
    "DG.GraphView.addToEmptyX": "Create x-axis with %@",
    "DG.GraphView.dropInPlot": "Color points by values of %@",
    "DG.GraphView.zoomTip": "Double-click to zoom in.\nShift-double-click to zoom out",
    "DG.GraphView.rescale": "Rescale to data",

    // DG.SelectedInfoView
    "DG.SelectedInfoView.infoPlural": "Showing measures for %@ selected cases", // %@ = number selected
    "DG.SelectedInfoView.infoSing": "Showing measures for %@ selected case", // %@ = number selected

    // DG.AxisView
    "DG.AxisView.labelTooltip": "—Click to change %@ axis attribute",  // %@ is either horizontal or vertical
    "DG.AxisView.vertical": "vertical",
    "DG.AxisView.horizontal": "horizontal",

    // DG.DataTip
    "DG.DataTip.connectingLine": "%@: %@\nwith %@ points (%@) on this line", // <category attribute name> <category> <number of points> <collection name>

    // DG.MovableValueAdornment
    "DG.MovableMonthYear": "%@, %@", // <monthname>, <year>
    "DG.MovableMonthDayHour": "%@ %@ %@:00", // <monthname> <day> <hour>:00

    // DG.PlottedValueAdornment/DG.PlottedFunctionAdornment
    "DG.PlottedFormula.defaultNamePrompt": "Formula",
    "DG.PlottedValue.namePrompt": "Plotted Value",
    "DG.PlottedValue.formulaPrompt": "value =",
    "DG.PlottedValue.formulaHint": "",
    "DG.PlottedFunction.namePrompt": "Plotted Function",
    "DG.PlottedFunction.formulaPrompt": "f() =",
    "DG.PlottedFunction.formulaHint": "Type an expression e.g. x*x/30 - 50",

    // DG.MapView
    "DG.MapView.showGrid": "Show Grid",
    "DG.MapView.hideGrid": "Hide Grid",
    "DG.MapView.showPoints": "Show Points",
    "DG.MapView.hidePoints": "Hide Points",
    "DG.MapView.marqueeHint": "Marquee tool—drag select points in map",
    "DG.MapView.gridControlHint": "Change size of grid rectangles",

    // Inspector
    "DG.Inspector.values": "Measure",
    "DG.Inspector.configuration": "Configuration",
    "DG.Inspector.styles": "Format",
    "DG.Inspector.pointSize": "Point size:",
    "DG.Inspector.transparency": "Transparency:",
    "DG.Inspector.color": "Color:",
    "DG.Inspector.legendColor": "Legend color:",
    "DG.Inspector.backgroundColor": "Background\ncolor:",
    "DG.Inspector.stroke": "Stroke:",
    "DG.Inspector.rescale.toolTip": "Rescale display to show all the data",
    "DG.Inspector.mixUp.toolTip": "Mixup all the points",
    "DG.Inspector.hideShow.toolTip": "Show all cases or hide selected/unselected cases",
    "DG.Inspector.delete.toolTip": "Delete selected or unselected cases",
    "DG.Inspector.sliderValues.toolTip": "Set slider animation direction, speed, …",
    "DG.Inspector.webViewEditURL.toolTip": "Edit the URL of the displayed web page",

    "DG.Inspector.selection.selectAll": "Select All Cases",
    "DG.Inspector.selection.deleteSelectedCases": "Delete Selected Cases",
    "DG.Inspector.selection.deleteUnselectedCases": "Delete Unselected Cases",
    "DG.Inspector.deleteAll": "Delete All Cases",
    "DG.Inspector.deleteDataSet": "Delete and Destroy Data Set",

    "DG.Inspector.setaside.setAsideSelectedCases": "Set Aside Selected Cases",
    "DG.Inspector.setaside.setAsideUnselectedCases": "Set Aside Unselected Cases",
    "DG.Inspector.setaside.restoreSetAsideCases": "Restore %@ Set Aside Cases",
    "DG.Inspector.attributes.showAllHiddenAttributesSing": "Show %@ Hidden Attribute",
    "DG.Inspector.attributes.showAllHiddenAttributesPlural": "Show %@ Hidden Attributes",
    "DG.Inspector.attributes.showAllHiddenAttributesDisabled": "Show Hidden Attributes",

    // Display Inspector
    "DG.Inspector.displayValues.toolTip": "Change what is shown along with the points",
    "DG.Inspector.displayStyles.toolTip": "Change the appearance of the display",
    "DG.Inspector.displayLayers.toolTip": "Change the appearance of the map layers",
    "DG.Inspector.displayConfiguration.toolTip": "Configure the display differently",
    "DG.Inspector.makeImage.toolTip": "Save the image as a PNG file",
    "DG.Inspector.displayShow": "Show …",
    "DG.Inspector.displayScale": "Scale …",

    // Color Picker
    "DG.Inspector.colorPicker.more": "more",
    "DG.Inspector.colorPicker.less": "less",

    // Graph Inspector
    "DG.Inspector.strokeSameAsFill": "Stroke same color as fill",
    "DG.Inspector.graphTransparency": "Transparent",
    "DG.Inspector.graphCount": "Count",
    "DG.Inspector.graphPercent": "Percent",
    "DG.Inspector.graphFormula": "Formula",
    "DG.Inspector.graphRow": "Row",
    "DG.Inspector.graphColumn": "Column",
    "DG.Inspector.graphCell": "Cell",
    "DG.Inspector.graphConnectingLine": "Connecting Lines",
    "DG.Inspector.graphMovablePoint": "Movable Point",
    "DG.Inspector.graphMovableLine": "Movable Line",
    "DG.Inspector.graphInterceptLocked": "Intercept Locked",
    "DG.Inspector.graphPlottedFunction": "Plotted Function",
    "DG.Inspector.graphSquares": "Squares of Residuals",
    "DG.Inspector.graphLSRL": "Least Squares Line",
    "DG.Inspector.graphMovableValue": "Movable Value",
    "DG.Inspector.graphAdd": "Add",
    "DG.Inspector.graphRemove": "Remove",
    "DG.Inspector.graphPlottedMean": "Mean",
    "DG.Inspector.graphPlottedMedian": "Median",
    "DG.Inspector.graphPlottedStDev": "Standard Deviation",
    "DG.Inspector.graphPlottedMeanAbsDev": "Mean Absolute Deviation",
    "DG.Inspector.graphPlottedIQR": "Interquartile Range",
    "DG.Inspector.graphPlottedBoxPlot": "Box Plot",
    "DG.Inspector.graphBoxPlotShowOutliers": "Show Outliers",
    "DG.Inspector.graphPlottedValue": "Plotted Value",
    "DG.Inspector.graphBarChart": "Fuse Dots into Bars",
    "DG.Inspector.graphPlotPoints": "Points",
    "DG.Inspector.graphGroupIntoBins": "Group into Bins",
    "DG.Inspector.graphBarForEachPoint": "Bar for Each Point",
    "DG.Inspector.graphBinWidth": "Bin width",
    "DG.Inspector.graphAlignment": "Alignment",

    // Table Inspector
    "DG.Inspector.attributes.toolTip": "Make new attributes. Export case data.",
    "DG.Inspector.resize.toolTip": "Resize all columns to fit data",
    "DG.Inspector.newAttribute": "New Attribute in %@...",
    "DG.Inspector.randomizeAllAttributes": "Rerandomize All",
    "DG.Inspector.exportCaseData": "Export Case Data...",
    "DG.Inspector.copyCaseDataToClipboard": "Copy to Clipboard...",
    "DG.Inspector.getCaseDataFromClipboard": "Import Case Data from Clipboard...",
    "DG.Inspector.caseTable.exportCaseDialog.copyFrom": "Copy case data from:",
    "DG.Inspector.caseTable.exportCaseDialog.copy": "Copy",
    "DG.Inspector.caseTable.exportCaseDialog.copyTooltip": "Copy data to clipboard",
    "DG.Inspector.caseTable.exportCaseDialog.copiedData": "Copied %@ to the clipboard",

    // Map Inspector
    "DG.Inspector.mapGrid": "Grid",
    "DG.Inspector.mapPoints": "Points",
    "DG.Inspector.mapLines": "Connecting Lines",

    // Map-layer Inspector
    "DG.Inspector.layers": "Layers",

    // Game Controller
    "DG.GameController.continuityError": "Sorry, after columns in the case table have been reordered, new data cannot be accepted.",

    // Game View
    "DG.GameView.loading": "Loading",
    "DG.GameView.loadError": "If you can see this text, loading the above URL may have failed. You can check the link in another browser tab or report the error to http://codap.concord.org/help.",

    // Controllers
    "DG.Component.closeComponent.confirmCloseMessage": "Are you sure?",
    "DG.Component.closeComponent.confirmCloseDescription": "",
    "DG.Component.closeComponent.okButtonTitle": "Yes, close it",
    "DG.Component.closeComponent.cancelButtonTitle": "Cancel",
    "DG.Component.closeComponent.toolTip": "Close this Component",
    "DG.Component.minimizeComponent.toolTip": "Minimize or expand this Component",
    "DG.GameController.confirmCloseDescription": "If you close this, you may not be able to add more data.",

    // Web View
    "DG.WebView.defaultTitle": "Web Page",

    "DG.Locale.name.de": "German",
    "DG.Locale.name.el": "Greek",
    "DG.Locale.name.en": "English",
    "DG.Locale.name.es": "Spanish",
    "DG.Locale.name.he": "Hebrew",
    "DG.Locale.name.ja": "Japanese",
    "DG.Locale.name.nb": "Bokmål",
    "DG.Locale.name.nn": "Nynorsk",
    "DG.Locale.name.tr": "Turkish",
    "DG.Locale.name.zh": "Traditional Chinese",
    "DG.Locale.name.zh-Hans": "Simplified Chinese"
});
