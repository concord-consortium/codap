// ==========================================================================
//                      DG.ComponentController
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

    Coordinates responses to events in a CODAP Component.

 @extends SC.Object
 */
DG.ComponentController = SC.Object.extend((function () // closure
/** @scope DG.ComponentController.prototype */ {

  return {  // return from closure

    /**
     * @type {DG.Component}
     */
    model: null,

    /**
     * @type {DG.ComponentView}
     */
    view: null,

    _oldLayout: null,

    /**
     * Lazy initialization is responsibility of subclass
     * @property {Array of DG.InspectorButtonView}
     */
    _inspectorButtons: null,
    inspectorButtons: function() {
      if( !this._inspectorButtons) {
        this._inspectorButtons = this.createInspectorButtons();
      }
      return this._inspectorButtons;
    }.property('_inspectorButtons'),

    /**
     * Subclasses will call sc_super and push onto array.
     * @returns {Array}
     */
    createInspectorButtons: function() {
      return [];
    },

    destroyInspectorButtons: function() {
      this._inspectorButtons.forEach( function( iButton) {
        iButton.destroy();
      });
      this.set('_inspectorButtons', null);
    },

    /**
     * The component view will add these to its titlebar
     * @property {[SC.View]}
     */
    specialTitleBarButtons: null,

    /**
     * Whether the user interface should should confirm the close of this
     * component.
     *
     * @type {boolean}
     */
    shouldConfirmClose: NO,

    shouldDestroyOnComponentDestroy: true,

    init: function() {
      sc_super();

      this.set('specialTitleBarButtons', []);
    },

    /**
     Give derived classes a chance to clean up after themselves.
     */
    willDestroy: function () {
    },

    destroy: function () {
      this.view = null; // break the loop!
      sc_super();
    },

    /**
     Utility method for adding entries to the _links_ property of a
     componentStorage object. Will create the _links_ property if necessary.
     @param    {Object}  iStorage -- The componentStorage object with the _links_ property
     @param    {String}  iLinkKey -- The string key of the link in the _links_ property
     @param    {Object}  iObject -- The object being linked; must have a toLink() method
     */
    addLink: function (iStorage, iLinkKey, iObject) {
      DG.ArchiveUtils.addLink(iStorage, iLinkKey, iObject);
    },

    /**
     Utility method for extracting link IDs from the _links_ property
     of a componentStorage object.
     @param    {Object}  iStorage -- The componentStorage object with the _links_ property
     @param    {String}  iLinkKey -- The string key of the link in the _links_ property
     @returns  {Number}              The ID from the link object with the specified key
     */
    getLinkID: function (iStorage, iLinkKey) {
      return DG.ArchiveUtils.getLinkID(iStorage, iLinkKey);
    },

    /**
     Called to create/return an object whose properties should be written out
     to external storage, e.g. by JSONification.
     Derived classes should override to return component-specific storage.
     @returns  {Object}  An object whose properties should be archived.
     */
    createComponentStorage: function () {
      // Derived classes should override to return component-specific storage.
      return {title: this.getPath('model.title')};
    },

    /**
     Called by the framework to give derived classes an opportunity to
     restore the contents of their archived component storage object.
     Derived classes should override to restore their contents appropriately.
     @param  iComponentStorage {Object}  An object whose properties should be restored.
     */
    restoreComponentStorage: function (iComponentStorage, iDocumentID) {
      var tComponentModel = this.get('model'),
          tRestoredTitle = iComponentStorage.title,
          tRestoredName = iComponentStorage.name;
      tComponentModel.set('title', tRestoredTitle || tRestoredName);
      if( tRestoredName)
        tComponentModel.set('name', tRestoredName);
    },

    /**
     Update any properties that need to be updated pre-archive, e.g. layout.
     Called by the framework as part of the document writing process.
     */
    willSaveComponent: function () {

      if (this.model) {
        var componentStorage = this.createComponentStorage();
        if (componentStorage)
          this.model.set('componentStorage', componentStorage);

        this.updateModelLayout();
      }
    },

    /**
     Restore any properties that need to be updated post-archive, e.g. component storage.
     */
    didRestoreComponent: function (iDocumentID) {
      var componentStorage = this.getPath('model.componentStorage');
      if (componentStorage)
        this.restoreComponentStorage(componentStorage, iDocumentID);
      // We don't restore the layout here - the layout is retrieved and used at view construction time.
    },

    updateModelLayout: function() {
      // If our content knows about a frame object, we'll get that frames layout and store it.
      var layout = this.getPath('view.layout'),
          modelLayout = this.model.get('layout');
      layout.isVisible = this.getPath('view.isVisible');  // For views (like Guide) that need to restore visibility
      if( layout && (modelLayout && JSON.stringify(layout) !== JSON.stringify(modelLayout))) {
        this.model.set('layout', layout);
        return modelLayout;
      }
      else if( !modelLayout) {
        this.setPath('model.layout', layout);
      }
      return null;
    },

    revertModelLayout: function(newLayout) {
      var prevLayout = this.model.get('layout');

      this.model.set('layout', newLayout);
      this.model.set('oldLayout', prevLayout);
      this.setPath('view.layout', newLayout);
      return prevLayout;
    },

    /* Notification that the user has clicked the close button on a component. This is an opportunity to finalize things,
       however, the component will be closed as soon as this function returns, so only synchronous code is allowed. It is
       executated outside of an Undo, so it may register a separate undo command, if desired.
     */
    willCloseComponent: function() { }

  }; // end return from closure

}())); // end closure
