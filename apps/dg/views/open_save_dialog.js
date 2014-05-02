// ==========================================================================
//                          DG.OpenSaveDialog
// 
//  Implements a primitive open/save dialog which allows the user to type 
//  the name of the document to open/save.
//  
//  Authors:  Kirk Swenson
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

/** @class

  @extends SC.PalettePane
*/
DG.OpenSaveDialog = SC.PalettePane.extend(
/** @scope DG.OpenSaveDialog.prototype */ {

  isModal: true,

  dialogType: null, // { DG.OpenSaveDialog.kOpenDialog, DG.OpenSaveDialog.kSaveDialog }

  layout: { width: 400, height: 120, centerX: 0, centerY: 0 },

  contentView: SC.View.extend({
    dialogType: null, // { DG.OpenSaveDialog.kOpenDialog, DG.OpenSaveDialog.kSaveDialog }

    childViews: ['promptView', 'documentListView', 'documentNameView',
                  'documentPermissionsView', 'okButton', 'cancelButton'],
    promptView: SC.LabelView.extend({
      layout: { top: 10, left: 5, right: 5, height:24 },
      localize: true,
      value: 'DG.OpenSaveDialog.promptView.value'   // "Choose a document/name" 
    }),
    documentListView: SC.SelectFieldView.design({
      layout: { top: 40, left: 5, right: 5, height:24 },
      nameKey: 'name',
      valueKey: 'id',
      disableSort: true // clients should pass the array sorted appropriately
//       isVisibleBinding: SC.Binding.from('.parentView.dialogType')
    }),
    documentNameView: SC.TextFieldView.design({
      layout: { top: 40, left: 5, right: 5, height:24 },
      value: '',
      spellCheckEnabled: false,
      leftAccessoryView: SC.LabelView.create( {
                          layout: { left: 1, width: 105, height:22, centerY: 0 },
                          localize: true,
                          value: 'DG.OpenSaveDialog.documentNameView.prompt', // "Document Name:"
                          backgroundColor: 'lightgray'
                        })
//       isVisibleBinding: SC.Binding.from('.parentView.dialogType')
    }),

    /**IMPORTANT**/
    //This has been disabled until further design decisions have been made about how to inform the user of this feature
    //and how it will look in both the DG App, and Drupal site.  As far as I've tested, it is fully functional and need
    //only be uncommented, and childView added in the SC.View.extend, and uncommenting the tDocumentPermissions in
    //DG.CreateOpenSaveDialog at the end of this file to allow the shared checkbox to appear again and function.
    //Until then, permissions will still be in place, but essentially all documents will be set to private
    //which is the default, and the user will have no way of changing the permissions on it as the Drupal documents
    //manager will no longer have permissions showing also.

    //permissions for documents consists of private(0), or public(1), more permission levels possible at later
    //date, e.g. group-share.
    documentPermissionsView: SC.CheckboxView.design({
      value: 0,
      toggleOnValue: 1,
      toggleOffValue: 0,
      localize: true,
      title: 'DG.OpenSaveDialog.documentPermissions.title',
      toolTip: 'DG.OpenSaveDialog.documentPermissions.toolTip',
      layout: {bottom: 10, left: 15 , width: 100, height: 17}
    }),
    okButton: SC.ButtonView.design({
      layout: { bottom:5, right: 5, height:24, width: 90 },
      titleMinWidth: 0,
      localize: true,
      title: 'DG.OpenSaveDialog.okButton.title',  // "Open/Save"
      target: null,
      action: null,
      toolTip: 'DG.OpenSaveDialog.okButton.toolTip',  // "Open/Save the specified document",
      // Ideally, we should disable the OK button when the document name field is empty.
      //isEnabledBinding: SC.Binding.oneWay('*parentView.documentNameView.value').notEmpty(),
      isDefault: true
    }),
    cancelButton: SC.ButtonView.design({
      layout: { bottom:5, right: 115, height:24, width: 90 },
      titleMinWidth: 0,
      localize: true,
      title: 'DG.OpenSaveDialog.cancelButton.title',  // "Cancel"
      target: null,
      action: null,
      toolTip: 'DG.OpenSaveDialog.cancelButton.toolTip',  // "Dismiss the dialog without making any changes"
      isCancel: true
    })
  }),
  
  documentName: function() {
    switch( this.get('dialogType')) {
    case DG.OpenSaveDialog.kOpenDialog:
      var docList = this.getPath('contentView.documentListView.objects'),
          i, docCount = docList && docList.get('length'),
          docID = this.getPath('contentView.documentListView.fieldValue');
      for( i = 0; i < docCount; ++i) {
        var docEntry = docList.objectAt( i);
        if( docEntry.id === docID)
          return docEntry.name;
      }
      return null;
    case DG.OpenSaveDialog.kSaveDialog:
      return this.getPath('contentView.documentNameView.value');
    default:
    }
    return '';
  }.property(),

  documentID: function() {
    switch( this.get('dialogType')) {
    case DG.OpenSaveDialog.kOpenDialog:
      return this.getPath('contentView.documentListView.fieldValue');
    default:
    }
    return null;
  }.property(),

  documentPermissions: function() {
    return this.getPath('contentView.documentPermissionsView.value');
  }.property(),

  init: function() {
    sc_super();

    // By default, cancel simply closes the dialog
    this.setPath('contentView.cancelButton.target', this);
    this.setPath('contentView.cancelButton.action', 'close');
  },
  
  /**
    Close the open/save dialog.
    
    Call this function from your okButton/cancelButton action handlers.
    (The default cancelButton handler simply calls this method directly.)
   */
  close: function() {
    // Not clear what the best way to close/destroy is.
    this.remove();
    this.destroy();
  }
});

DG.OpenSaveDialog.kOpenDialog = 1;
DG.OpenSaveDialog.kSaveDialog = 2;

/**
  Brings up the open/save dialog with the properties specified by the client.
  
  @param {Object} iProperties   Configuration properties for open/save dialog.
                                Clients should set the 'documentNameValue' to the default name
                                to display in the dialog, and the 'okTarget' and 'okAction'
                                to the method to be called when a name is entered.
                                Additional options include the titles of the buttons, tooltips
                                displayed for the dialog items, etc.
                                See the kParamMap below for details.
  
  @returns  {DG.OpenSaveDialog} the created dialog
 */
DG.CreateOpenSaveDialog = function( iProperties) {
  var tDialog = DG.OpenSaveDialog.create( iProperties),
      kParamMap = {
        dialogType: 'dialogType', // { DG.OpenSaveDialog.kOpenDialog, DG.OpenSaveDialog.kSaveDialog }
        
        prompt: 'promptView.value',

        documentList: 'documentListView.objects',

        documentNamePrompt: 'documentNameView.leftAccessoryView.value',
        documentNameValue: 'documentNameView.value',
        documentNameHint: 'documentNameView.hint',
        documentNameIsEnabled: 'documentNameView.isEnabled',
        documentPermissionValue: 'documentPermissionsView.value',
        
        okTitle: 'okButton.title',
        okTarget: 'okButton.target',
        okAction: 'okButton.action',
        okTooltip: 'okButton.toolTip',
        
        cancelTitle: 'cancelButton.title',
        cancelTooltip: 'cancelButton.toolTip'
      },
      tContentView = tDialog.get('contentView'),
      tDocListView = tContentView.get('documentListView'),
      tDocNameView = tContentView.get('documentNameView'),
      tDocPermissionsView = tContentView.get('documentPermissionsView'),
      // "Shared" check-box shown on save dialog for supported configurations
      permissionsVisibility = DG.supports('docSavePermissions') &&
                              (tDialog.get('dialogType') === DG.OpenSaveDialog.kSaveDialog);
  
  // Loop through client-specified properties, applying them to the
  // appropriate property via its path given in the kParamMap.
  DG.ObjectMap.forEach( iProperties,
              function( iKey, iValue) {
                var tParamPath = kParamMap[ iKey];
                if( !SC.empty( tParamPath))
                  tContentView.setPath( tParamPath, iValue);
              } );

  // Should be able to do this with bindings instead of code
  tDocListView.set('isVisible', tDialog.get('dialogType') === DG.OpenSaveDialog.kOpenDialog);
  tDocNameView.set('isVisible', tDialog.get('dialogType') === DG.OpenSaveDialog.kSaveDialog);
  tDocPermissionsView.set('isVisible', permissionsVisibility);

  // Put up the dialog
  tDialog.append();

  // Make the document name edit view the first responder
  switch( tDialog.get('dialogType')) {
  case DG.OpenSaveDialog.kOpenDialog:
    tDocListView.becomeFirstResponder();
    break;
  case DG.OpenSaveDialog.kSaveDialog:
    tDocNameView.becomeFirstResponder();
    break;
  default:
  }
  return tDialog;
};

