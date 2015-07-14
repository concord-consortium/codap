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

sc_require('models/base_model');

/** @class

  A container for the cases and attributes that make up a collection.
  
  @extends SC.Object
*/
DG.Collection = DG.BaseModel.extend( (function() // closure
/** @scope DG.Collection.prototype */ {

  return {

    /**
     * The id of the model object.
     * @property {number}
     */
    id: null,

    /**
     * A relational link back to the owning data context.
     * @property {DG.DataContextRecord}
     */
    context: null,


    /**
     * A relational link back to the parent collection (if any).
     * @property {DG.Collection}
     */
    parent: null,

    /**
     * A relational link to the subcollections of this collection.
     * @property {[DG.Collection]}
     */
    children: null,

    /**
     * A relational link to the attributes of this collection.
     *  Note that "attributes" is a reserved property name in SproutCore.
     * @property {[DG.Attribute]}
     */
    attrs: null,

    /**
     * A relational link to the cases of this collection.
     * @property {[DG.Case]}
     */
    cases: null,

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
     * Map of case IDs to indices within parent cases
     * @property {Object} of {String}:{Number}
     */
    caseIDToIndexMap: null,

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
     * Map of parent case IDs to number of cases with that parent
     * @property {Object} of {String}:{Number}
     */
    caseCounts: null,

    /**
     * If present, the name of an individual case.
     * @property {String}
     */
    caseName: null,

    /**
     * ToDo: define
     * @property {String}
     */
    childAttrName: null,

    /**
     * Whether tabular representations of a child table should collapse
     * all the children of a single parent to a single row.
     * @property {Boolean}
     */
    collapseChildren: null,

    /**
     * Default axes for the collection
     * @property {{defaults: { xAttr: string, yAttr: string }}}
     */
    defaults: undefined,

    /**
     * A description of/comment for the collection.
     * @property {String}
     */
    description: '',

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
    labels: undefined,

    /**
     * The name of the collection
     * @property {String}
     */
    name: '',

    /**
     * Initializes the DG.Collection object.
     */
    init: function () {

      sc_super();

      this.attrs = [];
      this.cases = [];
      this.children = [];
      this.set('attrsRecords', this.attrs);
      this.set('casesRecords', this.cases);
      this.updateCaseIDToIndexMap();
    },

    /**
     Destroy the collection's cases and attributes when the collection is destroyed.
     */
    destroy: function() {
      var context, ix;
      this.cases.forEach( function( iCase) { DG.Case.destroyCase( iCase); });

      this.attrs.forEach( function( iAttr) { DG.Attribute.destroyAttribute( iAttr); });

      if (this.parent) {
        ix = this.parent.children.indexOf(this);
        if (ix >= 0) {
          this.parent.children.splice(ix, 1);
        }
      }
      context = this.context;
      delete context.collections[this.id];
      sc_super();
    },

    verify: function () {
      if (SC.empty(this.context)) {
        DG.logWarn('Unattached collection: ' + this.id);
      }
      if (typeof this.context === 'number') {
        DG.logWarn('Unresolved reference in collection ' + this.id + ' to context ' + this.context);
      }
      if (!SC.empty(this.parent) && (typeof this.parent === 'number')) {
        DG.logWarn('Collection parent is a key -- collection/key: ' + this.name
          + '/' + this.parent);
      }
      if (SC.empty(this.name)) {
        DG.logWarn('Collection with no name: ' + this.id);
      }
    },

    /**
     Returns true if iOtherCollection is descended from this collection.
     @param {DG.Collection} iOtherCollection The collection to test for ancestry.
     @returns {Boolean} True if this is an ancestor of iOtherCollection, false otherwise.
     */
    isAncestorOf: function (iOtherCollection) {
      return iOtherCollection.isDescendantOf( this);
    },

    /**
     Returns true if this collection is descended from iOtherCollection.
     @param {DG.Collection} iOtherCollection The collection to test for ancestry.
     @returns {Boolean} True if this is an descendant of iOtherCollection, false otherwise.
     */
    isDescendantOf: function (iOtherCollection) {
      var parent = this.get('parent');
      // If I don't have a parent, then I'm not descended from anything
      if( !parent) return false;
      // If the other collection is my parent, then I'm a descendant
      if( parent === iOtherCollection) return true;
      // Otherwise, if my parent is a descendant, then I'm a descendant
      return parent.isDescendantOf( iOtherCollection);
    },

    /**
     * Creates a new attribute in this collection with the specified properties.
     * @returns {DG.Attribute}
     */
    createAttribute: function (iProperties) {
      var attr;
      iProperties = iProperties || {};
      // Relate it to its parent collection
      iProperties.collection = this;
      attr = DG.Attribute.createAttribute(iProperties);
      this.attrsRecords.pushObject(attr);
      return attr;
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
    createCase: function (iProperties) {
      iProperties = iProperties || {};
      // Relate it to its parent collection
      iProperties.collection = this;

      var newCase = DG.Case.createCase(iProperties);

      if (SC.none(iProperties.index)) {
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
    addCase: function (iCase) {
      var caseID = iCase.get('id'),
        parentID = iCase.getPath('parent.id'),
        caseIDToIndexMap = this.get('caseIDToIndexMap'),
        caseCounts = this.get('caseCounts');
      if (SC.none(caseCounts[parentID])) {
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
    insertCase: function (iCase, idx) {
      this.casesRecords.insertAt(idx, iCase);
      this.updateCaseIDToIndexMap();
    },

    /**
     * Deletes the specified case from this collection.
     * Clients should call updateCaseIDToIndexMap() after deleting cases.
     * @param   {DG.Case} iCase The case to delete.
     */
    deleteCase: function (iCase) {
      DG.Case.destroyCase(iCase);
      this.updateCaseIDToIndexMap();
    },

    /**
     * Returns an array of ids for the attributes in the collection.
     * @returns {[Number]}
     */
    getAttributeIDs: function () {
      return this.attrsRecords.getEach('id');
    },

    /**
     * Returns an array of names for the attributes in the collection.
     * @returns {[String]}
     */
    getAttributeNames: function () {
      return this.attrsRecords.getEach('name');
    },

    /**
     * Returns an array of ids for the cases in the collection,
     *  suitable for use by clients like Protovis.
     * @returns {[Number]}
     */
    getCaseIDs: function () {
      return this.casesRecords.getEach('id');
    },

    /**
     * Rebuilds the 'caseIDToIndexMap' and 'caseContents' properties.
     * This function should be called whenever the mapping between
     * case IDs and indices must change, e.g. after deleting cases.
     */
    updateCaseIDToIndexMap: function () {
      var caseIndices = {}, map = {};
      this.casesRecords.forEach(function (iCase) {
          if (!iCase.get('isDestroyed')) {
            var caseID = iCase.get('id'), parentID = iCase.getPath('parent.id');
            if (SC.none(caseIndices[parentID]))
              caseIndices[parentID] = 0;
            map[caseID] = caseIndices[parentID]++;
          }
        });
      this.set('caseIDToIndexMap', map);
      // The caseIndices map now indicates # cases for each parent
      this.set('caseCounts', caseIndices);
    },

    /**
     * Debug-only utility function.
     */
    debugLog: function (iPrompt) {
      DG.log((iPrompt || "") + " Collection " +
        this.get('id') + ", " + " Attrs: [" +
        this.getAttributeIDs() + "], " + " Cases: [" + this.getCaseIDs() + "]");
    },

    toArchive: function () {
      var parentID, obj;
      if (this.parent) {
        if (typeof this.parent === 'number') {
          parentID = this.parent;
        } else {
          parentID = this.parent.id;
        }
      }
      obj = {
        areParentChildLinksConfigured: this.areParentChildLinksConfigured,
        attrs: [],
        cases: [],
        caseName: this.caseName,
        childAttrName: this.childAttrName,
        collapseChildren: this.collapseChildren,
        guid: this.id,
        labels: this.labels,
        name: this.name,
        parent: parentID
      };
      this.attrs.forEach(function (attr) {
        obj.attrs.push(attr.toArchive());
      });
      this.cases.forEach(function (myCase) {
        obj.cases.push(myCase.toArchive());
      });
      return obj;
    }
  };
}())) ;

DG.Collection.createCollection = function( iProperties) {
  var tCollection;

  if( SC.none( iProperties)) {
    iProperties = {};
  }

  if( SC.none( iProperties.type)) {
    iProperties.type = 'DG.Collection';
  }

  if (iProperties.parent) {
    iProperties.parent = DG.store.resolve(iProperties.parent);
  }

  tCollection = DG.Collection.create(iProperties);

  if (iProperties.parent) {
    iProperties.parent.children.push(tCollection);
  }
  if (iProperties.context) {
    iProperties.context.collections[tCollection.id] = tCollection;
  }

  if (!SC.none(iProperties.areParentChildLinksConfigured)) {
    tCollection.set('areParentChildLinksConfigured',
      iProperties.areParentChildLinksConfigured);
  }

  if (iProperties.attrs) {
    iProperties.attrs.forEach(function (iAttr) {
      iAttr.collection = tCollection;
      tCollection.attrs.pushObject(DG.Attribute.createAttribute(iAttr));
    });
  }

  if (iProperties.cases) {
    iProperties.cases.forEach(function (iCase) {
      iCase.collection = tCollection;
      tCollection.cases.pushObject(DG.Case.createCase(iCase));
    });
  }

  DG.log('Create collection: ' + [tCollection.name, tCollection.description].join());

  return tCollection;
};

DG.Collection.destroyCollection = function (iCollection) {
  iCollection.destroy();
};
