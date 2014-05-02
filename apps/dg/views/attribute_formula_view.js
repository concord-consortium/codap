// ==========================================================================
//                        DG.AttributeFormulaView
// 
//  Implements a dialog with edit fields for attribute name and formula.
//  
//  Authors:  William Finzer, Kirk Swenson
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

sc_require('formula/formula_context');
sc_require('views/formula_text_edit_view');

/** @class

  A TableView contains a scrollable view that, in turn, contains a table.

  @extends SC.PalettePane
*/
DG.AttributeFormulaView = SC.PalettePane.extend(
/** @scope DG.AttributeFormulaView.prototype */ {

  isModal: YES,

  layout: { width: 400, height: 180, centerX: 0, centerY: 0 },

  contentView: SC.View.extend({
    childViews: 'attrName equalsLabel formula operandPopup functionPopup apply cancel'.w(),
      attrName: SC.TextFieldView.design({
        layout: { top: 5, left: 5, right: 25, height:24 },
        value: '',
        spellCheckEnabled: false,
        leftAccessoryView: SC.LabelView.create( {
                    layout: { left: 1, width: 95, height:22, centerY: 0 },
                    value: 'DG.AttrFormView.attrNamePrompt',  // "Attribute Name:"
                    backgroundColor: 'lightgray',
                    localize: true
                  })
      }),
      equalsLabel: SC.LabelView.extend({
        layout: { top: 5, right: 5, width: 12, height: 24 },
        value: "="
      }),
      formula: DG.FormulaTextEditView.design({
        layout: { top: 34, left: 5, right: 5, height:72 },
        value: '',
        isTextArea: true,
        spellCheckEnabled: false,
        hint: '',
        leftAccessoryView: SC.LabelView.create( {
                    layout: { left: 1, width: 55, height:70, top: 1 },
                    value: 'DG.AttrFormView.formulaPrompt', // "Formula:",
                    backgroundColor: 'lightgray',
                    localize: true
                  })
      }),
      operandPopup: SC.PopupButtonView.extend({
        layout: { top: 112, left: 5, width: 140, height: 24 },
        localize: true,
        title: 'DG.AttrFormView.operandMenuTitle',
        menu: SC.MenuPane.extend({
          layout: { width: 200 },
          // Computed property which converts array of strings to array of menu item objects
          rawItems: function( iKey, iValues) {
            var maxItemLength = 0;
            if( iValues !== undefined) {
              // Convert the strings to menu items, including separators
              var tValues = iValues.map( function( iItem) {
                                            if( maxItemLength < iItem.length)
                                              maxItemLength = iItem.length;
                                            return { title: iItem, isSeparator: iItem === '--' };
                                          });
              this.set('items', tValues);
            }
            // Seems to work for string of arbitrary numbers of W's
            this.adjust('width', 40 + 10 * maxItemLength);
          }.property()
        })
      }),
      functionPopup: SC.PopupButtonView.extend({
        layout: { top: 112, left: 150, width: 140, height: 24 },
        localize: true,
        title: 'DG.AttrFormView.functionMenuTitle',
        menu: SC.MenuPane.extend({
          layout: { width: 100 },
          items: null // filled in later
        })
      }),
      apply: SC.ButtonView.design({
        layout: { bottom:5, right: 5, height:24, width: 90 },
        titleMinWidth: 0,
        title: 'DG.AttrFormView.applyBtnTitle', // "Apply"
        target: null,
        action: null,
        toolTip: '',
        localize: true,
        isDefault: true
      }),
      cancel: SC.ButtonView.design({
        layout: { bottom:5, right: 115, height:24, width: 90 },
        titleMinWidth: 0,
        title: 'DG.AttrFormView.cancelBtnTitle',  // "Cancel"
        target: null,
        action: null,
        toolTip: 'DG.AttrFormView.cancelBtnTooltip',  // "Dismiss the dialog without making any changes"
        localize: true,
        isCancel: true
      })
  }),

  /**
    Forwarding property for the dialog's attribute name value.
    @property   {String}
   */
  attributeName: function( iKey, iValue) {
    return iValue === undefined
              ? this.getPath('contentView.attrName.value')
              : this.setPath('contentView.attrName.value', iValue);
  }.property(),
  
  /**
    Forwarding property for the dialog's formula value.
    @property   {String}
   */
  formula: function( iKey, iValue) {
    return iValue === undefined
              ? this.getPath('contentView.formula.formulaExpression')
              : this.setPath('contentView.formula.formulaExpression', iValue);
  }.property(),
  
  /**
    Initialization function.
   */
  init: function() {
    sc_super();
    this.setPath('contentView.cancel.target', this);
    this.setPath('contentView.cancel.action', 'close');
    
    this.setPath('contentView.functionPopup.menu.items',
                  DG.FormulaContext.getFunctionNamesWithParentheses());
  },
  
  /**
    Observer function called when the user selects an item from the Operands popup.
   */
  userSelectedOperand: function() {
    // Extract the text of the selected item
    var insertionString = this.getPath('contentView.operandPopup.menu.selectedItem.title');
    if( !SC.empty( insertionString)) {
      var formulaView = this.getPath('contentView.formula');
      // Replace the current selection with the selected item text
      if( formulaView) formulaView.replaceSelectionWithString( insertionString);
    }
    // Clear the selected item so the same item can be selected multiple times
    this.setPath('contentView.operandPopup.menu.selectedItem', null);
  }.observes('.contentView.operandPopup.menu.selectedItem'),
  
  /**
    Observer function called when the user selects an item from the Functions popup.
   */
  userSelectedFunction: function() {
    // Extract the text of the selected item
    var insertionString = this.getPath('contentView.functionPopup.menu.selectedItem.title');
    if( !SC.empty( insertionString)) {
      var formulaView = this.getPath('contentView.formula');
      if( formulaView) {
        var selectionStart = formulaView.getPath('selection.start'),
            insertionLength = insertionString.length,
            newSelection = selectionStart + insertionLength - 1;
        // Replace the current selection with the selected item text
        formulaView.replaceSelectionWithString( insertionString);
        // Put the insertion caret between the parentheses for a function
        formulaView.setSelection( newSelection);
      }
    }
    // Clear the selected item so the same item can be selected multiple times
    this.setPath('contentView.functionPopup.menu.selectedItem', null);
  }.observes('.contentView.functionPopup.menu.selectedItem'),
  
  /**
    Close the dialog.
   */
  close: function() {
    // Not clear what the best way to close/destroy is.
    this.remove();
    this.destroy();
  }
});

DG.CreateAttributeFormulaView = function( iProperties) {
  var tDialog = DG.AttributeFormulaView.create( iProperties),
    kParamMap = {
      attrNamePrompt: 'attrName.leftAccessoryView.value',
      attrNameValue: 'attrName.value',
      attrNameHint: 'attrName.hint',
      attrNameIsEnabled: 'attrName.isEnabled',
      
      formulaPrompt: 'formula.leftAccessoryView.value',
      formulaValue: 'formula.value',
      formulaExpression: 'formula.formulaExpression',
      formulaNames: 'formula.names',
      formulaHint: 'formula.hint',
      formulaIsEnabled: 'formula.isEnabled',

      formulaOperands: 'operandPopup.menu.rawItems',

      applyTitle: 'apply.title',
      applyTarget: 'apply.target',
      applyAction: 'apply.action',
      applyTooltip: 'apply.toolTip',
      
      cancelTitle: 'cancel.title',
      cancelTooltip: 'cancel.toolTip'
    },
    tContentView = tDialog.get('contentView'),
    tAttrNameView = tContentView.attrName,
    tFormulaView = tContentView.formula;
  
  // Loop through client-specified properties, applying them to the
  // appropriate property via its path given in the kParamMap.
  DG.ObjectMap.forEach( iProperties,
              function( iKey, iValue) {
                var tParamPath = kParamMap[ iKey];
                if( !SC.empty( tParamPath))
                  tContentView.setPath( tParamPath, iValue);
              } );

  tDialog.append();

  var tInitialView = tAttrNameView.get('isEnabled') ? tAttrNameView : tFormulaView;
  tInitialView.becomeFirstResponder();
  
  return tDialog;
};
