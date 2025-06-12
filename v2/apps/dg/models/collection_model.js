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
     * Utility function for use in sorting DataItems into user/case order.
     * @type {function}
     */
    _caseCompareFunc: null,

    /**
     * Utility function for retrieving/caching the _caseCompareFunc.
     */
    getCaseCompareFunc: function() {
      if (this._caseCompareFunc) return this._caseCompareFunc;
      var itemCompareFunc = this.getPath('dataSet.compareItemsByClientIndex');
      if (itemCompareFunc) {
        this._caseCompareFunc = function(case1, case2) {
                                  return itemCompareFunc(case1.item, case2.item);
                                };
      }
      return this._caseCompareFunc;
    },

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
     * Map of case IDs to indices within the collection as a whole
     *
     * @property {Object} of {String}:{Number}
     */
    caseIDToIndexMap: null,

    /**
     * Map of case IDs to indices within parent cases
     *
     * @property {Object} of {String}:{Number}
     */
    caseIDToGroupedIndexMap: null,

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
     * The displayed name of the collection
     * @property {String}
     */
    _title: null,
    title: function (k, v) {
      if (!SC.none(v)) {
        this._title = v;
      }
      return this._title || this.name;
    }.property(),

    /**
     * Initializes the DG.Collection object.
     */
    init: function () {

      sc_super();

      this.attrs = [];
      this.cases = [];
      this.children = this.children || [];
      this.dataSet = this.context.dataSet;
      this.dataSet.registerCollection(this, this.children[0]);
      this.updateCaseIDToIndexMap();
    },

    /**
     Destroy the collection's cases and attributes when the collection is destroyed.
     */
    destroy: function() {
      var context, ix;
      this.cases.forEach( function( iCase) {
        DG.Case.destroyCase( iCase);
      });

      while( this.attrs.length > 0) {
        DG.Attribute.destroyAttribute( this.attrs.pop());
      }

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
      if(context.dataSet)
        context.dataSet.unregisterCollection( this);
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
      var attr, tStoredAttr;
      iProperties = iProperties || {};
      // Relate it to its parent collection
      iProperties.collection = this;
      tStoredAttr = DG.store.find(DG.Attribute, iProperties.guid);
      if( tStoredAttr) {
        attr = tStoredAttr;
      } else {
        attr = DG.Attribute.createAttribute(iProperties);
      }
      this.attrs.pushObject(attr);
      if( !this.dataSet.hasAttribute(attr))
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
      var values = DG.DataUtilities.canonicalizeAttributeValues(this.attrs, iProperties.values);
      var parentID = iProperties.parent;
      var parent;
      var parentItemID;
      var parentHasChildren;
      var itemID = iProperties.itemID;

      // Relate it to its parent collection
      iProperties.collection = this;

      delete iProperties.values;

      if (!item) {
        if (SC.none(parentID)) {
          // if no parent then create item
          item = dataSet.addDataItem(DG.DataItem.create({id: itemID, values: values}));
        } else {
          parent = DG.store.resolve(parentID);
          parentItemID = parent.item.id;
          parentHasChildren = parent.get('children') && parent.get('children').length > 0;
          if (parentHasChildren && SC.none(itemID)){
            // if new child case has no item id, create new item by merging new
            // values with parent values.
            item = dataSet.addDataItem(joinValues(values, parent.item));
          } else if (itemID && itemID !== parentItemID) {
            // if new child has item id and it differs from parent's item id,
            // create a new item by merging new values with parent values
            item = dataSet.addDataItem(DG.DataItem.create({id: itemID, values: joinValues(values, parent.item)}));
          } else {
            // if item id matches parent item, update the parent's item
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
     * Returns the last case in the collection.
     * @returns {*|boolean}
     */
    lastCase: function () {
      return this.cases[this.cases.length - 1];
    },
    /**
     * Adds a new case to the collection.

     * @param   {DG.Case}  iCase The newly created case
     */
    addCase: function (iCase) {
      // If we are in the top level collection we always append cases.
      // We always append cases to the parent's case group, so if parent of the
      // last case in this collection has an index not greater than this case we
      // can append to this collection.
      function caseShouldBeAddedAtEnd(iParentID, iParentCollection, iLastCase) {
        if (SC.none(iParentID) || SC.none(iLastCase) || SC.none(iLastCase.parent)) {
          return true;
        }
        DG.assert(!SC.none(iParentCollection), 'parentCollection should exist');
        var parentCaseIndex = iParentCollection.caseIDToIndexMap[iParentID];
        var lastCaseParentIndex = iParentCollection.caseIDToIndexMap[iLastCase.parent.id];

        return (lastCaseParentIndex <= parentCaseIndex );
      }
      function insertCaseInCollection(iParentID, iCase) {
        var parentCollection = _this.parent;
        DG.assert(!SC.none(parentCollection), 'parentCollection does not exist');
        var parentCaseIndex = parentCollection.caseIDToIndexMap[iParentID];
        DG.assert(!SC.none(parentCaseIndex), 'parentCaseIndex does not exist');
        var parentCase = parentCollection.cases[parentCaseIndex];
        var parentsLastChild;
        var priorIndex = -1;

        DG.assert(!SC.none(parentCase), 'parentCase does not exist');
        if (parentCase.children.length > 1) { // the newly added case is already known
                                              // at the parent level, so we adjust for it
          parentsLastChild = parentCase.children[parentCase.children.length - 2];
          priorIndex = _this.caseIDToIndexMap[parentsLastChild.id];
        } else {
          // if we get here, our parent is not the last case in the parent
          // collection, and it doesn't have any children, so we perform a
          // search of this collection to find the last case in this collection
          // with a parent earlier in the parent collection than our parent.
          _this.cases.some(function (iCase, ix) {
            if (parentCollection.caseIDToIndexMap[iCase.parent.id] <= parentCaseIndex) {
              priorIndex = ix;
              return false;
            } else {
              return true;
            }
          });
        }
        DG.assert(!SC.none(priorIndex), 'parent\'s last child not in index map.');
        _this.cases.insertAt(priorIndex+1, iCase);
        _this.updateCaseIDToIndexMap();
      }

      /*
       * start of addCase method
       */
      var caseID = iCase.get('id'),
        parentID = iCase.getPath('parent.id'),
        caseIDToIndexMap = this.get('caseIDToIndexMap'),
        caseCounts = this.get('caseCounts'),
        _this = this;

      if (SC.none(caseCounts[parentID])) {
        caseCounts[parentID] = 0;
      }

      if (caseShouldBeAddedAtEnd(parentID, this.parent, this.lastCase())) {
        this.caseIDToGroupedIndexMap[caseID] = caseCounts[parentID]++;
        caseIDToIndexMap[caseID] = this.cases.length;
        this.cases.pushObject(iCase);
        this.notifyPropertyChange('caseIDToIndexMap');
      } else {
        insertCaseInCollection(parentID, iCase);
      }
    },

    /**
     * Changes the order of the specified case within this collection.
     * If moving multiple cases, clients should pass false for iSkipIDMapUpdate
     * in all calls except the last, or call updateCaseIDToIndexMap() directly
     * once all moves are complete.
     * @param   {DG.Case} iCase The case to move.
     * @param   {number}  position The desired index of the moved case
     * @param   {boolean} iSkipIDMapUpdate If true, the re-mapping of case IDs to indices will be skipped.
     */
    moveCase: function(iCase, position, iSkipIDMapUpdate) {
      var currentPosition = this.cases.indexOf(iCase);
      if (currentPosition >= 0 && currentPosition !== position) {
        this.cases.removeAt(currentPosition);
        this.cases.insertAt(position, iCase);
      }
      if (!iSkipIDMapUpdate) {
        this.updateCaseIDToIndexMap();
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
        this.dataSet.deleteDataItem(item);
      }
    },

    setAsideCase: function (iCase) {
      var item = iCase.item;
      DG.Case.destroyCase(iCase);
      this.dataSet.deleteDataItem(item, true);
    },

    restoreSetAsideCases: function () {
      var items = this.dataSet.restoreSetAsideItems();
      var count = items.length;
      if (count > 0) {
        this.updateCaseIDToIndexMap();
      }
      DG.log("Restored " + count + " cases in collection \"" + this.get('name') + "\"");
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
      var collectionID = this.get('id'),
          createdCases = [];
      // Look for a case that references the item. If found we position it
      function findOrCreateCaseForItem (items, parent, collection) {
        var tCase;
        items.some(function (item) {
          tCase = DG.Case.findCase(collectionID, item.get('id'));
          return !!tCase;
        });
        // var tCase = DG.Case.findCase(collectionID, item.get('id'));
        if (!tCase) {
          tCase = DG.Case.createCase({
            parent: parent,
            collection: collection,
            item: items[0]
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
          tCase.children = [];
        }
        return tCase;
      }

      // ------- Start of recreateCases --------

      var childCollection = this.children[0];
      var itemGroups = {};  // a hash value representing the values for the
                            // attributes of this collection
      var attrs = [];

      if (SC.none(items)) {
        items = this.dataSet.getDataItems()
                  .filter(function (item) { return !item.deleted; });
      }

      attrs = this.attrs.filter(function (attr) {
        return SC.empty(attr.formula);
      });


      // We are going to walk the itemGroups hash-map creating cases.
      // If we are the base collection we will have a case for each item in the
      // order defined by the item list.
      if (SC.none(childCollection)) {
        items.forEach(function (item) {
          // create a case
          var theCase = findOrCreateCaseForItem([item], parent, this);
          theCase._deletable = false;
        }.bind(this));
      } else {
        // If this is not a base collection, we
        // make a hash-map of items with the hash-key being the attribute
        // values for this collection's attributes and the values being arrays of items
        items.forEach(function (item) {
          if (!item.deleted) {
            var values = attrs.map(function (attr) {
              var value =  item.values[attr.id];
              var newValue;
              if (typeof value === 'object') {
                try {
                  newValue = JSON.stringify(value);
                } catch (ex) {
                  console.warn('In collection ' + collectionID + ', item ' +
                      item.id + ', Attribute value is non-serializable object');
                  newValue = 'object';
                }
              } else {
                newValue = value;
              }
              return newValue;
            }).join();
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
          var theCase = findOrCreateCaseForItem(list, parent, this);
          theCase.children = [];
          theCase._deletable = false;

          // call recreate cases on the child collection for each hash entry.
          childCases = childCollection.recreateCases(list, theCase);
          createdCases = createdCases.concat(childCases);
        }.bind(this));
      }
      //this.updateCaseIDToIndexMap();
      return createdCases;
    },

    reorderCases: function (level, levelCounts, iCases, parent) {
      var childCollection = this.children[0],
          caseCompareFunc = this.getCaseCompareFunc();
      if (SC.none(levelCounts[level])) {
        levelCounts[level] = 0;
      }
      if (SC.none(iCases)) {
        // Sort top level collection
        this.cases.sort(caseCompareFunc);
        if (!SC.none(childCollection)) {
          this.cases.forEach(function (iCase) {
            var children = iCase.children;
            childCollection.reorderCases(level + 1, levelCounts, children, iCase);
          });
        }
      } else {
        // sort children
        iCases.sort(caseCompareFunc);
        iCases.forEach(function (iCase) {
          this.cases[levelCounts[level]++] = iCase;
          if (iCase.children && iCase.children.length>0) {
            childCollection.reorderCases(level + 1, levelCounts, iCase.children, iCase);
          }
        }.bind(this));
      }
      //this.updateCaseIDToIndexMap();
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

      attr.set('collection', null);
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
     *
     * @param iId {Number}
     * @returns {DG.Attribute}
     */
    getAttributeByID: function( iId) {
      return this.attrs.find( function( iAttr) {
        return iAttr.get('id') === iId;
      });
    },

    /**
     * Returns an array of names for the attributes in the collection.
     * @returns {[String]}
     */
    getAttributeNames: function () {
      return this.attrs.getEach('name');
    },

    /**
     * Returns an array of names for the attributes in the collection.
     * @returns {[String]}
     */
    numberOfVisibleAttributes: function () {
      return this.attrs.reduce( function (iCountVisible, iAttr) {
        if( !iAttr.get('hidden'))
          iCountVisible++;
        return iCountVisible;
      }, 0);
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
      var caseIndices = {},
          map = {},
          groupedMap = {};
      this.cases.forEach(function (iCase, ix) {
          if (!iCase.get('isDestroyed')) {
            var caseID = iCase.get('id'), parentID = iCase.getPath('parent.id');
            if (SC.none(caseIndices[parentID]))
              caseIndices[parentID] = 0;
            groupedMap[caseID] = caseIndices[parentID]++;
            map[caseID] = ix;
          }
        });
      this.set('caseIDToIndexMap', map);
      this.set('caseIDToGroupedIndexMap', groupedMap);
      // The caseIndices map now indicates # cases for each parent
      this.set('caseCounts', caseIndices);
    },

    /**
     * @param iCaseID {number|string}
     * @returns {number|undefined}
     */
    getCaseIndexByID: function (iCaseID) {
      var caseIDToIndexMap = this.get('caseIDToIndexMap');
      return caseIDToIndexMap && caseIDToIndexMap[iCaseID];
    },

    /**
     * Debug-only utility function.
     */
    debugLog: function (iPrompt) {
      DG.log((iPrompt || "") + " Collection " +
        this.get('id') + ", Attrs: [" +
        this.getAttributeIDs() + "], Cases: [" + this.getCaseIDs() + "]");
    },

    toArchive: function (excludeCases) {
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
        caseName: this.get('caseName'),
        childAttrName: this.get('childAttrName'),
        collapseChildren: this.get('collapseChildren'),
        defaults: this.get('defaults'),
        guid: this.get('id'),
        id: this.get('id'),
        labels: this.labels,
        name: this.get('name'),
        parent: parentID,
        title: this.get('title'),
        type: 'DG.Collection'
      };
      this.attrs.forEach(function (attr) {
        obj.attrs.push(attr.toArchive());
      });
      if (!excludeCases) {
        this.cases.forEach(function (myCase) {
          obj.cases.push(myCase.toArchive());
        });
      }
      return obj;
    }
  };
}())) ;

DG.Collection.createCollection = function( iProperties) {
  if (!(iProperties && iProperties.context)) {
    return;
  }

  var tContextRecord = iProperties.context;
  var tParent = SC.none(iProperties.parent)? null :  DG.store.resolve(iProperties.parent);
  var tRoot = DG.ObjectMap.values(tContextRecord.collections).find(function (collection) {
    return SC.none(collection.parent);
  });
  var tCollection;
  var childCollection = null;

  if( SC.none( iProperties.type)) {
    iProperties.type = 'DG.Collection';
  }

  if (iProperties.children) {
    childCollection = iProperties.children[0];
  }

  iProperties.parent = tParent;

  tCollection = DG.Collection.create(iProperties);

  // if child collection, link this collection in
  if (childCollection) {
    if (childCollection.get('parent')) {
      childCollection.get('parent').children[0] = tCollection;
      tCollection.set('parent', childCollection.get('parent'));
    }
    tCollection.children[0] = childCollection;
    childCollection.set('parent', tCollection);
  } else if (tParent) {
    if (tParent.children[0]) {
      tParent.children[0].set('parent', tCollection);
      tCollection.children[0] = tParent.children[0];
    }
    tParent.children[0] = tCollection;
  } else if (tRoot) {
    tCollection.children[0] = tRoot;
    tRoot.set('parent', tCollection);
  }

  tContextRecord.addCollection( tCollection);

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
