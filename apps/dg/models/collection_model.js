// ==========================================================================
//                              DG.Collection
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

  A controller object for the cases and attributes that make up a collection.
  
  @extends SC.Object
*/
DG.Collection = SC.Object.extend(
/** @scope DG.Collection.prototype */ {

  collectionRecord: null,// DG.CollectionRecord
  
  id: function() {
    return this.collectionRecord && this.collectionRecord.get('id');
  }.property('collectionRecord').cacheable(),

  /**
   * Query used to request attributes associated with this collection.
   * Assigned in the init() function with a call to SC.Query.local().
   * @property {SC.Query}
   */
  attrsQuery: null,

  /**
   * Array of attribute records returned from a find of the attrsQuery.
   * Assigned in the init() function with a call to DG.store.find().
   * @property {SC.RecordArray of DG.AttributeRecords}
   */
  attrsRecords: null,
  
  /**
   * Query used to request cases associated with this collection.
   * Assigned in the init() function with a call to SC.Query.local().
   * @property {SC.Query}
   */
  casesQuery: null,

  /**
   * Array of case records returned from a find of the casesQuery.
   * Assigned in the init() function with a call to DG.store.find().
   * @property {SC.RecordArray of DG.Cases}
   */
  casesRecords: null,
  
  /**
   * Initializes the DG.Collection object.
   */
  init: function() {
  
    sc_super();

    // Utility function for use as 'orderBy' property.
    // Uses local _id property of record, if present.
    function compareIDs( record1, record2) {
      var id1 = record1._id || record1.get('id'),
          id2 = record2._id || record2.get('id');
      if( id1 < id2) return -1;
      if( id1 > id2) return 1;
      return 0;
    }

  // Note that the following code assumes that the collection
  // property will have been set by the time we get here,
  // e.g. by passing it to the create() function.
  
    this.attrsQuery = SC.Query.local(DG.Attribute, {
                      conditions: 'collection = {collection}',
                      collection: this.collectionRecord,
                      orderBy: compareIDs });
    this.attrsRecords = DG.store.find(this.attrsQuery);
    
    this.casesQuery = SC.Query.local(DG.Case, {
                      conditions: 'collection = {collection}',
                      collection: this.collectionRecord,
                      orderBy: compareIDs });
    this.casesRecords = DG.store.find(this.casesQuery);
  },
  
  /**
   * Indicates whether parent/child links are configured correctly.
   * Games using the revised API (Aug 2011) should set this to true.
   * Note that this property is not a record attribute and is not
   * expected to be archived with the record. It's a temporary flag
   * for use until games using the old API are no longer supported.
   * @property {Boolean}
   */
  areParentChildLinksConfigured: function() {
    return this.getPath('collectionRecord.areParentChildLinksConfigured');
  }.property('collectionRecord.areParentChildLinksConfigured').cacheable(),

  /**
    Returns true if iOtherCollection is descended from this collection.
    @param {DG.Collection} iOtherCollection The collection to test for ancestry.
    @returns {Boolean} True if this is an ancestor of iOtherCollection, false otherwise.
   */
  isAncestorOf: function( iOtherCollection) {
    var myCollectionRecord = this.get('collectionRecord');
    return myCollectionRecord && 
            myCollectionRecord.isAncestorOf( iOtherCollection.get('collectionRecord'));
  },
  
  /**
    Returns true if this collection is descended from iOtherCollection.
    @param {DG.Collection} iOtherCollection The collection to test for ancestry.
    @returns {Boolean} True if this is an descendant of iOtherCollection, false otherwise.
   */
  isDescendantOf: function( iOtherCollection) {
    var myCollectionRecord = this.get('collectionRecord');
    return myCollectionRecord && 
            myCollectionRecord.isDescendantOf( iOtherCollection.get('collectionRecord'));
  },
  
  /**
   * Creates a new attribute in this collection with the specified properties.
   * @returns {DG.Attribute}
   */
  createAttribute: function( iProperties) {
    iProperties = iProperties || {};
    // Relate it to its parent collection
    iProperties.collection = this.get('id');
    return DG.Attribute.createAttribute( iProperties);
  },

  /**
   * Creates a new case in this collection with the specified properties.
   * @returns {DG.Case}
   */
  createCase: function( iProperties) {
    iProperties = iProperties || {};
    // Relate it to its parent collection
    iProperties.collection = this.get('id');
    return DG.Case.createCase( iProperties);
  },
  
  /**
   * Returns an array of ids for the attributes in the collection.
   * @returns {Array of Number}
   */
  getAttributeIDs: function() {
    return this.attrsRecords.getEach('id');
  },
  
  /**
   * Returns an array of names for the attributes in the collection.
   * @returns {Array of String}
   */
  getAttributeNames: function() {
    return this.attrsRecords.getEach('name');
  },
  
  /**
   * Returns an array of ids for the cases in the collection, 
   *  suitable for use by clients like Protovis.
   * @returns {Array of Number}
   */
  getCaseIDs: function() {
    return this.casesRecords.getEach('id');
  },
  
  /**
   * Calls the refresh() methods of the attrsRecords and casesRecords objects.
   */
  refresh: function() {
    this.attrsRecords.refresh();
    this.casesRecords.refresh();
  },

  /**
   * Debug-only utility function.
   */
  debugLog: function(iPrompt) {
  DG.log((iPrompt || "") + 
              " Collection " + this.getPath('collectionRecord.id') + ", " +
              " Attrs: [" + this.getAttributeIDs() + "], " +
              " Cases: [" + this.getCaseIDs() + "]");
  }
  
}) ;
