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
  // mainPage.js
  'DG.mainPage.mainPane.logoutButton.title' : "Logout",
  'DG.mainPage.mainPane.logoutButton.toolTip' : "Log out the current user",
  'DG.mainPage.mainPane.undoButton.title' : "Undo",
  'DG.mainPage.mainPane.undoButton.toolTip' : "Undo the last action",
  'DG.mainPage.mainPane.redoButton.title' : "Redo",
  'DG.mainPage.mainPane.redoButton.toolTip' : "Redo the last undone action",
  'DG.mainPage.mainPane.versionString' : "Version %@ (%@)", // DG.VERSION, DG.BUILD_NUM
  'DG.mainPage.mainPane.messageView.value' : "Unfortunately, DG is not currently supported on your browser. " +
                                            "DG is supported on Internet Explorer 9+, Firefox 3.6+, Chrome 10+, and Safari 4+. " +
                                            "DG is not actively supported on other browsers at this time.",

  // DG.UserEntryDialog
  'DG.UserEntryDialog.welcome'                 : 'Welcome to CODAP',
  'DG.UserEntryDialog.welcome2'                : 'What would you like to do?',
  'DG.UserEntryDialog.openNew.option'          : 'Start a New Document...',
  'DG.UserEntryDialog.openNew.prompt'          : 'Please provide a title for your new document:',
  'DG.UserEntryDialog.openNew.titleFieldHint'  : 'Enter a document title here...',
  'DG.UserEntryDialog.openNew.button'          : 'OK',
  'DG.UserEntryDialog.openNew.buttonTooltip'   : 'Create a new document with the specified title',
  'DG.UserEntryDialog.openFile.option'         : 'Open a Local Document...',
  'DG.UserEntryDialog.openFile.prompt'         : 'Select a document to open:',
  'DG.UserEntryDialog.openFile.button'         : 'Open',
  'DG.UserEntryDialog.openFile.buttonTooltip'  : 'Open the specified document',
  'DG.UserEntryDialog.documentServer.option'   : 'Browse the CODAP Cloud...',
  'DG.UserEntryDialog.openExample.option'      : 'Example Documents',
  'DG.UserEntryDialog.openExample.prompt'      : 'Choose an example to open:',
  'DG.UserEntryDialog.openExample.okTitle'     : 'Open',
  'DG.UserEntryDialog.openExample.okTooltip'   : 'Open the specified example',

  // DG.Authorization
  'DG.Authorization.guestUserName'            : "guest",
  'DG.Authorization.guestPassword'            : "",
  'DG.Authorization.loginPane.dialogTitle'    : "CODAP Login",
  'DG.Authorization.loginPane.userLabel'      : "User",
  'DG.Authorization.loginPane.passwordLabel'  : "Password",
  'DG.Authorization.loginPane.loginAsGuest'   : "Login as guest",
  'DG.Authorization.loginPane.login'          : "Login",
  'DG.Authorization.loginPane.registerLink'   : "<a href='http://%@/user/register'>Create a new account</a>",
  'DG.Authorization.loginPane.recoveryLink'   : "<a href='http://%@/user/password'>Forgot your password?</a>",
  'DG.Authorization.loginPane.documentStoreSignInHref': "%@user/authenticate",
  'DG.Authorization.loginPane.error.general'  : "Error occurred while logging in",
  'DG.Authorization.loginPane.error.userDatabaseError' : "Error connecting to the user database",
  'DG.Authorization.loginPane.error.authFailed': "Invalid username or password",
  'DG.Authorization.loginPane.error.noResponse': "Could not connect to login server",
  'DG.Authorization.loginPane.error.sessionExpired': "Session expired, please login again",
  'DG.Authorization.loginPane.error.invalidSession': "Session invalid, please login again",
  'DG.Authorization.loginPane.error.notLoggedIn': "Please log in before continuing.",

  // IS_BUILD variants of strings for InquirySpace
  'DG.mainPage.mainPane.versionString.IS_BUILD' : "Version %@ (%@ IS)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.
  'DG.Authorization.loginPane.registerLink.IS_BUILD' : "",
  'DG.Authorization.loginPane.recoveryLink.IS_BUILD' : "",
  'DG.Authorization.loginPane.documentStoreSignInHref.IS_BUILD': "%@user/authenticate",

  // DG.IS_SRRI_BUILD variants of strings for SRRI build
  'DG.mainPage.mainPane.versionString.SRRI_BUILD' : "Version %@ (%@.srri10)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.
  'DG.Authorization.loginPane.registerLink.SRRI_BUILD' : "<a href='http://%@/user/register'>Create a new account</a>",
  'DG.Authorization.loginPane.recoveryLink.SRRI_BUILD' : "<a href='http://%@/user/password'>Forgot your password?</a>",
  'DG.Authorization.loginPane.documentStoreSignInHref.SRRI_BUILD': "%@user/authenticate",

  // Session expiration dialog
  'DG.Authorization.sessionExpired.message': 'Your session has expired. In order to continue saving, please log in.',
  'DG.Authorization.sessionExpired.loginButtonText': 'Log In',
  'DG.Authorization.sessionExpired.loginButtonTooltip': 'Abort this current session and log in again.',
  'DG.Authorization.sessionExpired.ignoreButtonText': 'Ignore',
  'DG.Authorization.sessionExpired.ignoreButtonTooltip': 'Ignore this error and attempt to continue working.',

  // DG.AppController
  'DG.AppController.resetData.title' : "Clear Data...",
  'DG.AppController.resetData.toolTip' : "Delete all data from current document",
  'DG.AppController.resetData.warnMessage' : "Do you really want to delete all the data in this document?",
  'DG.AppController.resetData.warnDescription' : "This action is not undoable.",
  'DG.AppController.resetData.okButtonTitle' : "Yes, delete the data",
  'DG.AppController.resetData.cancelButtonTitle' : "No, keep the data",
  'DG.AppController.fileMenuItems.openDocument' : "Open Document...",
  'DG.AppController.fileMenuItems.saveDocument' : "Save Document...",
  'DG.AppController.fileMenuItems.copyDocument' : "Make a Copy...",
  'DG.AppController.fileMenuItems.documentManager' : "Manage Documents...",
  'DG.AppController.fileMenuItems.closeDocument' : "Close Document...",
  'DG.AppController.fileMenuItems.importData' : "Import Data...",
  'DG.AppController.fileMenuItems.importDocument' : "Import CODAP Document...",
  'DG.AppController.fileMenuItems.exportDocument' : "Export CODAP Document...",
  'DG.AppController.fileMenuItems.showShareLink' : "Share Document...",
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
  'DG.AppController.copyDocument.error.writeFailed' : "An error occurred when trying to copy the document.",
  'DG.AppController.copyDocument.error.documentDatabaseConnectFailed' : "An error occurred while trying to connect to the database.",
  'DG.AppController.copyDocument.error.general' : "The document could not be copied because an error occurred.",
  'DG.AppController.copyDocument.prompt' : "Choose a name for the document:",
  'DG.AppController.copyDocument.okTitle' : "Copy",
  'DG.AppController.copyDocument.okTooltip' : "Copy the document with the specified name",
  'DG.AppController.deleteDocument.error.unknown' : "The document could not be deleted because an unknown error occurred.",
  'DG.AppController.deleteDocument.error.general' : "The document could not be deleted because an error occurred.",
  'DG.AppController.deleteDocument.error.notFound' : "The document could not be found.",
  'DG.AppController.deleteDocument.error.documentDatabaseConnectFailed' : "An error occurred while trying to connect to the database.",
  'DG.AppController.deleteDocument.error.permissions' : "The document could not be deleted because you do not have the correct permissions.",
  'DG.AppController.revertDocument.title' : "Revert to Original...",
  'DG.AppController.revertDocument.toolTip' : "Revert the current document to its original state.",
  'DG.AppController.revertDocument.warnMessage' : "Do you really want to revert your current document?",
  'DG.AppController.revertDocument.warnDescription' : "You will lose all changes, and this action is not undoable.",
  'DG.AppController.revertDocument.okButtonTitle' : "Revert",
  'DG.AppController.revertDocument.cancelButtonTitle' : "Cancel",
  'DG.AppController.renameDocument.error.unknown' : "The document could not be renamed because an unknown error occurred.",
  'DG.AppController.renameDocument.error.general' : "The document could not be renamed because an error occurred.",
  'DG.AppController.renameDocument.error.notFound' : "The document to rename could not be found.",
  'DG.AppController.renameDocument.error.duplicate' : "A document with the new name already exists!",
  'DG.AppController.renameDocument.error.permissions' : "The document could not be renamed because you do not have the correct permissions.",
  'DG.AppController.importDocument.prompt' : "Select a CODAP document to import:",
  'DG.AppController.importDocument.alert' : "Alert: The specified file is not a CODAP document.",
  'DG.AppController.importDocument.okTitle' : "Import",
  'DG.AppController.importDocument.okTooltip' : "Import the specified CODAP document",
  'DG.AppController.importData.prompt' : "Select a data file to import:",
  'DG.AppController.importData.alert' : "Alert: The specified file is not a data file.",
  'DG.AppController.importData.okTitle' : "Import",
  'DG.AppController.importData.okTooltip' : "Import the specified data",
  'DG.AppController.exportDocument.prompt' : "Filename:",
  'DG.AppController.exportCaseData.prompt' : "Copy the case data, from:",
  'DG.AppController.exportCaseData.okTitle' : "Done",
  'DG.AppController.exportCaseData.okTooltip' : "Done with export",
  'DG.AppController.exportDocument.okTitle' : "Done",
  'DG.AppController.exportDocument.okTooltip' : "Done with CODAP export",
  'DG.AppController.feedbackDialog.dialogTitle' : "Provide Feedback",
  'DG.AppController.feedbackDialog.subHeaderText' : "Your feedback is important to us!",
  'DG.AppController.feedbackDialog.messageText' : "Please let us know how we can continue to improve our product.\n Questions, bug reports and feature requests are all welcome. Thank you!",
  'DG.AppController.feedbackDialog.subjectHint' : "What is your feedback about",
  'DG.AppController.feedbackDialog.feedbackHint' : "Details",
  'DG.AppController.feedbackDialog.submitFeedbackButton' : "Submit feedback",
  'DG.AppController.feedbackDialog.cancelFeedbackButton' : "Cancel",
  'DG.AppController.manageDocumentsURL' : '/datagames_documents_manager', // path on Drupal website
  'DG.AppController.showWebSiteURL' : 'concord.org/projects/codap', // Changed from path on Drupal website to CC project site
  'DG.AppController.showWebSiteTitle' : 'About CODAP',
  'DG.AppController.showHelpURL' : 'codap.concord.org/help', // path on Drupal website
  'DG.AppController.showHelpTitle' : 'Help with CODAP',
  'DG.AppController.showAboutURL' : 'DataGames/WebPages/about/aboutDG.html', // path on Drupal website
  'DG.AppController.showAboutTitle' : 'About CODAP',
  'DG.AppController.showReleaseNotesURL' : 'http://play.ccssgames.com/release_notes', // path on Drupal website
  'DG.AppController.showReleaseNotesTitle' : 'CODAP Release Notes',
  'DG.AppController.shareLinkDialog.title' : 'Share',
  'DG.AppController.shareLinkDialog.shareButtonLabel' : 'Shareable',
  'DG.AppController.shareLinkDialog.okButtonTitle' : 'OK',
  'DG.AppController.shareLinkDialog.instructions' : "<p>Use the link below to share this document with others:</p>",
  'DG.AppController.shareLinkDialog.saveWarning' : "<p>Warning: Make sure to save your document and mark it as shared!</p>",
  'DG.AppController.copyLinkDialog.title' : 'Copy complete',
  'DG.AppController.copyLinkDialog.okButtonTitle' : 'Go!',
  'DG.AppController.copyLinkDialog.instructions' : "<p>Your document copy is now ready.<br/>Click the Go! button to open it in a new window/tab.</p>",
  'DG.AppController.dropURLDialog.message' : 'What do you want to do with the URL you dragged in?',
  'DG.AppController.dropURLDialog.description' : 'There are two possibilities:',
  'DG.AppController.dropURLDialog.ignore' : 'Ignore',
  'DG.AppController.dropURLDialog.embedDI' : 'Embed a data interactive',
  'DG.AppController.dropURLDialog.embedWV' : 'Embed a web view',
  'DG.AppController.dropFile.error' : 'Error: %@1',  // Error: <error text>
    'DG.AppController.validateDocument.missingRequiredProperty' : 'Required property not found: %@1',
    'DG.AppController.validateDocument.unexpectedProperty' : 'Unexpected top-level property: %@1',
    'DG.AppController.validateDocument.unresolvedID' : 'Unresolved id: %@1',
    'DG.AppController.validateDocument.parseError' : 'Parse error: %@1',
    'DG.AppController.validateDocument.invalidDocument' : 'Invalid JSON Document: %@1',


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
  'DG.OpenSaveDialog.noExamples' : "No examples found",
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
  'DG.ToolButtonData.tableButton.title' : "Tables",
  'DG.ToolButtonData.tableButton.toolTip' : "Open a case table for each data set(ctrl-alt-t)",
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
  'DG.ToolButtonData.optionMenu.toolTip' : "Help, activities, learn about CODAP, ...",
  'DG.ToolButtonData.guideMenu.title' : "Guide",
  'DG.ToolButtonData.guideMenu.toolTip' : "Show the guide for this activity and navigate within it",
  'DG.ToolButtonData.guideMenu.showGuide' : "Show Guide",

  // Undo / Redo
  'DG.Undo.exceptionOccurred': "An error occurred while trying to undo.",
  'DG.Undo.componentMove': "Undo moving the component",
  'DG.Undo.componentResize': "Undo resizing the component",
  'DG.Undo.axisDilate': "Undo rescaling the axis",
  'DG.Undo.axisDrag': "Undo dragging the axis",
  'DG.Undo.axisAttributeChange': "Undo changing the axis attribute",
  'DG.Undo.toggleComponent.add.calcView': "Undo showing the calculator",
  'DG.Undo.toggleComponent.delete.calcView': "Undo hiding the calculator",
  'DG.Undo.toggleComponent.add.mapView': "Undo showing the map",
  'DG.Undo.toggleComponent.delete.mapView': "Undo hiding the map",
  'DG.Undo.toggleComponent.add.caseTableView': "Undo showing the case table",
  'DG.Undo.toggleComponent.delete.caseTableView': "Undo hiding the case table",

  'DG.Redo.exceptionOccurred': "An error occurred while trying to redo.",
  'DG.Redo.componentMove': "Redo moving the component",
  'DG.Redo.componentResize': "Redo resizing the component",
  'DG.Redo.axisDilate': "Redo rescaling the axis",
  'DG.Redo.axisDrag': "Redo dragging the axis",
  'DG.Redo.axisAttributeChange': "Redo changing the axis attribute",
  'DG.Redo.toggleComponent.add.calcView': "Redo showing the calculator",
  'DG.Redo.toggleComponent.delete.calcView': "Redo hiding the calculator",
  'DG.Redo.toggleComponent.add.mapView': "Redo showing the map",
  'DG.Redo.toggleComponent.delete.mapView': "Redo hiding the map",
  'DG.Redo.toggleComponent.add.caseTableView': "Redo showing the case table",
  'DG.Redo.toggleComponent.delete.caseTableView': "Redo hiding the case table",

  // DG.DataContext
  'DG.DataContext.singleCaseName': "case",
  'DG.DataContext.pluralCaseName': "cases",
  'DG.DataContext.caseCountString': "%@1 %@2",  // %@1: count, %@2: case name string
  'DG.DataContext.setOfCasesLabel': "a collection",
  'DG.DataContext.collapsedRowString': "%@1 of %@2",

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
  'DG.TableController.headerMenuItems.editAttribute' : "Edit Formula...",
  'DG.TableController.headerMenuItems.renameAttribute' : "Rename Attribute...",
  'DG.TableController.headerMenuItems.deleteAttribute' : "Delete Attribute...",
  'DG.TableController.gearMenuItems.newAttribute' : "New Attribute in %@...",
  'DG.TableController.gearMenuItems.setScoreFormula' : "Set Score Formula...",
  'DG.TableController.gearMenuItems.deleteCases' : "Delete Selected Cases",
  'DG.TableController.gearMenuItems.selectAll' : "Select All Cases",
  'DG.TableController.gearMenuItems.exportCaseData' : "Export Case Data...",
  'DG.TableController.newAttrDlg.defaultAttrName' : "new_attr",
  'DG.TableController.newAttrDlg.attrNameHint' : "Enter a name for the new attribute",
  'DG.TableController.newAttrDlg.formulaHint' : "If desired, type a formula for computing values of this attribute",
  'DG.TableController.newAttrDlg.applyTooltip' : "Define the new attribute using the name and (optional) formula",
  'DG.TableController.newAttrDlg.mustEnterAttrNameMsg' : "Please enter a name for the new attribute",
  'DG.TableController.renameAttributePrompt' : "Enter a new name for the attribute:",
  'DG.TableController.renameAttributeOKTip' : "Accept the new attribute name",
  'DG.TableController.renameAttributeInvalidMsg' : "Attribute names may not be empty",
  'DG.TableController.renameAttributeInvalidDesc' : "Please enter a valid attribute name",
  'DG.TableController.renameAttributeDuplicateMsg' : "An attribute with that name already exists",
  'DG.TableController.renameAttributeDuplicateDesc' : "Please enter a unique attribute name",
  'DG.TableController.deleteAttribute.confirmMessage' : "Delete the attribute '%@'?",
  'DG.TableController.deleteAttribute.confirmDescription' : "This action cannot be undone.",
  'DG.TableController.deleteAttribute.okButtonTitle' : "Delete Attribute",
  'DG.TableController.deleteAttribute.cancelButtonTitle' : "Cancel",
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
  
  // DG.GuideConfigurationView
  'DG.GuideConfigView.titlePrompt' : "Guide Title",
  'DG.GuideConfigView.titleHint' : "Activity Name",
  'DG.GuideConfigView.itemTitleHint' : "Section Name",
  'DG.GuideConfigView.itemURLHint' : "URL of section",
  'DG.GuideConfigView.okBtnTitle' : "OK",
  'DG.GuideConfigView.okBtnToolTip' : "Accept the Guide menu items",
  'DG.GuideConfigView.cancelBtnTitle' : "Cancel",
  'DG.GuideConfigView.cancelBtnTooltip' : "Dismiss the dialog without making any changes",
  'DG.GuideConfigView.httpWarning' : "The URL must start with either http:// or https://",

  'DG.DataDisplayModel.rescaleToData' : "Rescale to Data",
  'DG.DataDisplayModel.ShowConnectingLine' : "Show Connecting Lines",
  'DG.DataDisplayModel.HideConnectingLine' : "Hide Connecting Lines",

  // DG.CellLinearAxisView
  'DG.CellLinearAxisView.midPanelTooltip' : "Drag to translate axis scale",
  'DG.CellLinearAxisView.lowerPanelTooltip' : "Drag to change axis lower bound",
  'DG.CellLinearAxisView.upperPanelTooltip' : "Drag to change axis upper bound",
  
  // DG.PlotModel
  'DG.PlotModel.mixup' : "Mix Up the Plot",  // "Mix Up the Plot"
  'DG.PlotModel.showCount' : "Show Count",
  'DG.PlotModel.hideCount' : "Hide Count",

  // DG.DotPlotModel
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
  'DG.ScatterPlotModel.UnlockIntercept' : "Unlock Intercept",
  'DG.ScatterPlotModel.LockIntercept' : "Lock Intercept at Zero",

  // DG.LegendView
  'DG.LegendView.attributeTooltip' : "Click to change legend attribute",  // "Click to change legend attribute"

  // DG.NumberToggleView
  'DG.NumberToggleView.showAll' : "Show All -",  // "Show All"
  'DG.NumberToggleView.hideAll' : "Hide All -",  // "Hide All"
  'DG.NumberToggleView.showAllTooltip' : "Click numbers to toggle visibility. Click label to show all.",  // "Click numbers to toggle visibility. Click label to show all."
  'DG.NumberToggleView.hideAllTooltip' : "Click numbers to toggle visibility. Click label to hide all.",  // "Click numbers to toggle visibility. Click label to hide all."
  'DG.NumberToggleView.indexTooltip' : "Click to toggle visibility.",  // "Click to toggle visibility."

  // DG.PlottedAverageAdornment
  'DG.PlottedAverageAdornment.meanValueTitle' : "mean=%@", // "mean=123.456"
  'DG.PlottedAverageAdornment.medianValueTitle' : "median=%@", // "median=123.456"
  'DG.PlottedAverageAdornment.stDevValueTitle' : "\xB11 SD, %@", // "st.dev=123.456"
  'DG.PlottedAverageAdornment.iqrValueTitle' : "IQR=%@", // "iqr=123.456"
  'DG.PlottedCountAdornment.title' : "%@ %@, %@%", // "12 cases, 50%"

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
    'DG.MapView.gridControlHint': "Change size of grid rectangles"  // "Change size of grid rectangles"
  }
) ;
