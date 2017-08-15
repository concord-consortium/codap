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
SC.stringsFor('es', {

  // CFM/File menu
  'DG.fileMenu.menuItem.newDocument': "(es)New",
  'DG.fileMenu.menuItem.openDocument': "(es)Open...",
  'DG.fileMenu.menuItem.closeDocument': "(es)Close",
  'DG.fileMenu.menuItem.importFile': "(es)Import...",
  'DG.fileMenu.menuItem.revertTo': "(es)Revert...",
  'DG.fileMenu.menuItem.revertToOpened': "(es)Recently opened state",
  'DG.fileMenu.menuItem.revertToShared': "(es)Shared view",
  'DG.fileMenu.menuItem.saveDocument': "(es)Save...",
  'DG.fileMenu.menuItem.copyDocument': "(es)Create a copy",
  'DG.fileMenu.menuItem.share': "(es)Share...",
  'DG.fileMenu.menuItem.shareGetLink': "(es)Get link to shared view",
  'DG.fileMenu.menuItem.shareUpdate': "(es)Update shared view",
  'DG.fileMenu.menuItem.renameDocument': "(es)Rename",

  // main.js
  'DG.main.userEntryView.title': "(es)What would you like to do?",
  'DG.main.userEntryView.openDocument': "(es)Open Document or Browse Examples",
  'DG.main.userEntryView.newDocument': "(es)Create New Document",

  // mainPage.js
  'DG.mainPage.mainPane.undoButton.title': "Deshacer",
  'DG.mainPage.mainPane.undoButton.toolTip': "Deshacer la última acción",
  'DG.mainPage.mainPane.redoButton.title': "Rehacer",
  'DG.mainPage.mainPane.redoButton.toolTip': "Rehacer la última acción",
  'DG.mainPage.mainPane.versionString': "Versión %@ (%@)", // DG.VERSION, DG.BUILD_NUM
  'DG.mainPage.mainPane.messageView.value': "Desfortunadamente, DG no se apoya en su navegador." +
  "DG se apoya en Internet Explorer 9+, Firefox 3.6+, Chrome 10+, and Safari 4+. " +
  "DG no se apoya activamente en otros versiones o navegadores ahora.",
  'DG.mainPage.titleBar.saved': '¡Documento Guardado!',

  // IS_BUILD variants of strings for InquirySpace
  'DG.mainPage.mainPane.versionString.IS_BUILD': "(es)Version %@ (%@ IS)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.

  // DG.IS_SRRI_BUILD variants of strings for SRRI build
  'DG.mainPage.mainPane.versionString.SRRI_BUILD': "(es)Version %@ (%@.srri10)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.

  // DG.AppController
  'DG.AppController.resetData.title' : "(es)Clear Data...",
  'DG.AppController.resetData.toolTip' : "(es)Delete all data from current document",
  'DG.AppController.resetData.warnMessage' : "(es)Do you really want to delete all the data in this document?",
  'DG.AppController.resetData.warnDescription' : "(es)This action is not undoable.",
  'DG.AppController.resetData.okButtonTitle' : "(es)Yes, delete the data",
  'DG.AppController.resetData.cancelButtonTitle' : "(es)No, keep the data",
  'DG.AppController.closeDocument.warnMessage' : "(es)Close the current document without saving?",
  'DG.AppController.closeDocument.warnDescription' : "(es)This action is not undoable.",
  'DG.AppController.closeDocument.okButtonTitle' : "(es)Close",
  'DG.AppController.closeDocument.cancelButtonTitle' : "(es)Cancel",
  'DG.AppController.beforeUnload.confirmationMessage' : "(es)The document contains unsaved changes.",
  'DG.AppController.optionMenuItems.reportProblem' : "(es)Send Feedback...",
  'DG.AppController.optionMenuItems.viewWebPage' : "(es)Display Web Page...",
  'DG.AppController.optionMenuItems.configureGuide' : "(es)Configure Guide...",
  'DG.AppController.optionMenuItems.about' : "(es)About CODAP...",
  'DG.AppController.optionMenuItems.releaseNotes' : "(es)What's New?",
  'DG.AppController.optionMenuItems.help' : "(es)Help...",
  'DG.AppController.optionMenuItems.toWebSite' : "(es)CODAP website",
  'DG.AppController.exportDocument.prompt' : "(es)Filename:",
  'DG.AppController.exportCaseData.prompt' : "(es)Export the case data, from:",
  'DG.AppController.exportDocument.exportTitle' : "(es)Export",
  'DG.AppController.exportDocument.exportTooltip' : "(es)Export data to a file",
  'DG.AppController.exportDocument.cancelTitle' : "(es)Cancel",
  'DG.AppController.exportDocument.cancelTooltip' : "(es)Cancel the export",
  'DG.AppController.feedbackDialog.dialogTitle' : "(es)Provide Feedback",
  'DG.AppController.feedbackDialog.subHeaderText' : "(es)Your feedback is important to us!",
  'DG.AppController.feedbackDialog.messageText' : "(es)Please help us continue to improve our product. Questions, bug reports and feature requests are all welcome. Thank you!",
  'DG.AppController.feedbackDialog.subjectHint' : "(es)What is your feedback about",
  'DG.AppController.feedbackDialog.feedbackHint' : "(es)Details",
  'DG.AppController.feedbackDialog.submitFeedbackButton' : "(es)Submit",
  'DG.AppController.feedbackDialog.cancelFeedbackButton' : "(es)Cancel",
  'DG.AppController.showWebSiteTitle' : '(es)About CODAP',
  'DG.AppController.showHelpTitle' : '(es)Help with CODAP',
  'DG.AppController.showAboutTitle' : '(es)About CODAP',
  'DG.AppController.showReleaseNotesTitle' : '(es)CODAP Release Notes',
  'DG.AppController.dropFile.error' : '(es)Error: %@1', // Error: <error text>
  'DG.AppController.dropFile.unknownFileType' : '(es)You cannot import the type of file dropped',
  'DG.AppController.validateDocument.missingRequiredProperty' : '(es)Required property not found: %@1',
  'DG.AppController.validateDocument.unexpectedProperty' : '(es)Unexpected top-level property: %@1',
  'DG.AppController.validateDocument.unresolvedID' : '(es)Unresolved id: %@1',
  'DG.AppController.validateDocument.parseError' : '(es)Parse error in document: %@1',
  'DG.AppController.validateDocument.invalidDocument' : '(es)Invalid JSON Document: %@1',
  'DG.AppController.openDocument.error.general': '(es)Unable to open document',
  'DG.AppController.openDocument.error.invalid_format': '(es)CODAP can not read this type of document',
  'DG.AppController.createDataSet.initialAttribute': '(es)Attribute', /* Attribute */
  'DG.AppController.createDataSet.name': '(es)New Dataset', /* New Dataset */
  'DG.AppController.createDataSet.collectionName': '(es)Cases', /* Cases */
  'DG.AppController.caseTableMenu.newDataSet': '(es)-- new --', /* -- new -- */

  'DG.SingleTextDialog.okButton.title': "(es)OK",
  'DG.SingleTextDialog.cancelButton.title': "(es)Cancel",
  'DG.SingleTextDialog.cancelButton.toolTip': "(es)Dismiss the dialog without making any changes",

  // DG.DocumentController
  'DG.DocumentController.calculatorTitle': "(es)Calculator",
  'DG.DocumentController.caseTableTitle': "(es)Case Table",
  'DG.DocumentController.graphTitle': "(es)Graph",
  'DG.DocumentController.sliderTitle': "(es)Slider",
  'DG.DocumentController.textTitle': "(es)Text",
  'DG.DocumentController.mapTitle': "(es)Map",
  'DG.DocumentController.enterURLPrompt': "(es)Enter the URL of a web page to display",
  'DG.DocumentController.enterViewWebPageOKTip': "(es)Displays the web page given by the URL",

  // DG.Document
  'DG.Document.defaultDocumentName': "(es)Untitled Document",
  'DG.Document.documentName.toolTip': "(es)Click to edit document name", // "Click to edit document name"

  // DG.SliderView
  'DG.SliderView.thumbView.toolTip': "(es)Drag to change the slider's value",
  'DG.SliderView.startButton.toolTip': "(es)Start/stop animation",

  // DG.ToolButtonData
  'DG.ToolButtonData.tableButton.title': "Listas",
  'DG.ToolButtonData.tableButton.toolTip': "(es)Open a case table for each data set(ctrl-alt-t)",
  'DG.ToolButtonData.graphButton.title': "Graphico",
  'DG.ToolButtonData.graphButton.toolTip': "(es)Make a graph (ctrl-alt-g)",
  'DG.ToolButtonData.sliderButton.title': "Seslizador",
  'DG.ToolButtonData.sliderButton.toolTip': "(es)Make a slider (ctrl-alt-s)",
  'DG.ToolButtonData.calcButton.title': "(es)Calc",
  'DG.ToolButtonData.calcButton.toolTip': "(es)Open/close the calculator (ctrl-alt-c)",
  'DG.ToolButtonData.textButton.title': "Texto",
  'DG.ToolButtonData.textButton.toolTip': "(es)Make a text object (ctrl-alt-shift-t)",
  'DG.ToolButtonData.mapButton.title': "(es)Map",
  'DG.ToolButtonData.mapButton.toolTip': "(es)Make a map",
  'DG.ToolButtonData.optionMenu.title': "(es)Options",
  'DG.ToolButtonData.optionMenu.toolTip': "(es)Display a website, configure guide...",
  'DG.ToolButtonData.tileListMenu.title': "(es)Tiles",
  'DG.ToolButtonData.tileListMenu.toolTip': "(es)Show the list of tiles in the document",
  'DG.ToolButtonData.guideMenu.title': "(es)Guide",
  'DG.ToolButtonData.guideMenu.toolTip': "(es)Show the guide for this activity and navigate within it",
  'DG.ToolButtonData.guideMenu.showGuide': "(es)Show Guide",
  'DG.ToolButtonData.help.title': "(es)Help",
  'DG.ToolButtonData.help.toolTip': "(es)Help for CODAP, learn about CODAP project",

  'DG.Slider.multiples': "(es)Restrict to Multiples of:",  // Restrict to Multiples of
  'DG.Slider.maxPerSecond': "(es)Maximum Animation Frames/sec:",  // Maximum Animation Frames/sec:
  'DG.Slider.direction': "(es)Animation Direction:", // Direction
  'DG.Slider.backAndForth': "(es)Back and Forth", // Back and Forth
  'DG.Slider.lowToHigh': "(es)Low to High", // Low to High
  'DG.Slider.highToLow': "(es)High to Low", // High to Low
  'DG.Slider.mode': "(es)Animation Repetition:", // Animation Repetition:
  'DG.Slider.nonStop': "(es)Non-Stop", // Non-Stop
  'DG.Slider.onceOnly': "(es)Once Only", // Once Only

  // Undo / Redo
  'DG.Undo.exceptionOccurred': "(es)An error occurred while trying to undo.",
  'DG.Redo.exceptionOccurred': "(es)An error occurred while trying to redo.",
  'DG.Undo.componentMove': "(es)Undo moving the component",
  'DG.Redo.componentMove': "(es)Redo moving the component",
  'DG.Undo.componentResize': "(es)Undo resizing the component",
  'DG.Redo.componentResize': "(es)Redo resizing the component",
  'DG.Undo.axisDilate': "(es)Undo rescaling the axis",
  'DG.Redo.axisDilate': "(es)Redo rescaling the axis",
  'DG.Undo.axisRescaleFromData': "(es)Undo rescaling the axis",
  'DG.Redo.axisRescaleFromData': "(es)Redo rescaling the axis",
  'DG.Undo.axisDrag': "(es)Undo dragging the axis",
  'DG.Redo.axisDrag': "(es)Redo dragging the axis",
  'DG.Undo.axisAttributeChange': "(es)Undo changing the axis attribute",
  'DG.Redo.axisAttributeChange': "(es)Redo changing the axis attribute",
  'DG.Undo.axisAttributeAdded': "(es)Undo adding an axis attribute",
  'DG.Redo.axisAttributeAdded': "(es)Redo adding an axis attribute",
  'DG.Undo.toggleComponent.add.calcView': "(es)Undo showing the calculator",
  'DG.Redo.toggleComponent.add.calcView': "(es)Redo showing the calculator",
  'DG.Undo.toggleComponent.delete.calcView': "(es)Undo hiding the calculator",
  'DG.Redo.toggleComponent.delete.calcView': "(es)Redo hiding the calculator",
  'DG.Undo.caseTable.open': "(es)Undo showing case tables",
  'DG.Redo.caseTable.open': "(es)Redo showing case tables",
  'DG.Undo.caseTable.editAttribute': "(es)Undo editing case table attribute",
  'DG.Redo.caseTable.editAttribute': "(es)Redo editing case table attribute",
  'DG.Undo.caseTable.createAttribute': "(es)Undo creating case table attribute",
  'DG.Redo.caseTable.createAttribute': "(es)Redo creating case table attribute",
  'DG.Undo.caseTable.editAttributeFormula': "(es)Undo editing case table attribute formula",
  'DG.Redo.caseTable.editAttributeFormula': "(es)Redo editing case table attribute formula",
  'DG.Undo.caseTable.editCellValue': "(es)Undo editing case table cell value",
  'DG.Redo.caseTable.editCellValue': "(es)Redo editing case table cell value",
  'DG.Undo.caseTable.sortCases': "(es)Undo sorting cases",
  'DG.Redo.caseTable.sortCases': "(es)Redo sorting cases",
  'DG.Undo.caseTable.deleteAttribute': "(es)Undo deleting case table attribute",
  'DG.Redo.caseTable.deleteAttribute': "(es)Redo deleting case table attribute",
  'DG.Undo.caseTable.createCollection': "(es)Undo create new collection",
  'DG.Redo.caseTable.createCollection': "(es)Redo create new collection",
  'DG.Undo.caseTable.collectionNameChange': '(es)Undo rename collection',
  'DG.Redo.caseTable.collectionNameChange': '(es)Redo rename collection',
  'DG.Undo.caseTable.createNewCase': '(es)Undo create new case',
  'DG.Redo.caseTable.createNewCase': '(es)Redo create new case',
  'DG.Undo.caseTable.insertCases': '(es)Undo insert cases',
  'DG.Redo.caseTable.insertCases': '(es)Redo insert cases',
  'DG.Undo.caseTable.groupToggleExpandCollapseAll': '(es)Undo toggle expand/collapse all',
  'DG.Redo.caseTable.groupToggleExpandCollapseAll': '(es)Redo toggle expand/collapse all',
  'DG.Undo.caseTable.expandCollapseOneCase': '(es)Undo expand or collapse of a group',
  'DG.Redo.caseTable.expandCollapseOneCase': '(es)Redo expand or collapse of a group',
  'DG.Undo.caseTable.resizeColumns': '(es)Undo auto-resize all columns',
  'DG.Redo.caseTable.resizeColumns': '(es)Redo auto-resize all columns',
  'DG.Undo.document.share': "(es)Undo sharing the document",
  'DG.Redo.document.share': "(es)Redo sharing the document",
  'DG.Undo.document.unshare': "(es)Undo stop sharing the document",
  'DG.Redo.document.unshare': "(es)Redo stop sharing the document",
  'DG.Undo.game.add': "(es)Undo adding a game to the document",
  'DG.Redo.game.add': "(es)Redo adding a game to the document",
  'DG.Undo.graph.showCount': "(es)Undo showing count",
  'DG.Redo.graph.showCount': "(es)Redo showing count",
  'DG.Undo.graph.hideCount': "(es)Undo hiding count",
  'DG.Redo.graph.hideCount': "(es)Redo hiding count",
  'DG.Undo.graph.showPercent': "(es)Undo showing percent",
  'DG.Redo.graph.showPercent': "(es)Redo showing percent",
  'DG.Undo.graph.hidePercent': "(es)Undo hiding percent",
  'DG.Redo.graph.hidePercent': "(es)Redo hiding percent",
  'DG.Undo.graph.showMovableLine': "(es)Undo showing movable line",
  'DG.Redo.graph.showMovableLine': "(es)Redo showing movable line",
  'DG.Undo.graph.hideMovableLine': "(es)Undo hiding movable line",
  'DG.Redo.graph.hideMovableLine': "(es)Redo hiding movable line",
  'DG.Undo.graph.lockIntercept': "(es)Undo locking line intercept",
  'DG.Redo.graph.lockIntercept': "(es)Redo locking line intercept",
  'DG.Undo.graph.unlockIntercept': "(es)Undo unlocking line intercept",
  'DG.Redo.graph.unlockIntercept': "(es)Redo unlocking line intercept",
  'DG.Undo.graph.showPlotFunction': "(es)Undo showing plotted function",
  'DG.Redo.graph.showPlotFunction': "(es)Redo showing plotted function",
  'DG.Undo.graph.hidePlotFunction': "(es)Undo hiding plotted function",
  'DG.Redo.graph.hidePlotFunction': "(es)Redo hiding plotted function",
  'DG.Undo.graph.changePlotFunction': "(es)Undo change plotted function",
  'DG.Redo.graph.changePlotFunction': "(es)Redo change plotted function",
  'DG.Undo.graph.showPlotValue': "(es)Undo showing plotted value",
  'DG.Redo.graph.showPlotValue': "(es)Redo showing plotted value",
  'DG.Undo.graph.hidePlotValue': "(es)Undo hiding plotted value",
  'DG.Redo.graph.hidePlotValue': "(es)Redo hiding plotted value",
  'DG.Undo.graph.changePlotValue': "(es)Undo change plotted value",
  'DG.Redo.graph.changePlotValue': "(es)Redo change plotted value",
  'DG.Undo.graph.showConnectingLine': "(es)Undo showing connecting line",
  'DG.Redo.graph.showConnectingLine': "(es)Redo showing connecting line",
  'DG.Undo.graph.hideConnectingLine': "(es)Undo hiding connecting line",
  'DG.Redo.graph.hideConnectingLine': "(es)Redo hiding connecting line",
  'DG.Undo.graph.showLSRL': "(es)Undo showing least squares line",
  'DG.Redo.graph.showLSRL': "(es)Redo showing least squares line",
  'DG.Undo.graph.hideLSRL': "(es)Undo hiding least squares line",
  'DG.Redo.graph.hideLSRL': "(es)Redo hiding least squares line",
  'DG.Undo.graph.showSquares': "(es)Undo showing squares",
  'DG.Redo.graph.showSquares': "(es)Redo showing squares",
  'DG.Undo.graph.hideSquares': "(es)Undo hiding squares",
  'DG.Redo.graph.hideSquares': "(es)Redo hiding squares",
  'DG.Undo.graph.showPlottedMean': "(es)Undo showing mean",
  'DG.Redo.graph.showPlottedMean': "(es)Redo showing mean",
  'DG.Undo.graph.hidePlottedMean': "(es)Undo hiding mean",
  'DG.Redo.graph.hidePlottedMean': "(es)Redo hiding mean",
  'DG.Undo.graph.showPlottedMedian': "(es)Undo showing median",
  'DG.Redo.graph.showPlottedMedian': "(es)Redo showing median",
  'DG.Undo.graph.hidePlottedMedian': "(es)Undo hiding median",
  'DG.Redo.graph.hidePlottedMedian': "(es)Redo hiding median",
  'DG.Undo.graph.showPlottedStDev': "(es)Undo showing standard deviation",
  'DG.Redo.graph.showPlottedStDev': "(es)Redo showing standard deviation",
  'DG.Undo.graph.hidePlottedStDev': "(es)Undo hiding standard deviation",
  'DG.Redo.graph.hidePlottedStDev': "(es)Redo hiding standard deviation",
  'DG.Undo.graph.showPlottedIQR': "(es)Undo showing inter-quartile range",
  'DG.Redo.graph.hidePlottedIQR': "(es)Redo hiding inter-quartile range",
  'DG.Undo.graph.hidePlottedIQR': "(es)Undo hiding inter-quartile range",
  'DG.Redo.graph.showPlottedIQR': "(es)Redo showing inter-quartile range",
  'DG.Undo.graph.addMovableValue': "(es)Undo adding movable value",
  'DG.Redo.graph.addMovableValue': "(es)Redo adding movable value",
  'DG.Undo.graph.removeMovableValue': "(es)Undo removing movable value",
  'DG.Redo.graph.removeMovableValue': "(es)Redo removing movable value",
  'DG.Undo.graph.moveMovableValue': "(es)Undo moving movable value",
  'DG.Redo.graph.moveMovableValue': "(es)Redo moving movable value",
  'DG.Undo.graph.changePointColor': "(es)Undo changing data color",
  'DG.Redo.graph.changePointColor': "(es)Redo changing data color",
  'DG.Undo.graph.changeStrokeColor': "(es)Undo changing stroke color",
  'DG.Redo.graph.changeStrokeColor': "(es)Redo changing stroke color",
  'DG.Undo.graph.changePointSize': "(es)Undo changing point size",
  'DG.Redo.graph.changePointSize': "(es)Redo changing point size",
  'DG.Undo.graph.changeAttributeColor': "(es)Undo changing attribute color",
  'DG.Redo.graph.changeAttributeColor': "(es)Redo changing attribute color",
  'DG.Undo.graph.changeBackgroundColor': "(es)Undo changing graph background color",
  'DG.Redo.graph.changeBackgroundColor': "(es)Redo changing graph background color",
  'DG.Undo.graph.toggleTransparent': "(es)Undo toggling plot transparency",
  'DG.Redo.graph.toggleTransparent': "(es)Redo toggling plot transparency",
  'DG.Undo.guide.show': "(es)Undo showing the guide",
  'DG.Redo.guide.show': "(es)Redo showing the guide",
  'DG.Undo.guide.navigate': "(es)Undo changing the guide page",
  'DG.Redo.guide.navigate': "(es)Redo changing the guide page",
  'DG.Undo.hideSelectedCases': "(es)Undo hiding selected cases",
  'DG.Redo.hideSelectedCases': "(es)Redo hiding selected cases",
  'DG.Undo.hideUnselectedCases': "(es)Undo hiding unselected cases",
  'DG.Redo.hideUnselectedCases': "(es)Redo hiding unselected cases",
  'DG.Undo.enableNumberToggle': "(es)Undo Show Parent Visibility Toggles",
  'DG.Redo.enableNumberToggle': "(es)Redo Show Parent Visibility Toggles",
  'DG.Undo.disableNumberToggle': "(es)Undo Hide Parent Visibility Toggles",
  'DG.Redo.disableNumberToggle': "(es)Redo Hide Parent Visibility Toggles",
  'DG.Undo.interactiveUndoableAction': "(es)Undo an action in the interactive",
  'DG.Redo.interactiveUndoableAction': "(es)Redo an action in the interactive",
  'DG.Undo.showAllCases': "(es)Undo showing all cases",
  'DG.Redo.showAllCases': "(es)Redo showing all cases",
  'DG.Undo.map.create': "(es)Undo adding map",
  'DG.Redo.map.create': "(es)Redo adding map",
  'DG.Undo.map.fitBounds': "(es)Undo resizing map",
  'DG.Redo.map.fitBounds': "(es)Redo resizing map",
  'DG.Undo.map.pan': "(es)Undo panning map",
  'DG.Redo.map.pan': "(es)Redo panning map",
  'DG.Undo.map.zoom': "(es)Undo zooming map",
  'DG.Redo.map.zoom': "(es)Redo zooming map",
  'DG.Undo.map.showGrid': "(es)Undo showing grid on map",
  'DG.Redo.map.showGrid': "(es)Redo showing grid on map",
  'DG.Undo.map.hideGrid': "(es)Undo hiding grid on map",
  'DG.Redo.map.hideGrid': "(es)Redo hiding grid on map",
  'DG.Undo.map.changeGridSize': "(es)Undo changing map grid size",
  'DG.Redo.map.changeGridSize': "(es)Redo changing map grid size",
  'DG.Undo.map.showPoints': "(es)Undo showing points on map",
  'DG.Redo.map.showPoints': "(es)Redo showing points on map",
  'DG.Undo.map.hidePoints': "(es)Undo hiding points on map",
  'DG.Redo.map.hidePoints': "(es)Redo hiding points on map",
  'DG.Undo.map.showLines': "(es)Undo showing lines on map",
  'DG.Redo.map.showLines': "(es)Redo showing lines on map",
  'DG.Undo.map.hideLines': "(es)Undo hiding lines on map",
  'DG.Redo.map.hideLines': "(es)Redo hiding lines on map",
  'DG.Undo.map.changeBaseMap': "(es)Undo changing map background",
  'DG.Redo.map.changeBaseMap': "(es)Redo changing map background",
  'DG.Undo.textComponent.create': "(es)Undo adding text object",
  'DG.Redo.textComponent.create': "(es)Redo adding text object",
  'DG.Undo.textComponent.edit': "(es)Undo editing text",
  'DG.Redo.textComponent.edit': "(es)Redo editing text",
  'DG.Undo.sliderComponent.create': "(es)Undo adding a slider",
  'DG.Redo.sliderComponent.create': "(es)Redo adding a slider",
  'DG.Undo.slider.change': "(es)Undo slider value change",
  'DG.Redo.slider.change': "(es)Redo slider value change",
  'DG.Undo.slider.changeMultiples': "(es)Undo change to slider multiples restriction",
  'DG.Redo.slider.changeMultiples': "(es)Redo change to slider multiples restriction",
  'DG.Undo.slider.changeSpeed': "(es)Undo change to slider max frames/sec",
  'DG.Redo.slider.changeSpeed': "(es)Redo change to slider max frames/sec",
  'DG.Undo.slider.changeDirection': "(es)Undo change to slider animation direction",
  'DG.Redo.slider.changeDirection': "(es)Redo change to slider animation direction",
  'DG.Undo.slider.changeRepetition': "(es)Undo change to slider animation repetition",
  'DG.Redo.slider.changeRepetition': "(es)Redo change to slider animation repetition",
  'DG.Undo.graphComponent.create': "(es)Undo adding a graph",
  'DG.Redo.graphComponent.create': "(es)Redo adding a graph",
  'DG.Undo.dataContext.create': '(es)Undo creating a data set',
  'DG.Redo.dataContext.create': '(es)Redo creating a data set',
  'DG.Undo.data.deleteCases': "(es)Undo deleting cases",
  'DG.Redo.data.deleteCases': "(es)Redo deleting cases",
  'DG.Undo.component.close': "(es)Undo closing component",
  'DG.Redo.component.close': "(es)Redo closing component",
  'DG.Undo.component.minimize': "(es)Undo minimizing component",
  'DG.Redo.component.minimize': "(es)Redo minimizing component",
  'DG.Undo.dataContext.moveAttribute': "(es)Undo moving case table attribute",
  'DG.Redo.dataContext.moveAttribute': "(es)Redo moving case table attribute",


  // DG.DataContext
  'DG.DataContext.singleCaseName': "(es)case",
  'DG.DataContext.pluralCaseName': "(es)cases",
  'DG.DataContext.caseCountString': "(es)%@1 %@2", // %@1: count, %@2: case name string
  'DG.DataContext.setOfCasesLabel': "(es)a collection",
  'DG.DataContext.collapsedRowString': "(es)%@1 of %@2",
  'DG.DataContext.noData': "(es)No Data", // "No Data"
  'DG.DataContext.baseName': '(es)Data_Set_%@1',

  // DG.CollectionClient
  'DG.CollectionClient.cantEditFormulaErrorMsg': "(es)The formula for attribute \"%@\" is not editable.",
  'DG.CollectionClient.cantEditFormulaErrorDesc': "(es)Create a new attribute to be able to specify a formula.",

  // DG.Formula
  'DG.Formula.FuncCategoryArithmetic': "(es)Arithmetic Functions",
  'DG.Formula.FuncCategoryConversion': "(es)Other Functions", // put into "Other" for now
  'DG.Formula.FuncCategoryDateTime': "(es)Date/Time Functions",
  'DG.Formula.FuncCategoryLookup': "(es)Lookup Functions",
  'DG.Formula.FuncCategoryOther': "(es)Other Functions",
  'DG.Formula.FuncCategoryRandom': "(es)Other Functions", // put into "Other" for now
  'DG.Formula.FuncCategoryStatistical': "(es)Statistical Functions",
  'DG.Formula.FuncCategoryString': "(es)String Functions",
  'DG.Formula.FuncCategoryTrigonometric': "(es)Trigonometric Functions",

  'DG.Formula.DateLongMonthJanuary': "(es)January",
  'DG.Formula.DateLongMonthFebruary': "(es)February",
  'DG.Formula.DateLongMonthMarch': "(es)March",
  'DG.Formula.DateLongMonthApril': "(es)April",
  'DG.Formula.DateLongMonthMay': "(es)May",
  'DG.Formula.DateLongMonthJune': "(es)June",
  'DG.Formula.DateLongMonthJuly': "(es)July",
  'DG.Formula.DateLongMonthAugust': "(es)August",
  'DG.Formula.DateLongMonthSeptember': "(es)September",
  'DG.Formula.DateLongMonthOctober': "(es)October",
  'DG.Formula.DateLongMonthNovember': "(es)November",
  'DG.Formula.DateLongMonthDecember': "(es)December",

  'DG.Formula.DateShortMonthJanuary': "(es)Jan",
  'DG.Formula.DateShortMonthFebruary': "(es)Feb",
  'DG.Formula.DateShortMonthMarch': "(es)Mar",
  'DG.Formula.DateShortMonthApril': "(es)Apr",
  'DG.Formula.DateShortMonthMay': "(es)May",
  'DG.Formula.DateShortMonthJune': "(es)Jun",
  'DG.Formula.DateShortMonthJuly': "(es)Jul",
  'DG.Formula.DateShortMonthAugust': "(es)Aug",
  'DG.Formula.DateShortMonthSeptember': "(es)Sep",
  'DG.Formula.DateShortMonthOctober': "(es)Oct",
  'DG.Formula.DateShortMonthNovember': "(es)Nov",
  'DG.Formula.DateShortMonthDecember': "(es)Dec",

  'DG.Formula.DateLongDaySunday': "(es)Sunday",
  'DG.Formula.DateLongDayMonday': "(es)Monday",
  'DG.Formula.DateLongDayTuesday': "(es)Tuesday",
  'DG.Formula.DateLongDayWednesday': "(es)Wednesday",
  'DG.Formula.DateLongDayThursday': "(es)Thursday",
  'DG.Formula.DateLongDayFriday': "(es)Friday",
  'DG.Formula.DateLongDaySaturday': "(es)Saturday",

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

  'DG.Formula.SyntaxErrorMiddle': "(es)Syntax error: '(es)%@'",
  'DG.Formula.SyntaxErrorEnd': "(es)Incomplete expression",
  'DG.Formula.SyntaxErrorInvalidOperator': "(es)invalid operator '%@'",
  'DG.Formula.TypeError.name': "(es)\u274c",
  'DG.Formula.TypeError.message': "(es)invalid type(s) for '%@'",
  'DG.Formula.TypeError.description': "(es)invalid type(s) for '%@'",
  'DG.Formula.VarReferenceError.name': "(es)\u274c",
  'DG.Formula.VarReferenceError.message': "(es)'%@': unknown variable",
  'DG.Formula.VarReferenceError.description': "(es)Variable '%@' is unrecognized",
  'DG.Formula.HierReferenceError.name': "(es)\u274c",
  'DG.Formula.HierReferenceError.message': "(es)invalid reference to child attribute '%@'",
  'DG.Formula.HierReferenceError.description': "(es)'%@' is a child attribute that can only be referenced in an aggregate function",
  'DG.Formula.FuncReferenceError.name': "(es)\u274c",
  'DG.Formula.FuncReferenceError.message': "(es)'%@': unknown function",
  'DG.Formula.FuncReferenceError.description': "(es)Function '%@' is unrecognized",
  'DG.Formula.FuncArgsError.name': "(es)\u274c",
  'DG.Formula.FuncArgsErrorSingle.message': "(es)'%@' expects 1 argument",
  'DG.Formula.FuncArgsErrorSingle.description': "(es)The '%@' function expects 1 argument",
  'DG.Formula.FuncArgsErrorPlural.message': "(es)'%@' expects %@ arguments",
  'DG.Formula.FuncArgsErrorPlural.description': "(es)The '%@' function expects %@ arguments",
  'DG.Formula.FuncArgsErrorRange.message': "(es)'%@' expects %@-%@ arguments",
  'DG.Formula.FuncArgsErrorRange.description': "(es)The '%@' function expects %@-%@ arguments",
  'DG.Formula.PendingRequest.name': "(es)\u231b",
  'DG.Formula.PendingRequest.message': "(es)request pending...",
  'DG.Formula.PendingRequest.description': "(es)request pending...",
  'DG.Formula.FailedRequest.name': "(es)\u274c",
  'DG.Formula.FailedRequest.message': "(es)request failed (%@)",
  'DG.Formula.FailedRequest.description': "(es)request failed (%@)",
  'DG.Formula.PendingBoundaries.name': "(es)\u231b",
  'DG.Formula.PendingBoundaries.message': "(es)boundaries pending...",
  'DG.Formula.PendingBoundaries.description': "(es)boundaries pending...",
  'DG.Formula.FailedBoundaries.name': "(es)\u274c",
  'DG.Formula.FailedBoundaries.message': "(es)boundaries failed (%@)",
  'DG.Formula.FailedBoundaries.description': "(es)boundaries failed (%@)",
  'DG.Formula.LookupDataSetError.message': "(es)'%@': unrecognized data set",
  'DG.Formula.LookupDataSetError.description': "(es)Data set '%@' is unrecognized",
  'DG.Formula.LookupAttrError.message': "(es)'%@' not found in data set '%@'",
  'DG.Formula.LookupAttrError.description': "(es)Attribute '%@' not found in data set '%@'",

  // DG.TableController
  'DG.TableController.headerMenuItems.editAttribute': "(es)Edit Attribute Properties...",
  'DG.TableController.headerMenuItems.editFormula': "(es)Edit Formula...",
  'DG.TableController.headerMenuItems.randomizeAttribute': "(es)Rerandomize",
  'DG.TableController.headerMenuItems.sortAscending': "(es)Sort Ascending (A\u2192Z, 0\u21929)",
  'DG.TableController.headerMenuItems.sortDescending': "(es)Sort Descending (9\u21920, Z\u2192A)",
  'DG.TableController.headerMenuItems.deleteAttribute': "(es)Delete Attribute",
  'DG.TableController.newAttrDlg.defaultAttrName': "(es)new_attr",
  'DG.TableController.newAttrDlg.attrNameHint': "(es)Enter a name for the new attribute",
  'DG.TableController.newAttrDlg.formulaHint': "(es)If desired, type a formula for computing values of this attribute",
  'DG.TableController.newAttrDlg.applyTooltip': "(es)Define the new attribute using the name and (optional) formula",
  'DG.TableController.newAttrDlg.mustEnterAttrNameMsg': "(es)Please enter a name for the new attribute",
  'DG.TableController.newAttrDialog.AttributesCategory': "(es)Attributes",
  'DG.TableController.newAttrDialog.SpecialCategory': "(es)Special",
  'DG.TableController.newAttrDialog.GlobalsCategory': "(es)Globals",
  'DG.TableController.newAttrDialog.ConstantsCategory': "(es)Constants",  // Set to "Special" to combine with 'caseIndex'
  'DG.TableController.newAttrDialog.FunctionsCategory': "(es)Functions",
  'DG.TableController.renameAttributeInvalidMsg': "(es)Attribute names may not be empty",
  'DG.TableController.renameAttributeInvalidDesc': "(es)Please enter a valid attribute name",
  'DG.TableController.renameAttributeDuplicateMsg': "(es)An attribute with that name already exists",
  'DG.TableController.renameAttributeDuplicateDesc': "(es)Please enter a unique attribute name",
  'DG.TableController.deleteAttribute.confirmMessage': "(es)Delete the attribute '%@'?",
  'DG.TableController.deleteAttribute.confirmDescription': "(es)This action cannot be undone.",
  'DG.TableController.deleteAttribute.okButtonTitle': "(es)Delete Attribute",
  'DG.TableController.deleteAttribute.cancelButtonTitle': "(es)Cancel",
  'DG.TableController.deleteDataSet.confirmMessage': "(es)Delete and destroy this data set: '(es)%@'?",
  'DG.TableController.deleteDataSet.confirmDescription': "(es)This action cannot be undone.",
  'DG.TableController.deleteDataSet.okButtonTitle': "(es)Delete Data Set",
  'DG.TableController.deleteDataSet.cancelButtonTitle': "(es)Cancel",
  'DG.TableController.attrEditor.precisionHint': "(es)Number of digits after decimal point",
  'DG.TableController.attrEditor.unitHint': "(es)Unit of measure, if applicable",
  'DG.TableController.attrEditor.descriptionHint': "(es)Describe the attribute",
  'DG.TableController.scoreAttrName': "(es)score",
  'DG.TableController.setScoreDlg.applyTooltip': "(es)Set the formula for the '%@' attribute",
  'DG.TableController.setScoreDlg.formulaHint': "(es)Type a formula for computing values of this attribute",
  'DG.TableController.newAttributeTooltip': '(es)Add a new attribute to this table',

  'DG.TableController.attributeEditor.title': '(es)Attribute Properties',
  // DG.CaseTableDropTarget
  'DG.CaseTableDropTarget.dropMessage': "(es)drop attribute to create new collection",
  'DG.CaseTable.defaultAttrName': '(es)newAttr',
  'DG.CaseTable.indexColumnName': '(es)index',
  'DG.CaseTable.indexColumnTooltip': '(es)The row number (caseIndex) within the collection',
  'DG.CaseTable.indexMenu.insertCase': "(es)Insert Case",
  'DG.CaseTable.indexMenu.insertCases': "(es)Insert Cases...",
  'DG.CaseTable.indexMenu.deleteCase': "(es)Delete Case",
  'DG.CaseTable.indexMenu.deleteCases': "(es)Delete Cases",
  'DG.CaseTable.attribute.type.none': '(es)',
  'DG.CaseTable.attribute.type.nominal': '(es)categorical',
  'DG.CaseTable.attribute.type.categorical': '(es)categorical',
  'DG.CaseTable.attribute.type.numeric': '(es)numeric',
  'DG.CaseTable.attribute.type.date': '(es)date',
  'DG.CaseTable.attribute.type.qualitative': '(es)qualitative',
  'DG.CaseTable.attribute.type.boundary':'(es)boundary', //boundary Translate
  'DG.CaseTable.attributeEditor.name': '(es)name', // name
  'DG.CaseTable.attributeEditor.description': '(es)description', // description
  'DG.CaseTable.attributeEditor.type': '(es)type', // type
  'DG.CaseTable.attributeEditor.unit': '(es)unit', // unit
  'DG.CaseTable.attributeEditor.precision': '(es)precision', // precision
  'DG.CaseTable.attributeEditor.editable': '(es)editable', // editable
  'DG.CaseTable.insertCasesDialog.title': '(es)Insert Cases',
  'DG.CaseTable.insertCasesDialog.numCasesPrompt': '(es)# cases to insert:',
  'DG.CaseTable.insertCasesDialog.beforeAfter.prompt': '(es)location:',
  'DG.CaseTable.insertCasesDialog.beforeAfter.before': '(es)before',
  'DG.CaseTable.insertCasesDialog.beforeAfter.after': '(es)after',
  'DG.CaseTable.insertCasesDialog.applyBtnTitle': '(es)Insert Cases',
  'DG.CaseTable.insertCasesDialog.applyBtnTooltip': '(es)Insert the specified number of cases',

  // DG.CaseTableController
  'DG.CaseTableController.allTables': '(es)All tables',

  // DG.AttributeFormulaView
  'DG.AttrFormView.attrNamePrompt': "(es)Attribute Name:",
  'DG.AttrFormView.formulaPrompt': "(es)Formula:",
  'DG.AttrFormView.operandMenuTitle': "(es)--- Insert Value ---",
  'DG.AttrFormView.functionMenuTitle': "(es)--- Insert Function ---",
  'DG.AttrFormView.applyBtnTitle': "(es)Apply",
  'DG.AttrFormView.cancelBtnTitle': "(es)Cancel",
  'DG.AttrFormView.cancelBtnTooltip': "(es)Dismiss the dialog without making any changes",

  // DG.GuideConfigurationView
  'DG.GuideConfigView.titlePrompt': "(es)Guide Title",
  'DG.GuideConfigView.titleHint': "(es)Activity Name",
  'DG.GuideConfigView.itemTitleHint': "(es)Section Name",
  'DG.GuideConfigView.itemURLHint': "(es)URL of section",
  'DG.GuideConfigView.okBtnTitle': "(es)OK",
  'DG.GuideConfigView.okBtnToolTip': "(es)Accept the Guide menu items",
  'DG.GuideConfigView.cancelBtnTitle': "(es)Cancel",
  'DG.GuideConfigView.cancelBtnTooltip': "(es)Dismiss the dialog without making any changes",
  'DG.GuideConfigView.httpWarning': "(es)The URL must start with either http:// or https://",

  'DG.DataDisplayModel.rescaleToData': "(es)Rescale to Data",
  'DG.DataDisplayModel.ShowConnectingLine': "(es)Show Connecting Lines",
  'DG.DataDisplayModel.HideConnectingLine': "(es)Hide Connecting Lines",

  // DG.AxisView
  'DG.AxisView.emptyGraphCue': 'Haga clic aquí, o arrastrar un atributo aquí.',

  // DG.CellLinearAxisView
  'DG.CellLinearAxisView.midPanelTooltip': "(es)Drag to translate axis scale",
  'DG.CellLinearAxisView.lowerPanelTooltip': "(es)Drag to change axis lower bound",
  'DG.CellLinearAxisView.upperPanelTooltip': "(es)Drag to change axis upper bound",

  // DG.PlotModel
  'DG.PlotModel.mixup': "(es)Mix Up the Plot", // "Mix Up the Plot"
  'DG.PlotModel.showCount': "(es)Show Count",
  'DG.PlotModel.hideCount': "(es)Hide Count",

  // DG.ScatterPlotModel
  'DG.ScatterPlotModel.sumSquares': "(es),\nSum of squares = %@", // sumOfResidualsSquared
  'DG.ScatterPlotModel.rSquared': "(es),\nr^2 = %@", // r-squared
  'DG.ScatterPlotModel.slopeIntercept': "(es)%@ = %@ %@ %@ %@",// y,slope,x,signInt,Int
  'DG.ScatterPlotModel.infiniteSlope': "(es)%@ = %@",// x,constant
  'DG.ScatterPlotModel.slopeOnly': "(es)slope = %@ %@",// numeric slope
  'DG.ScatterPlotModel.yearsLabel': "(es)per year",// per year - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.daysLabel': "(es)per day",// per day - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.hoursLabel': "(es)per hour",// per hour - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.minutesLabel': "(es)per minute",// per minute - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.secondsLabel': "(es)per seconds",// per second - used in equation for line when x is a datetime axis

  // DG.LegendView
  'DG.LegendView.attributeTooltip': "(es)Click to change legend attribute", // "Click to change legend attribute"

  // DG.NumberToggleView
  'DG.NumberToggleView.showAll': "(es)Show All -", // "Show All"
  'DG.NumberToggleView.hideAll': "(es)Hide All -", // "Hide All"
  'DG.NumberToggleView.lastDash': "(es)\u2013",         // "-"
  'DG.NumberToggleView.lastUnchecked': "(es)\u2610",    // "[ ]"
  'DG.NumberToggleView.lastChecked': "(es)\u2612",      // "[x]"
  'DG.NumberToggleView.lastLabel': "(es)Last",    // "Last"
  'DG.NumberToggleView.showAllTooltip': "(es)Click numbers to toggle visibility. Click label to show all.", // "Click numbers to toggle visibility. Click label to show all."
  'DG.NumberToggleView.hideAllTooltip': "(es)Click numbers to toggle visibility. Click label to hide all.", // "Click numbers to toggle visibility. Click label to hide all."
  'DG.NumberToggleView.enableLastModeTooltip': "(es)Click to show last parent case only",
  'DG.NumberToggleView.disableLastModeTooltip': "(es)Click to exit last parent case mode",
  'DG.NumberToggleView.indexTooltip': "(es)Click to toggle visibility.", // "Click to toggle visibility."

  // DG.PlottedAverageAdornment
  'DG.PlottedAverageAdornment.meanValueTitle': "(es)mean=%@", // "mean=123.456"
  'DG.PlottedAverageAdornment.medianValueTitle': "(es)median=%@", // "median=123.456"
  'DG.PlottedAverageAdornment.stDevValueTitle': "(es)\xB11 SD, %@", // "st.dev=123.456"
  'DG.PlottedAverageAdornment.iqrValueTitle': "(es)IQR=%@", // "iqr=123.456"
  'DG.PlottedAverageAdornment.boxPlotTitle': "(es)lower=%@\nQ1=%@\nmedian=%@\nQ3=%@\nupper=%@\nIQR=%@", // "lower=%@\nQ1=%@\nmedian=%@\nQ3=\nIQ=%@\nupper=%@"
  'DG.PlottedCountAdornment.title': "(es)%@ %@, %@%", // "12 cases, 50%"

  // DG.GraphModel
  'DG.DataDisplayMenu.attribute_x': "(es)X: %@", // %@ = attribute name
  'DG.DataDisplayMenu.attribute_y': "(es)Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.attribute_y2': "(es)Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.attribute_legend': "(es)Legend: %@", // %@ = attribute name
  'DG.DataDisplayMenu.remove': "(es)Remove Attribute",
  'DG.DataDisplayMenu.removeAttribute_x': "(es)Remove X: %@", // %@ = attribute name
  'DG.DataDisplayMenu.removeAttribute_y': "(es)Remove Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.removeAttribute_y2': "(es)Remove Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.removeAttribute_legend': "(es)Remove Legend: %@", // %@ = attribute name
  'DG.DataDisplayMenu.treatAsCategorical': "(es)Treat as Categorical",
  'DG.DataDisplayMenu.treatAsNumeric': "(es)Treat as Numeric",
  'DG.DataDisplayMenu.hide': "(es)Hide and Show",
  'DG.DataDisplayMenu.hideSelectedPlural': "(es)Hide Selected Cases",
  'DG.DataDisplayMenu.hideUnselectedPlural': "(es)Hide Unselected Cases",
  'DG.DataDisplayMenu.hideSelectedSing': "(es)Hide Selected Case",
  'DG.DataDisplayMenu.hideUnselectedSing': "(es)Hide Unselected Case",
  'DG.DataDisplayMenu.enableNumberToggle': "(es)Show Parent Visibility Toggles",
  'DG.DataDisplayMenu.disableNumberToggle': "(es)Hide Parent Visibility Toggles",
  'DG.DataDisplayMenu.showAll': "(es)Show All Cases",
  'DG.DataDisplayMenu.snapshot': "(es)Make Snapshot",

  // DG.GraphView
  'DG.GraphView.replaceAttribute': "(es)Replace %@ with %@", // both %@ are attribute names
  'DG.GraphView.addAttribute': "(es)Add attribute %@", // %@ is attribute name
  'DG.GraphView.addToEmptyPlace': "(es)Create axis with %@", // %@ is attribute name
  'DG.GraphView.addToEmptyX': "(es)Create x-axis with %@", // %@ is attribute name
  'DG.GraphView.dropInPlot': "(es)Color points by values of %@", // %@ is attribute name
  'DG.GraphView.zoomTip': "(es)Double-click to zoom in.\nShift-double-click to zoom out", // %@ is attribute name
  'DG.GraphView.rescale': "(es)Rescale to data", // Rescale to data

  // DG.AxisView
  'DG.AxisView.labelTooltip': "(es)—Click to change %@ axis attribute", // %@ is either horizontal or vertical
  'DG.AxisView.vertical': '(es)vertical',
  'DG.AxisView.horizontal': '(es)horizontal',

  // DG.DataTip
  'DG.DataTip.connectingLine': "(es)%@: %@\nwith %@ %@",

  // DG.MovableValueAdornment
  'DG.MovableMonthYear': "(es)%@, %@", // <monthname>, <year>
  'DG.MovableMonthDayHour': "(es)%@ %@ %@:00", // <monthname> <day> <hour>:00

  // DG.PlottedValueAdornment/DG.PlottedFunctionAdornment
  'DG.PlottedFormula.defaultNamePrompt': "(es)Formula",
  'DG.PlottedValue.namePrompt': "(es)Plotted Value",
  'DG.PlottedValue.formulaPrompt': "(es)value =",
  'DG.PlottedValue.formulaHint': "(es)",
  'DG.PlottedFunction.namePrompt': "(es)Plotted Function",
  'DG.PlottedFunction.formulaPrompt': "(es)f() =",
  'DG.PlottedFunction.formulaHint': "(es)Type an expression e.g. x*x/30 - 50",

  // DG.MapView
  'DG.MapView.showGrid': "(es)Show Grid", // "Show Grid"
  'DG.MapView.hideGrid': "(es)Hide Grid", // "Hide Grid"
  'DG.MapView.showPoints': "(es)Show Points", // "Show Points"
  'DG.MapView.hidePoints': "(es)Hide Points", // "Hide Points"
  'DG.MapView.marqueeHint': "(es)Marquee tool—drag select points in map", // "Marquee tool—drag select points in map"
  'DG.MapView.gridControlHint': "(es)Change size of grid rectangles", // "Change size of grid rectangles"

  // Inspector
  'DG.Inspector.values': "(es)Values", // "Values"
  'DG.Inspector.styles': "(es)Styles", // "Styles"
  'DG.Inspector.pointSize': "(es)Point size:", // "Point size:"
  'DG.Inspector.transparency': "(es)Transparency:", // "Transparency:"
  'DG.Inspector.color': "(es)Color:", // "Color:"
  'DG.Inspector.legendColor': "(es)Legend color:",  // "Legend color:"
  'DG.Inspector.backgroundColor': "(es)Background\ncolor:",  // "Background color:"
  'DG.Inspector.stroke': "(es)Stroke:", // "Stroke:"
  'DG.Inspector.rescale.toolTip': "(es)Rescale display to show all the data", // "Rescale display to show all the data"
  'DG.Inspector.mixUp.toolTip': "(es)Mixup all the points", // "Mixup all the points"
  'DG.Inspector.hideShow.toolTip': "(es)Show all cases or hide selected/unselected cases", // "Show all cases or hide selected/unselected cases"
  'DG.Inspector.delete.toolTip': "(es)Delete selected or unselected cases", // "Delete selected or unselected cases"
  'DG.Inspector.sliderValues.toolTip': "(es)Set slider animation direction, speed, …", // "Set slider animation direction, speed, …"
  'DG.Inspector.webViewEditURL.toolTip': "(es)Edit the URL of the displayed web page",  // "Edit the URL of the displayed web page"

  'DG.Inspector.selection.selectAll': "(es)Select All Cases", // "Select All Cases"
  'DG.Inspector.selection.deleteSelectedCases': "(es)Delete Selected Cases", // "Delete Selected Cases"
  'DG.Inspector.selection.deleteUnselectedCases': "(es)Delete Unselected Cases",    // "Delete Unselected Cases"
  'DG.Inspector.deleteAll': "(es)Delete All Cases",           // "Delete All Cases"
  'DG.Inspector.deleteDataSet': "(es)Delete and Destroy Data Set",        // "Delete Data Set"

  // Display Inspector
  'DG.Inspector.displayValues.toolTip': "(es)Change what is shown along with the points", // "Change what is shown along with the points"
  'DG.Inspector.displayStyles.toolTip': "(es)Change the appearance of the display", // "Change the appearance of the display"
  'DG.Inspector.makeImage.toolTip': "(es)Save the image as a PNG file", // "Save the image as a PNG file"
  'DG.Inspector.displayShow': "(es)Show …", // "Show …"

  // Color Picker
  'DG.Inspector.colorPicker.more': '(es)more', // more
  'DG.Inspector.colorPicker.less': '(es)less', // less

  // Graph Inspector
  'DG.Inspector.graphTransparency': "(es)Transparent", // "Transparent"
  'DG.Inspector.graphCount': "(es)Count", // "Count"
  'DG.Inspector.graphPercent': "(es)Percent",  // "Percent"
  'DG.Inspector.graphRow': "(es)Row",  // "Row"
  'DG.Inspector.graphColumn': "(es)Column",  // "Column"
  'DG.Inspector.graphCell': "(es)Cell",  // "Cell"
  'DG.Inspector.graphConnectingLine': "(es)Connecting Lines", // "Connecting Lines"
  'DG.Inspector.graphMovableLine': "(es)Movable Line", // "Movable Line"
  'DG.Inspector.graphInterceptLocked': "(es)Intercept Locked", // "Intercept Locked"
  'DG.Inspector.graphPlottedFunction': "(es)Plotted Function", // "Plotted Function"
  'DG.Inspector.graphSquares': "(es)Squares of Residuals", // "Squares of Residuals"
  'DG.Inspector.graphLSRL': "(es)Least Squares Line",  // "Least Squares Line"
  'DG.Inspector.graphMovableValue': "(es)Movable Value", // "Movable Value"
  'DG.Inspector.graphAdd': "(es)Add",  // "Add"
  'DG.Inspector.graphRemove': "(es)Remove",  // "Remove"
  'DG.Inspector.graphPlottedMean': "(es)Mean", // "Mean"
  'DG.Inspector.graphPlottedMedian': "(es)Median", // "Median"
  'DG.Inspector.graphPlottedStDev': "(es)Standard Deviation", // "Standard Deviation"
  'DG.Inspector.graphPlottedIQR': "(es)Interquartile Range", // "Interquartile Range"
  'DG.Inspector.graphPlottedBoxPlot': "(es)Box Plot",  // "Box Plot"
  'DG.Inspector.graphPlottedValue': "(es)Plotted Value", // "Plotted Value"

  // Table Inspector
  'DG.Inspector.attributes.toolTip': "(es)Make new attributes. Export case data.", // "Make new attributes. Export case data."
  'DG.Inspector.resize.toolTip': "(es)Resize all columns to fit data", // "Resize all columns to fit data"
  'DG.Inspector.newAttribute': "(es)New Attribute in %@...", // "New Attribute in %@..."
  'DG.Inspector.randomizeAllAttributes': "(es)Rerandomize All", // "Randomize Attributes"
  'DG.Inspector.exportCaseData': "(es)Export Case Data...", // "Export Case Data..."

  // Map Inspector
  'DG.Inspector.mapGrid': "(es)Grid", // "Grid"
  'DG.Inspector.mapPoints': "(es)Points", // "Points"
  'DG.Inspector.mapLines': "(es)Connecting Lines", // "Connecting Lines"

  // Game Controller
  'DG.GameController.continuityError': '(es)Sorry, after columns in the case table have been reordered, new data cannot be accepted.',

  // Game View
  'DG.GameView.loading': '(es)Loading',
  'DG.GameView.loadError': '(es)If you can see this text, loading the above URL may have failed. You can check the link in another browser tab or report the error to http://codap.concord.org/help.',

  // Controllers
  'DG.Component.closeComponent.confirmCloseMessage': '(es)Are you sure?',
  'DG.Component.closeComponent.confirmCloseDescription': '',
  'DG.Component.closeComponent.okButtonTitle': '(es)Yes, close it',
  'DG.Component.closeComponent.cancelButtonTitle': '(es)Cancel',
  'DG.GameController.confirmCloseDescription': '(es)If you close this, you may not be able to add more data.',

  // Web View
  'DG.WebView.defaultTitle': '(es)Web Page'
  });
