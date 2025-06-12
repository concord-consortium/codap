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
sc_require('views/formula_rich_edit_view');

/** @class

  A TableView contains a scrollable view that, in turn, contains a table.

  @extends SC.PalettePane
*/
DG.AttributeFormulaView = SC.PalettePane.extend(
/** @scope DG.AttributeFormulaView.prototype */ {

  isModal: YES,

  layout: { width: 400, height: 180, centerX: 0, centerY: 0 },

  contentView: SC.View.extend({
    classNames: 'dg-formula-dialog',
    childViews: 'attrName equalsLabel formula operandPopup functionPopup apply cancel resizeHandle'.w(),
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
      formula: DG.FormulaRichEditView.design({
        layout: { top: 34, left: 5, right: 5, bottom:74 },
        value: '',
        isTextArea: true,
        spellCheckEnabled: false,
        hint: '',
        leftAccessoryView: SC.LabelView.create( {
                    layout: { left: 1, width: 55, bottom:1, top: 1 },
                    value: 'DG.AttrFormView.formulaPrompt', // "Formula:",
                    backgroundColor: 'lightgray',
                    localize: true
                  }),
        classNames: 'dg-formula-dialog-input-field'
      }),
      operandPopup: SC.PopupButtonView.extend({
        layout: { bottom: 44, left: 5, width: 140, height: 24 },
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
        layout: { bottom: 44, left: 150, width: 170, height: 24 },
        localize: true,
        title: 'DG.AttrFormView.functionMenuTitle',
        mouseDown: function() {
          if (this._fbDiv && DG.React.Components.FunctionBrowser) {
            var onSelectFunction = function(name, argList, info) {
                  this.getPath('parentView.formula').replaceSelectionWithString("%@(%@)".fmt(name, argList));
                }.bind(this),
                fbComponent = DG.React.Components.FunctionBrowser({
                                                    anchor: this.get('layer'),
                                                    container: DG.mainPage.mainPane.get('layer'),
                                                    categorizedFunctionInfo: DG.functionRegistry.get('categorizedFunctionInfo'),
                                                    onSelect: onSelectFunction
                                                  });
            DG.React.toggleRender(this._fbDiv, fbComponent);
          }
        },
        action: null,
        didAppendToDocument: function() {
          this._fbDiv = document.createElement("div");
          // NOTE: component div should be inserted at the body level
          // so that the absolute positioning works correctly.
          document.body.appendChild(this._fbDiv);
        }
      }),
      apply: SC.ButtonView.design({
        layout: { bottom:5, right: 25, height:24, width: 90 },
        titleMinWidth: 0,
        title: 'DG.AttrFormView.applyBtnTitle', // "Apply"
        target: null,
        action: null,
        toolTip: '',
        localize: true,
        isDefault: true,
        classNames: 'dg-formula-dialog-apply'

      }),
      cancel: SC.ButtonView.design({
        layout: { bottom:5, right: 135, height:24, width: 90 },
        titleMinWidth: 0,
        title: 'DG.AttrFormView.cancelBtnTitle',  // "Cancel"
        target: null,
        action: null,
        toolTip: 'DG.AttrFormView.cancelBtnTooltip',  // "Dismiss the dialog without making any changes"
        localize: true,
        isCancel: true,
        classNames: 'dg-formula-dialog-cancel'

      }),
      resizeHandle: SC.View.extend({
        classNames: ['resize-handle'],
        layout: { right: 0, bottom: 0, width: 20, height: 20},

        render: function (context) {
          context.begin().addClass('handle-image').end();
        },

        mouseDown: function (evt) {
          // Cache the initial vertical offset and parent height.
          var parentView = this.get('parentView'),
              wrapperView = parentView.get('parentView'),
              frame = parentView.get('borderFrame');

          // Indicate that we are resizing.
          wrapperView.beginLiveResize();

          this._initialX = evt.clientX;
          this._initialY = evt.clientY;
          this._initialWidth = frame.width;
          this._initialHeight = frame.height;

          return true;
        },

        mouseDragged: function (evt) {
          var parentView = this.get('parentView'),
              width, height,
              offsetX, offsetY;

          offsetX = evt.clientX - this._initialX;
          offsetY = evt.clientY - this._initialY;
          // Parent view is centered, so we double the offset to keep the dragger under the mouse (for aesthetic purposes - the view would
          // continue to get the events even if the mouse is no longer over it, as RootResponder routes subsequent mouse events to the view
          // which handled mouseDown).
          width = Math.max(400, this._initialWidth + offsetX);
          height = Math.max(180, this._initialHeight + offsetY);
          parentView.adjust({width: width, height: height});
        },

        mouseUp: function (evt) {
          var parentView = this.get('parentView'),
              wrapperView = parentView.get('parentView');

          // Indicate that we are resizing.
          wrapperView.endLiveResize();

          // Clean up.
          delete this._initialX;
          delete this._initialY;
          parentView.set('transitionAdjust', SC.View.SMOOTH_ADJUST);

          return true;
        }
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
  },

  keyDown: function(evt) {
    if (evt.keyCode === SC.Event.KEY_ESC) {
      this.close();
      return YES;
    }
    return NO;
  },

  /**
    Observer function called when the user selects an item from the Operands popup.
   */
  userSelectedOperand: function() {
    // Extract the text of the selected item
    var insertionString = this.getPath('contentView.operandPopup.menu.selectedItem.title');
    if( !SC.empty( insertionString)) {
      var canonicalString = DG.Attribute.canonicalizeName(insertionString, true),
          formulaView = this.getPath('contentView.formula');
      if (insertionString !== canonicalString)
        insertionString = '`' + insertionString + '`';
      // Replace the current selection with the selected item text
      if( formulaView) {
        formulaView.becomeFirstResponder();
        formulaView.replaceSelectionWithString( insertionString);
      }
    }
    // Clear the selected item so the same item can be selected multiple times
    this.setPath('contentView.operandPopup.menu.selectedItem', null);
  }.observes('.contentView.operandPopup.menu.selectedItem'),

  /**
    Close the dialog.
   */
  close: function() {
    // Not clear what the best way to close/destroy is.
    this.remove();
    this.destroy();
  }
});

DG.AttributeFormulaView.buildOperandsMenuAndCompletionData = function(iDataContext) {
  var collectionRecords = iDataContext.get('collections'),
      tGlobalNames = DG.globalsController.getGlobalValueNames(),
      tCompletionData = [],
      tOperandsMenu = [],
      kAttributesCategory = { key: 'Attributes',
                              name: 'DG.TableController.newAttrDialog.AttributesCategory'.loc() },
      kSpecialCategory = { key: 'Special',
                            name: 'DG.TableController.newAttrDialog.SpecialCategory'.loc() },
      kGlobalsCategory = { key: 'Globals',
                            name: 'DG.TableController.newAttrDialog.GlobalsCategory'.loc() },
      kConstantsCategory = { key: 'Constants',
                              name: 'DG.TableController.newAttrDialog.ConstantsCategory'.loc() },
      kFunctionsCategory = { key: 'Functions',
                              name: 'DG.TableController.newAttrDialog.FunctionsCategory'.loc() };

  function appendNamesToCompletionData(iNames, iCategory) {
    /* global removeDiacritics */
    tCompletionData = tCompletionData.concat(
                        iNames.map(function(iName) {
                                    // Remove diacritics (accents, etc.) for matching
                                    var label = removeDiacritics(iName),
                                        parenPos = label.indexOf('(');
                                    // Remove "()" from functions for matching
                                    if (parenPos > 0)
                                      label = label.substr(0, parenPos);
                                    return {
                                      label: label,   // for matching
                                      value: iName,   // menu/replacing
                                      category: iCategory
                                    };
                                  }));
  }

  function appendArrayOfNamesToMenu(iNamesArray, iCategory) {
    if( !iNamesArray || !iNamesArray.length) return;
    if( tOperandsMenu.length)
      tOperandsMenu.push('--');
    tOperandsMenu = tOperandsMenu.concat( iNamesArray.sort());

    if (iCategory && iCategory.name)
      appendNamesToCompletionData(iNamesArray, iCategory);
  }

  collectionRecords.forEach(function (collectionRecord) {
    var collectionContext = iDataContext.getCollectionByName(collectionRecord.name);
    appendArrayOfNamesToMenu(collectionContext.collection.getAttributeNames(), kAttributesCategory);
  });
  if (kSpecialCategory.name !== kConstantsCategory.name)
    appendArrayOfNamesToMenu(['caseIndex'], kSpecialCategory);
  appendArrayOfNamesToMenu(tGlobalNames, kGlobalsCategory);
  if (kSpecialCategory.name === kConstantsCategory.name)
    appendArrayOfNamesToMenu(['caseIndex'], kSpecialCategory);
  appendArrayOfNamesToMenu([ "e", "π" ]);
  tCompletionData.push({ label: "e", value: "e", category: kConstantsCategory });
  tCompletionData.push({ label: "π", value: "π", category: kConstantsCategory,
                          fontFamily: "Symbol,serif", fontSize: "130%" });
  // match against "pi", but render "π"
  tCompletionData.push({ label: "pi", value: "π", category: kConstantsCategory,
                          fontFamily: "Symbol,serif", fontSize: "130%" });

  appendNamesToCompletionData(DG.functionRegistry.get('namesWithParentheses'), kFunctionsCategory);

  return { operandsMenu: tOperandsMenu, completionData: tCompletionData };
};

DG.CreateAttributeFormulaView = function( iProperties) {
  var tDialog = DG.AttributeFormulaView.create(iProperties || {}),
    kParamMap = {
      attrNamePrompt: 'attrName.leftAccessoryView.value',
      attrNameValue: 'attrName.value',
      attrNameHint: 'attrName.hint',
      attrNameIsEnabled: 'attrName.isEnabled',

      formulaPrompt: 'formula.leftAccessoryView.value',
      formulaValue: 'formula.value',
      formulaExpression: 'formula.formulaExpression',
      formulaCompletions: 'formula.completionData',
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

  // if no apply action is specified, simply close the dialog
  if (!tContentView.getPath('apply.action')) {
    tContentView.setPath('apply.action', tContentView.getPath('cancel.action'));
  }

  tDialog.append();

  var tInitialView = tAttrNameView.get('isEnabled') ? tAttrNameView : tFormulaView;
  tInitialView.becomeFirstResponder();

  return tDialog;
};
