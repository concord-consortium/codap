// ==========================================================================
//                          DG.TextComponentController
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

sc_require('controllers/component_controller');

/** @class

  Coordinating controller for the DG text component.

  @extends SC.Object
*/
DG.TextComponentController = DG.ComponentController.extend(
/** @scope DG.TextComponentController.prototype */ {

  /**
   *  The contents of the text object.
   *  This property is bound to the 'value' property of the textFieldView.
   *  @property {String}
   */
  theText: "",
  previousValue: "",

  /**
   *  Returns the object to be JSONified for storage.
   *  @returns  {Object}
   */
  createComponentStorage: function() {
    var theText = this.get('theText'),
        theStorage = {};
    if( !SC.empty( theText))
      theStorage.text = theText;
    return theStorage;
  },
  
  /**
   *  Copies the contents of iComponentStorage to the model.
   *  @param {Object} iComponentStorage -- Properties restored from document.
   *  @param {String} iDocumentID --       ID of the component's document.
   */
  restoreComponentStorage: function( iComponentStorage, iDocumentID) {
    var theText = iComponentStorage.text || "";
    this.set('theText', theText);
  },

  commitEditing: function() {
    var value = this.get('theText'),
        previousValue = this.get('previousValue');
    if (value !== previousValue) {
      DG.UndoHistory.execute(DG.Command.create({
        name: 'text.edit',
        undoString: 'DG.Undo.text.edit',
        redoString: 'DG.Redo.text.edit',
        execute: function () {
          DG.logUser("editTextObject: '%@'", value);
          this.set('previousValue', value);
          DG.dirtyCurrentDocument();
        }.bind(this),
        undo: function () {
          // 'this' may not refer to the currently displayed view, but the controller will remain the same after the view is removed/re-added
          this.set('theText', previousValue);
          this.set('previousValue', previousValue);
          DG.logUser("editTextObject (undo): '%@'", previousValue);
          DG.dirtyCurrentDocument();
        }.bind(this),
        redo: function () {
          // 'this' may not refer to the currently displayed view, but the controller will remain the same after the view is removed/re-added
          this.set('theText', value);
          this.set('previousValue', previousValue);
          DG.logUser("editTextObject (redo): '%@'", value);
          DG.dirtyCurrentDocument();
        }.bind(this)
      }));
    }
  },
  
  /**
   *  Called when the view is connected to the controller.
   */
  viewDidChange: function() {
    // Bind the contents of the textFieldView to our 'theText' property.
    var textFieldView = this.getPath('view.containerView.contentView.editView');
    if( textFieldView)
      textFieldView.bind('value', this, 'theText');
  }.observes('view')
  
});

