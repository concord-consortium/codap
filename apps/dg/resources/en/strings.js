// ==========================================================================
//                              DG Strings
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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
  // mainPage.js
  'DG.mainPage.mainPane.logoutButton.title' : "Logout",
  'DG.mainPage.mainPane.logoutButton.toolTip' : "Log out the current user",
  'DG.mainPage.mainPane.versionString' : "Version %@ (%@)", // DG.VERSION, DG.BUILD_NUM
  'DG.mainPage.mainPane.messageView.value' : "Unfortunately, DG is not currently supported on your browser. " +
                                            "DG is supported on Internet Explorer 9+, Firefox 3.6+, Chrome 10+, and Safari 4+. " +
                                            "DG is not actively supported on other browsers at this time.",

  // DG.Authorization
  'DG.Authorization.guestUserName'            : "guest",
  'DG.Authorization.guestPassword'            : "",
  'DG.Authorization.loginPane.dialogTitle'    : "Data Games Login",
  'DG.Authorization.loginPane.userLabel'      : "User",
  'DG.Authorization.loginPane.passwordLabel'  : "Password",
  'DG.Authorization.loginPane.loginAsGuest'   : "Login as guest",
  'DG.Authorization.loginPane.login'          : "Login",
  'DG.Authorization.loginPane.registerLink'   : "<a href='http://"+DG.DRUPAL_SUBDOMAIN+"%@/user/register'>Create a new account</a>",
  'DG.Authorization.loginPane.recoveryLink'   : "<a href='http://"+DG.DRUPAL_SUBDOMAIN+"%@/user/password'>Forgot your password?</a>",
  'DG.Authorization.loginPane.error.general'  : "Error occurred while logging in",
  'DG.Authorization.loginPane.error.userDatabaseError' : "Error connecting to the user database",
  'DG.Authorization.loginPane.error.authFailed': "Invalid username or password",
  'DG.Authorization.loginPane.error.noResponse': "Could not connect to login server",
  'DG.Authorization.loginPane.error.sessionExpired': "Session expired, please login again",
  'DG.Authorization.loginPane.error.invalidSession': "Session invalid, please login again",

  // IS_BUILD variants of strings for InquirySpace
  'DG.mainPage.mainPane.versionString.IS_BUILD' : "Version %@ (%@ IS)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.

  // DG.IS_SRRI_BUILD variants of strings for SRRI build
  'DG.mainPage.mainPane.versionString.SRRI_BUILD' : "Version %@ (%@.srri7)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.
  'DG.Authorization.loginPane.registerLink.SRRI_BUILD' : "<a href='http://"+DG.DRUPAL_SUBDOMAIN+"%@/user/register'>Create a new account</a>",
  'DG.Authorization.loginPane.recoveryLink.SRRI_BUILD' : "<a href='http://"+DG.DRUPAL_SUBDOMAIN+"%@/user/password'>Forgot your password?</a>",

    // DG.AppController
  'DG.AppController.resetData.title' : "Clear Data...",
  'DG.AppController.resetData.toolTip' : "Delete all data from completed games",
  'DG.AppController.resetData.warnMessage' : "Do you really want to delete all the completed game data?",
  'DG.AppController.resetData.warnDescription' : "This action is not undoable.",
  'DG.AppController.resetData.okButtonTitle' : "Yes, delete the data",
  'DG.AppController.resetData.cancelButtonTitle' : "No, keep the data",
  'DG.AppController.fileMenuItems.openDocument' : "Open Document...",
  'DG.AppController.fileMenuItems.saveDocument' : "Save Document...",
  'DG.AppController.fileMenuItems.documentManager' : "Manage Documents...",
  'DG.AppController.fileMenuItems.closeDocument' : "Close Document...",
  'DG.AppController.fileMenuItems.importDocument' : "Import JSON Document...",
  'DG.AppController.fileMenuItems.exportDocument' : "Export JSON Document...",
  'DG.AppController.fileMenuItems.exportCaseData' : "Export Case Data...",
  'DG.AppController.closeDocument.warnMessage' : "Close the current document without saving?",
  'DG.AppController.closeDocument.warnDescription' : "This action is not undoable.",
  'DG.AppController.closeDocument.okButtonTitle' : "Close",
  'DG.AppController.closeDocument.cancelButtonTitle' : "Cancel",
  'DG.AppController.beforeUnload.confirmationMessage' : "The document contains unsaved changes.",
  'DG.AppController.optionMenuItems.reportProblem' : "Report Problem...",
  'DG.AppController.optionMenuItems.viewWebPage' : "View Web Page...",
  'DG.AppController.optionMenuItems.about' : "About Data Games...",
  'DG.AppController.optionMenuItems.releaseNotes' : "What's New?",
  'DG.AppController.optionMenuItems.help' : "Help...",
  'DG.AppController.optionMenuItems.logout' : "Logout",
  'DG.AppController.openDocument.prompt' : "Choose a document to open:",
  'DG.AppController.openDocument.okTitle' : "Open",
  'DG.AppController.openDocument.okTooltip' : "Open the specified document",
  'DG.AppController.openDocument.error.unknown' : "The document could not be opened because an unknown error occurred.",
  'DG.AppController.openDocument.error.general' : "The document could not be opened because an error occurred.",
  'DG.AppController.openDocument.error.notFound' : "The document could not be found.",
  'DG.AppController.openDocument.error.documentDatabaseConnectFailed' : "An error occurred while trying to connect to the database.",
  'DG.AppController.openDocument.error.permissions' : "The document could not be opened. Please have the owner make it a shared document in order to access it.",
  'DG.AppController.saveDocument.error.writeFailed' : "An error occurred when trying to save the document.",
  'DG.AppController.saveDocument.error.documentDatabaseConnectFailed' : "An error occurred while trying to connect to the database.",
  'DG.AppController.saveDocument.error.general' : "The document could not be saved because an error occurred.",
  'DG.AppController.saveDocument.prompt' : "Choose a name for the document:",
  'DG.AppController.saveDocument.okTitle' : "Save",
  'DG.AppController.saveDocument.okTooltip' : "Save the document with the specified name",
  'DG.AppController.importDocument.prompt' : "Paste a JSON document to import:",
  'DG.AppController.importDocument.okTitle' : "Import",
  'DG.AppController.importDocument.okTooltip' : "Import the specified JSON document",
  'DG.AppController.exportDocument.prompt' : "Copy the JSON document for export:",
  'DG.AppController.exportCaseData.prompt' : "Copy the case data, from:",
  'DG.AppController.exportCaseData.okTitle' : "Done",
  'DG.AppController.exportCaseData.okTooltip' : "Done with export",
  'DG.AppController.exportDocument.okTitle' : "Done",
  'DG.AppController.exportDocument.okTooltip' : "Done with JSON export",
  'DG.AppController.reportProblem.dialogTitle' : "Report Data Games Problem",

  // DG.OpenSaveDialog - Generally defaults which can be overridden by clients
  'DG.OpenSaveDialog.promptView.value' : "Choose a document/name",
  'DG.OpenSaveDialog.documentNameView.prompt' : "Document Name:",
  'DG.OpenSaveDialog.okButton.title' : "Open/Save",
  'DG.OpenSaveDialog.okButton.toolTip' : "Open/Save the specified document",
  'DG.OpenSaveDialog.cancelButton.title' : "Cancel",
  'DG.OpenSaveDialog.cancelButton.toolTip' : "Dismiss the dialog without making any changes",
  'DG.OpenSaveDialog.documentPermissions.title': "Shared",
  'DG.OpenSaveDialog.documentPermissions.toolTip' : "Allow other users to access this document?",
  'DG.OpenSaveDialog.loading' : "Loading document list...",
  'DG.OpenSaveDialog.noDocuments' : "No documents found",
  'DG.OpenSaveDialog.error.noResponse' : "Error retrieving document list",

  // DG.OpenSaveDialog - Generally defaults which can be overridden by clients
  'DG.SingleTextDialog.okButton.title' : "OK",
  'DG.SingleTextDialog.cancelButton.title' : "Cancel",
  'DG.SingleTextDialog.cancelButton.toolTip' : "Dismiss the dialog without making any changes",

  // DG.DocumentController
  'DG.DocumentController.calculatorTitle' : "Calculator",
  'DG.DocumentController.caseTableTitle' : "Case Table",
  'DG.DocumentController.graphTitle' : "Graph",
  'DG.DocumentController.sliderTitle' : "Slider",
  'DG.DocumentController.textTitle' : "Text",
  'DG.DocumentController.mapTitle' : "Map",
  'DG.DocumentController.saveDocument.errorMsg' : "The document could not be saved because an error occurred.",
  'DG.DocumentController.enterURLPrompt' : "Enter the URL of a web page to display",
  'DG.DocumentController.enterViewWebPageOKTip' : "Displays the web page given by the URL",

  // DG.DocumentListController
  'DG.DocumentListController.error.general' : "There was an error retrieving documents",
  'DG.DocumentListController.error.parseError' : "Unable to parse response from server",
  'DG.DocumentListController.error.documentDatabaseConnectFailed' : "Error connecting to database",

  // DG.Document
  'DG.Document.defaultDocumentName' : "Untitled Document",
  
  // DG.SliderView
  'DG.SliderView.thumbView.toolTip' : "Drag to change the slider's value",
  'DG.SliderView.startButton.toolTip' : "Start/stop animation",
  
  // DG.ToolButtonData
  'DG.ToolButtonData.fileMenu.title' : "File",
  'DG.ToolButtonData.fileMenu.toolTip' : "Save and open document (ctrl-s and ctrl-o)",
  'DG.ToolButtonData.gameMenu.title' : "Game",
  'DG.ToolButtonData.gameMenu.toolTip' : "Choose the game to play (ctrl-alt-shift-g)",
  'DG.ToolButtonData.tableButton.title' : "Table",
  'DG.ToolButtonData.tableButton.toolTip' : "Open/close the case table (ctrl-alt-t)",
  'DG.ToolButtonData.graphButton.title' : "Graph",
  'DG.ToolButtonData.graphButton.toolTip' : "Make a graph (ctrl-alt-g)",
  'DG.ToolButtonData.sliderButton.title' : "Slider",
  'DG.ToolButtonData.sliderButton.toolTip' : "Make a slider (ctrl-alt-s)",
  'DG.ToolButtonData.calcButton.title' : "Calc",
  'DG.ToolButtonData.calcButton.toolTip' : "Open/close the calculator (ctrl-alt-c)",
  'DG.ToolButtonData.textButton.title' : "Text",
  'DG.ToolButtonData.textButton.toolTip' : "Make a text object (ctrl-alt-shift-t)",
  'DG.ToolButtonData.mapButton.title' : "Map",
  'DG.ToolButtonData.mapButton.toolTip' : "Make a map",
  'DG.ToolButtonData.optionMenu.title' : "Options",
  'DG.ToolButtonData.optionMenu.toolTip' : "Delete data, report a problem, learn about Data Games, ...",
  
  // DG.DataContext
  'DG.DataContext.singleCaseName': "case",
  'DG.DataContext.pluralCaseName': "cases",
  'DG.DataContext.caseCountString': "%@1 %@2",  // %@1: count, %@2: case name string
  'DG.DataContext.setOfCasesLabel': "a collection",
  
  // DG.CollectionClient
  'DG.CollectionClient.cantEditFormulaErrorMsg': "The formula for attribute \"%@\" is not editable.",
  'DG.CollectionClient.cantEditFormulaErrorDesc': "Create a new attribute to be able to specify a formula.",
  
  // DG.Formula
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
  
  // DG.TableController
  'DG.TableController.gearMenuItems.newAttribute' : "New Attribute in %@...",
  'DG.TableController.gearMenuItems.setScoreFormula' : "Set Score Formula...",
  'DG.TableController.gearMenuItems.deleteCases' : "Delete Selected Cases",
  'DG.TableController.gearMenuItems.editAttribute' : "Edit %@ Formula",
  'DG.TableController.newAttrDlg.defaultAttrName' : "new_attr",
  'DG.TableController.newAttrDlg.attrNameHint' : "Enter a name for the new attribute",
  'DG.TableController.newAttrDlg.formulaHint' : "If desired, type a formula for computing values of this attribute",
  'DG.TableController.newAttrDlg.applyTooltip' : "Define the new attribute using the name and (optional) formula",
  'DG.TableController.newAttrDlg.mustEnterAttrNameMsg' : "Please enter a name for the new attribute",
  'DG.TableController.scoreAttrName' : "score",
  'DG.TableController.setScoreDlg.applyTooltip' : "Set the formula for the '%@' attribute",
  'DG.TableController.setScoreDlg.formulaHint' : "Type a formula for computing values of this attribute",

  // DG.AttributeFormulaView
  'DG.AttrFormView.attrNamePrompt' : "Attribute Name:",
  'DG.AttrFormView.formulaPrompt' : "Formula:",
  'DG.AttrFormView.operandMenuTitle' : "--- Insert Value ---",
  'DG.AttrFormView.functionMenuTitle' : "--- Insert Function ---",
  'DG.AttrFormView.applyBtnTitle' : "Apply",
  'DG.AttrFormView.cancelBtnTitle' : "Cancel",
  'DG.AttrFormView.cancelBtnTooltip' : "Dismiss the dialog without making any changes",
  
  // DG.CellLinearAxisView
  'DG.CellLinearAxisView.midPanelTooltip' : "Drag to translate axis scale",
  'DG.CellLinearAxisView.lowerPanelTooltip' : "Drag to change axis lower bound",
  'DG.CellLinearAxisView.upperPanelTooltip' : "Drag to change axis upper bound",
  
  // DG.PlotModel
  'DG.PlotModel.mixup' : "Mix Up the Plot",  // "Mix Up the Plot"
  'DG.PlotModel.showCount' : "Show Count",
  'DG.PlotModel.hideCount' : "Hide Count",

  // DG.DotPlotModel
  'DG.DotPlotModel.rescaleToData' : "Rescale to Data",
  'DG.DotPlotModel.showMovableValue' : "Show Movable Value",
  'DG.DotPlotModel.hideMovableValue' : "Hide Movable Value",
  'DG.DotPlotModel.showMean' : "Show Mean",
  'DG.DotPlotModel.hideMean' : "Hide Mean",
  'DG.DotPlotModel.showMedian' : "Show Median",
  'DG.DotPlotModel.hideMedian' : "Hide Median",
  'DG.DotPlotModel.showStDev' : "Show Standard Deviation",
  'DG.DotPlotModel.hideStDev' : "Hide Standard Deviation",
  'DG.DotPlotModel.showIQR' : "Show Inter-Quartile Range",
  'DG.DotPlotModel.hideIQR' : "Hide Inter-Quartile Range",
  'DG.DotPlotModel.hidePlottedValue' : "Hide Plotted Value",
  'DG.DotPlotModel.plotValue' : "Plot Value",

  // DG.ScatterPlotModel
  'DG.ScatterPlotModel.ShowConnectingLine' : "Show Connecting Lines",
  'DG.ScatterPlotModel.HideConnectingLine' : "Hide Connecting Lines",
  'DG.ScatterPlotModel.UnlockIntercept' : "Unlock Intercept",
  'DG.ScatterPlotModel.LockIntercept' : "Lock Intercept at Zero",

  // DG.LegendView
  'DG.LegendView.attributeTooltip' : "Click to change legend attribute",  // "Click to change legend attribute"

  // DG.NumberToggleView
  'DG.NumberToggleView.overallTooltip' : "Click numbers to show one. Click label to show all.",  // "Click to toggle visibility"

  // DG.PlottedAverageAdornment
  'DG.PlottedAverageAdornment.meanValueTitle' : "mean=%@", // "mean=123.456"
  'DG.PlottedAverageAdornment.medianValueTitle' : "median=%@", // "median=123.456"
  'DG.PlottedAverageAdornment.stDevValueTitle' : "\xB11 SD, %@", // "st.dev=123.456"
  'DG.PlottedAverageAdornment.iqrValueTitle' : "IQR=%@", // "iqr=123.456"
  'DG.PlottedCountAdornment.title' : "%@ %@, %@%", // "12 cases, 50%"

   // DG.GraphModel
   'DG.GraphMenu.attribute_x': "X: %@", // %@ = attribute name
   'DG.GraphMenu.attribute_y': "Y: %@", // %@ = attribute name
   'DG.GraphMenu.attribute_legend': "Legend: %@", // %@ = attribute name
   'DG.GraphMenu.remove': "Remove Attribute",
   'DG.GraphMenu.removeAttribute_x': "Remove X: %@", // %@ = attribute name
   'DG.GraphMenu.removeAttribute_y': "Remove Y: %@", // %@ = attribute name
   'DG.GraphMenu.removeAttribute_legend': "Remove Legend: %@", // %@ = attribute name
   'DG.GraphMenu.treatAsCategorical': "Treat as Categorical",
   'DG.GraphMenu.treatAsNumeric': "Treat as Numeric",
   'DG.GraphMenu.hide': "Hide and Show",
   'DG.GraphMenu.hideSelectedPlural': "Hide Selected Cases",
   'DG.GraphMenu.hideUnselectedPlural': "Hide Unselected Cases",
   'DG.GraphMenu.hideSelectedSing': "Hide Selected Case",
   'DG.GraphMenu.hideUnselectedSing': "Hide Unselected Case",
   'DG.GraphMenu.showAll': "Show All Cases",

   // DG.GraphView
   'DG.GraphView.replaceAttribute': "Replace %@ with %@",  // both %@ are attribute names
   'DG.GraphView.addAttribute': "Add attribute %@",  // %@ is attribute name
   'DG.GraphView.addToEmptyPlace': "Create axis with %@",  // %@ is attribute name
   'DG.GraphView.dropInPlot': "Color points by values of %@"  // %@ is attribute name
  }
) ;
