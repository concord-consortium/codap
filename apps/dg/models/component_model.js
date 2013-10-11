// ==========================================================================
//                              DG.Component
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

sc_require('models/dg_record');

/** @class

  Represents an individual component of a DG.Document.

  @extends DG.Record
*/
DG.Component = DG.Record.extend(
/** @scope DG.Component.prototype */ {

  /**
   * A relational link back to the parent DG.Document
   * @property {DG.Document}
   */
  document: SC.Record.toOne("DG.Document", {
    inverse: "components", isOwner: NO, isMaster: NO
  }),

  /**
    Conceptually, the DG.Component owns a 'content' property. The fact that DG.Records get
    promiscuously cloned, however, makes it a bad idea to have potentially complicated
    content objects stored in top-level properties where they are likely to get cloned
    unnecessarily. Therefore, we use an object map. See DG.Component.getContent() and
    DG.Component.setContent() functions defined below for details.
    Note that using a smarter clone function that skipped non-record properties would
    also likely work, but would require more effort at this juncture.
    This computed property allows client to access the map as though it were a standard
    'content' property.
   */
  content: function( iKey, iValue) {
    if( iValue !== undefined) {
      DG.Component.setContent( this, iValue);
      return this;
    }
    return DG.Component.getContent( this);
  }.property(),
  
  /**
   * The type of the component (e.g. 'DG.CaseTable', 'DG.Graph', 'DG.Calculator', ...)
   * @property {String}
   */
  type: SC.Record.attr(String),
  
  /**
   * The bounds of the component in the document stored as an SC.Layout-formatted object.
   * @property {JSON}
   */
  layout: SC.Record.attr(Object, { defaultValue: null }),
  
  /**
   * Per-component storage, in a component specific format.
   * @property {JSON}
   */
  componentStorage: SC.Record.attr(Object, { defaultValue: null })
  
});

/**
  Class-level map from DG.Component 'id's to content objects.

  Conceptually, the DG.Component owns a 'content' property. The fact that DG.Records get
  promiscuously cloned, however, makes it a bad idea to have potentially complicated
  content objects stored in top-level properties where they are likely to get cloned
  unnecessarily. Therefore, we use an object map. The computed 'content' property above
  insures that clients that get/set the 'content' property will be accessing the
  contents of this map rather than a simple property.
 */
DG.Component.contentMap = {};

/**
  Returns the content object associated with the specified component.
  @param  {DG.Component}  iComponent  The component whose content should be returned.
  @returns  {Object}  The content object associated with the specified component.
 */
DG.Component.getContent = function( iComponent) {
  var componentID = iComponent && DG.store.idFor( iComponent.get('storeKey'));
  return componentID ? DG.Component.contentMap[ componentID] : undefined;
};

/**
  Sets the content object associated with the specified component.
  @param  {DG.Component}  iComponent  The component whose content is being specified.
  @param  {Object}        iContent    The content object to associate with the component.
 */
DG.Component.setContent = function( iComponent, iContent) {
  // We must use DG.store.idFor() here because during creation, we can get
  // here with DG.store.idFor() having been updated appropriately, but
  // component.get('id') being stale.
  var componentID = iComponent && DG.store.idFor( iComponent.get('storeKey'));
  if( !SC.none( componentID)) {
    if( iContent === undefined)
      delete DG.Component.contentMap[ componentID];
    else DG.Component.contentMap[ componentID] = iContent;
  }
};

DG.Component.createComponent = function( iProperties) {
  var newComponent = DG.store.createRecord( DG.Component, iProperties || {});
  // Currently, must call normalize for defaultValues to get handled appropriately.
  // See https://github.com/sproutcore/sproutcore/issues/98 for details.
  newComponent.normalize();
  // Seems like we ought to be able to commit once at the end of all our changes,
  // but the MemoryDataSource seems to require that we commit after each change.
  DG.store.commitRecords();
  return newComponent;
};

DG.Component.destroyComponent = function( iComponent) {
  iComponent.destroy();
  DG.store.commitRecords();
};

