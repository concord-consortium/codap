// ==========================================================================
//                          DG.FileImportDialog
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

sc_require('views/single_text_dialog');

/** @class

    A dialog box to manage importing a document from the file system. Has a
    label, a file import view, an initially
    hidden alert buttong, a cancel button, and an OK button.

 @extends SC.PalettePane
 */
DG.FileImportDialog = DG.SingleTextDialog.extend(
  /** @scope DG.FileImportDialog.prototype */ {
    contentView: SC.View.extend({

            childViews: 'promptView editView alertView okButton cancelButton'.w(),
            promptView: SC.LabelView.extend({
                layout: { top: 10, left: 5, right: 5, height:24 },
                localize: true,
                value: ''
            }),
            editView: DG.FileImportView.design({
                layout: { top: 40, left: 5, right: 5, height:24 },
                value: '',
                isTextArea: false,
                spellCheckEnabled: false
            }),
            // alertView: Initially invisible, only exposed if invalid file
            // uploaded
            alertView: SC.LabelView.extend({
              layout: { top: 70, left: 5, right: 5, height:24 },
              classNames: ['dg-alert'],
              localize: true,
              isVisible: NO,
              value: ''
            }),
            okButton: SC.ButtonView.design({
                layout: { bottom:5, right: 5, height:24, width: 90 },
                titleMinWidth: 0,
                localize: true,
                title: 'DG.SingleTextDialog.okButton.title',  // "OK"
                target: null,
                action: null,
                isDefault: true
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
                isCancel: true
            })
        }),

        showAlert: function () {
          this.contentView.alertView.set('isVisible', YES);
        },

        hideAlert: function () {
          this.contentView.alertView.set('isVisible', NO);
        },

        value: function() {
            return this.getPath('contentView.editView.files');
        }.property()

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

 @returns  {DG.FileImportDialog} the created dialog
 */
DG.CreateFileImportDialog = function( iProperties) {
    var tDialog = DG.FileImportDialog.create( iProperties),
        kParamMap = {
            prompt: 'promptView.value',

            textValue: 'editView.value',
            textHint: 'editView.hint',
            textLimit: 'editView.maxLength',
            textIsMultiLine: 'editView.isTextArea',
            textAction: 'editView.action',

            alert: 'alertView.value',

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

