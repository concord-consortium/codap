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
   *  The "raw" contents of the text editor.
   *  This property is bound in (viewDidChange) to the 'editorValue' property of the DG.TextView.
   *  Setting this property to null causes the editor to use 'theText'/'value' property instead.
   *  This property changes frequently since it includes selection/focus information.
   *  @property {String}
   */
  theValue: null,

  /**
   *  The serializable contents of the text editor.
   *  This property is bound in (viewDidChange) to the 'value' property of the DG.TextView.
   *  This property changes only when the content changes as it does not contain selection.
   *  @property {String}
   */
  theText: function (k, v) {
    if (!SC.none(v)) {
      // this gets called when the editView changes the value because of the binding
      this.setPath('model.content.text', v);
    }
    return this.getPath('model.content.text');
  }.property(),


  theTextDidChange: function () {
    this.notifyPropertyChange('theText');
  }.observes('model.content.text'),

  /**
   *  Listen for the text to be changed via API and handle it appropriately.
   */
  apiTextDidChange: function () {
    var apiText = this.getPath('model.content.apiText');
    if (!SC.none(apiText)) {
      try {
        this.setTheText(JSON.parse(apiText));
      } catch(ex) {
        this.setTheText(apiText);
      }
      this.setPath('model.content.apiText', null);
    }
  }.observes('model.content.apiText'),

  /**
   *  Pushes its argument to the editor's content. This is accomplished by
   *  setting the editor's 'value' property (via binding) to the desired
   *  value and then setting the editor's 'editorValue' property (also via
   *  binding) to null so that the editor will use the 'value' property.
   *  @param {Object} value -- The editor value to push to the editor
   */
  setTheText: function(value) {
    this._isUpdatingText = true;
    this.beginPropertyChanges();
    this.set('theText', value);
    // clearing 'theValue' tells editView to use 'theText'
    this.set('theValue', null);
    this.endPropertyChanges();
    this.invokeLater(function() {
      SC.run(function() {
        this._isUpdatingText = false;
      }.bind(this));
    });
  },

  previousValue: null,
  _session: null,

  /**
   *  Returns the object to be JSONified for storage.
   *  @returns  {Object}
   */
  createComponentStorage: function() {
    var theText = this.get('theText'),
        theStorage = {};
    if( !SC.empty( theText)) {
      if (typeof theText === 'string') {
        theStorage.text = theText;
      } else {
        theStorage.text = JSON.stringify(theText);
      }
    }
    return theStorage;
  },

  /**
   *  Copies the contents of iComponentStorage to the model.
   *  @param {Object} iComponentStorage -- Properties restored from document.
   *  @param {String} iDocumentID --       ID of the component's document.
   */
  restoreComponentStorage: function( iComponentStorage, iDocumentID) {
    sc_super();
    var theText = iComponentStorage.text || iComponentStorage.apiText || "",
        parsed;
    try {
      parsed = JSON.parse(theText);
      // if it doesn't look like a Slate value, treat as plain text
      if (!parsed || !parsed.object || (parsed.object !== "value"))
        parsed = theText;
    }
    catch(e) {
      // if it's not JSON, treat as plain text
      parsed = theText;
    }
    this.setTheText(parsed);
    this.set('previousValue', parsed);
  },

  onTextUpdate: function() {
    if (this._isUpdatingText) return;

    var value = JSON.stringify(this.get("theText") || "");
    this._session = this._session || Math.random();

    function parseValue(v) {
      var parsed = "";
      try {
        parsed = JSON.parse(v);
      }
      catch(e) {
        parsed = "";
      }
      return parsed;
    }

    DG.UndoHistory.execute(DG.Command.create({
      name: 'textComponent.edit',
      undoString: 'DG.Undo.textComponent.edit',
      redoString: 'DG.Redo.textComponent.edit',
      //log: "Edited text component: '%@'".fmt(value),
      _componentId: this.getPath('model.id'),
      _controller: function() {
        return DG.currDocumentController().componentControllersMap[this._componentId];
      },
      _reduceKey: 'textComponent.edit' + this._session,
      executeNotification: {
        action: 'notify',
        resource: 'component',
        values: {
          operation: 'edit text',
          type: 'DG.TextView'
        }
      },
      execute: function () {
        this._beforeStorage = this._controller().get('previousValue');
        this._afterStorage = value;
        this._controller().set('previousValue', value);
      },
      undo: function () {
        // can no longer merge once it's been undone
        this._reduceKey = Math.random();
        this._controller().setTheText(parseValue(this._beforeStorage));
        this._controller().set('previousValue', this._beforeStorage);
      },
      redo: function () {
        this._controller().setTheText(parseValue(this._afterStorage));
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
    // prevents further undo merging
    this._session = null;
    DG.currDocumentController().notificationManager.sendNotification({
      action: 'notify',
      resource: 'component',
      values: {
        operation: 'commitEdit',
        type: this.getPath('model.type'),
        id: this.getPath('model.id'),
        title: this.getPath('model.title'),
        text: JSON.stringify(this.get("theText") || "")
      }
    });
  },

  willCloseComponent: function() {
    sc_super();
    this.commitEditing();
  },

  getEditView: function() {
    return this.getPath('view.containerView.contentView.editView');
  },

  /**
   *  Called when the view is connected to the controller.
   */
  viewDidChange: function() {
    var editView = this.getEditView();
    if (editView) {
      // set the initial value
      var theText = this.get('theText');
      theText && editView.set('value', theText);
      // bind the raw and serializable properties
      editView.bind('editorValue', this, 'theValue');
      editView.bind('value', this, 'theText');
    }
  }.observes('*view.containerView.contentView')

});
