// ==========================================================================
//                              DG Strings
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

// Place strings you want to localize here.  In your app, use the key and
// localize it using "key string".loc().  HINT: For your key names, use the
// english string with an underscore in front.  This way you can still see
// how your UI will look and you'll notice right away when something needs a
// localized string added to this file!
//
SC.stringsFor('English', {

  // CFM/File menu
  'DG.fileMenu.menuItem.newDocument': "New",
  'DG.fileMenu.menuItem.openDocument': "Open...",
  'DG.fileMenu.menuItem.closeDocument': "Close",
  'DG.fileMenu.menuItem.importFile': "Import...",
  'DG.fileMenu.menuItem.revertTo': "Revert...",
    'DG.fileMenu.menuItem.revertToOpened': "Recently opened state",
    'DG.fileMenu.menuItem.revertToShared': "Shared view",
  'DG.fileMenu.menuItem.saveDocument': "Save...",
  'DG.fileMenu.menuItem.copyDocument': "Create a copy",
  'DG.fileMenu.menuItem.share': "Share...",
    'DG.fileMenu.menuItem.shareGetLink': "Get link to shared view",
    'DG.fileMenu.menuItem.shareUpdate': "Update shared view",
  'DG.fileMenu.menuItem.renameDocument': "Rename",

  // main.js
  'DG.main.userEntryView.title': "What would you like to do?",
  'DG.main.userEntryView.openDocument': "Open Document or Browse Examples",
  'DG.main.userEntryView.newDocument': "Create New Document",

  // mainPage.js
  'DG.mainPage.mainPane.undoButton.title': "Undo",
  'DG.mainPage.mainPane.undoButton.toolTip': "Undo the last action",
  'DG.mainPage.mainPane.redoButton.title': "Redo",
  'DG.mainPage.mainPane.redoButton.toolTip': "Redo the last undone action",
  'DG.mainPage.mainPane.versionString': "Version %@ (%@)", // DG.VERSION, DG.BUILD_NUM
  'DG.mainPage.mainPane.messageView.value': "Unfortunately, DG is not currently supported on your browser. " +
  "DG is supported on Internet Explorer 9+, Firefox 3.6+, Chrome 10+, and Safari 4+. " +
  "DG is not actively supported on other browsers at this time.",
  'DG.mainPage.titleBar.saved': 'Document Saved!',

  // IS_BUILD variants of strings for InquirySpace
  'DG.mainPage.mainPane.versionString.IS_BUILD': "Version %@ (%@ IS)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.

  // DG.IS_SRRI_BUILD variants of strings for SRRI build
  'DG.mainPage.mainPane.versionString.SRRI_BUILD': "Version %@ (%@.srri10)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.

  // DG.AppController
  'DG.AppController.resetData.title' : "Clear Data...",
  'DG.AppController.resetData.toolTip' : "Delete all data from current document",
  'DG.AppController.resetData.warnMessage' : "Do you really want to delete all the data in this document?",
  'DG.AppController.resetData.warnDescription' : "This action is not undoable.",
  'DG.AppController.resetData.okButtonTitle' : "Yes, delete the data",
  'DG.AppController.resetData.cancelButtonTitle' : "No, keep the data",
  'DG.AppController.closeDocument.warnMessage' : "Close the current document without saving?",
  'DG.AppController.closeDocument.warnDescription' : "This action is not undoable.",
  'DG.AppController.closeDocument.okButtonTitle' : "Close",
  'DG.AppController.closeDocument.cancelButtonTitle' : "Cancel",
  'DG.AppController.beforeUnload.confirmationMessage' : "The document contains unsaved changes.",
  'DG.AppController.optionMenuItems.reportProblem' : "Send Feedback...",
  'DG.AppController.optionMenuItems.viewWebPage' : "Display Web Page...",
  'DG.AppController.optionMenuItems.configureGuide' : "Configure Guide...",
  'DG.AppController.optionMenuItems.about' : "About CODAP...",
  'DG.AppController.optionMenuItems.releaseNotes' : "What's New?",
  'DG.AppController.optionMenuItems.help' : "Help...",
  'DG.AppController.optionMenuItems.toWebSite' : "CODAP website",
  'DG.AppController.exportDocument.prompt' : "Filename:",
  'DG.AppController.exportCaseData.prompt' : "Export the case data, from:",
  'DG.AppController.exportDocument.exportTitle' : "Export",
  'DG.AppController.exportDocument.exportTooltip' : "Export data to a file",
  'DG.AppController.exportDocument.cancelTitle' : "Cancel",
  'DG.AppController.exportDocument.cancelTooltip' : "Cancel the export",
  'DG.AppController.feedbackDialog.dialogTitle' : "Provide Feedback",
  'DG.AppController.feedbackDialog.subHeaderText' : "Your feedback is important to us!",
  'DG.AppController.feedbackDialog.messageText' : "Please help us continue to improve our product. Questions, bug reports and feature requests are all welcome. Thank you!",
  'DG.AppController.feedbackDialog.subjectHint' : "What is your feedback about",
  'DG.AppController.feedbackDialog.feedbackHint' : "Details",
  'DG.AppController.feedbackDialog.submitFeedbackButton' : "Submit",
  'DG.AppController.feedbackDialog.cancelFeedbackButton' : "Cancel",
  'DG.AppController.showWebSiteTitle' : 'About CODAP',
  'DG.AppController.showHelpTitle' : 'Help with CODAP',
  'DG.AppController.showAboutTitle' : 'About CODAP',
  'DG.AppController.showReleaseNotesTitle' : 'CODAP Release Notes',
  'DG.AppController.dropFile.error' : 'Error: %@1',  // Error: <error text>
  'DG.AppController.dropFile.unknownFileType' : 'You cannot import the type of file dropped',
  'DG.AppController.validateDocument.missingRequiredProperty' : 'Required property not found: %@1',
  'DG.AppController.validateDocument.unexpectedProperty' : 'Unexpected top-level property: %@1',
  'DG.AppController.validateDocument.unresolvedID' : 'Unresolved id: %@1',
  'DG.AppController.validateDocument.parseError' : 'Parse error in document: %@1',
  'DG.AppController.validateDocument.invalidDocument' : 'Invalid JSON Document: %@1',
  'DG.AppController.openDocument.error.general': 'Unable to open document',
  'DG.AppController.openDocument.error.invalid_format': 'CODAP can not read this type of document',
  'DG.AppController.createDataSet.initialAttribute': 'new', /* new */
  'DG.AppController.createDataSet.name': 'new_dataset', /* new_dataset */

  'DG.SingleTextDialog.okButton.title': "OK",
  'DG.SingleTextDialog.cancelButton.title': "Cancel",
  'DG.SingleTextDialog.cancelButton.toolTip': "Dismiss the dialog without making any changes",

  // DG.DocumentController
  'DG.DocumentController.calculatorTitle': "Calculator",
  'DG.DocumentController.caseTableTitle': "Case Table",
  'DG.DocumentController.graphTitle': "Graph",
  'DG.DocumentController.sliderTitle': "Slider",
  'DG.DocumentController.textTitle': "Text",
  'DG.DocumentController.mapTitle': "Map",
  'DG.DocumentController.enterURLPrompt': "Enter the URL of a web page to display",
  'DG.DocumentController.enterViewWebPageOKTip': "Displays the web page given by the URL",

  // DG.Document
  'DG.Document.defaultDocumentName': "Untitled Document",
  'DG.Document.documentName.toolTip': "Click to edit document name",   // "Click to edit document name"

  // DG.SliderView
  'DG.SliderView.thumbView.toolTip': "Drag to change the slider's value",
  'DG.SliderView.startButton.toolTip': "Start/stop animation",

  // DG.ToolButtonData
  'DG.ToolButtonData.tableButton.title': "Tables",
  'DG.ToolButtonData.tableButton.toolTip': "Open a case table for each data set(ctrl-alt-t)",
  'DG.ToolButtonData.graphButton.title': "Graph",
  'DG.ToolButtonData.graphButton.toolTip': "Make a graph (ctrl-alt-g)",
  'DG.ToolButtonData.sliderButton.title': "Slider",
  'DG.ToolButtonData.sliderButton.toolTip': "Make a slider (ctrl-alt-s)",
  'DG.ToolButtonData.calcButton.title': "Calc",
  'DG.ToolButtonData.calcButton.toolTip': "Open/close the calculator (ctrl-alt-c)",
  'DG.ToolButtonData.textButton.title': "Text",
  'DG.ToolButtonData.textButton.toolTip': "Make a text object (ctrl-alt-shift-t)",
  'DG.ToolButtonData.mapButton.title': "Map",
  'DG.ToolButtonData.mapButton.toolTip': "Make a map",
  'DG.ToolButtonData.optionMenu.title': "Options",
  'DG.ToolButtonData.optionMenu.toolTip': "Display a website, configure guide...",
  'DG.ToolButtonData.tileListMenu.title': "Tiles",
  'DG.ToolButtonData.tileListMenu.toolTip': "Show the list of tiles in the document",
  'DG.ToolButtonData.guideMenu.title': "Guide",
  'DG.ToolButtonData.guideMenu.toolTip': "Show the guide for this activity and navigate within it",
  'DG.ToolButtonData.guideMenu.showGuide': "Show Guide",
  'DG.ToolButtonData.help.title': "Help",
  'DG.ToolButtonData.help.toolTip': "Help for CODAP, learn about CODAP project",

  'DG.Slider.direction': "Animation Direction:",  // Direction
  'DG.Slider.backAndForth': "Back and Forth",   // Back and Forth
  'DG.Slider.lowToHigh': "Low to High",   // Low to High
  'DG.Slider.highToLow': "High to Low",   // High to Low
  'DG.Slider.mode': "Animation Repetition:",   // Animation Repetition:
  'DG.Slider.nonStop': "Non-Stop",   // Non-Stop
  'DG.Slider.onceOnly': "Once Only",   // Once Only

  // Undo / Redo
  'DG.Undo.exceptionOccurred': "An error occurred while trying to undo.",
  'DG.Redo.exceptionOccurred': "An error occurred while trying to redo.",
  'DG.Undo.componentMove': "Undo moving the component",
  'DG.Redo.componentMove': "Redo moving the component",
  'DG.Undo.componentResize': "Undo resizing the component",
  'DG.Redo.componentResize': "Redo resizing the component",
  'DG.Undo.axisDilate': "Undo rescaling the axis",
  'DG.Redo.axisDilate': "Redo rescaling the axis",
  'DG.Undo.axisRescaleFromData': "Undo rescaling the axis",
  'DG.Redo.axisRescaleFromData': "Redo rescaling the axis",
  'DG.Undo.axisDrag': "Undo dragging the axis",
  'DG.Redo.axisDrag': "Redo dragging the axis",
  'DG.Undo.axisAttributeChange': "Undo changing the axis attribute",
  'DG.Redo.axisAttributeChange': "Redo changing the axis attribute",
  'DG.Undo.axisAttributeAdded': "Undo adding an axis attribute",
  'DG.Redo.axisAttributeAdded': "Redo adding an axis attribute",
  'DG.Undo.toggleComponent.add.calcView': "Undo showing the calculator",
  'DG.Redo.toggleComponent.add.calcView': "Redo showing the calculator",
  'DG.Undo.toggleComponent.delete.calcView': "Undo hiding the calculator",
  'DG.Redo.toggleComponent.delete.calcView': "Redo hiding the calculator",
  'DG.Undo.caseTable.open': "Undo showing case tables",
  'DG.Redo.caseTable.open': "Redo showing case tables",
  'DG.Undo.caseTable.editAttribute': "Undo editing case table attribute",
  'DG.Redo.caseTable.editAttribute': "Redo editing case table attribute",
  'DG.Undo.caseTable.createAttribute': "Undo creating case table attribute",
  'DG.Redo.caseTable.createAttribute': "Redo creating case table attribute",
  'DG.Undo.caseTable.editAttributeFormula': "Undo editing case table attribute formula",
  'DG.Redo.caseTable.editAttributeFormula': "Redo editing case table attribute formula",
  'DG.Undo.caseTable.deleteAttribute': "Undo deleting case table attribute",
  'DG.Redo.caseTable.deleteAttribute': "Redo deleting case table attribute",
  'DG.Undo.caseTable.createCollection': "Undo create new collection",
  'DG.Redo.caseTable.createCollection': "Redo create new collection",
  'DG.Undo.caseTable.collectionNameChange': 'Undo rename collection',
  'DG.Redo.caseTable.collectionNameChange': 'Redo rename collection',
  'DG.Undo.caseTable.groupToggleExpandCollapseAll': 'Undo toggle expand/collapse all',
  'DG.Redo.caseTable.groupToggleExpandCollapseAll': 'Redo toggle expand/collapse all',
  'DG.Undo.caseTable.expandCollapseOneCase': 'Undo expand or collapse of a group',
  'DG.Redo.caseTable.expandCollapseOneCase': 'Redo expand or collapse of a group',
  'DG.Undo.document.share': "Undo sharing the document",
  'DG.Redo.document.share': "Redo sharing the document",
  'DG.Undo.document.unshare': "Undo stop sharing the document",
  'DG.Redo.document.unshare': "Redo stop sharing the document",
  'DG.Undo.game.add': "Undo adding a game to the document",
  'DG.Redo.game.add': "Redo adding a game to the document",
  'DG.Undo.graph.showCount': "Undo showing count",
  'DG.Redo.graph.showCount': "Redo showing count",
  'DG.Undo.graph.hideCount': "Undo hiding count",
  'DG.Redo.graph.hideCount': "Redo hiding count",
  'DG.Undo.graph.showPercent': "Undo showing percent",
  'DG.Redo.graph.showPercent': "Redo showing percent",
  'DG.Undo.graph.hidePercent': "Undo hiding percent",
  'DG.Redo.graph.hidePercent': "Redo hiding percent",
  'DG.Undo.graph.showMovableLine': "Undo showing movable line",
  'DG.Redo.graph.showMovableLine': "Redo showing movable line",
  'DG.Undo.graph.hideMovableLine': "Undo hiding movable line",
  'DG.Redo.graph.hideMovableLine': "Redo hiding movable line",
  'DG.Undo.graph.lockIntercept': "Undo locking line intercept",
  'DG.Redo.graph.lockIntercept': "Redo locking line intercept",
  'DG.Undo.graph.unlockIntercept': "Undo unlocking line intercept",
  'DG.Redo.graph.unlockIntercept': "Redo unlocking line intercept",
  'DG.Undo.graph.showPlotFunction': "Undo showing plotted function",
  'DG.Redo.graph.showPlotFunction': "Redo showing plotted function",
  'DG.Undo.graph.hidePlotFunction': "Undo hiding plotted function",
  'DG.Redo.graph.hidePlotFunction': "Redo hiding plotted function",
  'DG.Undo.graph.showPlotValue': "Undo showing plotted value",
  'DG.Redo.graph.showPlotValue': "Redo showing plotted value",
  'DG.Undo.graph.hidePlotValue': "Undo hiding plotted value",
  'DG.Redo.graph.hidePlotValue': "Redo hiding plotted value",
  'DG.Undo.graph.showConnectingLine': "Undo showing connecting line",
  'DG.Redo.graph.showConnectingLine': "Redo showing connecting line",
  'DG.Undo.graph.hideConnectingLine': "Undo hiding connecting line",
  'DG.Redo.graph.hideConnectingLine': "Redo hiding connecting line",
  'DG.Undo.graph.showLSRL': "Undo showing least squares line",
  'DG.Redo.graph.showLSRL': "Redo showing least squares line",
  'DG.Undo.graph.hideLSRL': "Undo hiding least squares line",
  'DG.Redo.graph.hideLSRL': "Redo hiding least squares line",
  'DG.Undo.graph.showSquares': "Undo showing squares",
  'DG.Redo.graph.showSquares': "Redo showing squares",
  'DG.Undo.graph.hideSquares': "Undo hiding squares",
  'DG.Redo.graph.hideSquares': "Redo hiding squares",
  'DG.Undo.graph.showPlottedMean': "Undo showing mean",
  'DG.Redo.graph.showPlottedMean': "Redo showing mean",
  'DG.Undo.graph.hidePlottedMean': "Undo hiding mean",
  'DG.Redo.graph.hidePlottedMean': "Redo hiding mean",
  'DG.Undo.graph.showPlottedMedian': "Undo showing median",
  'DG.Redo.graph.showPlottedMedian': "Redo showing median",
  'DG.Undo.graph.hidePlottedMedian': "Undo hiding median",
  'DG.Redo.graph.hidePlottedMedian': "Redo hiding median",
  'DG.Undo.graph.showPlottedStDev': "Undo showing standard deviation",
  'DG.Redo.graph.showPlottedStDev': "Redo showing standard deviation",
  'DG.Undo.graph.hidePlottedStDev': "Undo hiding standard deviation",
  'DG.Redo.graph.hidePlottedStDev': "Redo hiding standard deviation",
  'DG.Undo.graph.showPlottedIQR': "Undo showing inter-quartile range",
  'DG.Redo.graph.hidePlottedIQR': "Redo hiding inter-quartile range",
  'DG.Undo.graph.hidePlottedIQR': "Undo hiding inter-quartile range",
  'DG.Redo.graph.showPlottedIQR': "Redo showing inter-quartile range",
  'DG.Undo.graph.addMovableValue': "Undo adding movable value",
  'DG.Redo.graph.addMovableValue': "Redo adding movable value",
  'DG.Undo.graph.removeMovableValue': "Undo removing movable value",
  'DG.Redo.graph.removeMovableValue': "Redo removing movable value",
  'DG.Undo.graph.moveMovableValue': "Undo moving movable value",
  'DG.Redo.graph.moveMovableValue': "Redo moving movable value",
  'DG.Undo.graph.changePointColor': "Undo changing data color",
  'DG.Redo.graph.changePointColor': "Redo changing data color",
  'DG.Undo.graph.changeStrokeColor': "Undo changing stroke color",
  'DG.Redo.graph.changeStrokeColor': "Redo changing stroke color",
  'DG.Undo.graph.changePointSize': "Undo changing point size",
  'DG.Redo.graph.changePointSize': "Redo changing point size",
  'DG.Undo.graph.changeAttributeColor': "Undo changing attribute color",
  'DG.Redo.graph.changeAttributeColor': "Redo changing attribute color",
  'DG.Undo.graph.changeBackgroundColor': "Undo changing graph background color",
  'DG.Redo.graph.changeBackgroundColor': "Redo changing graph background color",
  'DG.Undo.graph.toggleTransparent': "Undo toggling plot transparency",
  'DG.Redo.graph.toggleTransparent': "Redo toggling plot transparency",
  'DG.Undo.guide.show': "Undo showing the guide",
  'DG.Redo.guide.show': "Redo showing the guide",
  'DG.Undo.guide.navigate': "Undo changing the guide page",
  'DG.Redo.guide.navigate': "Redo changing the guide page",
  'DG.Undo.hideSelectedCases': "Undo hiding selected cases",
  'DG.Redo.hideSelectedCases': "Redo hiding selected cases",
  'DG.Undo.hideUnselectedCases': "Undo hiding unselected cases",
  'DG.Redo.hideUnselectedCases': "Redo hiding unselected cases",
  'DG.Undo.interactiveUndoableAction': "Undo an action in the interactive",
  'DG.Redo.interactiveUndoableAction': "Redo an action in the interactive",
  'DG.Undo.showAllCases': "Undo showing all cases",
  'DG.Redo.showAllCases': "Redo showing all cases",
  'DG.Undo.map.create': "Undo adding map",
  'DG.Redo.map.create': "Redo adding map",
  'DG.Undo.map.fitBounds': "Undo resizing map",
  'DG.Redo.map.fitBounds': "Redo resizing map",
  'DG.Undo.map.pan': "Undo panning map",
  'DG.Redo.map.pan': "Redo panning map",
  'DG.Undo.map.zoom': "Undo zooming map",
  'DG.Redo.map.zoom': "Redo zooming map",
  'DG.Undo.map.showGrid': "Undo showing grid on map",
  'DG.Redo.map.showGrid': "Redo showing grid on map",
  'DG.Undo.map.hideGrid': "Undo hiding grid on map",
  'DG.Redo.map.hideGrid': "Redo hiding grid on map",
  'DG.Undo.map.changeGridSize': "Undo changing map grid size",
  'DG.Redo.map.changeGridSize': "Redo changing map grid size",
  'DG.Undo.map.showPoints': "Undo showing points on map",
  'DG.Redo.map.showPoints': "Redo showing points on map",
  'DG.Undo.map.hidePoints': "Undo hiding points on map",
  'DG.Redo.map.hidePoints': "Redo hiding points on map",
  'DG.Undo.map.showLines': "Undo showing lines on map",
  'DG.Redo.map.showLines': "Redo showing lines on map",
  'DG.Undo.map.hideLines': "Undo hiding lines on map",
  'DG.Redo.map.hideLines': "Redo hiding lines on map",
  'DG.Undo.map.changeBaseMap': "Undo changing map background",
  'DG.Redo.map.changeBaseMap': "Redo changing map background",
  'DG.Undo.textComponent.create': "Undo adding text object",
  'DG.Redo.textComponent.create': "Redo adding text object",
  'DG.Undo.textComponent.edit': "Undo editing text",
  'DG.Redo.textComponent.edit': "Redo editing text",
  'DG.Undo.sliderComponent.create': "Undo adding a slider",
  'DG.Redo.sliderComponent.create': "Redo adding a slider",
  'DG.Undo.slider.change': "Undo slider value change",
  'DG.Redo.slider.change': "Redo slider value change",
  'DG.Undo.graphComponent.create': "Undo adding a graph",
  'DG.Redo.graphComponent.create': "Redo adding a graph",
  'DG.Undo.dataContext.create': 'Undo creating a data set',
  'DG.Redo.dataContext.create': 'Redo creating a data set',
  'DG.Undo.data.deleteCases': "Undo deleting cases",
  'DG.Redo.data.deleteCases': "Redo deleting cases",
  'DG.Undo.component.close': "Undo closing component",
  'DG.Redo.component.close': "Redo closing component",
  'DG.Undo.component.minimize': "Undo minimizing component",
  'DG.Redo.component.minimize': "Redo minimizing component",
  'DG.Undo.dataContext.moveAttribute': "Undo moving case table attribute",
  'DG.Redo.dataContext.moveAttribute': "Redo moving case table attribute",


  // DG.DataContext
  'DG.DataContext.singleCaseName': "case",
  'DG.DataContext.pluralCaseName': "cases",
  'DG.DataContext.caseCountString': "%@1 %@2",  // %@1: count, %@2: case name string
  'DG.DataContext.setOfCasesLabel': "a collection",
  'DG.DataContext.collapsedRowString': "%@1 of %@2",
  'DG.DataContext.noData': "No Data",   // "No Data"
  'DG.DataContext.baseName': 'Data_Set_%@1',

  // DG.CollectionClient
  'DG.CollectionClient.cantEditFormulaErrorMsg': "The formula for attribute \"%@\" is not editable.",
  'DG.CollectionClient.cantEditFormulaErrorDesc': "Create a new attribute to be able to specify a formula.",

  // DG.Formula
  'DG.Formula.FuncCategoryArithmetic': "Arithmetic Functions",
  'DG.Formula.FuncCategoryConversion': "Other Functions", // put into "Other" for now
  'DG.Formula.FuncCategoryDateTime': "Date/Time Functions",
  'DG.Formula.FuncCategoryLookup': "Lookup Functions",
  'DG.Formula.FuncCategoryOther': "Other Functions",
  'DG.Formula.FuncCategoryRandom': "Other Functions", // put into "Other" for now
  'DG.Formula.FuncCategoryStatistical': "Statistical Functions",
  'DG.Formula.FuncCategoryString': "String Functions",
  'DG.Formula.FuncCategoryTrigonometric': "Trigonometric Functions",

  'DG.Formula.DateLongMonthJanuary': "January",
  'DG.Formula.DateLongMonthFebruary': "February",
  'DG.Formula.DateLongMonthMarch': "March",
  'DG.Formula.DateLongMonthApril': "April",
  'DG.Formula.DateLongMonthMay': "May",
  'DG.Formula.DateLongMonthJune': "June",
  'DG.Formula.DateLongMonthJuly': "July",
  'DG.Formula.DateLongMonthAugust': "August",
  'DG.Formula.DateLongMonthSeptember': "September",
  'DG.Formula.DateLongMonthOctober': "October",
  'DG.Formula.DateLongMonthNovember': "November",
  'DG.Formula.DateLongMonthDecember': "December",

  'DG.Formula.DateShortMonthJanuary': "Jan",
  'DG.Formula.DateShortMonthFebruary': "Feb",
  'DG.Formula.DateShortMonthMarch': "Mar",
  'DG.Formula.DateShortMonthApril': "Apr",
  'DG.Formula.DateShortMonthMay': "May",
  'DG.Formula.DateShortMonthJune': "Jun",
  'DG.Formula.DateShortMonthJuly': "Jul",
  'DG.Formula.DateShortMonthAugust': "Aug",
  'DG.Formula.DateShortMonthSeptember': "Sep",
  'DG.Formula.DateShortMonthOctober': "Oct",
  'DG.Formula.DateShortMonthNovember': "Nov",
  'DG.Formula.DateShortMonthDecember': "Dec",

  'DG.Formula.DateLongDaySunday': "Sunday",
  'DG.Formula.DateLongDayMonday': "Monday",
  'DG.Formula.DateLongDayTuesday': "Tuesday",
  'DG.Formula.DateLongDayWednesday': "Wednesday",
  'DG.Formula.DateLongDayThursday': "Thursday",
  'DG.Formula.DateLongDayFriday': "Friday",
  'DG.Formula.DateLongDaySaturday': "Saturday",

                                        /* "dd-mmm-yyyy", "dd-mmm-yy", "mm/dd/yy", "mm/dd/yyyy" */
  'DG.Utilities.date.localDatePattern': '(?:(?:[0-3]?\\d\-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\-\\d{2}(?:\\d{2})?)|(?:[01]?\\d\/[0-3]?\\d\/\\d{2}(?:\\d{2})?))',
                                    /* "hh:mm", "hh:mm:ss", "hh:mm:ss.ddd" */
  'DG.Utilities.date.timePattern': '(?:[0-2]?\\d:[0-5]?\\d(?::[0-5]\\d(?:\\.\\d{3})?)? ?(?:[ap]m)?)',
                                    /* "yyyy-mm-dd", "yyyy-mm-ddThh:mm:ss", "yyyy-mm-ddThh:mm:ssZ" "yyyy-mm-ddThh:mm:ss+hh:mm"*/
  // We are assembling the full iso pattern piecemeal below, in hopes of making it
  // easier to read and understand...
  'DG.Utilities.date.iso8601Pattern': [
    '^', // beginning of string
    '\\d{4}-[01]\\d-[0-3]\\d', // iso date part yyyy-mm-dd
    '(?:', // optional clause BEGIN
      '[T ]', // date/time separator
      '(?:[0-2]\\d:[0-5]\\d:[0-5]\\d(?:\\.\\d{3,3})?)',  // iso time part hh:mm:ss or hh:mm:ss.ddd
      '(?:', // optional clause BEGIN
        'Z|(?:[-+]?[01]\\d:[0-5]\\d)|(?: ?[-+][0-2]\\d{3})', // iso timezone part 'Z', +hh:mm, -hh:mm, +hhmm, -hhmm
      ')?', // optional clause END
    ')?', // optional clause END
    '$'
  ].join(''),
                                  /* "rgb(nnn,nnn,nnn)" "rgba(nnn,nnn,nnn,0.n)" "#ffffff" */
  'DG.Utilities.colorPattern': '(?:rgb\\((?:\\d{1,3},){2}\\d{1,3}\\))|(?:rgba\\((?:\\d{1,3},){3}[\\d\\.]*\\))|(?:#[\\da-f]{6})',

  'DG.Formula.SyntaxErrorMiddle': "Syntax error: '%@'",
  'DG.Formula.SyntaxErrorEnd': "Incomplete expression",
  'DG.Formula.VarReferenceError.message': "'%@': unknown variable",
  'DG.Formula.VarReferenceError.description': "Variable '%@' is unrecognized",
  'DG.Formula.FuncReferenceError.message': "'%@': unknown function",
  'DG.Formula.FuncReferenceError.description': "Function '%@' is unrecognized",
  'DG.Formula.FuncArgsErrorSingle.message': "'%@' expects 1 argument",
  'DG.Formula.FuncArgsErrorSingle.description': "The '%@' function expects 1 argument",
  'DG.Formula.FuncArgsErrorPlural.message': "'%@' expects %@ arguments",
  'DG.Formula.FuncArgsErrorPlural.description': "The '%@' function expects %@ arguments",
  'DG.Formula.FuncArgsErrorRange.message': "'%@' expects %@-%@ arguments",
  'DG.Formula.FuncArgsErrorRange.description': "The '%@' function expects %@-%@ arguments",
  'DG.Formula.LookupDataSetError.message': "'%@': unrecognized data set",
  'DG.Formula.LookupDataSetError.description': "Data set '%@' is unrecognized",
  'DG.Formula.LookupAttrError.message': "'%@' not found in data set '%@'",
  'DG.Formula.LookupAttrError.description': "Attribute '%@' not found in data set '%@'",

  // DG.TableController
  'DG.TableController.headerMenuItems.editAttribute': "Edit Attribute Properties...",
  'DG.TableController.headerMenuItems.editFormula': "Edit Formula...",
  'DG.TableController.headerMenuItems.randomizeAttribute': "Rerandomize",
  'DG.TableController.headerMenuItems.deleteAttribute': "Delete Attribute",
  'DG.TableController.newAttrDlg.defaultAttrName': "new_attr",
  'DG.TableController.newAttrDlg.attrNameHint': "Enter a name for the new attribute",
  'DG.TableController.newAttrDlg.formulaHint': "If desired, type a formula for computing values of this attribute",
  'DG.TableController.newAttrDlg.applyTooltip': "Define the new attribute using the name and (optional) formula",
  'DG.TableController.newAttrDlg.mustEnterAttrNameMsg': "Please enter a name for the new attribute",
  'DG.TableController.newAttrDialog.AttributesCategory': "Attributes",
  'DG.TableController.newAttrDialog.SpecialCategory': "Special",
  'DG.TableController.newAttrDialog.GlobalsCategory': "Globals",
  'DG.TableController.newAttrDialog.ConstantsCategory': "Constants",  // Set to "Special" to combine with 'caseIndex'
  'DG.TableController.newAttrDialog.FunctionsCategory': "Functions",
  'DG.TableController.renameAttributeInvalidMsg': "Attribute names may not be empty",
  'DG.TableController.renameAttributeInvalidDesc': "Please enter a valid attribute name",
  'DG.TableController.renameAttributeDuplicateMsg': "An attribute with that name already exists",
  'DG.TableController.renameAttributeDuplicateDesc': "Please enter a unique attribute name",
  'DG.TableController.deleteAttribute.confirmMessage': "Delete the attribute '%@'?",
  'DG.TableController.deleteAttribute.confirmDescription': "This action cannot be undone.",
  'DG.TableController.deleteAttribute.okButtonTitle': "Delete Attribute",
  'DG.TableController.deleteAttribute.cancelButtonTitle': "Cancel",
  'DG.TableController.deleteDataSet.confirmMessage': "Delete this data set: '%@'?",
  'DG.TableController.deleteDataSet.confirmDescription': "This action cannot be undone.",
  'DG.TableController.deleteDataSet.okButtonTitle': "Delete Data Set",
  'DG.TableController.deleteDataSet.cancelButtonTitle': "Cancel",
  'DG.TableController.attrEditor.precisionHint': "Number of digits after decimal point",
  'DG.TableController.attrEditor.unitHint': "Unit of measure, if applicable",
  'DG.TableController.attrEditor.descriptionHint': "Describe the attribute",
  'DG.TableController.scoreAttrName': "score",
  'DG.TableController.setScoreDlg.applyTooltip': "Set the formula for the '%@' attribute",
  'DG.TableController.setScoreDlg.formulaHint': "Type a formula for computing values of this attribute",

  'DG.TableController.attributeEditor.title': 'Attribute Properties',
  // DG.CaseTableDropTarget
  'DG.CaseTableDropTarget.dropMessage': "drop attribute to create new collection",
  'DG.CaseTable.attribute.type.none': '',
  'DG.CaseTable.attribute.type.nominal': 'categorical',
  'DG.CaseTable.attribute.type.numeric': 'numeric',
  'DG.CaseTable.attribute.type.date': 'date',
  'DG.CaseTable.attribute.type.qualitative': 'qualitative',

  // DG.CaseTableController
  'DG.CaseTableController.allTables': 'All tables',

  // DG.AttributeFormulaView
  'DG.AttrFormView.attrNamePrompt': "Attribute Name:",
  'DG.AttrFormView.formulaPrompt': "Formula:",
  'DG.AttrFormView.operandMenuTitle': "--- Insert Value ---",
  'DG.AttrFormView.functionMenuTitle': "--- Insert Function ---",
  'DG.AttrFormView.applyBtnTitle': "Apply",
  'DG.AttrFormView.cancelBtnTitle': "Cancel",
  'DG.AttrFormView.cancelBtnTooltip': "Dismiss the dialog without making any changes",

  // DG.GuideConfigurationView
  'DG.GuideConfigView.titlePrompt': "Guide Title",
  'DG.GuideConfigView.titleHint': "Activity Name",
  'DG.GuideConfigView.itemTitleHint': "Section Name",
  'DG.GuideConfigView.itemURLHint': "URL of section",
  'DG.GuideConfigView.okBtnTitle': "OK",
  'DG.GuideConfigView.okBtnToolTip': "Accept the Guide menu items",
  'DG.GuideConfigView.cancelBtnTitle': "Cancel",
  'DG.GuideConfigView.cancelBtnTooltip': "Dismiss the dialog without making any changes",
  'DG.GuideConfigView.httpWarning': "The URL must start with either http:// or https://",

  'DG.DataDisplayModel.rescaleToData': "Rescale to Data",
  'DG.DataDisplayModel.ShowConnectingLine': "Show Connecting Lines",
  'DG.DataDisplayModel.HideConnectingLine': "Hide Connecting Lines",

  // DG.AxisView
  'DG.AxisView.emptyGraphCue': 'Click here, or drag an attribute here.',

  // DG.CellLinearAxisView
  'DG.CellLinearAxisView.midPanelTooltip': "Drag to translate axis scale",
  'DG.CellLinearAxisView.lowerPanelTooltip': "Drag to change axis lower bound",
  'DG.CellLinearAxisView.upperPanelTooltip': "Drag to change axis upper bound",

  // DG.PlotModel
  'DG.PlotModel.mixup': "Mix Up the Plot",  // "Mix Up the Plot"
  'DG.PlotModel.showCount': "Show Count",
  'DG.PlotModel.hideCount': "Hide Count",

  // DG.ScatterPlotModel
  'DG.ScatterPlotModel.sumSquares': ",\nSum of squares = %@", // sumOfResidualsSquared
  'DG.ScatterPlotModel.rSquared': ",\nr^2 = %@", // r-squared
  'DG.ScatterPlotModel.slopeIntercept': "%@ = %@ %@ %@ %@",// y,slope,x,signInt,Int
  'DG.ScatterPlotModel.infiniteSlope': "%@ = %@",// x,constant
  'DG.ScatterPlotModel.yearsLabel': "per year",// per year - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.daysLabel': "per day",// per day - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.hoursLabel': "per hour",// per hour - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.minutesLabel': "per minute",// per minute - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.secondsLabel': "per seconds",// per second - used in equation for line when x is a datetime axis

  // DG.LegendView
  'DG.LegendView.attributeTooltip': "Click to change legend attribute",  // "Click to change legend attribute"

  // DG.NumberToggleView
  'DG.NumberToggleView.showAll': "Show All -",  // "Show All"
  'DG.NumberToggleView.hideAll': "Hide All -",  // "Hide All"
  'DG.NumberToggleView.showAllTooltip': "Click numbers to toggle visibility. Click label to show all.",  // "Click numbers to toggle visibility. Click label to show all."
  'DG.NumberToggleView.hideAllTooltip': "Click numbers to toggle visibility. Click label to hide all.",  // "Click numbers to toggle visibility. Click label to hide all."
  'DG.NumberToggleView.indexTooltip': "Click to toggle visibility.",  // "Click to toggle visibility."

  // DG.PlottedAverageAdornment
  'DG.PlottedAverageAdornment.meanValueTitle': "mean=%@", // "mean=123.456"
  'DG.PlottedAverageAdornment.medianValueTitle': "median=%@", // "median=123.456"
  'DG.PlottedAverageAdornment.stDevValueTitle': "\xB11 SD, %@", // "st.dev=123.456"
  'DG.PlottedAverageAdornment.iqrValueTitle': "IQR=%@", // "iqr=123.456"
  'DG.PlottedAverageAdornment.boxPlotTitle': "lower=%@\nQ1=%@\nmedian=%@\nQ3=%@\nupper=%@\nIQR=%@", // "lower=%@\nQ1=%@\nmedian=%@\nQ3=\nIQ=%@\nupper=%@"
  'DG.PlottedCountAdornment.title': "%@ %@, %@%", // "12 cases, 50%"

  // DG.GraphModel
  'DG.DataDisplayMenu.attribute_x': "X: %@", // %@ = attribute name
  'DG.DataDisplayMenu.attribute_y': "Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.attribute_y2': "Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.attribute_legend': "Legend: %@", // %@ = attribute name
  'DG.DataDisplayMenu.remove': "Remove Attribute",
  'DG.DataDisplayMenu.removeAttribute_x': "Remove X: %@", // %@ = attribute name
  'DG.DataDisplayMenu.removeAttribute_y': "Remove Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.removeAttribute_y2': "Remove Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.removeAttribute_legend': "Remove Legend: %@", // %@ = attribute name
  'DG.DataDisplayMenu.treatAsCategorical': "Treat as Categorical",
  'DG.DataDisplayMenu.treatAsNumeric': "Treat as Numeric",
  'DG.DataDisplayMenu.hide': "Hide and Show",
  'DG.DataDisplayMenu.hideSelectedPlural': "Hide Selected Cases",
  'DG.DataDisplayMenu.hideUnselectedPlural': "Hide Unselected Cases",
  'DG.DataDisplayMenu.hideSelectedSing': "Hide Selected Case",
  'DG.DataDisplayMenu.hideUnselectedSing': "Hide Unselected Case",
  'DG.DataDisplayMenu.showAll': "Show All Cases",
  'DG.DataDisplayMenu.snapshot': "Make Snapshot",

  // DG.GraphView
  'DG.GraphView.replaceAttribute': "Replace %@ with %@",  // both %@ are attribute names
  'DG.GraphView.addAttribute': "Add attribute %@",  // %@ is attribute name
  'DG.GraphView.addToEmptyPlace': "Create axis with %@",  // %@ is attribute name
  'DG.GraphView.addToEmptyX': "Create x-axis with %@",  // %@ is attribute name
  'DG.GraphView.dropInPlot': "Color points by values of %@",  // %@ is attribute name
  'DG.GraphView.zoomTip': "Double-click to zoom in.\nShift-double-click to zoom out",  // %@ is attribute name
  'DG.GraphView.rescale': "Rescale to data",  // Rescale to data

  // DG.AxisView
  'DG.AxisView.labelTooltip': "—Click to change %@ axis attribute",  // %@ is either horizontal or vertical

  // DG.DataTip
  'DG.DataTip.connectingLine': "%@: %@\nwith %@ %@",

  // DG.MapView
  'DG.MapView.showGrid': "Show Grid",  // "Show Grid"
  'DG.MapView.hideGrid': "Hide Grid",  // "Hide Grid"
  'DG.MapView.showPoints': "Show Points",  // "Show Points"
  'DG.MapView.hidePoints': "Hide Points",  // "Hide Points"
  'DG.MapView.marqueeHint': "Marquee tool—drag select points in map",  // "Marquee tool—drag select points in map"
  'DG.MapView.gridControlHint': "Change size of grid rectangles",  // "Change size of grid rectangles"

  // Inspector
  'DG.Inspector.values': "Measure",  // "Measure"
  'DG.Inspector.styles': "Format",  // "Format"
  'DG.Inspector.pointSize': "Point size:",  // "Point size:"
  'DG.Inspector.transparency': "Transparency:",  // "Transparency:"
  'DG.Inspector.color': "Color:",  // "Color:"
  'DG.Inspector.legendColor': "Legend color:",  // "Legend color:"
  'DG.Inspector.backgroundColor': "Background\ncolor:",  // "Background color:"
  'DG.Inspector.stroke': "Stroke:",  // "Stroke:"
  'DG.Inspector.rescale.toolTip': "Rescale display to show all the data",  // "Rescale display to show all the data"
  'DG.Inspector.mixUp.toolTip': "Mixup all the points",  // "Mixup all the points"
  'DG.Inspector.hideShow.toolTip': "Show all cases or hide selected/unselected cases",  // "Show all cases or hide selected/unselected cases"
  'DG.Inspector.delete.toolTip': "Delete selected or unselected cases",  // "Delete selected or unselected cases"
  'DG.Inspector.sliderValues.toolTip': "Set slider animation direction, speed, …",  // "Set slider animation direction, speed, …"
  'DG.Inspector.webViewEditURL.toolTip': "Edit the URL of the displayed web page",  // "Edit the URL of the displayed web page"

  'DG.Inspector.selection.selectAll': "Select All Cases",           // "Select All Cases"
  'DG.Inspector.selection.deleteSelectedCases': "Delete Selected Cases",  // "Delete Selected Cases"
  'DG.Inspector.selection.deleteUnselectedCases': "Delete Unselected Cases",    // "Delete Unselected Cases"
  'DG.Inspector.deleteAll': "Delete All Cases",           // "Delete All Cases"
  'DG.Inspector.deleteDataSet': "Delete Data Set",        // "Delete Data Set"

  // Display Inspector
  'DG.Inspector.displayValues.toolTip': "Change what is shown along with the points",  // "Change what is shown along with the points"
  'DG.Inspector.displayStyles.toolTip': "Change the appearance of the display",  // "Change the appearance of the display"
  'DG.Inspector.makeImage.toolTip': "Save the image as a PNG file",  // "Save the image as a PNG file"
  'DG.Inspector.displayShow': "Show …",  // "Show …"

  // Graph Inspector
  'DG.Inspector.graphTransparency': "Transparent",  // "Transparent"
  'DG.Inspector.graphCount': "Count",  // "Count"
  'DG.Inspector.graphPercent': "Percent",  // "Percent"
  'DG.Inspector.graphRow': "Row",  // "Row"
  'DG.Inspector.graphColumn': "Column",  // "Column"
  'DG.Inspector.graphCell': "Cell",  // "Cell"
  'DG.Inspector.graphConnectingLine': "Connecting Lines",  // "Connecting Lines"
  'DG.Inspector.graphMovableLine': "Movable Line",  // "Movable Line"
  'DG.Inspector.graphInterceptLocked': "Intercept Locked",  // "Intercept Locked"
  'DG.Inspector.graphPlottedFunction': "Plotted Function",  // "Plotted Function"
  'DG.Inspector.graphSquares': "Squares of Residuals",  // "Squares of Residuals"
  'DG.Inspector.graphLSRL': "Least Squares Line",  // "Least Squares Line"
  'DG.Inspector.graphMovableValue': "Movable Value",  // "Movable Value"
  'DG.Inspector.graphAdd': "Add",  // "Add"
  'DG.Inspector.graphRemove': "Remove",  // "Remove"
  'DG.Inspector.graphPlottedMean': "Mean",  // "Mean"
  'DG.Inspector.graphPlottedMedian': "Median",  // "Median"
  'DG.Inspector.graphPlottedStDev': "Standard Deviation",  // "Standard Deviation"
  'DG.Inspector.graphPlottedIQR': "Interquartile Range",  // "Interquartile Range"
  'DG.Inspector.graphPlottedBoxPlot': "Box Plot",  // "Box Plot"
  'DG.Inspector.graphPlottedValue': "Plotted Value",  // "Plotted Value"

  // Table Inspector
  'DG.Inspector.attributes.toolTip': "Make new attributes. Export case data.",  // "Make new attributes. Export case data."
  'DG.Inspector.newAttribute': "New Attribute in %@...",  // "New Attribute in %@..."
  'DG.Inspector.randomizeAllAttributes': "Rerandomize All", // "Randomize Attributes"
  'DG.Inspector.exportCaseData': "Export Case Data...", // "Export Case Data..."

  // Map Inspector
  'DG.Inspector.mapGrid': "Grid",  // "Grid"
  'DG.Inspector.mapPoints': "Points",  // "Points"
  'DG.Inspector.mapLines': "Connecting Lines",  // "Connecting Lines"

  // Game Controller
  'DG.GameController.continuityError': 'Sorry, after columns in the case table have been reordered, new data cannot be accepted.',

  // Game View
  'DG.GameView.loading': 'Loading',
  'DG.GameView.loadError': 'If you can see this text, loading the above URL may have failed. You can check the link in another browser tab or report the error to http://codap.concord.org/help.',

  // Controllers
  'DG.Component.closeComponent.confirmCloseMessage': 'Are you sure?',
  'DG.Component.closeComponent.confirmCloseDescription': '',
  'DG.Component.closeComponent.okButtonTitle': 'Yes, close it',
  'DG.Component.closeComponent.cancelButtonTitle': 'Cancel',
  'DG.GameController.confirmCloseDescription': 'If you close this, you may not be able to add more data.',

  // Web View
  'DG.WebView.defaultTitle': 'Web Page'
  });
