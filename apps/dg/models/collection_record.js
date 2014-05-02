// ==========================================================================
//                        DG.CollectionRecord
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

sc_require('models/dg_record');

/** @class

  (Document your Model here)

  @extends DG.Record
*/
DG.CollectionRecord = DG.Record.extend( (function() // closure
/** @scope DG.CollectionRecord.prototype */ {

  return {  // return from closure
  
  /**
   * The name of the collection
   * @property {String}
   */
  name: SC.Record.attr(String, { defaultValue: '' }),

  /**
   * A description of/comment for the collection.
   * @property {String}
   */
  description: SC.Record.attr(String, { defaultValue: '' }),
  
  /**
   * A relational link back to the owning data context.
   * @property {DG.DataContextRecord}
   */
  context: SC.Record.toOne('DG.DataContextRecord', {
    inverse: 'collections', isOwner: NO, isMaster: NO
  }),

  /**
   * A relational link back to the parent collection (if any).
   * @property {DG.CollectionRecord}
   */
  parent: SC.Record.toOne('DG.CollectionRecord', {
    inverse: 'children', isOwner: NO, isMaster: NO
  }),

  /**
   * A relational link to the subcollections of this collection.
   * @property {Array of DG.CollectionRecord}
   */
  children: SC.Record.toMany('DG.CollectionRecord', {
    inverse: 'parent', isOwner: NO, isMaster: YES
  }),

  /**
   * Indicates whether parent/child links are configured correctly.
   * Games using the revised API (Aug 2011) should set this to true.
   * Note that this property is not a record attribute and is not
   * expected to be archived with the record. It's a temporary flag
   * for use until games using the old API are no longer supported.
   * @property {Boolean}
   */
  areParentChildLinksConfigured: false,

  /**
   * A relational link to the attributes of this collection.
   *  Note that "attributes" is a reserved property name in SproutCore.
   * @property {Array of DG.Attribute}
   */
  attrs: SC.Record.toMany('DG.Attribute', {
    inverse: 'collection', isOwner: YES, isMaster: YES
  }),

  /**
   * A relational link to the cases of this collection.
   * @property {Array of DG.Case}
   */
  cases: SC.Record.toMany('DG.Case', {
    inverse: 'collection', isOwner: YES, isMaster: YES
  }),
  
  /**
   * Map of case IDs to indices within parent cases
   * @property {Object} of {String}:{Number}
   */
  caseIDToIndexMap: null,
  
  /**
   * Map of parent case IDs to number of cases with that parent
   * @property {Object} of {String}:{Number}
   */
  caseCounts: null,
  
  /**
    Destroy the collection's cases and attributes when the collection is destroyed.
   */
  destroy: function() {
    this.cases.forEach( function( iCase) { DG.Case.destroyCase( iCase); });
    
    this.attrs.forEach( function( iAttr) { DG.Attribute.destroyAttribute( iAttr); });
    
    sc_super();
  },
  
  /**
    Returns true if iOtherCollection is descended from this collection.
    @param {DG.CollectionRecord} iOtherCollection The collection to test for ancestry.
    @returns {Boolean} True if this is an ancestor of iOtherCollection, false otherwise.
   */
  isAncestorOf: function( iOtherCollection) {
    return iOtherCollection.isDescendantOf( this);
  },
  
  /**
    Returns true if this collection is descended from iOtherCollection.
    @param {DG.CollectionRecord} iOtherCollection The collection to test for ancestry.
    @returns {Boolean} True if this is an descendant of iOtherCollection, false otherwise.
   */
  isDescendantOf: function( iOtherCollection) {
    var parent = this.get('parent');
    // If I don't have a parent, then I'm not descended from anything
    if( !parent) return false;
    // If the other collection is my parent, then I'm a descendant
    if( parent === iOtherCollection) return true;
    // Otherwise, if my parent is a descendant, then I'm a descendant
    return parent.isDescendantOf( iOtherCollection);
  },
  
  /**
    Find the DG.Attribute with the specified name.
    @param    {String}        iName -- The name of the attribute to find
    @returns  {DG.Attribute}  The attribute with the specified name
   */
  getAttributeByName: function( iName) {
    var attrs = this.get('attrs'),
        i, attrCount = attrs && attrs.get('length');
    for( i = 0; i < attrCount; ++i) {
      var attr = attrs.objectAt( i);
      if( attr && (attr.get('name') === iName))
        return attr;
    }
    return null;
  }
  
  }; // end return from closure
  
}())); // end closure

DG.CollectionRecord.createCollection = function( iProperties) {
  var newCollection = DG.store.createRecord( DG.CollectionRecord, iProperties || {});
  if( !SC.none( iProperties.areParentChildLinksConfigured))
    newCollection.set('areParentChildLinksConfigured', iProperties.areParentChildLinksConfigured);
  DG.store.commitRecords(); // must commit to force record 'id' generation
  return newCollection;
};

DG.CollectionRecord.destroyCollection = function( iCollection) {
  iCollection.destroy();
};



