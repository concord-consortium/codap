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
  theText: function (k, v) {
    if (!SC.none(v)) {
      this.setPath('model.content.text', v);
    }
    return this.getPath('model.content.text');
  }.property(),

  theTextDidChange: function () {
    this.notifyPropertyChange('theText');
  }.observes('model.content.text'),

  previousValue: "",
  _session: null,

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
    this.set('previousValue', theText);
  },

  onTextUpdate: function() {
    var value = this.get("theText");
    this._session = this._session || Math.random();

    DG.UndoHistory.execute(DG.Command.create({
      name: 'textComponent.edit',
      undoString: 'DG.Undo.textComponent.edit',
      redoString: 'DG.Redo.textComponent.edit',
      log: "Edited text component: '%@'".fmt(value),
      _componentId: this.getPath('model.id'),
      _controller: function() {
        return DG.currDocumentController().componentControllersMap[this._componentId];
      },
      _reduceKey: 'textComponent.edit' + this._session,
      execute: function () {
        this._beforeStorage = this._controller().get('previousValue');
        this._afterStorage = value;
        this._controller().set('previousValue', value);
      },
      undo: function () {
        // 'this' may not refer to the currently displayed view, but the controller will remain the same after the view is removed/re-added
        this._controller().set('theText', this._beforeStorage);
        this._controller().set('previousValue', this._beforeStorage);
      },
      redo: function () {
        // 'this' may not refer to the currently displayed view, but the controller will remain the same after the view is removed/re-added
        this._controller().set('theText', this._afterStorage);
        this._controller().set('previousValue', this._afterStorage);
      },
      reduce: function(previous) {
        if (previous._reduceKey === this._reduceKey) {
          this._beforeStorage = previous._beforeStorage;
          return this;
        }
      }
    }));
  }.observes('theText'),

  commitEditing: function() {
    if( this._session) {
      DG.currDocumentController().notificationManager.sendNotification({
        action: 'notify',
        resource: 'component',
        values: {
          operation: 'edit',
          type: 'DG.TextView',
          title: this.getPath('model.title')
        }
      });
      DG.dirtyCurrentDocument(null, true);
    }
    this._session = null;
  },

  willCloseComponent: function() {
    sc_super();
    this.commitEditing();
  },
  
  /**
   *  Called when the view is connected to the controller.
   */
  viewDidChange: function() {
    // Bind the contents of the textFieldView to our 'theText' property.
    var textFieldView = this.getPath('view.containerView.contentView.editView');
    if( textFieldView)
      textFieldView.bind('value', this, 'theText');
  }.observes('*view.containerView.contentView')
  
});

