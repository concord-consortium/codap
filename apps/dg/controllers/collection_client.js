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
    return this.getPath('collection.collectionRecord.id');
  }.property('collection').cacheable(),
  
  /**
   * The name of the collection with which this object is associated.
   * @property {String}
   */
  name: function() {
    return this.getPath('collection.collectionRecord.name');
  }.property('collection').cacheable(),
  
  attrsController: null,

  casesController: null,
  
  attrFormulaChanges: 0,
  attrFormulaDependentChanges: 0,
  
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
                                  });
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
  }.property('collection.areParentChildLinksConfigured').cacheable(),
  
  /**
    Provides support for hooking up collection relationships for
    games using the old game API.
   */
  setParentCollection: function( iParentCollection) {
    var childRecord = this.getPath('collection.collectionRecord'),
        parentRecord = iParentCollection.getPath('collection.collectionRecord');
    if( childRecord && parentRecord) {
      childRecord.set('parent', parentRecord);
      childRecord.set('areParentChildLinksConfigured', true);
      parentRecord.set('areParentChildLinksConfigured', true);
      DG.store.commitRecords();
    }
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
    this.collection = iCollection;
    this.attrsController.set('content', iCollection.attrsRecords);
    this.casesController.set('content', iCollection.casesRecords);
    
    // When restoring documents, we need to process the restored attributes
    this.forEachAttribute( function( iAttribute) {
                            this.didCreateAttribute( iAttribute);
                          }.bind( this));
  },
  
  /**
    Returns an array with the IDs of the attributes in the collection.
   */
  getAttributeIDs: function() {
    return this.attrsController.getEach('id');
  },

  /**
    Returns an array with the names of the attributes in the collection.
    @returns    {Array of String}   The array of attribute names
   */
  getAttributeNames: function() {
    return this.attrsController.getEach('name');
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
    return !SC.none( iAttrID) ? this.attrsController.findProperty('id', iAttrID) : undefined;
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
    // Ultimately, we want all formula changes to be notified automatically, as the following
    // line would suggest. Currently, however, using the DG.MemoryDataSource, it seems that
    // minor changes like adding new cases result in many "all properties changed" notifications,
    // which result in many spurious calls to this.attributeFormulaDidChange. Therefore, for
    // the short term we only notify when we know we've made the change (see guaranteeAttribute
    // below). This issue should be revisited when we have a real data source/back end.
    //iAttribute.addObserver('formula', this, 'attributeFormulaDidChange');
    
    iAttribute.addObserver('dependentChange', this, 'attrFormulaDependentDidChange');
  },
  
  /**
    Utility function called when an attribute is about to be removed from the collection
    or when the DG.CollectionClient is first attached to an existing collection.
    Removes necessary observers from each attribute in the collection.
   */
  willDestroyAttribute: function( iAttribute) {
    iAttribute.removeObserver('dependentChange', this, 'attrFormulaDependentDidChange');
  },
  
  /**
    Returns the attribute which matches the specified properties, creating it if it doesn't already exist.
    @param    {Object}        iProperties -- Initial property values
    @returns  {DG.Attribute}  The matching or newly-created DG.Attribute object
   */
  guaranteeAttribute: function( iProperties) {
    var tAttribute = null;

    // This function side-effects iProperties by potentially changing the name and unit
    function makeNameLegal() {
      var tName = iProperties.name || '',
          tReg = /\((.*)\)/,  // Identifies first parenthesized substring
          tMatch = tReg.exec( tName);
      // If there is a parenthesized substring, stash it as the unit and remove it from the name
      if( tMatch && tMatch.length > 1) {
        iProperties.unit = tMatch[ 1];
        tName = tName.replace(tReg, '');  // Get rid of parenthesized units
      }
      // TODO: We are eliminating all but Latin characters here. We should be more general and allow
      // non-Latin alphameric characters.
      tName = tName.replace(/\W$/, ''); // Get rid of trailing white space
      tName = tName.replace(/\W/g, '_');  // Replace white space with underscore
      iProperties.name = tName;
    }
    
    // See if the attribute already exists
    iProperties = iProperties || {};

    makeNameLegal();

    if (!SC.empty( iProperties.name)) {
      tAttribute = this.getAttributeByName( iProperties.name);

      if ( tAttribute) {
        // Attribute already exists:
        // copy the formula property, if there is one.
        if( iProperties.formula !== undefined) {
          // Don't allow formula assignment for non-'editable' attributes,
          // unless they already have a formula (for legacy document support).
          if( tAttribute.get('editable') || tAttribute.get('hasFormula'))
            this.setAttributeFormula( tAttribute, iProperties.formula);
          else {
            var attrName = tAttribute.get('name');
            DG.AlertPane.error({
                  message: 'DG.CollectionClient.cantEditFormulaErrorMsg'.loc( attrName),
                  description: 'DG.CollectionClient.cantEditFormulaErrorDesc'.loc(),
                  localize: false }); // We've already done the localization
          }
        }
        // copy the attribute colors
        if (!SC.none( iProperties.colormap)) {
          tAttribute.set('colormap', SC.clone( iProperties.colormap));
        }
        // copy 'editable' property
        if (!SC.none( iProperties.editable)) {
          tAttribute.set('colormap', iProperties.editable);
        }
        // Eventually we should copy all properties here.
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
   */
  setAttributeFormula: function( iAttribute, iFormula) {
    var attrID = iAttribute && iAttribute.get('id'),
        didHaveFormula = iAttribute.get('hasFormula'),
        willHaveFormula = !SC.empty( iFormula),
        preserveComputedValues = didHaveFormula && !willHaveFormula,
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
    this.attributeFormulaDidChange();
  },
  
  /**
    Applies the specified function to each attribute in the collection.
    @param    {Function}      Function to be applied to each attribute
    @returns  {DG.CollectionClient} this, for use in chaining method invocations
   */
  forEachAttribute: function( iFunction) {
    this.attrsController.forEach( iFunction);
    return this;
  },

  /**
    Returns an array containing the IDs of every case.
    @returns  {Array of Number}   The array of case IDs
   */
  getCaseIDs: function() {
    return this.casesController.getEach('id');
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
    @param    {Number}    The index of the case to be returned
    @returns  {DG.Case}   The case at the specified index
   */
  getCaseAt: function(iCaseIndex) {
    return this.casesController.objectAt(iCaseIndex);
  },
  
  /**
    Returns true if the case at the specified index is selected, false otherwise.
    @param    {Number}    The index of the case whose selection status is to be returned
    @returns  {Boolean}   True if the specified case is selected, false otherwise
   */
  isCaseSelected: function( iCase) {
    var tSelection = this.getPath('casesController.selection');
    return iCase && tSelection ? tSelection.contains( iCase) : false;
  },
  
  /**
    Returns true if the case at the specified index is selected, false otherwise.
    @param    {Number}    The index of the case whose selection status is to be returned
    @returns  {Boolean}   True if the specified case is selected, false otherwise
   */
  isCaseAtIndexSelected: function( iCaseIndex) {
    var tCase = this.getCaseAt( iCaseIndex),
        tSelection = this.getPath('casesController.selection');
    return tCase && tSelection ? tSelection.contains( tCase) : false;
  },
  
  /**
    Creates a new case with the specified initial properties.
    @param    {Object}    iProperties -- Initial properties for the newly-created DG.Case
    @returns  {DG.Case}   The newly-created DG.Case object
   */
  createCase: function( iProperties) {
    return this.collection.createCase( iProperties || {});
  },
  
  /**
    Increments the 'attrFormulaChanges' property, triggering any observers of that property.
   */
  attributeFormulaDidChange: function() {
    this.incrementProperty('attrFormulaChanges');
  },
  
  /**
    Observer function for attribute formulas' 'dependentChange' notifications.
    Increments the 'attrFormulaChanges' property, triggering any observers of that property.
   */
  attrFormulaDependentDidChange: function() {
    this.incrementProperty('attrFormulaDependentChanges');
  },
  
  /**
    Apples the specified function to each case in the collection.
    @param    {Function}            The function to apply to each case
    @returns  {DG.CollectionClient} this, for method chaining
   */
  forEachCase: function( iFunction) {
    this.casesController.forEach( iFunction);
    return this;
  },
  
  /**
    Applies the specified function to each value of the specified attribute.
    @param    {Number}              iAttrID -- The ID of the attribute whose values are to be iterated
    @param    {Function}            iFunction -- The function to apply to each value of the specified attribute
    @returns  {DG.CollectionClient} this, for method chaining
   */
  forEachAttributeValue: function( iAttrID, iFunction) {
    var cases = this.getPath('casesController.arrangedObjects');
    cases.forEach( function( iCase) {
                    var caseValue = iCase.getValue( iAttrID);
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
  
  /**
    This function should be called whenever cases are deleted to allow
    the collection a chance to synchronize store contents, ID to index
    maps, and other contents.
   */
  didDeleteCases: function() {

    DG.store.commitRecords();

    this.get('collection').updateCaseIDToIndexMap();

    // Manual refresh seems necessary for the results to take effect.
    this.getPath('casesController.content').refresh();
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
        tController = this.get('casesController');
    tController.forEach( function( aCase) {
      tCollection.deleteCase( aCase);
    });
    this.didDeleteCases();
  },

  /**
    Returns a link object of the form { type: 'DG.CollectionRecord', id: collectionID }.
    @returns  {Object}  linkObject -- contains the type and id of the referenced record
              {String}  linkObject.type -- the type of record ('DG.CollectionRecord' in this case).
              {Number}  linkObject.id -- the id of the collection record
   */
  toLink: function() {
    var collectionRecord = this.getPath('collection.collectionRecord');
    return collectionRecord && collectionRecord.toLink();
  },
  
  debugLog: function(iPrompt) {
    this.get('collection').debugLog(iPrompt);
  }

}) ;

