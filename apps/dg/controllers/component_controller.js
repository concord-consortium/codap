// ==========================================================================
//                      DG.ComponentController
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

  Top-level coordinating controller for the DG application.

  @extends SC.Object
*/
DG.ComponentController = SC.Object.extend((function() // closure
/** @scope DG.ComponentController.prototype */ {

  return {  // return from closure
  
  model: null,  // DG.Component
  
  view: null,     // DG.ComponentView
  
  shouldDestroyOnComponentDestroy: true,

  /**
    Give derived classes a chance to clean up after themselves.
   */
  willDestroy: function() {
  },
  
  /**
    Utility method for adding entries to the _links_ property of a
    componentStorage object. Will create the _links_ property if necessary.
    @param    {Object}  iStorage -- The componentStorage object with the _links_ property
    @param    {String}  iLinkKey -- The string key of the link in the _links_ property
    @param    {Object}  iObject -- The object being linked; must have a toLink() method
   */
  addLink: function( iStorage, iLinkKey, iObject) {
    DG.ArchiveUtils.addLink( iStorage, iLinkKey, iObject);
  },
  
  /**
    Utility method for extracting link IDs from the _links_ property
    of a componentStorage object.
    @param    {Object}  iStorage -- The componentStorage object with the _links_ property
    @param    {String}  iLinkKey -- The string key of the link in the _links_ property
    @returns  {Number}              The ID from the link object with the specified key
   */
  getLinkID: function( iStorage, iLinkKey) {
    return DG.ArchiveUtils.getLinkID( iStorage, iLinkKey);
  },
  
  /**
    Called to create/return an object whose properties should be written out
    to external storage, e.g. by JSONification.
    Derived classes should override to return component-specific storage.
    @returns  {Object}  An object whose properties should be archived.
   */
  createComponentStorage: function() {
    // Derived classes should override to return component-specific storage.
    return null;
  },
  
  /**
    Called by the framework to give derived classes an opportunity to
    restore the contents of their archived component storage object.
    Derived classes should override to restore their contents appropriately.
    @param  {Object}  An object whose properties should be restored.
   */
  restoreComponentStorage: function( iComponentStorage, iDocumentID) {
    // Derived classes should override to restore from component storage
  },
  
  /**
    Update any properties that need to be updated pre-archive, e.g. layout.
    Called by the framework as part of the document writing process.
   */
  willSaveComponent: function() {
    
    if( this.model) {
      var componentStorage = this.createComponentStorage();
      if( componentStorage)
        this.model.set('componentStorage', componentStorage);

      // If our content knows about a frame object, we'll get that frames layout and store it.
      var layout = this.getPath('view.layout');
      if( layout)
        this.model.set('layout', layout);
    }
  },
  
  /**
    Restore any properties that need to be updated post-archive, e.g. component storage.
   */
  didRestoreComponent: function( iDocumentID) {
    var componentStorage = this.getPath('model.componentStorage');
    if( componentStorage)
      this.restoreComponentStorage( componentStorage, iDocumentID);
    // We don't restore the layout here - the layout is retrieved and used at view construction time.
  }

  }; // end return from closure
  
}())) ; // end closure
