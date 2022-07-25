// ==========================================================================
//                        DG.CollectionClient
//
//  Author:   Kirk Swenson
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

  (Document Your Controller Here)

  @extends SC.Object
*/
DG.CollectionClient = SC.Object.extend(
/** @scope DG.CollectionClient.prototype */ {

  collection: null, // DG.Collection

  /**
   * The id of the underlying DG.CollectionRecord.
   * @property {Number}
   */
  id: function() {
    return this.collection && this.collection.get('id');
  }.property('collection').cacheable(),

  /**
   * The name of the collection with which this object is associated.
   * @property {String}
   */
  name: function(key, value) {
    if (value !== undefined) {
      this.collection.set('name', value);
    }
    return this.collection && this.collection.get('name');
  }.property('collection').cacheable(),

  titleBinding: '.collection.title',

  collapseChildren: function () {
    return this.collection && this.collection.get('collapseChildren');
  }.property('collection').cacheable(),

  defaults: function () {
    return this.collection && this.collection.get('defaults');
  }.property('collection').cacheable(),

  /**
   * Returns labels for this collection, if any have been set.
   * @returns {Object}
   */
  labels: function () {
    return this.collection && this.collection.get('labels');
  }.property('collection').cacheable(),

  attrsController: null,

  casesController: null,

  attrFormulaChanges: null,

  /**
    Returns true if this collection contains attributes with formulas that
    use aggregate functions. The presence of aggregate function references
    can affect how clients respond to change notifications, for instance.
    @property   {Boolean}
   */
  hasAggregates: function() {
    var attrCount = this.attrsController.get('length');
    for( var i = 0; i < attrCount; ++i) {
      var attr = this.attrsController.objectAt( i);
      if( attr && attr.getPath('_dgFormula.hasAggregates'))
        return true;
    }
    return false;
  }.property(),

  init: function() {
    sc_super();
    this.attrsController = SC.ArrayController.create({});
    this.casesController = SC.ArrayController.create({});
  },

  /**
    Destruction method.
   */
  destroy: function() {
    this.attrsController.forEach( function( iAttribute) {
      if( iAttribute)
        this.willDestroyAttribute( iAttribute);
    }.bind(this));
    this.collection.destroy();
    sc_super();
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
    return this.getPath('collection.areParentChildLinksConfigured');
  }.property().cacheable(),
  /**
   * Provides support for hooking up collection relationships for
   * games using the old game API.
   * @param {DG.CollectionClient} iParentCollection
   */
  setParentCollection: function( iParentCollection) {
    var childCollection = this.get('collection'),
        parentCollection = iParentCollection.get('collection');
    if( childCollection && parentCollection) {
      childCollection.set('parent', parentCollection);
      childCollection.set('areParentChildLinksConfigured', true);
      parentCollection.set('areParentChildLinksConfigured', true);
    }
  },

  getParentCollectionID: function () {
    var collectionModel = this.get('collection');
    var parent = collectionModel && collectionModel.parent;
    return (parent && parent.id);
  },

  /**
    Returns true if iOtherCollection is descended from this collection.
    @param {DG.CollectionClient} iOtherCollection The collection to test for ancestry.
    @returns {Boolean} True if this is an ancestor of iOtherCollection, false otherwise.
   */
  isAncestorOf: function( iOtherCollection) {
    var myCollectionModel = this.get('collection');
    return myCollectionModel &&
            myCollectionModel.isAncestorOf( iOtherCollection.get('collection'));
  },

  /**
    Returns true if this collection is descended from iOtherCollection.
    @param {DG.CollectionClient} iOtherCollection The collection to test for ancestry.
    @returns {Boolean} True if this is an descendant of iOtherCollection, false otherwise.
   */
  isDescendantOf: function( iOtherCollection) {
    var myCollectionModel = this.get('collection');
    return myCollectionModel &&
            myCollectionModel.isDescendantOf( iOtherCollection.get('collection'));
  },

  /**
    Sets the collection model for this collection client.
    @param    {DG.CollectionModel}  iCollection -- The collection to be used as this object's model
   */
  setTargetCollection: function( iCollection) {
    this.set('collection', iCollection);
    this.attrsController.set('content', iCollection.attrs);
    this.casesController.set('content', iCollection.cases);

    // When restoring documents, we need to process the restored attributes
    this.forEachAttribute( function( iAttribute) {
                            this.didCreateAttribute( iAttribute);
                          }.bind( this));
  },

  /**
   * Reorders the attributes according to the order specified by the attribute
   * list. The attribute list is an array of attribute names. All names in the
   * list must be present as named attributes or the reordering will be
   * abandoned. There may be attributes not specified in the list. These will
   * be ordered after the attributes named in the list in their present order.
   *
   * @param {[String]} iAttributeNameList an array of attribute names
   */
  reorderAttributes: function(iAttributeNameList) {
    var nameListLength = iAttributeNameList.length;
    this.collection.attrs.sort(function(attr1, attr2) {
      var ix1 = iAttributeNameList.indexOf(attr1.name),
        ix2 = iAttributeNameList.indexOf(attr2.name);
      if (ix1 < 0) {ix1 = nameListLength++;}
      if (ix2 < 0) {ix2 = nameListLength++;}
      return ix1 - ix2;
    });
  },

  /**
    Returns an array with the IDs of the attributes in the collection.
   */
  getAttributeIDs: function() {
    return this.attrsController.getEach('id');
  },

  /**
    Returns an array with the names of the attributes in the collection.
    @returns    {[string]}   The array of attribute names
   */
  getAttributeNames: function() {
    return this.attrsController.getEach('name');
  },

    /**
     Returns an array with the names of the visible attributes in the collection.
     Omits any attributes with 'hidden' property set to true
     @returns    {[string]}   The array of attribute names
     */
    getVisibleAttributeNames: function() {
      return this.attrsController.filterProperty('hidden', false).getEach('name');
    },

  /**
    Returns the number of attributes in the collection.
    @returns    {Number}    The number of attributes in the collection
   */
  getAttributeCount: function() {
    return this.attrsController.get('length');
  },

  /**
    Returns the attribute at the specified index in the collection.
    @param    {Number}        iAttrIndex -- The index of the attribute to be returned
    @returns  {DG.Attribute}  The DG.Attribute with the specified ID or undefined
   */
  getAttributeAt: function(iAttrIndex) {
    return this.attrsController.objectAt(iAttrIndex);
  },

  /**
    Returns the attribute with the specified ID.
    @param    {Number}        iAttrID -- The ID of the attribute to be returned
    @returns  {DG.Attribute}  The DG.Attribute with the specified ID or undefined
   */
  getAttributeByID: function(iAttrID) {
    return !SC.none( iAttrID) ? this.attrsController.findProperty('id', Number(iAttrID)) : undefined;
  },

  /**
    Returns the attribute whose name matches the specified name.
    @param    {String}        iAttrName -- The name of the attribute to be returned
    @returns  {DG.Attribute}  The DG.Attribute with the specified ID or undefined
   */
  getAttributeByName: function(iAttrName) {
    return !SC.empty( iAttrName) ? this.attrsController.findProperty('name', iAttrName) : undefined;
  },

  /**
    Returns the index of the specified attribute name in the list of attribute names.
    @param    {String}        iAttrName -- The name of the attribute whose index is to be returned
    @returns  {Number}        0-origin index of attribute name in attribute list, or -1 if not found
   */
  getAttributeIndexByName: function( iAttrName) {
    var tNames = this.getAttributeNames();
    return tNames.indexOf( iAttrName );
  },

  /**
    Returns true if the collection contains an attribute with the specified name,
    false otherwise.
    @param    {String}    iAttrName -- The name of the attribute to look for
    @returns  {Boolean}   True if an attribute with the specified name exists,
                          false otherwise.
   */
  hasAttribute: function( iAttrName) {
    return this.getAttributeIndexByName( iAttrName) >= 0;
  },

  /**
    Creates a new attribute with the specified properties.
    @param    {Object}        iProperties -- Initial property values
    @returns  {DG.Attribute}  The newly-created DG.Attribute object
   */
  createAttribute: function( iProperties) {
    var newAttribute = this.collection.createAttribute( iProperties || {});

    if( newAttribute) this.didCreateAttribute( newAttribute);

    return newAttribute;
  },

  /**
    Utility function called when an attribute is added to the collection or
    when the DG.CollectionClient is first attached to an existing collection.
    Adds necessary observers for each attribute in the collection.
    @param    {DG.Attribute}  iAttribute -- The attribute being added
   */
  didCreateAttribute: function( iAttribute) {
  },

  /**
    Utility function called when an attribute is about to be removed from the collection
    or when the DG.CollectionClient is first attached to an existing collection.
    Removes necessary observers from each attribute in the collection.
   */
  willDestroyAttribute: function( iAttribute) {
  },

  canonicalizeName: function (iName) {
    return DG.Attribute.canonicalizeName(iName);
  },

  /**
    Returns the attribute which matches the specified properties, creating it if it doesn't already exist.
    @param    {Object}        iProperties -- Initial property values
    @param    {boolean}       isUndo -- optional param: whether this call is
                                part of an undo
    @returns  {DG.Attribute}  The matching or newly-created DG.Attribute object

   */
  guaranteeAttribute: function( iProperties, isUndo) {

    var tAttribute = null;

    // See if the attribute already exists
    iProperties = iProperties || {};

    if (!SC.none(iProperties.name)) {
      iProperties.name = this.canonicalizeName(iProperties.name);
    }

    // if the property has an ID then it is an existing attribute, possibly from
    // another collection. If so, we need to remove it from the other collection
    // and add it here.

    if (!SC.empty( iProperties.name)) {
      tAttribute = this.getAttributeByName( iProperties.name);

      if ( tAttribute) {
        // Attribute already exists:
        // copy the formula property, if there is one.
        if( iProperties.formula !== undefined || isUndo) {
          // we used to ban formula changes if editable flag not set.
          // Now, data interactive is considered to preempt the setting
          // in the document.
          this.setAttributeFormula( tAttribute, iProperties.formula, isUndo);
        }
        // copy the attribute colors
        if (!SC.none( iProperties.categoryMap)) {
          tAttribute.set('categoryMap', SC.clone( iProperties.categoryMap));
        }

        ['title', 'type', 'description', 'editable', 'hidden', 'precision', 'unit', 'blockDisplayOfEmptyCategories'].forEach(function (prop) {
          if (!SC.none( iProperties[prop])) {
            tAttribute.set(prop, iProperties[prop]);
          }
        });
      }

      // If the attribute doesn't exist, we must create it
      else {
        tAttribute = this.createAttribute( iProperties);
      }
    }

    return tAttribute;
  },

  /**
    Sets the formula for the specified attribute.
    If a formula is removed, computed values become editable ones.
    @param  {DG.Attribute}    iAttribute -- The attribute whose formula is to be set.
    @param  {String}          iFormula -- The formula to set for the attribute
    @param  {boolean}         isUndo -- whether call is part of an undo. If so
                                        and the operation removes a formula, we
                                        do not overwrite existing values with
                                        formula values.
   */
  setAttributeFormula: function( iAttribute, iFormula, isUndo) {
    var attrID = iAttribute && iAttribute.get('id'),
        didHaveFormula = iAttribute.get('hasFormula'),
        willHaveFormula = !SC.empty( iFormula),
        preserveComputedValues = didHaveFormula && !willHaveFormula && !isUndo,
        preservedValues = [];

    // Preserve computed values if necessary
    if( preserveComputedValues) {
      // preserve computed values
      this.forEachAttributeValue( attrID,
                                  function( iValue) {
                                    preservedValues.push( iValue);
                                  });
    }

    // Set the new formula (which may erase the formula)
    iAttribute.set('formula', iFormula);

    // Restore the preserved computed values if necessary
    if( preserveComputedValues) {
      // set the preserved values as the new case values
      this.setAttributeValuesFromArray( attrID, preservedValues);
      // Mark legacy attributes with formulae as 'editable'
      if( !iAttribute.get('editable'))
        iAttribute.set('editable', true);
    }
    // Signal a formula change manually. See comment under newAttribute
    // for details of why we're signalling manually.
    this.attributeFormulaDidChange(iAttribute);
  },

  /**
    Applies the specified function to each attribute in the collection.
    @param    {Function}      iFunction to be applied to each attribute
    @returns  {DG.CollectionClient} this, for use in chaining method invocations
   */
  forEachAttribute: function( iFunction) {
    this.collection.attrs.forEach( iFunction);
    return this;
  },

  /**
    Returns an array containing the IDs of every case.
    @returns  {Array of Number}   The array of case IDs
   */
  getCaseIDs: function() {
    return this.casesController.getEach('id');
  },

  parseSearchQuery: function (queryString) {
      if (queryString === '*') {
        return {
          valid: true,
          op: '*'
        };
      }
    // for now this is a simple single expression of "left op right" where op is a comparison operator
    // this could be expanded (along with the testCaseAgainstQuery method below) using the shunting yard algorithm
    var matches = queryString.match(/([^=!<>]+)(==|!=|<=|<|>=|>)([^=!<>]*)/),
        trim = function (s) { return s.replace(/^\s+|\s+$/, ''); },
        parsedQuery = {
          valid: !!matches,
          left: matches && trim(matches[1]),
          op: matches && matches[2],
          right: matches && trim(matches[3])
        },
        attrNameToIdMap = {},
        parseOperand = function (value) {
          var numberValue = Number(value),
              parsedValue = value === 'true' ? true : (value === 'false' ? false : (isNaN(numberValue) ? value : numberValue));
          return {
            value: parsedValue,
            id: attrNameToIdMap[value]
          };
        };

    this.forEachAttribute(function (attr) {
      attrNameToIdMap[attr.name] = attr.id;
    });

    parsedQuery.left = parseOperand(parsedQuery.left);
    parsedQuery.right = parseOperand(parsedQuery.right);

    // valid queries must have at least one side with a defined attribute
    parsedQuery.valid = !!(parsedQuery.valid && (parsedQuery.left.id || parsedQuery.right.id));

    return parsedQuery;
  },

  testCaseAgainstQuery: function (iCase, parsedQuery) {
    var getValue = function (attr) {
          return attr.id ? iCase.getValue(attr.id) : attr.value;
        },
        leftValue = parsedQuery.left && getValue(parsedQuery.left) || '',
        rightValue = parsedQuery.right && getValue(parsedQuery.right) || '';

    if (!parsedQuery.valid) {
      return false;
    }

    switch (parsedQuery.op) {
      case '*':  return true;
      case '==': return leftValue === rightValue;
      case '!=': return leftValue !== rightValue;
      case '<':  return leftValue <   rightValue;
      case '<=': return leftValue <=  rightValue;
      case '>=': return leftValue >=  rightValue;
      case '>':  return leftValue >   rightValue;
      default:   return false;
    }
  },

  searchCases: function (queryString) {
    var parsedQuery = this.parseSearchQuery(queryString);

    // return null to signal an invalid query
    if (!parsedQuery.valid) {
      return null;
    }

    return this.casesController.filter(function (iCase) {
      return this.testCaseAgainstQuery(iCase, parsedQuery);
    }.bind(this));

  },

  /**
   * Returns the cases in this collection that satisfy the query string, where
   * "satisfy" means the formula returns a truthy value for the case.
   *
   * @param queryString {string} A formula expression with the same syntax
   *   and meaning as the string constructed in the Formula Editor
   * @return {[DG.Case]}
   */
  searchCasesByFormula: function (queryString) {
    var collectionID = this.get('id');
    var context = DG.CollectionFormulaContext.create({
      ownerSpec: {
        type: DG.DEP_TYPE_UNDEFINED,
        id: this.get('id'),
        name: this.get('name')
      },
      collection: this.get('collection')
    });
    var formula = DG.Formula.create({context: context});
    formula.set('source', queryString);

    var cases = this.casesController.filter(function (iCase) {
      return formula.evaluate({
        _case_: iCase,
        _id_: iCase && iCase.get('id'),
        _collectionID_: collectionID
      });
    });

    formula.destroy();
    return cases;
  },

  /**
    Returns the number of cases in the collection.
    @returns  {Number}    The number of cases in the collection
   */
  getCaseCount: function() {
    return this.casesController.get('length');
  },

  /**
    Returns the case at the specified index within the collection.
    @param    iCaseIndex {Number}    The index of the case to be returned
    @returns  {DG.Case}   The case at the specified index
   */
  getCaseAt: function(iCaseIndex) {
    return this.casesController.objectAt(iCaseIndex);
  },

  /**
   * @param iCaseID {number|string}
   * @returns {number|undefined}
   */
  getCaseIndexByID: function (iCaseID) {
    var tCollection = this.get('collection');
    return tCollection && tCollection.getCaseIndexByID( iCaseID);
  },

  /**
   * @param iCaseID {number|string}
   * @returns {DG.Cases}
   */
  getCaseByID: function(iCaseID) {
    var ix = this.getCaseIndexByID(iCaseID);
    if (!SC.none(ix)) {
      return this.getCaseAt(ix);
    }
  },

  /**
   * Observer function which notifies when case indices change.
   */
  caseIndicesDidChange: function() {
    this.notifyPropertyChange('caseIndices');
  }.observes('*collection.caseIDToIndexMap'),

  /**
    Returns true if the case at the specified index is selected, false otherwise.
    @param    {Number}    iCase The index of the case whose selection status is to be returned
    @returns  {Boolean}         True if the specified case is selected, false otherwise
   */
  isCaseSelected: function( iCase) {
    var tSelection = this.getPath('casesController.selection');
    return iCase && tSelection ? tSelection.contains( iCase) : false;
  },

  /**
    Returns true if the case at the specified index is selected, false otherwise.
    @param    iCaseIndex {Number}    The index of the case whose selection status is to be returned
    @returns  {Boolean}              True if the specified case is selected, false otherwise
   */
  isCaseAtIndexSelected: function( iCaseIndex) {
    var tCase = this.getCaseAt( iCaseIndex),
        tSelection = this.getPath('casesController.selection');
    return tCase && tSelection ? tSelection.contains( tCase) : false;
  },

  /**
    Creates a new case with the specified initial properties.

    If the properties object contains an `index` property, the new case will
    be inserted at the appropriate index. Otherwise, it will be added to
    the end of the cases array.

    @param    {Object}    iProperties -- Initial properties for the newly-created DG.Case
    @returns  {DG.Case}   The newly-created DG.Case object
   */
  createCase: function( iProperties) {
    return this.collection.createCase( iProperties || {});
  },

  /**
    Updates the 'attrFormulaChanges' property, triggering any observers of that property.
   */
  attributeFormulaDidChange: function(iAttribute) {
    var attrID = iAttribute.get('id'),
        prevID = this.get('attrFormulaChanges');
    this.beginPropertyChanges();
      // force notification, even if the attribute is the same
      if (prevID === attrID) {
        this.set('attrFormulaChanges', null);
      }
      this.set('attrFormulaChanges', attrID);
    this.endPropertyChanges();
  },

  /**
    Apples the specified function to each case in the collection.
    @param    {Function}  iFunction The function to apply to each case
    @returns  {DG.CollectionClient} this, for method chaining
   */
  forEachCase: function( iFunction) {
    this.casesController.forEach( iFunction);
    return this;
  },

  /**
    Applies the specified function to each value of the specified attribute.
    Passes the raw value (i.e. including Dates) to the specified callback function.
    @param    {Number}              iAttrID -- The ID of the attribute whose values are to be iterated
    @param    {Function}            iFunction -- The function to apply to each value of the specified attribute
    @returns  {DG.CollectionClient} this, for method chaining
   */
  forEachAttributeValue: function( iAttrID, iFunction) {
    var cases = this.getPath('casesController.arrangedObjects');
    cases.forEach( function( iCase) {
                    var caseValue = iCase.getRawValue( iAttrID);
                    iFunction( caseValue);
                  });
    return this;
  },

  /**
    Set multiple values for the specified case from an array of values.
    The values are assumed to be in canonical attribute order, which is
    generally order of creation. This function exists to support case
    creation by games, which specify the canonical attribute order when
    they create their collections, and then specify simple arrays of
    values when creating cases. This was deemed preferable to having
    the game provide attrName:value pairs, which would be more work
    for the game, require more bandwidth, and require the app to perform
    attribute lookups for every value. The downside to this approach is
    that the app must maintain the canonical attribute order.
    @param    {DG.Case}         iCase -- The case whose values are to be set
    @param    {Array of values} iValues -- The array of values used to set the case values
   */
  setCaseValuesFromArray: function( iCase, iValues) {
    var attrIDs = this.getAttributeIDs(),
        attrLength = attrIDs.length,
        valuesLength = iValues ? iValues.length : 0,
        i, count = attrLength < valuesLength ? attrLength : valuesLength,
        tValue;
    iCase.beginCaseValueChanges();
    for( i = 0; i < count; ++i) {
      tValue = DG.DataUtilities.canonicalizeInputValue( iValues[i]);
      // Currently, setValue is called for null values but not undefined ones.
      if( tValue !== undefined)
        iCase.setValue( attrIDs[ i], tValue);
    }
    iCase.endCaseValueChanges();
  },

  /**
    Set multiple attribute values from the specified array of values.
   */
  setAttributeValuesFromArray: function( iAttrID, iValues) {
    var cases = this.getPath('casesController.arrangedObjects');
    cases.forEach( function( iCase, iIndex) {
                    if( iIndex < iValues.length)
                      iCase.setValue( iAttrID, iValues[ iIndex]);
                  });
  },

  /**
    Delete the specified case.
    Client should call didDeleteCases() after deleting a batch of cases.
    @param    {DG.Case}   iCase: the case to delete
   */
  deleteCase: function( iCase) {
    this.get('collection').deleteCase( iCase);
  },

  setAsideCase: function (iCase) {
    this.get('collection').setAsideCase(iCase);
  },

  restoreSetAsideCases: function () {
    this.get('collection').restoreSetAsideCases();
  },

  /**
    This function should be called whenever cases are deleted to allow
    the collection a chance to synchronize store contents, ID to index
    maps, and other contents.
   */
  didDeleteCases: function() {
    this.get('collection').updateCaseIDToIndexMap();
  },

  /**
    Deletes the currently selected cases from the collection.
   */
  deleteSelectedCases: function() {
    var tCollection = this.get('collection'),
        tSelected = this.getPath('casesController.selection');
    DG.logUser("deleteSelectedCases: %@", tSelected.length());
    tSelected.forEach( function( aCase) {
      tCollection.deleteCase( aCase);
    });
    this.didDeleteCases();
  },

  /**
    Deletes all cases from the collection.
   */
  deleteAllCases: function() {
    var tCollection = this.get('collection'),
        tCases = tCollection.get('cases'),
        tArray = tCases.concat();

    tArray.forEach(function (aCase) {
      tCollection.deleteCase(aCase, true);
    });
    this.didDeleteCases();
  },

  markCasesForDeletion: function () {
    var tCollection = this.get('collection'),
        tCases = tCollection.get('cases');
    tCases.forEach(function (iCase) {
      iCase._deletable = true;
    });
  },

  deleteMarkedCases: function () {
    var tCollection = this.get('collection'),
        tCases = tCollection.get('cases'),
        tDeletedCases = [],
        tRetainedCases = [];

    // if there are no delete cases, this is a no-op
    if (!tCases.some(function (iCase) {
      return (iCase._deletable);
    })) {
      return [];
    }

    this.getPath('collection.cases').beginPropertyChanges();
    this.casesController.beginPropertyChanges();
    this.beginPropertyChanges();
    try {
      tCases.forEach(function (myCase) {
        if (myCase._deletable) {
          tDeletedCases.push(myCase);
          // DG.Case._removeCaseFromItemMap(myCase);
          DG.Case.destroyCase(myCase);
        } else {
          tRetainedCases.push(myCase);
        }
      });
      this.setPath('collection.cases', tRetainedCases);
      this.casesController.set('content', tRetainedCases);
    } finally {
      this.endPropertyChanges();
      this.casesController.endPropertyChanges();
      this.getPath('collection.cases').endPropertyChanges();
    }

    if (tDeletedCases.length > 0) {
      this.didDeleteCases();
    }
    //DG.log("Did delete %@ cases".loc(tDeletedCaseIDs.length));
    return tDeletedCases;
  },

  // deleteMarkedCases: function () {
  //   var tCollection = this.get('collection'),
  //       tCases = tCollection.get('cases'),
  //       tDeletedCaseIDs = [],
  //       tDeletedCases = [],
  //       ix,
  //       iCase;
  //   for (ix = tCases.length - 1; ix >= 0; ix --) {
  //     iCase = tCases[ix];
  //     if (iCase._deletable) {
  //       tDeletedCases.push(iCase);
  //       tDeletedCaseIDs.push(iCase.id);
  //       tCollection.deleteCase(iCase, true);
  //     }
  //   }
  //   if (tDeletedCaseIDs.length > 0) {
  //     this.didDeleteCases();
  //   }
  //   //DG.log("Did delete %@ cases".loc(tDeletedCaseIDs.length));
  //   return tDeletedCases;
  // },

  /**
    Returns a link object of the form { type: 'DG.CollectionRecord', id: collectionID }.
    @returns  {Object}  linkObject -- contains the type and id of the referenced record
              {String}  linkObject.type -- the type of record ('DG.CollectionRecord' in this case).
              {Number}  linkObject.id -- the id of the collection record
   */
  toLink: function() {
    var collection = this.getPath('collection');
    return collection && collection.toLink();
  },

  debugLog: function(iPrompt) {
    this.get('collection').debugLog(iPrompt);
  }

}) ;

