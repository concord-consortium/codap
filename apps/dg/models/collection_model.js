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
     * A convenience member. The DataSet for this context.
     * @type {DG.DataSet}
     */
    dataSet: null,

    /**
     * A relational link back to the parent collection (if any).
     * @property {DG.Collection}
     */
    parent: null,

    /**
     * A relational link to the subcollections of this collection.
     *
     * Note: in the current design there can be only one direct sub-
     * collection of this collection.
     *
     * @property {[DG.Collection]}
     */
    children: null,

    /**
     * A relational link to the attributes of this collection.
     *
     *  Note that "attributes" is a reserved property name in SproutCore.
     *
     * This array also defines the order of attributes of the collection.
     *
     * @property {[DG.Attribute]}
     */
    attrs: null,

    /**
     * A relational link to the cases of this collection.
     * @property {[DG.Case]}
     */
    cases: null,

    /**
     * Map of case IDs to indices within parent cases
     *
     * ToDo: I think this property goes away. It is used in formulas.
     * ToDo: propose implementing some other way.
     *
     * @property {Object} of {String}:{Number}
     */
    caseIDToIndexMap: null,

    /**
     * Indicates whether parent/child links are configured correctly.
     * Games using the revised API (Aug 2011) should set this to true.
     * Note that this property is not a record attribute and is not
     * expected to be archived with the record. It's a temporary flag
     * for use until games using the old API are no longer supported.
     *
     * ToDo: Believe this property is removable.
     *
     * @property {Boolean}
     */
    areParentChildLinksConfigured: false,

    /**
     * Map of parent case IDs to number of cases with that parent
     *
     * ToDo: Make dynamic?
     *
     * @property {Object}
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
     *
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
      this.dataSet = this.context.dataSet;
      this.dataSet.registerCollection(this, null);
      this.updateCaseIDToIndexMap();
    },

    /**
     Destroy the collection's cases and attributes when the collection is destroyed.
     */
    destroy: function() {
      var context, ix;
      this.cases.forEach( function( iCase) { DG.Case.destroyCase( iCase); });

      this.attrs.forEach( function( iAttr) { DG.Attribute.destroyAttribute( iAttr); });

      // remove link from parent
      if (this.parent) {
        ix = this.parent.children.indexOf(this);
        if (ix >= 0) {
          this.parent.children.removeAt(ix, 1);
        }
      }

      // link up child
      if (this.children) {
        this.children.forEach(function (child) {
          if (this.parent) {
            this.parent.children.pushObject(child);
          }
          child.parent = this.parent;
        }.bind(this));
      }
      context = this.context;
      context.removeCollection(this);
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
      this.attrs.pushObject(attr);
      this.dataSet.addAttributes([attr]);
      return attr;
    },

    /**
     * Adds an existing attribute at a particular position in the sequence of
     * attributes. If position is undefined, defaults to the last position.
     *
     * @param attr
     * @param position
     */
    addAttribute: function (attr, position) {
      attr.set('collection', this);
      if (SC.none(position)) {
        this.attrs.pushObject(attr);
      } else {
        this.attrs.insertAt(position, attr);
      }
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
     * @param iProperties {Object}  Properties of the newly created case
     *                  We assume iProperties only applies to this creation event
     *                  and is mutable.
     * @returns {DG.Case}
     */
    createCase: function (iProperties) {

      function gatherLeftAttributeList (collection) {
        if (SC.none(collection)) {
          return [];
        } else {
          return gatherLeftAttributeList(collection.get('parent')).concat(collection.getAttributeIDs());
        }
      }
      function joinValues(values, parentItem) {
        var list = gatherLeftAttributeList(_this.get('parent'));
        list.forEach(function(attrId) { values[attrId] = parentItem.values[attrId]; });
        return values;
      }

      iProperties = iProperties || {};

      var item = iProperties.item;
      var newCase;
      var _this = this;
      var dataSet = this.get('dataSet');
      var values = this.mapAttributeNamesToIDs(iProperties.values);
      var parent = iProperties.parent;

      // Relate it to its parent collection
      iProperties.collection = this;

      delete iProperties.values;

      if (!item) {
        // if no parent then create item
        // if parent and parent has children create item with parent's values and new values
        // if parent and parent has no children add new values to parent item
        if (SC.none(parent)) {
          item = dataSet.addDataItem(values);
        } else {
          parent = DG.store.resolve(parent);
          if (parent.get('children').length > 0) {
            item = dataSet.addDataItem(joinValues(values, parent.item));
          } else {
            item = parent.get('item');
            item.updateData(values);
          }
        }
        iProperties.item = item;
      }

      newCase = DG.Case.createCase(iProperties);

      this.addCase(newCase);

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
      this.cases.pushObject(iCase);
    },

    moveCase: function(iCase, position) {
      var currentPosition = this.cases.indexOf(iCase);
      if (currentPosition >= 0 && currentPosition !== position) {
        this.cases.insertAt(position, this.cases.removeAt(currentPosition));
      }
    },
    /**
     * Deletes the specified case from this collection.
     * Clients should call updateCaseIDToIndexMap() after deleting cases.
     * @param   {DG.Case} iCase The case to delete.
     * @param   {boolean} retainItem Delete the case, but do not delete the
     *                    underlying data item.
     */
    deleteCase: function (iCase, retainItem) {
      var item = iCase.item;
      DG.Case.destroyCase(iCase);
      if (!retainItem) {
        this.dataSet.deleteDataItemByIndex(item.itemIndex);
      }
    },

    /**
     * Recreates a set of cases in this collection from the DataSet. If no
     * argument is provided, will recreate cases for all items, otherwise will create cases
     * for this set only. In either situation will append to the collection's case
     * array, as created.
     *
     * @param items {[DG.DataItem]}
     * @param parent {DG.Case} The parent case for this set of cases.
     */
    recreateCases: function (items, parent) {
      var createdCases = [];
      // Look for a case that references the item. If found we position it
      function findOrCreateCaseForItem (item, parent, collection) {
        var tCase = collection.cases.findProperty('item', item);
        if (SC.none(tCase)) {
          tCase = DG.Case.createCase({
            parent: parent,
            collection: collection,
            item: item
          });
          collection.addCase(tCase);
          createdCases.push(tCase);
        } else {
          if (parent) {
            tCase.parent = parent;
            parent.children.pushObject(tCase);
          } else {
            tCase.parent = null;
          }
        }
        return tCase;
      }

      // ------- Start of recreateCases --------

      var childCollection = this.children[0];
      var itemGroups = {};  // a hash value representing the values for the
                            // attributes of this collection

      if (SC.none(items)) {
        items = this.dataSet.dataItems;
      }


      // We are going to walk the itemGroups hash-map creating cases.
      // If we are the base collection we will have a case for each item in the
      // order defined by the item list.
      if (SC.none(childCollection)) {
        items.forEach(function (item) {
          // create a case
          var theCase = findOrCreateCaseForItem(item, parent, this);
          theCase._deletable = false;
        }.bind(this));
      } else {
        // If this is not a base collection, we
        // make a hash-map of items with the hash-key being the attribute
        // values for this collection's attributes and the values being arrays of items
        items.forEach(function (item) {
          if (!item.deleted) {
            var values = this.attrs.map(function (attr) { return item.values[attr.id];}).join();
            var list = itemGroups[values] || [];
            if (list.length === 0) {
              itemGroups[values] = list;
            }
            list.push(item);
          }
        }.bind(this));

        // Now we make or find a case for each group in the hash map, and
        // recreate cases for the items in each group
        DG.ObjectMap.forEach(itemGroups, function(key, list) {
          var childCases;
          var theCase = findOrCreateCaseForItem(list[0], parent, this);
          theCase.children = [];
          theCase._deletable = false;

          // call recreate cases on the child collection for each hash entry.
          childCases = childCollection.recreateCases(list, theCase);
          createdCases = createdCases.concat(childCases);
        }.bind(this));
      }
      this.updateCaseIDToIndexMap();
      return createdCases;
    },

    reorderCases: function (level, levelCounts, iCases, parent) {
      var childCollection = this.children[0];
      if (SC.none(levelCounts[level])) {
        levelCounts[level] = 0;
      }
      if (SC.none(iCases)) {
        // Sort top level collection
        this.cases.sort(function(a, b) {
          return a.item.itemIndex - b.item.itemIndex;
        });
        if (!SC.none(childCollection)) {
          this.cases.forEach(function (iCase) {
            var children = iCase.children;
            childCollection.reorderCases(level + 1, levelCounts, children, iCase);
          });
        }
      } else {
        // sort children
        iCases.sort(function(a, b) {
          return a.item.itemIndex - b.item.itemIndex;
        });
        iCases.forEach(function (iCase) {
          this.cases[levelCounts[level]++] = iCase;
          if (iCase.children && iCase.children.length>0) {
            childCollection.reorderCases(level + 1, levelCounts, iCase.children, iCase);
          }
        }.bind(this));
      }
      this.updateCaseIDToIndexMap();
    },

    /**
     * Removes an attribute from this collection. The attribute is not deleted.
     * It is assumed the attribute will be added to a new collection.
     *
     * @param attr {DG.Attribute}
     * @return {DG.Attribute}
     */
    removeAttribute: function (attr) {
      var ix;
      for (ix = 0; ix < this.attrs.length; ix += 1) {
        if (this.attrs[ix].id === attr.id) {
          break;
        }
      }
      this.attrs.removeAt(ix, 1);
      return attr;
    },

    /**
     * Returns an array of ids for the attributes in the collection.
     * @returns {[Number]}
     */
    getAttributeIDs: function () {
      return this.attrs.getEach('id');
    },

    /**
     * Returns an array of names for the attributes in the collection.
     * @returns {[String]}
     */
    getAttributeNames: function () {
      return this.attrs.getEach('name');
    },

    mapAttributeNamesToIDs: function (dataMap) {
      var valuesMap = {};
      var attrs = this.attrs;
      DG.ObjectMap.forEach(dataMap, function (iKey, iValue) {
        var attr = attrs.findProperty('name', iKey);
        if( !SC.none( attr)) {
          valuesMap[attr.id] = iValue;
        } else {
          valuesMap[iKey] = iValue;
        }
      });
      return valuesMap;
    },

    /**
     * Returns an array of ids for the cases in the collection,
     *  suitable for use by clients like Protovis.
     * @returns {[Number]}
     */
    getCaseIDs: function () {
      return this.cases.getEach('id');
    },

    /**
     * Rebuilds the 'caseIDToIndexMap' and 'caseCounts' properties.
     * This function should be called whenever the mapping between
     * case IDs and indices must change, e.g. after deleting cases.
     */
    updateCaseIDToIndexMap: function () {
      var caseIndices = {}, map = {};
      this.cases.forEach(function (iCase) {
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
        parent: parentID,
        type: 'DG.Collection'
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
  var childCollection = null;

  if( SC.none( iProperties)) {
    iProperties = {};
  }

  if( SC.none( iProperties.type)) {
    iProperties.type = 'DG.Collection';
  }

  if (iProperties.children) {
    childCollection = iProperties.children[0];
  }

  if (iProperties.parent) {
    iProperties.parent = DG.store.resolve(iProperties.parent);
  }

  tCollection = DG.Collection.create(iProperties);

  // if child collection, link this collection in
  if (childCollection) {
    if (childCollection.get('parent')) {
      childCollection.get('parent').children[0] = tCollection;
      tCollection.set('parent', childCollection.get('parent'));
    }
    tCollection.children[0] = childCollection;
    childCollection.set('parent', tCollection);

  }

  if (iProperties.parent) {
    DG.store.resolve(iProperties.parent).children[0] = tCollection;
  }

  if (iProperties.context) {
    iProperties.context.addCollection( tCollection);
  }

  if (!SC.none(iProperties.areParentChildLinksConfigured)) {
    tCollection.set('areParentChildLinksConfigured',
      iProperties.areParentChildLinksConfigured);
  }

  if (iProperties.attrs) {
    iProperties.attrs.forEach(function (iAttr) {
      iAttr.collection = tCollection;
      tCollection.createAttribute(iAttr);
    });
  }

  if (iProperties.cases) {
    iProperties.cases.forEach(function (iCase) {
      iCase.collection = tCollection;
      tCollection.createCase(iCase);
    });
  }

  DG.log('Create collection: ' + [tCollection.name, tCollection.description].join());

  return tCollection;
};

DG.Collection.destroyCollection = function (iCollection) {
  iCollection.destroy();
};
