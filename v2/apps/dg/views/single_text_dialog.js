// ==========================================================================
//                          DG.SingleTextDialog
//
//  Implements a dialog with a single text field and Ok and Cancel buttons
//  Has options to hide the cancel button, and make the text field multi-line.
//
//  Authors:  William Finzer
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

  A simple dialog box with a label, a text edit view, a cancel button, and an OK button

  @extends SC.PalettePane
*/
DG.SingleTextDialog = SC.PalettePane.extend(
/** @scope DG.SingleTextDialog.prototype */ {

  isModal: true,
  // Use to opt in to allowing HTML in the prompt
  escapePromptHTML: true,

  layout: { width: 400, height: 120, centerX: 0, centerY: 0 },

  contentView: SC.View.extend({

    childViews: 'promptView editView okButton cancelButton'.w(),
    promptView: SC.LabelView.extend({
      displayProperties: ['escapeHTML'],
      layout: { top: 10, left: 5, right: 5, height:24 },
      localize: true,
      value: '',
      escapeHTMLBinding: '.parentView.parentView.escapePromptHTML'
    }),
    editView: SC.TextFieldView.design({
      layout: { top: 40, left: 5, right: 5, height:24 },
      value: '',
      isTextArea: false,
      spellCheckEnabled: false,
      classNames: 'dg-single-text-dialog-textfield'
    }),
    okButton: SC.ButtonView.design({
      layout: { bottom:5, right: 5, height:24, width: 90 },
      titleMinWidth: 0,
      localize: true,
      title: 'DG.SingleTextDialog.okButton.title',  // "OK"
      target: null,
      action: null,
      isDefault: true,
      isEnabledBinding: '.parentView.editView.value',
      classNames: 'dg-single-text-dialog-ok'
    }),
    cancelButton: SC.ButtonView.design({
      layout: { bottom:5, right: 115, height:24, width: 90 },
      titleMinWidth: 0,
      localize: true,
      title: 'DG.SingleTextDialog.cancelButton.title',  // "Cancel"
      target: null,
      action: null,
      toolTip: 'DG.SingleTextDialog.cancelButton.toolTip',  // "Dismiss the dialog without making any changes"
      isVisible: true,
      isCancel: true,
      classNames: 'dg-single-text-dialog-cancel'
    })
  }),

  value: function() {
    return this.getPath('contentView.editView.value');
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

/**
  Brings up the open/save dialog with the properties specified by the client.

  @param {Object} iProperties   Configuration properties for open/save dialog.
                                Clients should set the 'documentNameValue' to the default name
                                to display in the dialog, and the 'okTarget' and 'okAction'
                                to the method to be called when a name is entered.
                                Additional options include the titles of the buttons, tooltips
                                displayed for the dialog items, etc.
                                See the kParamMap below for details.

  @returns  {DG.SingleTextDialog} the created dialog
 */
DG.CreateSingleTextDialog = function( iProperties) {
  var tDialog = DG.SingleTextDialog.create( iProperties),
      kParamMap = {
        prompt: 'promptView.value',

        textValue: 'editView.value',
        textHint: 'editView.hint',
        textLimit: 'editView.maxLength',
        textIsMultiLine: 'editView.isTextArea',

        okTarget: 'okButton.target',
        okAction: 'okButton.action',
        okTooltip: 'okButton.toolTip',

        cancelTitle: 'cancelButton.title',
        cancelVisible: 'cancelButton.isVisible',
        cancelTooltip: 'cancelButton.toolTip'
      },
      tContentView = tDialog.get('contentView'),
      tEditView = tContentView.editView;

  // Loop through client-specified properties, applying them to the
  // appropriate property via its path given in the kParamMap.
  DG.ObjectMap.forEach( iProperties,
              function( iKey, iValue) {
                var tParamPath = kParamMap[ iKey];
                if( !SC.empty( tParamPath))
                  tContentView.setPath( tParamPath, iValue);
              } );

  // Put up the dialog
  tDialog.append();

  tEditView.becomeFirstResponder();

  return tDialog;
};

