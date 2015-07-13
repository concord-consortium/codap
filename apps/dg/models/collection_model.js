// ==========================================================================
//                              DG.Collection
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
     * Whether tabular representations of a child table should collapse
     * all the children of a single parent to a single row.
     * @property {Boolean}
     */
    collapseChildren: function () {
      return this.collectionRecord && this.collectionRecord.get('collapseChildren');
    }.property('collectionRecord').cacheable(),

    /**
     * Default axes for the collection
     * @property {{defaults: { xAttr: string, yAttr: string }}}
     */
    defaults: function () {
      return this.collectionRecord && this.collectionRecord.get('defaults');
    }.property('collectionRecord').cacheable(),

    /**
     * Labels for the collection
     *
     * @param {{
     *           singleCase: string,
     *           pluralCase: string,
     *           singleCaseWithArticle: string,
     *           setOfCases: string,
     *           setOfCasesWithArticle: string
     *         }}
     */
    labels: function () {
      return this.collectionRecord && this.collectionRecord.get('labels');
    }.property('collectionRecord').cacheable(),

    /**
     * The name of the collection with which this object is associated.
     * @property {String}
     */
    name: function() {
      return this.collectionRecord && this.collectionRecord.get('name');
    }.property('collection').cacheable(),

    /**
     * A relational link back to the parent collection (if any).
     * @property {DG.Collection}
     */
    parent: function() {
      return this.collectionRecord && this.collectionRecord.get('parent');
    }.property('collection').cacheable(),

    /**
   * Array of attribute records returned from a find of the attrsQuery.
   * Assigned in the init() function with a call to DG.store.find().
   * @property {[DG.Attribute]}
   */
  attrsRecords: null,
  
  /**
   * Array of case records returned from a find of the casesQuery.
   * Assigned in the init() function with a call to DG.store.find().
   * @property {[DG.Case]}
   */
  casesRecords: null,
  
  /**
   * Initializes the DG.Collection object.
   */
  init: function() {
  
    sc_super();

    this.set('attrsRecords', this.collectionRecord.attrs);
    this.set('casesRecords', this.collectionRecord.cases);
    this.updateCaseIDToIndexMap();
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
    var attr;
    iProperties = iProperties || {};
    // Relate it to its parent collection
    iProperties.collection = this.get('collectionRecord');
    attr =  DG.Attribute.createAttribute( iProperties);
    this.attrsRecords.pushObject(attr);
    return attr;
  },

  /**
   * Creates a new case in this collection with the specified properties.
   *
   * If the properties object contains an `index` property, the new case will
   * be inserted at the appropriate index. Otherwise, it will be added to
   * the end of the cases array.
   *
   * @param   {Object}  iProperties Properties of the newly created case
   * @returns {DG.Case}
   */
  createCase: function( iProperties) {
    iProperties = iProperties || {};
    // Relate it to its parent collection
    iProperties.collection = this.collectionRecord;

    var newCase = DG.Case.createCase( iProperties);

    if ( SC.none(iProperties.index)) {
      this.addCase(newCase);
    } else {
      this.insertCase(newCase, iProperties.index);
    }

    return newCase;
  },

  /**
   * Adds a new case to the collection.

   * @param   {DG.Case}  iCase The newly created case
   */
  addCase: function( iCase) {
    var caseID = iCase.get('id'),
        parentID = iCase.getPath('parent.id'),
        caseIDToIndexMap = this.collectionRecord.get('caseIDToIndexMap'),
        caseCounts = this.collectionRecord.get('caseCounts');
    if( SC.none(caseCounts[parentID])) {
      caseCounts[parentID] = 0;
    }

    caseIDToIndexMap[caseID] = caseCounts[parentID]++;
    this.casesRecords.pushObject(iCase);
  },

  /**
   * Inserts a new case to the collection, at the specified location.
   *
   * Any views of this collection should render the case as if it had been created
   * at that point in the history.
   *
   * @param   {DG.Case}  iCase The newly created case
   * @param   {number}  idx   The index at which the case will be inserted
   */
  insertCase: function( iCase, idx) {
    this.casesRecords.insertAt(idx, iCase);
    this.updateCaseIDToIndexMap();
  },

  /**
   * Deletes the specified case from this collection.
   * Clients should call updateCaseIDToIndexMap() after deleting cases.
   * @param   {DG.Case} iCase The case to delete.
   */
  deleteCase: function( iCase) {
    DG.Case.destroyCase( iCase);
    this.updateCaseIDToIndexMap();
  },

  /**
   * Returns an array of ids for the attributes in the collection.
   * @returns {[Number]}
   */
  getAttributeIDs: function() {
    return this.attrsRecords.getEach('id');
  },
  
  /**
   * Returns an array of names for the attributes in the collection.
   * @returns {[String]}
   */
  getAttributeNames: function() {
    return this.attrsRecords.getEach('name');
  },
  
  /**
   * Returns an array of ids for the cases in the collection, 
   *  suitable for use by clients like Protovis.
   * @returns {[Number]}
   */
  getCaseIDs: function() {
    return this.casesRecords.getEach('id');
  },
  
  /**
   * Rebuilds the 'caseIDToIndexMap' and 'caseContents' properties.
   * This function should be called whenever the mapping between
   * case IDs and indices must change, e.g. after deleting cases.
   */
  updateCaseIDToIndexMap: function() {
    var caseIndices = {},
        map = {};
    this.casesRecords.
          forEach( function( iCase) {
                      if( !iCase.get('isDestroyed')) {
                        var caseID = iCase.get('id'),
                            parentID = iCase.getPath('parent.id');
                        if( SC.none(caseIndices[parentID]))
                          caseIndices[parentID] = 0;
                        map[caseID] = caseIndices[parentID]++;
                      }
                   });
    this.collectionRecord.set('caseIDToIndexMap', map);
    // The caseIndices map now indicates # cases for each parent
    this.collectionRecord.set('caseCounts', caseIndices);
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

DG.Collection.createCollection = function( iProperties) {
  var collectionRecord = DG.CollectionRecord.createCollection(iProperties);
  return DG.Collection.create({ collectionRecord: collectionRecord });
};

DG.Collection.destroyCollection = function (iCollection) {
  iCollection.destroy();
};
