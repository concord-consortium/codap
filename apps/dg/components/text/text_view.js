// ==========================================================================
//                            DG.TextView
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

sc_require('views/text_field_view');

/** @class  DG.TextView

 A wrapper for a TextFieldView that gives user a place to type notes.

 @extends SC.View
 */
DG.TextView = SC.View.extend(
    /** @scope DG.TextView.prototype */ {

      backgroundColor: 'white',

      // We're saying that the TextView wraps an SC.TextFieldView. Any reason we shouldn't
      // simply use an SC.TextFieldView?
      childViews: ['editView'],
      editView: DG.TextFieldView.design({
        layout: { left: 2, right: 2, top: 2, bottom: 2 },
        isEditable: true,
        isTextArea: true,
        didCreateLayer: function() {
          sc_super();
          this._controller = this.getPath('parentView.parentView.parentView.controller');
        },
        commitEditing: function () {
          var result = sc_super();
          if (result) {
            var prevValue = this.get('_prevValue'),
                value = this.get('value');
            DG.UndoHistory.execute(DG.Command.create({
              name: 'text.edit',
              undoString: 'DG.Undo.text.edit',
              redoString: 'DG.Redo.text.edit',
              execute: function() {
                DG.logUser("editTextObject: '%@'", value);
                DG.dirtyCurrentDocument();
              }.bind(this),
              undo: function() {
                // 'this' may not refer to the currently displayed view, but the controller will remain the same after the view is removed/re-added
                this._controller.set('theText', prevValue);
                DG.logUser("editTextObject (undo): '%@'", prevValue);
                DG.dirtyCurrentDocument();
              }.bind(this),
              redo: function() {
                // 'this' may not refer to the currently displayed view, but the controller will remain the same after the view is removed/re-added
                this._controller.set('theText', value);
                DG.logUser("editTextObject (redo): '%@'", value);
                DG.dirtyCurrentDocument();
              }.bind(this)
            }));
          }
          return result;
        }
      }),

      defaultFirstResponder: function () {
        return this.get('editView');
      }.property()

    }
);
