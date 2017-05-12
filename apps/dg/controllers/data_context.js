// ==========================================================================
//                          DG.DataContext
//
//  The DataContext corresponds to a hierarchical data set comprised of
//  multiple collections in a linear parent/child relationship. Currently,
//  the data are limited to two levels (i.e. parent and child), but future
//  extension to support arbitrary number of levels is an eventual goal.
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

  Coordinating controller which manages a set of collections that form the
  hierarchical data model.

  @extends SC.Object
*/
DG.DataContext = SC.Object.extend((function() // closure
/** @scope DG.DataContext.prototype */ {

  return {  // return from closure

  /**
   *  The type of DataContext, for use when archiving/restoring.
   *  @property {String}
   */
  type: 'DG.DataContext',

  /**
   *  The DG.DataContextRecord for which this is the controller.
   *  @property {DG.DataContextRecord}
   */
  model: null,

  name: function (k, v) {
    if (!SC.none(v)){
      this.setPath('model.name', v);
    }
    return this.getPath('model.name');
  }.property(),

  title: function (k, v) {
    if (!SC.none(v)){
      this.setPath('model.title', v);
    }
    return this.getPath('model.title');
  }.property(),

  /**
    The Dependency Manager object for this context
    @property {DG.DependencyMgr}
   */
  dependencyMgr: function() {
    return this.getPath('model.dependencyMgr');
  }.property(),

  defaultTitleBinding: 'model.defaultTitle',

  /**
    The number of change requests that have been applied.
    Clients can use this like a seed value to determine when they're out of date
    and by how many changes they're behind. Clients that observe this property
    will be notified whenever a change is applied.
    @property   {Number}
   */
  changeCount: 0,

  /**
    The number of selection change requests that have been applied.
    Clients can use this like a seed value to determine when they're out of date
    and by how many selection changes they're behind. Clients that observe this property
    will be notified whenever a selection change is applied.
    @property   {Number}
   */
  selectionChangeCount: 0,

  /**
    Array of change objects that have been applied to/by this data context.
    Newly-applied changes are appended to the array, so the most recent changes
    are at the end.
    @property   {Array of Object} Array of change objects
   */
  changes: null,

  /**
   * Flag to indicate that the user has moved attributes within a collection
   * or between grids in a way that invalidates the Data Interactive
   * specification. If this happens we will block new createCase(s), openCase,
   * or updateCase requests from the data interactives to avoid corrupting
   * the data.
   */
  flexibleGroupingChangeFlag: function (key, value) {
    if (!SC.none(value)) {
      this.setPath('model.flexibleGroupingChangeFlag', value);
    }
    return this.getPath('model.flexibleGroupingChangeFlag');
  }.property(),

  // The following code should be uncommented if changes to the above property
  // are to be observed. SC does not support chained properties, and so the
  // observer pattern below is recommended and required for v1.10 and above.
  //flexibleGroupingChangeFlagDidChange: function () {
  //  this.notifyPropertyChange('flexibleGroupingChangeFlag',
  //      this.get('flexibleGroupingChangeFlag'));
  //}.observes('*model.flexibleGroupingChangeFlag'),

  canonicalizeNamesBinding: '*model.canonicalizeNames',

  canonicalizeName: function(iName) {
    var canonicalizeNames = this.get('canonicalizeNames');
    return DG.Attribute.canonicalizeName(iName, canonicalizeNames);
  },

  /**
   *  The id of our DG.DataContextRecord.
   *  Bound to the 'id' property of the model.
   *  @property {Number}
   */
  id: function() {
    return this.getPath('model.id');
  }.property('model'),

  collections: null,

    /**
     * Return the total number of cases, obtained by summing the case count over all collections
     * @property{ Number }
     */
    totalCaseCount: function() {
      var tTotalCount = 0;
      this.forEachCollection( function( iCollection) {
        tTotalCount += iCollection.getPath('collection.cases').length;
      });
      return tTotalCount;
    }.property('collectionCount'),

    /**
     * Returns a single array containing all cases of all collections
     * @property {[DG.Case]}
     */
    allCases: function() {
      var tResult = [];
      this.forEachCollection( function( iCollection) {
        tResult = tResult.concat(iCollection.getPath('collection.cases'));
      });
      return tResult;
    }.property('collectionCount'),

  /**
   *  The collections for which this controller is responsible.
   *  Clients expect the order of this array to be parent --> child.
   *  This function is responsible for guaranteeing the order.
   *  In particular, games using the old API often create their
   *  collections in child --> parent order, and need to be reversed
   *  in this function.
   *
   *  @property {[DG.Collection]}
   */
  collectionsDidChange: function() {
    var srcCollections = this.getPath('model.collections'),
        srcCollectionArray = DG.ObjectMap.values(srcCollections),
        i, c,
        collectionCount = srcCollectionArray.length;

    // Reset and restock the cached array
    this.collections = [];

    // find the ur-parent, then follow it to all its children.
    c = srcCollectionArray[0]; i = 0;
    if (c) {
      while (!SC.none(c.get('parent')) && i <= collectionCount) {
        c = c.get('parent');
        i++;
      }
      if (i > collectionCount) {
        DG.logError('Circular parental links among collections in context: ' + this.name);
      }
      i = 0;
      while (!SC.none(c) && i <= collectionCount) {
        this.collections.pushObject(c);
        c = c.get('children')[0];
        i++;
      }
      if (i > collectionCount) {
        DG.logError('Circular child links among collections in context: ' + this.name);
      }
    }

    // Return the cached array in the proper order
    return this.collections;
  }.observes('model.collectionsChangeCount'),

  /**
   *  Map of DG.CollectionClients, corresponding one-to-one to the DG.Collections.
   *  @property {Object} Map from collectionID to DG.CollectionClients
   */
  _collectionClients: null,

  /**
   * Whether there are Data Interactives for which are affiliated with this
   * data context.
   * @type {boolean}
   */
  hasDataInteractive: function () {
    return !SC.none(this.owningDataInteractive());
  }.property(),

  /**
   * Returns the Data Interactives for which are affiliated with this
   * data context.
   * @type {DG.GameController}
   */
  owningDataInteractive: function () {
    var dataInteractives = DG.currDocumentController().get('dataInteractives');
    var myID = this.get('id');
    var found = dataInteractives && DG.ObjectMap.values(dataInteractives).find(function (dataInteractive) {
      var id = (dataInteractive.getPath('context.id'));
      return (!SC.none(id) && (id === myID));
    }.bind(this));
    DG.assert(SC.none(found) || found.constructor === DG.GameController, "Found Game Controller");
    return found;
  }.property(),

  /**
   * Whether there are Data Interactives for which are affiliated with this
   * data context.
   * @type {boolean}
   */
  hasGameInteractive: function () {
    var owningDataInteractive = this.owningDataInteractive();
    var activeChannel = owningDataInteractive && owningDataInteractive.activeChannel();
    // Its possible that the owning interactive has not contacted codap, so has not
    // established a channel. We assume this is a Game Interactive.
    if (owningDataInteractive) {
      return SC.none(activeChannel) || (activeChannel.constructor === DG.GamePhoneHandler);
    } else {
      return false;
    }
  }.property(),

  /**
    Initialization method.
   */
  init: function() {
    sc_super();
    this._collectionClients = {};
    this.changes = [];
    this.collectionsDidChange();

    DG.globalsController.addObserver('globalNameChanges', this, 'globalNamesDidChange');
    DG.globalsController.addObserver('globalValueChanges', this, 'globalValuesDidChange');
  },

  /**
    Destruction method.
   */
  destroy: function() {
    DG.globalsController.removeObserver('globalNameChanges', this, 'globalNamesDidChange');
    DG.globalsController.removeObserver('globalValueChanges', this, 'globalValuesDidChange');

    var i, collectionCount = this.get('collectionCount');
    for( i=0; i<collectionCount; ++i) {
      var collection = this.getCollectionAtIndex( i);
      if( collection) this.willRemoveCollection( collection);
    }
    this.model.destroy();
    sc_super();
  },

  /**
    Returns an array of DG.Case objects corresponding to the selected cases.
    Note that the cases may come from multiple collections within the data context.
    @returns    {Array of DG.Case}    The currently selected cases
   */
  getSelectedCases: function() {
    var i, collectionCount = this.get('collectionCount'),
        selection = [];

    // utility function for adding individual cases to the selection object to return
    function addCaseToSelection( iCase) {
      selection.push( iCase);
    }

    // add each selected case from all collections to the selection object to return
    for( i=0; i<collectionCount; ++i) {
      var collection = this.getCollectionAtIndex( i),
          collSelection = collection && collection.getPath('casesController.selection');
      if( collSelection)
        collSelection.forEach( addCaseToSelection);
    }
    return selection;
  },

    /**
     * Accesses a case from its ID.
     *
     * Centralized method for Component layer objects.
     * @param iCaseID
     * @returns {*}
     */
  getCaseByID: function(iCaseID) {
    return DG.store.find( DG.Case, iCaseID);
  },


    /**
    Private properties used internally to synchronize changes with notifications.
   */
  _changeCount: 0,
  _prevChangeCount: 0,

  /**
    Returns the most-recently applied change object. Clients that observe the 'changeCount'
    property can call this function to determine what change triggered the notification.
    @property   {Object}    [computed] The most-recently applied change object
   */
  lastChange: function() {
    var count = this.changes.length;
    return count > 0 ? this.changes[ count - 1] : null;
  }.property(),

  /**
    Returns an array of change objects which correspond to the changes that have
    occurred since the last change notification.
    @property   {Array of Object}
   */
  newChanges: function() {
    var changesLength = this.changes && this.changes.length,
        newCount = this._changeCount - this._prevChangeCount;
    DG.assert( this._changeCount <= changesLength);
    DG.assert( this._prevChangeCount <= this._changeCount);
    return this.changes.slice( changesLength - newCount);
  }.property(),

  /**
    Apply the specified change object to this data context.
    @param    {Object}    iChange -- An object specifying the change(s) to apply
              {String}    iChange.operation -- The name of the change to apply
                          Other change properties are operation-specific
   */
  applyChange: function( iChange) {
    var result = this.performChange( iChange);
    iChange.result = DG.ObjectMap.join((iChange.result || {}), result);
    // TODO: Figure out how/when to prune the changes array so it doesn't grow unbounded.
    this.changes.push( iChange);
    ++ this._changeCount;

    // Delay the notification until the end of the runloop, so that SproutCore has a
    // chance to flush its caches, update bindings, etc.
    this.invokeLast( function() {
                        this.set('changeCount', this._changeCount);
                        this._prevChangeCount = this._changeCount;
                      }.bind( this));
    return iChange.result;
  },

  /**
    Performs the specified change(s) to this data context.
    Called by the applyChange() method.
    @param    {Object}    iChange -- An object specifying the change(s) to apply
              {String}    iChange.operation -- The name of the change to apply
                          Other change properties are operation-specific
   */
  performChange: function( iChange) {
    // If the client indicates that the action has already
    // been taken, simply return with success.
    if( iChange.isComplete) return { success: true };


    var result = { success: false },
        shouldDirtyDoc = true,
        shouldRetainUndo = false;
    switch( iChange.operation) {
      case 'createCollection':
        result = this.doCreateCollection( iChange);
        break;
      case 'updateCollection':
        result = this.doUpdateCollection( iChange);
        break;
      case 'deleteCollection':
        result = this.doDeleteCollection(iChange);
        break;
      case 'createCase':
        // doCreateCases() takes an array of values arrays
        iChange.values = [ iChange.values || [] ];
        result = this.doCreateCases( iChange);
        if( result.caseIDs && result.caseIDs.length)
          result.caseID = result.caseIDs[0];
        shouldRetainUndo = true;
        break;
      case 'createCases':
        result = this.doCreateCases( iChange);
        shouldRetainUndo = true;
        break;
      case 'updateCases':
        result = this.doUpdateCases( iChange);
        break;
      case 'deleteCases':
        result = this.doDeleteCases( iChange);
        shouldDirtyDoc = false;
        break;
      case 'selectCases':
        result = this.doSelectCases( iChange);
        shouldDirtyDoc = false;
        break;
      case 'createAttributes':
        result = this.doCreateAttributes( iChange);
        break;
      case 'updateAttributes':
        result = this.doUpdateAttributes( iChange);
        break;
      case 'deleteAttributes':
        result = this.doDeleteAttributes( iChange);
        break;
      case 'moveAttribute':
        result = this.doMoveAttribute(iChange);
        shouldDirtyDoc = false;
        break;
      case 'resetCollections':
        result = this.doResetCollections( iChange );
        break;
      case 'deleteDataContext':
        result = this.destroy();
        break;
      default:
        DG.logWarn('DataContext.performChange: unknown operation: '
            + iChange.operation);
    }
    if( shouldDirtyDoc && (iChange.dirtyDocument !== false))
      DG.dirtyCurrentDocument(this.get('model'), shouldRetainUndo);
    return result;
  },

  /**
    Creates a collection according to the arguments specified.
    @param  {Object}                iChange
              {String}              iChange.operation -- 'createCollection'
              {Object}              iChange.properties -- properties of the new collection
              {Array of Object}     iChange.attributes -- array of attribute specifications
    @returns  {Object}              a result object
                {Boolean}           result.success -- true on success, false on failure
                {DG.CollectionClient} result.collection -- the newly created collection
   */
  doCreateCollection: function( iChange) {
    var tCollection = this.guaranteeCollection( iChange.properties);
    if (tCollection) {
      iChange.attributes && iChange.attributes.forEach( function( iAttrSpec) {
        if (!SC.none(iAttrSpec.id) && !SC.none(iAttrSpec.collection)) {
          this.moveAttribute(iAttrSpec, tCollection);
        } else {
          tCollection.guaranteeAttribute( iAttrSpec);
        }
      }.bind(this));
      // if this is a recreation of the collection make sure the ordering corresponds
      // to DI expectations.
      iChange.attributes && tCollection.reorderAttributes(iChange.attributes.getEach('name'));
      return { success: true, collection: tCollection };
    }
    return { success: false };
  },


    /**
     * Updates the properties of a collection.
     * @param {object} iChange
     *    {String}              iChange.operation -- 'updateCollection'
     *    {String|DG.CollectionClient} iChange.collection -- the affected collection
     *    {Object}              iChange.properties -- properties of the new collection
     * @returns {{success: boolean}}
     */
    doUpdateCollection: function (iChange) {
      var success = true;
      var collection = (SC.typeOf(iChange.collection) === SC.T_STRING)
          ? this.getCollectionByName(iChange.collection)
          : iChange.collection;
      DG.ObjectMap.forEach(iChange.properties, function(key, value) {
        // name is not mutable
        if (key !== 'name') {
          collection.set(key, value);
        } else {
          DG.logWarn('Attempt to update immutable collection name ignored: %@ -> %@'.loc(
              this.get('name'), name));
        }
      });
      return {success: success};
    },
  /**
    Creates one or more cases according to the arguments specified.
    @param  {Object}                iChange
            {String}                iChange.operation -- 'createCase'|'createCases'
            {DG.CollectionClient}   iChange.collection (optional) -- collection containing cases
                                    If not present, the case will be created in the child collection.
            {Array of               iChange.values -- The array of values to use for the case values.
             Arrays of Values}
                                    The order of the values should match the order of the attributes
                                    in the collection specification (e.g. 'initGame').
    @returns  {Object}              An object is returned
                  {Boolean}             result.success -- true on success, false on failure
                  {Number}              result.caseID -- the case ID of the first newly created case
                  {[Number]}            result.caseIDs -- an array ids of all cases created

   */
  doCreateCases: function( iChange) {
    function createOneCase ( iValues) {
      var properties = {};
      var newCase;
      if (iChange.properties) {
        DG.ObjectMap.copy(properties, iChange.properties);
      }
      if (Array.isArray(iValues)) {
        newCase = collection.createCase(properties);
        if( newCase) {
          collection.setCaseValuesFromArray( newCase, iValues);
        }
      } else {
        properties.values = iValues;
        newCase = collection.createCase(properties);
      }
      if (newCase) {
        result.success = true;
        result.caseIDs.push( newCase.get('id'));
      }
    }
    /**
     * returns true if either the collection is a child collection or the parentKey
     * resolves to an existing parent.
     * @param parentKey {number}
     */
    var validateParent = function (collection, parentKey) {
      var rslt = true;
      var parentCollectionID = collection.getParentCollectionID();
      if (parentCollectionID) {
        rslt = !SC.none(this.getCaseByID(parentKey));
        if (!rslt) {
          DG.logWarn('Cannot create case with invalid or deleted parent: ' + parentKey);
        }
      }
      return rslt;
    }.bind(this);

    var collection,
        valuesArrays,
        parentIsValid = true,
        result = { success: false, caseIDs: [] };

    if( !iChange.collection) {
      iChange.collection = this.get('childCollection');
    }

    if (typeof iChange.collection === "string") {
      collection = this.getCollectionByName( iChange.collection);
    } else {
      collection = iChange.collection;
    }

    // we hold off on observers because of performance issues adding many
    // cases when some cases are selected
    collection.casesController.beginPropertyChanges();
    try {
      if (!iChange.properties) {
        iChange.properties = {};
      }

      if (typeof iChange.properties.parent !== 'object') {
        parentIsValid = validateParent(collection, iChange.properties.parent);
      }
      if( collection && parentIsValid) {
        valuesArrays = iChange.values || [ [] ];
        valuesArrays.forEach( createOneCase);
        if( result.caseIDs && (result.caseIDs.length > 0)) {
          result.caseID = result.caseIDs[0];
        }
      }
    } finally {
      collection.casesController.endPropertyChanges();
    }

    // invalidate dependents; aggregate functions may need to recalculate
    this.invalidateAttrsOfCollections([collection], iChange);

    return result;
  },

  /**
    Selects/deselects the specified cases.

    @param  {Object}                iChange
            {String}                iChange.operation -- 'selectCases'
            {DG.CollectionClient}   iChange.collection (optional) -- collection containing cases
                                    If not present, collection will be looked up from cases,
                                    which is less efficient but more flexible.
            {Array of DG.Case}      iChange.cases (optional)-- DG.Case objects to be changed
                                    If not present, all cases in collection will be changed.
            {Boolean}               iChange.select -- true for selection, false for deselection
            {Boolean}               iChange.extend -- true to extend the current selection
   */
  doSelectCases: function( iChange) {
    var tCollection = iChange.collection || this.get('childCollection'),
        tController = tCollection && tCollection.get('casesController'),
        tExtend = iChange.extend || false,
        tCollectionExtendMap = {},
      tCollectionSelectionMap = {},
        isSelectionChanged = false,
        this_ = this;

    // First selection change for each collection should respect iChange.extend.
    // Subsequent changes for each collection should always extend, otherwise
    // they wipe out any selection done previously.
    function extendForCollection( iCollection) {
      var collectionID = iCollection.get('id').toString();
      if( tCollectionExtendMap[ collectionID] === undefined) {
        tCollectionExtendMap[ collectionID] = true;
        return tExtend;
      }
      // After the first one, always return true
      return true;
    }

    function addSelectionToCollectionMap(iCollection, iCase) {
      var collectionID = iCollection.get('id').toString();
      if( tCollectionSelectionMap[ collectionID ] === undefined) {
        tCollectionSelectionMap[ collectionID ] = {collection:iCollection, cases: []};
      }
      tCollectionSelectionMap[ collectionID].cases.push(iCase);
    }

    function doSelectByCollection() {
      DG.ObjectMap.forEach(tCollectionSelectionMap, function (iCollectionID, iCaseMap) {
        var tCollection = iCaseMap.collection,
          tCases = iCaseMap.cases,
          tController = tCollection.get('casesController');
        tController.selectObjects( tCases, extendForCollection( tCollection));
      });
    }

    function doDeselectByCollection() {
      DG.ObjectMap.forEach(tCollectionSelectionMap, function (iCollectionID, iCaseMap) {
        var tCollection = iCaseMap.collection,
          tCases = iCaseMap.cases,
            tController = tCollection.get('casesController');
        tController.deselectObjects( tCases);
      });
    }

    // utility function for recursively selecting a case and its children
    function selectCaseAndChildren( iCase) {
      var tChildren = iCase.get('children'),
          tCollection = this_.getCollectionForCase( iCase),
          tController = tCollection && tCollection.get('casesController');
      if( tController) {
        var tSelection = tController.get('selection');
        if( tSelection && (!tSelection.contains( iCase) || (tSelection.length() > 1)))
          isSelectionChanged = true;
        //tController.selectObject( iCase, extendForCollection( tCollection));
        addSelectionToCollectionMap(tCollection, iCase);
        tChildren.forEach( selectCaseAndChildren);
      }
    }

    // utility function for recursively deselecting a case and its children
    function deselectCaseAndChildren( iCase) {
      var tChildren = iCase.get('children'),
          tCollection = this_.getCollectionForCase( iCase),
          tController = tCollection && tCollection.get('casesController');
      if( tController) {
        var tSelection = tController.get('selection');
        if( tSelection && tSelection.contains( iCase))
          isSelectionChanged = true;
        //tController.deselectObject( iCase);
        addSelectionToCollectionMap(tCollection, iCase);
        tChildren.forEach( deselectCaseAndChildren);
      }
    }

        // If cases aren't specified, assume select/deselect all
    var tCases = iChange.cases || tController,
        // Use the appropriate utility function for the job
        tFunction = iChange.select ? selectCaseAndChildren : deselectCaseAndChildren;

    if (iChange.select && !iChange.extend && tCases.length === 0) {
      this.forEachCollection( function( iCollectionClient) {
        var tController = iCollectionClient.get('casesController');
        tController.selectObject(); // deselect all
      });
      this.incrementProperty( 'selectionChangeCount');
      return { success: true };
    } else {
    // Apply the appropriate function to the specified cases
    if( tCases && tFunction) {
      tCases.forEach( tFunction);
      if (iChange.select) {
        doSelectByCollection();
      } else {
        doDeselectByCollection();
      }
    }

    }

    // If we are only selecting cases in child collection(s), we should
    // deselect any parent level cases when we're not extending.
    // Note that the current behavior is to always deselect all cases in
    // a parent collection after changing the selection in a child collection.
    // This is less ambitious than full synchronization, whereby individually
    // selecting all of the child cases of a single parent collection could
    // auto-select the parent collection as well (or vice-versa).
    if( isSelectionChanged) {
      this.forEachCollection( function( iCollectionClient) {
                                var collectionID = iCollectionClient.get('id'),
                                    tController = iCollectionClient.get('casesController');
                                if( collectionID && tController &&
                                    !extendForCollection( iCollectionClient)) {
                                  tController.selectObject(); // deselect all
                                }
                              });
      this.incrementProperty( 'selectionChangeCount');
    }

    return { success: true };
  },

  /**
   Changes the specified values of the specified cases, providing an array of values.

   @param  {Object}                iChange
   {String}                iChange.operation -- 'updateCases'
   {DG.CollectionClient}   iChange.collection (optional) -- collection containing cases
   If not present, collection will be looked up from case,
   which is less efficient but more flexible.
   {Array of Number}       iChange.attributeIDs (optional) -- attributes whose values
   are to be changed for each case.
   If not specified, all attributes are changed.
   {Array of DG.Case}      iChange.cases -- DG.Case objects to be changed
   {Array of Array of      If attributeIDs are specified, then the values are stored in
             values}       attribute-major fashion, i.e. there is an array of values for
   each attribute with a value for each case in each of the arrays.
   If attributeIDs are not specified, then the values are stored in
   case-major fashion, with an array of values for each case.
   The latter is used primarily for case creation using the Game API.
   */
  doUpdateCasesFromArrayOfValues: function (iChange) {
    var caseCount = iChange.cases.get('length'),
        attrCount = iChange.attributeIDs ? iChange.attributeIDs.get('length') : 0,
        valueArrayCount = iChange.values.get('length'),
        attrSpecs = [],
        caseIDs,
        a, c;

    // If no attributes were specified, set them all using setCaseValuesFromArray().
    // This is primarily used by the Game API to set all values of a case.
    if( (caseCount > 0) && (attrCount === 0) && (valueArrayCount > 0)) {
      iChange.cases.forEach( function( iCase, iIndex) {
        if( iCase && !iCase.get('isDestroyed'))
          this.setCaseValuesFromArray( iCase, iChange.values[ iIndex], iChange.collection);
      }.bind( this));
      caseIDs = iChange.cases.map(function (iCase) { return iCase.id; });
      return { success: true, caseIDs: caseIDs};
    }

    // If attributes are specified, set the values individually.
    iChange.caseIDs = [];
    // Look up the attributes
    for( a = 0; a < attrCount; ++a) {
      var attrID = iChange.attributeIDs.objectAt( a),
          attrSpec = this.getAttrRefByID( attrID);
      attrSpec.attributeID = attrID;
      attrSpecs.push( attrSpec);
    }

    // Loop through the cases
    for( c = 0; c < caseCount; ++c) {
      var tCase = iChange.cases.objectAt( c);
      iChange.caseIDs.push( tCase.get('id'));
      // Change the case values
      tCase.beginCaseValueChanges();
      // Loop through the attributes setting each value
      for( a = 0; a < attrCount; ++a) {
        tCase.setValue( attrSpecs[a].attributeID, iChange.values[a][c]);
      }
      tCase.endCaseValueChanges();
    }

    // invalidate dependents
    var attrNodes = attrSpecs.map(function(iSpec) {
                      var attr = DG.Attribute.getAttributeByID(iSpec.attributeID);
                      return { type: DG.DEP_TYPE_ATTRIBUTE, id: iSpec.attributeID,
                                name: attr.get('name') };
                    });
    this.invalidateDependentsAndNotify(attrNodes, iChange);

    return { success: true, caseIDs: iChange.caseIDs };
  },
  /**
   * Changes the specified values of the specified cases providing a hash keyed by attribute name.
   *
   * @param  {Object}                iChange
   *         {String}                iChange.operation -- 'updateCases'
   *         {DG.CollectionClient}   iChange.collection (optional) -- collection containing cases
   *                                 If not present, collection will be looked up from case,
   *                                 which is less efficient but more flexible.
   *         {[DG.Case]}             iChange.cases -- DG.Case objects to be changed
   *         {[Object]}              iChange.values -- Array of hashes keyed by attribute names.
   */
  doUpdateCasesFromHashOfNameValues: function (iChange) {
    var cases = iChange.cases;
    var success = true;
    var caseIDs = [];
    cases.forEach(function (iCase, iCaseIx) {
      var values = iChange.values[iCaseIx];
      caseIDs.push(iCase.id);
      if (values) {
        iCase.beginCaseValueChanges();
        DG.ObjectMap.forEach(values, function(key, value) {
          var attr = this.getAttributeByName(key)
              || this.getAttributeByName(this.canonicalizeName(key));
          if (attr) {
            iCase.setValue(attr.id, value);
          } else {
            DG.logWarn('DataContext.doUpdateCasesFromHashOfNameValues: Cannot resolve attribute: ' + key);
            success = false;
          }
        }.bind(this));
        iCase.endCaseValueChanges();
      }
    }.bind(this));
    return { success: success, caseIDs: caseIDs};
  },

  /*
   * Update case values.
   *
   * Supports updating from an array of values or a hash of attribute name/values.
   * See methods above.
   */
  doUpdateCases: function( iChange) {
    if (iChange.values && iChange.values[0] && Array.isArray(iChange.values[0])) {
      return this.doUpdateCasesFromArrayOfValues(iChange);
    } else {
      return this.doUpdateCasesFromHashOfNameValues(iChange);
    }
  },

  /**
    Deletes the specified cases along with any child cases.
    @param  {Object}                iChange
            {String}                iChange.operation -- 'deleteCases'
            {Array of DG.Case}      iChange.cases -- DG.Case objects to be deleted
            {Array of Number}       iChange.ids -- on output, the IDs of the deleted cases
   */
  doDeleteCases: function( iChange) {
    var deletedCases = [],
        this_ = this,
        allCollections = this.collections;

    iChange.ids = [];
    iChange.collectionIDs = {};

    // We are going to delete from the bottom up. That is, we find affected
    // cases in the base collection, delete them, then, if their parents are
    // now devoid of children, delete the parents, and so on up the chain.
    var doDelete = function (iCase) {
      if (iCase.get("isDestroyed"))
        // case has already been destroyed. (Happens when we select parents and
        // children and delete all)
        return;

      var tCollection = this.getCollectionForCase( iCase);
      var tParent = iCase.parent;

      // We store the set of deleted cases for later undoing.
      deletedCases.push( iCase );
      iChange.ids.push( iCase.get('id'));

      // keep track of the affected collections
      iChange.collectionIDs[ tCollection.get('id')] = tCollection;

      tCollection.deleteCase( iCase);
      if (tParent) {
        if (tParent.children.length === 0) {
          doDelete(tParent);
        }
        else {
          tParent.item = tParent.children[0].item;
        }
      }
    }.bind(this);

    // find the leaf node cases and call doDelete on each of them.
    // The doDelete function will propagate up the parental hierarchy
    // as far as appropriate.
    var deleteCaseAndChildren = function( iCase) {
      //var tCollection = this.getCollectionForCase( iCase);
      var tChildren= iCase.get('children'), ix;
      // we remove children in reverse order because removal from this list
      // is immediate and would otherwise corrupt the list.
      if( tChildren && tChildren.length) {
        for (ix = tChildren.length - 1; ix >= 0; ix--) {
          deleteCaseAndChildren(tChildren[ix]);
        }
      } else {
        doDelete(iCase);
      }
    }.bind( this);

    DG.UndoHistory.execute(DG.Command.create({
      name: "data.deleteCases",
      undoString: 'DG.Undo.data.deleteCases',
      redoString: 'DG.Redo.data.deleteCases',
      _beforeStorage: {
        context: this
      },
      execute: function() {
        deletedCases = [];
        // Delete each case
        iChange.cases.forEach( deleteCaseAndChildren);

        // Call didDeleteCases() for each affected collection
        DG.ObjectMap.forEach( iChange.collectionIDs, function( iCollectionID, iCollection) {
          if( iCollection)
            iCollection.didDeleteCases();
        });

        // Store the set of deleted cases, along with their values
        this._beforeStorage.deletedCases = deletedCases;
        this.log = "Deleted %@ case%@"
                      .fmt(deletedCases.length, deletedCases.length === 1 ? "" : "s");

        // invalidate dependents; aggregate functions may need to recalculate
        this_.invalidateAttrsOfCollections(DG.ObjectMap.values(iChange.collectionIDs), iChange);
      },
      undo: function() {
        var createdCases;

        // add cases back in collection order
        allCollections.forEach(function(iCollection){
          this._beforeStorage.deletedCases.forEach(function (iCase, ix) {
            var item = iCase.item;
            var myCollection = iCase.collection;
            if (myCollection && myCollection === iCollection) {
              item.set('deleted', false);
              // Note that we don't call addCase because the case in hand
              // has been destroyed. We allow regenerateCollectionCases to
              // actually bring about the addition of the case.
              // myCollection.addCase(iCase);
            }
          });
        }.bind(this));
        createdCases = this._beforeStorage.context.regenerateCollectionCases().createdCases;
        var tCollectionMap = {};
        createdCases.forEach( function( iCase) {
          var tCollID = iCase.getPath('collection.id');
          if( !tCollectionMap[ tCollID]) {
            tCollectionMap[ tCollID] = [];
          }
          tCollectionMap[ tCollID].push( iCase.get('id'));
        });
        // emit change notifications for created cases.
        DG.ObjectMap.forEach(tCollectionMap, function (collectionID, caseIDs) {
          var undoChange = {
            operation: 'createCases',
            isComplete: true,
            properties: {index: true},
            collection: this_.getCollectionByID(collectionID),
            result: {
              caseIDs: caseIDs,
              caseID: caseIDs[0]
            }
          };
          this_.applyChange( undoChange);
        });

        this._afterStorage = {
          cases: createdCases
        };

        // invalidate dependents; aggregate functions may need to recalculate
        this_.invalidateAttrsOfCollections(DG.ObjectMap.values(iChange.collectionIDs), iChange);
      },
      redo: function() {
        this.execute();
      }
    }));

    return { success: true };
  },

  doCreateAttributes: function( iChange) {
    var collection = typeof iChange.collection === "string"
                        ? this.getCollectionByName( iChange.collection)
                        : iChange.collection,
        attrNames = [],
        didCreateAttribute = false,
        result = { success: false, attrs: [], attrIDs: []},
        _this = this;

    // Create/update the specified attribute
    function createAttribute( iAttrProps) {
      if (!iAttrProps) {
        return;
      }
      var hadAttribute = collection.hasAttribute( iAttrProps.name),
          attrProps = DG.copy( iAttrProps),
          attribute;
      // User-created attributes default to editable
      if( !hadAttribute)
        attrProps.editable = true;
      attribute = collection.guaranteeAttribute( attrProps);
      if (!SC.none(iChange.position)) {
        _this.moveAttribute(attribute, collection, iChange.position);
      }
      if( attribute) {
        if( !hadAttribute)
          didCreateAttribute = true;
        attrNames.push(attribute.get('name'));
        // For now, return success if any attribute is created successfully
        result.success = true;
        result.attrs.push( attribute);
        result.attrIDs.push( attribute.get('id'));
      }
    }

    // Create/update each specified attribute
    if( collection && iChange.attrPropsArray)
      iChange.attrPropsArray.forEach( createAttribute);
    this.invalidateNamesAndNotify(attrNames);
    // For now we assume success
    if( !didCreateAttribute)
      iChange.operation = 'updateAttributes';
    return result;
  },

  /**
    Updates the specified properties of the specified attributes.
    @param  {Object}    iChange - The change request object
              {String}  .operation - "updateAttributes"
              {DG.CollectionClient} .collection - Collection whose attributes(s) are changed
              {Array of Object} .attrPropsArray - Array of attribute properties
    @returns  {Object}
                {Boolean}               .success
                {Array of DG.Attribute} .attrs
                {Array of Number}       .attrIDs
   */
  doUpdateAttributes: function( iChange) {
    var collection = typeof iChange.collection === "string"
                        ? this.getCollectionByName( iChange.collection)
                        : iChange.collection,
        names = [],
        result = { success: false, attrs: [], attrIDs: [] };

    // Function to update each individual attribute
    function updateAttribute( iAttrProps) {
      // Look up the attribute by ID if one is specified
      var attribute = collection && !SC.none( iAttrProps.id)
                        ? collection.getAttributeByID( iAttrProps.id)
                        : null;
      // Look up the attribute by name if not found by ID
      if( !attribute && collection && iAttrProps.name) {
        attribute = collection.getAttributeByName( iAttrProps.name);
      }
      if( attribute) {
        attribute.beginPropertyChanges();
        DG.ObjectMap.forEach( iAttrProps,
                              function( iKey, iValue) {
                                var oldName;
                                if (iKey === 'name') {
                                  oldName = attribute.get('name');
                                  if (names.indexOf(oldName) < 0)
                                    names.push(oldName);
                                  iValue = collection.canonicalizeName(iValue);
                                  if (names.indexOf(iValue) < 0)
                                    names.push(iValue);
                                }
                                if( iKey !== "id") {
                                  attribute.set( iKey, iValue);
                                }
                              });
        attribute.endPropertyChanges();
        result.success = true;
        result.attrs.push( attribute);
        result.attrIDs.push( attribute.get('id'));
      }
    }

    // Create/update each specified attribute
    if( collection && iChange.attrPropsArray)
      iChange.attrPropsArray.forEach( updateAttribute);

    // invalidate affected formulas
    this.invalidateNamesAndNotify(names);

    return result;
  },

    /**
     * Regenerates the case lists for all the collections in the context using the
     * dataSet as a reference.
     *
     * May create or delete cases as necessary. Tries to avoid unnecessary creation
     * or destruction.
     * @return {[DG.Case]}
     */
  regenerateCollectionCases: function (affectedCollections) {
    var topCollection = this.getCollectionAtIndex(0),
        collections = {},   // map from id to collection
        createdCases,       // array of created cases
        deletedCases = [];  // array of deleted cases

    function addTrackedCollection(collection) {
      var collectionID = collection && collection.get('id');
      if (collectionID && !collections[collectionID])
        collections[collectionID] = collection;
      // child collections are affected as well
      var children = collection && collection.get('children');
      if (children) {
        children.forEach(function(child) {
          addTrackedCollection(child);
        });
      }
    }

    if (affectedCollections && affectedCollections.length) {
      affectedCollections.forEach(function(collection) {
        addTrackedCollection(collection);
      });
    }

    // drop all cases
    this.forEachCollection(function (collection) { collection.markCasesForDeletion(); });

    // starting with top collection, recreate cases
    createdCases = topCollection.get('collection').recreateCases();

    // track affected collections
    if (createdCases) {
      createdCases.forEach(function(iCase) {
        addTrackedCollection(iCase.get('collection'));
      });
    }

    // delete cases that remain marked for deletion
    this.forEachCollection(function (collection) {
      var collectionDeletedCases = collection.deleteMarkedCases();
      deletedCases = deletedCases.concat(collectionDeletedCases);
      if (deletedCases && deletedCases.length)
        addTrackedCollection(collection);
    });

    // sort collections
    topCollection.get('collection').reorderCases(0, []);
    this.forEachCollection(function (collection) {
      collection.get('collection').updateCaseIDToIndexMap();
    });
    return { collections: DG.ObjectMap.values(collections),
            createdCases: createdCases, deletedCases: deletedCases };
  },

  /**
   * Adds items to a data set and updates collections to regenerate cases.
   * Accepts an array of items or a single item. The item can be specified as
   * a DG.DataItem or as an object mapping attribute names to values. Adds
   * an "createCases" item to the change list and returns a list of new cases.
   * The new cases may be cases of any collection in the data set.
   *
   * @param iItems {[Object] || [DG.DataItem] || Object || DG.DataItem}
   */
  addItems: function (iItems) {
    var dataSet = this.getPath('model.dataSet');
    var items = Array.isArray(iItems)?iItems:(iItems?[iItems]:[]);
    var attrs = this.getAttributes();
    var results;
    var collections = [];
    var collectionIDCaseMap = {};
    var canonicalize = this.get('canonicalizeNames');
    items.forEach(function (item) {
      var canonicalItem;
      if (item instanceof DG.DataItem) {
        canonicalItem = item;
      } else {
        canonicalItem = DG.DataUtilities.canonicalizeAttributeValues(attrs, item, canonicalize);
        dataSet.addDataItem(canonicalItem);
      }
    });
    results = this.regenerateCollectionCases();

    results.createdCases.forEach(function (iCase) {
      var collectionID = iCase.collection.get('id');
      var collectionCases = collectionIDCaseMap[collectionID];
      if (!collectionCases) {
        collections.push(iCase.collection);
        collectionCases = collectionIDCaseMap[collectionID] = [];
      }
      collectionCases.push(iCase.get('id'));
    });

    if (results && results.createdCases.length > 0) {
      collections.forEach(function (collection) {
        var cases = collectionIDCaseMap[collection.get('id')];
        this.applyChange({
          operation: 'createCases',
          collection: this.getCollectionByID(collection.get('id')),
          isComplete: true,
          properties: {index: true},
          result: {
            caseIDs: cases,
            caseID: cases[0]
          }
        });
      }.bind(this));
    }

    return results && results.createdCases.map(function(iCase){
      return iCase.id;
    });
  },

  _moveAttributeWithinCollection: function(attr, collectionClient, position) {
    var dataContext = this;
    var name = attr.name;
    var attributeNames = collectionClient.getAttributeNames();
    var ix = attributeNames.indexOf(name);
    var newPosition = (ix >= position)? position: position - 1;
    var changeFlag = this.get('flexibleGroupingChangeFlag');
    if (ix !== -1) {
      DG.UndoHistory.execute(DG.Command.create({
        name: 'dataContext.moveAttribute',
        undoString: 'DG.Undo.dataContext.moveAttribute',
        redoString: 'DG.Redo.dataContext.moveAttribute',
        log: 'move attribute {attribute: "%@", position: %@}'
            .loc(attr.name, position),
        execute: function () {
          attributeNames.removeAt(ix);
          attributeNames.insertAt(newPosition, name);
          collectionClient.reorderAttributes(attributeNames);
          dataContext.set('flexibleGroupingChangeFlag', true);
        },
        undo: function () {
          attributeNames.removeAt(newPosition);
          attributeNames.insertAt(ix, name);
          collectionClient.reorderAttributes(attributeNames);
          dataContext.set('flexibleGroupingChangeFlag', changeFlag);

          // notify about this change, but mark as complete, so
          // it is not re-executed
          var tChange = {
            isComplete: true,
            operation: 'moveAttribute',
            attr: attr,
            toCollection: collectionClient,
            position: ix
          };
          dataContext.applyChange(tChange);
        },
        redo: function () {
          this.execute();
          // notify
          var tChange = {
            isComplete: true,
            operation: 'moveAttribute',
            attr: attr,
            toCollection: collectionClient,
            position: position
          };
          dataContext.applyChange(tChange);
        }
      }));
    } else {
      DG.logWarn('Reordering attribute, "' + name +
          '", not in collection, "' + collectionClient.get('name') + '"');
    }
  },

  _moveAttributeBetweenCollections:  function (iAttr, fromCollection, toCollectionClient, position) {
    var dataContext = this;
    var allCollections = this.collections;
    var toCollection = toCollectionClient.get('collection');
    var originalPosition = fromCollection.get('attrs').findIndex(function (attr) {
      return attr === iAttr;
    });
    DG.assert(originalPosition !== -1, 'Moving attribute is found in original collection');
    var casesAffected;
    // remove attribute from old collection
    DG.UndoHistory.execute(DG.Command.create({
      name: 'dataContext.moveAttribute',
      undoString: 'DG.Undo.dataContext.moveAttribute',
      redoString: 'DG.Redo.dataContext.moveAttribute',
      log: 'move attribute {attribute: "%@", position: %@}'
          .loc(iAttr.name, position),
      execute: function () {
        iAttr = fromCollection.removeAttribute(iAttr);

        if (fromCollection.get('attrs').length === 0) {
          dataContext.destroyCollection(fromCollection);
          dataContext.applyChange( {
            operation: 'deleteCollection',
            collection: fromCollection,
            isComplete: true
          });
        }

        // add attribute to new collection
        toCollection.addAttribute(iAttr, position);

        casesAffected = dataContext.regenerateCollectionCases([fromCollection, toCollection]);
        dataContext.invalidateAttrsOfCollections(casesAffected.collections);
      },
      undo: function () {
        var toCollection = toCollectionClient.get('collection');
        var fromCollectionProperties;
        var newCollection;
        iAttr = toCollection.removeAttribute(iAttr);
        if (toCollection.get('attrs').length === 0) {
          dataContext.destroyCollection(toCollection);
          dataContext.applyChange( {
            operation: 'deleteCollection',
            collection: toCollection,
            isComplete: true
          });
        }
        // add cases back in collection order
        allCollections.forEach(function(iCollection){
          casesAffected.deletedCases.forEach(function (iCase, ix) {
            var item = iCase.item;
            var myCollection = iCase.collection;
            if (myCollection && myCollection === iCollection) {
              item.set('deleted', false);
              myCollection.addCase(iCase);
              DG.log('Adding case: ' + iCase.id);
            }
          });
        });

        if (fromCollection.get('attrs').length === 0) {
          fromCollectionProperties = {
            parent: fromCollection.parent,
            name: fromCollection.get('name'),
            title: fromCollection.get('title'),
            context: fromCollection.get('context'),
            children: [fromCollection.children && fromCollection.children[0]]
          };
          newCollection = dataContext.createCollection(fromCollectionProperties);
          dataContext.applyChange({
            operation: 'createCollection',
            collection: fromCollection,
            isComplete: true
          });
          newCollection.get('collection').addAttribute(iAttr, 0);
        } else {
          fromCollection.addAttribute(iAttr, originalPosition);
        }
        var casesAffectedByUndo = dataContext.regenerateCollectionCases([fromCollection, toCollection]);
        dataContext.invalidateAttrsOfCollections(casesAffectedByUndo.collections);
      },
      redo: function () {
        this.execute();
        // notify
        var tChange = {
          isComplete: true,
          operation: 'moveAttribute',
          attr: iAttr,
          toCollection: toCollectionClient,
          position: position
        };
        dataContext.applyChange(tChange);
        dataContext.invalidateAttrsOfCollections(casesAffected.collections);
      }
    }));
  },

  /**
   * Move an attribute from its current collection to a new collection.
   *
   * If moving an attribute leaves its original collection vacant, delete this
   * collection.
   *
   * @param attr {DG.Attribute} The attribute to move.
   * @param toCollectionClient {DG.CollectionClient} The new collection.
   * @param {number|undefined} position The position in the order of attributes in the
   *      new collection. If undefined, appends to the end of the attribute list.
   */
  moveAttribute:  function (attr, toCollectionClient, position) {
    var fromCollection = attr.get('collection');

    if (fromCollection === toCollectionClient.get('collection')) {
      // if intra-collection move, we simply delegate to the collection
      this._moveAttributeWithinCollection(attr, toCollectionClient, position);
    } else {
      // inter-collection moves are more complex: we need to reconstruct the
      // cases in the collection
      this._moveAttributeBetweenCollections(attr, fromCollection, toCollectionClient,
          position);
    }
  },
  /**
   * Moves an attribute either within a collection or between collections.
   *
   * @param iChange {Object} Describes the change
   *    {string} .operation            -- "moveAttribute"
   *    {DG.Attribute} .attr           -- the attribute to move.
   *    {DG.CollectionClient} .toCollection -- the collection to
   *                                     move the attribute to. Defaults
   *                                     to the existing collection.
   *    {integer} .position           -- the position to be occupied by
   *                                     the attribute indexed from the
   *                                     left. 0 means leftmost. If not
   *                                     specified, placed rightmost.
   * @return {Object}
   *    {Boolean}               .success
   */
  doMoveAttribute: function( iChange) {
    try {
      var attr = iChange.attr;
      var fromCollection = attr.get('collection');
      var toCollection = iChange.toCollection || fromCollection;
      var position = iChange.position;
      var toCollectionClient = (toCollection.instanceOf(DG.CollectionClient))
          ? toCollection : this.getCollectionByID(toCollection.id);

      this.moveAttribute(attr, toCollectionClient, position);
      return {success: true};
    } catch (ex) {
      DG.logWarn(ex);
      return {success: false};
    }
  },

  /**
    Deletes the specified attributes.
    @param  {Object}    iChange - The change request object
              {String}  .operation - "deleteAttributes"
              {DG.CollectionClient} .collection - Collection whose attributes(s) are changed
              {Array of Object} .attrs - Array of attributes to delete
    @returns  {Object}
                {Boolean}               .success
                {Array of DG.Attribute} .attrs
                {Array of Number}       .attrIDs
   */
  doDeleteAttributes: function( iChange) {
    var collection = typeof iChange.collection === "string"
                        ? this.getCollectionByName( iChange.collection)
                        : iChange.collection,
        deletedNodes = [],
        result = { success: true, attrIDs: [] };

    // Function to delete each individual attribute
    function deleteAttribute( iAttr) {
      // Look up the attribute by ID if one is specified
      var attribute = collection && !SC.none( iAttr.id)
                        ? collection.getAttributeByID( iAttr.id)
                        : null;
      if( attribute) {
        deletedNodes.push({ type: DG.DEP_TYPE_ATTRIBUTE, id: iAttr.id });
        DG.Attribute.destroyAttribute( attribute);
        result.attrIDs.push( iAttr.id);
      }
    }

    // Create/update each specified attribute
    if( collection && iChange.attrs) {
      iChange.attrs.forEach( deleteAttribute);
      this.invalidateDependentsAndNotify(deletedNodes);
      DG.store.commitRecords();
    }
    return result;
  },

  doDeleteCollection: function (iChange) {
    var collection = iChange.collection;
    this.destroyCollection(collection);
    this.regenerateCollectionCases([collection]);
    return { success: true};
  },

  doResetCollections: function (iChange) {
      DG.store.destroyAllRecordsOfType( DG.Case);
      DG.store.destroyAllRecordsOfType( DG.Attribute);
      DG.store.destroyAllRecordsOfType( DG.CollectionRecord);
  },

  /**
    Handler for global value (e.g. slider) name changes.
    Invalidates all dependent nodes and sends out an appropriate
    'namespaceChange' notification, indicating that all cases of
    the dependent attributes are affected.
    @param  {object}  iNotifier - generally the DG.globalsController
    @param  {string}  iKey - generally 'globalValuesChanged'
   */
  globalNamesDidChange: function(iNotifier, iKey) {
    var changes = iNotifier && iNotifier.get(iKey),
        names = [];
    changes.forEach(function(iChange) {
      if (iChange.oldName && (names.indexOf(iChange.oldName) < 0))
        names.push(iChange.oldName);
      if (iChange.newName && (names.indexOf(iChange.newName) < 0))
        names.push(iChange.newName);
    });
    this.invalidateNamesAndNotify(names);
  },

  /**
    Handler for global value (e.g. slider) changes.
    Invalidates all dependent nodes and sends out an appropriate
    'dependentCases' notification, indicating that all cases of
    the dependent attributes are affected.
    @param  {object}  iNotifier - generally the DG.globalsController
    @param  {string}  iKey - generally 'globalValuesChanged'
   */
  globalValuesDidChange: function(iNotifier, iKey) {
    var names = iNotifier.get(iKey);
    if (names && names.length) {
      var nodes = [];
      names.forEach(function(iName) {
        var globalValue = DG.globalsController.getGlobalValueByName(iName),
            globalID = globalValue && globalValue.get('id');
        if (globalValue) {
          nodes.push({ type: DG.DEP_TYPE_GLOBAL, id: globalID, name: iName });
        }
      });

      this.invalidateDependentsAndNotify(nodes);
    }
  },

  /**
    Invalidate all attributes of the specified collections.
    @param {[DG.Collection|DG.CollectionClient]} collections - array of collections affected
    @param {object} iChange - [optional] the change that triggered the invalidation
   */
  invalidateAttrsOfCollections: function(collections, iChange) {
    var attrNodes = [];
    if (!collections || !collections.length) return;
    collections.forEach(function(collection) {
      var collectionModel = collection instanceof DG.Collection
                              ? collection
                              : collection.get('collection'),
          collectionAttrs = collectionModel && collectionModel.get('attrs');
      if (collectionAttrs) {
        collectionAttrs.forEach(function(attr) {
          attrNodes.push({ type: DG.DEP_TYPE_ATTRIBUTE, id: attr.get('id'), name: attr.get('name') });
        });
      }
    });
    this.invalidateDependentsAndNotify(attrNodes, iChange);
  },

  /*
    Notifies clients of namespace changes that affect formulas.
    Invalidates the specified nodes in the DependencyMgr, which invalidates
    all dependent nodes and then returns the sets of nodes that are affected.
    Calls invalidateDependentsAndNotify(), so see description of that
    function for the notifications that can be triggered.
   */
  invalidateNamesAndNotify: function(iNames) {
    var dependencyMgr = this.get('dependencyMgr'),
        namedNodes = dependencyMgr.findNodesWithNames(iNames),
        dependentNodes = dependencyMgr.findDependentsOfNodes(namedNodes);
    dependentNodes.forEach(function(iNode) {
      var dependency = iNode.dependencies && iNode.dependencies[0],
          formulaContext = dependency && dependency.dependentContext;
      if (formulaContext)
        formulaContext.invalidateNamespace();
    });
    // invalidate dependents of the named nodes
    this.invalidateDependentsAndNotify(namedNodes);
  },

  /**
    Invalidates all dependents of the specified nodes and sends out
    appropriate dependentCases notifications. See notifyInvalidationResult
    for details of the notifications.
    @param  {object[]}  iNodes - array of nodes whose dependents are to be invalidated
    @param  {object}    iChange - optional change object
            {string}    .operation (e.g. 'createCases'|'updateCases'|'deleteCases')
   */
  invalidateDependentsAndNotify: function(iNodes, iChange) {
    var result = this.get('dependencyMgr').invalidateDependentsOf(iNodes);
    this.notifyInvalidationResult(result, iChange);
  },

  /**
    Invalidates a particular dependent of the specified node and sends out
    appropriate dependentCases notifications. See notifyInvalidationResult
    for details of the notifications.
    @param  {object}  iDependentSpec - specifier for the dependent node
    @param  {object}  iIndependentSpec - specifier for the independent node
    @param  {boolean} iForceAggregate - true if the dependence should be treated as aggregate
   */
  invalidateDependencyAndNotify: function(iDependentSpec, iIndependentSpec, iForceAggregate) {
    var result = this.get('dependencyMgr')
                  .invalidateDependency(iDependentSpec, iIndependentSpec, iForceAggregate);
    this.notifyInvalidationResult(result);
  },

  /**
    Notifies clients of dependent changes to cases.
    Invalidates the specified nodes in the DependencyMgr, which invalidates
    all dependent nodes and then returns the sets of nodes that are affected
    in a simple (non-aggregate) or an aggregate manner respectively.
    This information is then used to send out up to two 'dependentCases'
    notifications, indicating the set of attributes in each affected collection
    which require recalculation in a simple (non-aggregate) sense and then in
    a separate notification that set of attributes in each affected collection
    which require recalculation in an aggregate sense (i.e. all cases affected).
    The format of the 'depdentCases' notifications is described below.
    @param  {object[]}  iNodes
            {string}    .type (e.g. DG.DEP_TYPE_ATTRIBUTE|DG.DEP_TYPE_GLOBAL)
            {string}    .id
            {string}    .name (primarily used for debugging)
    @param  {object}    iChange
            {string}    .operation (e.g. 'createCases'|'updateCases'|'deleteCases')

      The iChange object is the same change object used by applyChange(),
      performChange(), etc. The format varies depending on the nature of the
      change, but often follow a pattern such as that below for 'updateCases'.
      See the handler for each change for details.

            {DG.CollectionClient}   iChange.collection (optional) -- collection containing cases
            {Array of Number}       iChange.attributeIDs (optional) -- affected attributes
            {Array of DG.Case}      iChange.cases -- DG.Case objects to be changed

      The 'dependentCases' information is packaged into the form of a change request
      and then applyChange() is called to notify downstream clients.

    @param  {Object}                iChange
            {String}                iChange.operation -- 'dependentCases'
            {Array of Object}       iChange.changes
              {DG.CollectionClient} iChange.changes.collection -- collection containing cases
              {Array of Number}     iChange.changes.attributeIDs -- attributes whose values
                                    are to be changed for each case.
              {Array of DG.Case}    iChange.changes.cases -- DG.Case objects to be changed
   */
  notifyInvalidationResult: function(iResult, iChange) {
    var changeCollection = iChange && iChange.collection,
        changeCollectionID = changeCollection && changeCollection.get('id'),
        changeCases = (iChange && iChange.cases) || [],
        simpleNotification, aggregateNotification,
        externalDataContexts = [];

    var convertDependenciesToNotification = function(iDependencies, iChange) {
      var notification = { operation: 'dependentCases', changes: [], isComplete: true },
          changeCases = (iChange && iChange.cases) || [],
          collectionChanges = {};

      iDependencies.forEach(function(iDep) {
        var type = iDep.type,
            attr = type === DG.DEP_TYPE_ATTRIBUTE
                    ? DG.Attribute.getAttributeByID(iDep.id) : null,
            dataContextRecord, dataContextID, dataContext,
            collectionRecord = attr && attr.get('collection'),
            collectionID = collectionRecord && collectionRecord.get('id'),
            collectionClient = collectionID && this.getCollectionByID(collectionID),
            affectedCases,
            change = collectionChanges[collectionID];
        if (!collectionClient) {
          // we may have an external data context reference
          dataContextRecord = collectionRecord && collectionRecord.get('context');
          dataContextID = dataContextRecord && dataContextRecord.get('id');
          dataContext = DG.currDocumentController().getContextByID(dataContextID);
          collectionClient = dataContext && collectionID &&
                              dataContext.getCollectionByID(collectionID);
          if (externalDataContexts.indexOf(dataContext) < 0)
            externalDataContexts.push(dataContext);
        }
        if (!change) {
          // For simple dependencies within the same collection as the original
          // change, only the cases originally changed can be affected.
          // For aggregate dependencies or dependencies across collections,
          // we simplify by reporting that all cases are affected. This is
          // less than optimally efficient in the case of non-aggregate references
          // from a child collection attribute formula to a parent collection
          // attribute, but for now we make this simplifying assumption.
          affectedCases = collectionID === changeCollectionID ? changeCases : [];
          change = collectionChanges[collectionID] = { dataContext: dataContext || this,
                                                        collection: collectionClient,
                                                        attributeIDs: [ iDep.id ],
                                                        cases: affectedCases };
        }
        else {
          change.attributeIDs.push(iDep.id);
        }
      }.bind(this));

      DG.ObjectMap.forEach(collectionChanges, function(iID, iCollectionChange) {
        notification.changes.push(iCollectionChange);
      });

      return notification;
    }.bind(this);

    if (!iResult.simpleDependencies.length && !iResult.aggregateDependencies.length) {
      //DG.log("DG.DataContext.invalidateDependentsAndNotify: No dependents");
    }
    else {
      if (!iChange && iResult.simpleDependencies.length) {
        // global value changes affect all cases, like aggregate functions
        iResult.aggregateDependencies = iResult.aggregateDependencies.concat(
                                          iResult.simpleDependencies);
        iResult.simpleDependencies = [];
      }

      // check if all changed cases are from the same collection
      if (!changeCollection) {
        var commonCollection, commonCollectionID;
        changeCases.forEach(function(iCase) {
          var caseCollection = iCase.get('collection'),
              caseCollectionID = caseCollection && caseCollection.get('id');
          if (!commonCollectionID) {
            commonCollection = caseCollection;
            commonCollectionID = caseCollectionID;
          }
          else if (caseCollectionID !== commonCollectionID)
            commonCollectionID = -1;
        });
        if (commonCollectionID && (commonCollectionID !== -1)) {
          changeCollection = commonCollection;
          changeCollectionID = commonCollectionID;
        }
      }

      // handle simple dependencies, but only for updateCases
      if (iResult.simpleDependencies.length &&
          iChange && (iChange.operation === 'updateCases')) {
        // DG.log("DG.DataContext.notifyInvalidationResult: simpleDependents: [%@]",
        //         iResult.simpleDependencies.map(function(iDep) {
        //                                     return "'" + iDep.name + "'";
        //                                   })
        //                                   .join(", "));
        simpleNotification = convertDependenciesToNotification(iResult.simpleDependencies, iChange);
      }

      // handle aggregate dependencies
      if (iResult.aggregateDependencies.length) {
        // DG.log("DG.DataContext.notifyInvalidationResult: aggregateDependents: [%@]",
        //         iResult.aggregateDependencies.map(function(iDep) {
        //                                         return "'" + iDep.name + "'";
        //                                       })
        //                                       .join(", "));
        aggregateNotification = convertDependenciesToNotification(iResult.aggregateDependencies);
      }

      if (simpleNotification)
        this.applyChange(simpleNotification);
      if (aggregateNotification) {
        this.applyChange(aggregateNotification);
        // signal any dependent contexts to update as well
        externalDataContexts.forEach(function(iDataContext) {
          iDataContext.applyChange(aggregateNotification);
        });
      }
    }
  },

    /**
     * A utility to find the last collection in the context.
     *
     * @return {DG.CollectionClient}
     */
    getLastCollection: function () {
      var collections = this.get('collections');
      var lastCollection = collections && collections[collections.length - 1];
      // we have a Collection. We want a CollectionClient.
      return lastCollection && this.getCollectionByID(lastCollection.get('id'));
    },
  /**
   * Export the case data for all attributes and cases of the given collection,
   * suitable for pasting into TinkerPlots/Fathom.
   * If no collection name given, returns an list of collection names.
   * @param iWhichCollection {String} collection name of the desired collection.
   * @return {String} Case data in tab-delimited string format
   */
  exportCaseData: function( iWhichCollection ) {
    // Encode str as per RFC 4180.
    // If str contains double quotes, convert to two double quotes
    // If str contains commas or double quotes, wrap in double quotes.
    function escape(str) {
      var newStr = '' + (SC.none(str)? '': str);
      if (/.*[",].*/.test(str)) {
        newStr = '"' + newStr.replace(/"/g, '""') + '"';
      }
      return newStr;
    }

    var columnDelimiter = ',',
        rowDelimiter = '\r\n',
        collection,
        attribNames,
        attribIDs,
        rows = [];

    if( SC.empty( iWhichCollection )) {
      return;
    }

    if (iWhichCollection === 'DG.CaseTableController.allTables'.loc()) {
      collection = this.getLastCollection();
      attribIDs = [];
      attribNames = [];
      this.getAttributes().forEach(function (attr){
        attribIDs.push(attr.get('id'));
        attribNames.push(attr.get('name'));
      });
    } else {
      collection = this.getCollectionByName(iWhichCollection);
      attribNames = collection && collection.getAttributeNames();
      attribIDs   = collection && collection.getAttributeIDs();
    }

    // create a tab and newline delimited string of attribute names and case values.

    // add a row of attribute names
    rows.push(attribNames.join(columnDelimiter));

    // add each row of case values
    collection.forEachCase( function( iCase, iIndex ) {
      var row = [];
      attribIDs.forEach( function( iAttrID ) {
        var caseValue = iCase.getValue( iAttrID);
        row.push(escape(caseValue));
      });
      rows.push(row.join(columnDelimiter)); // append each line of data to the output
    });

    return rows.join(rowDelimiter);
  },

  /**
   *  The number of collections controlled by this controller.
   *  @property {Number}
   */
  collectionCount: function() {
    return this.getPath('collections.length') || 0;
  }.property(),

  /**
   *  Returns the DG.CollectionClient for the child or leaf collection.
   *  @returns  {DG.CollectionClient | null}
   */
  childCollection: function() {
    var collectionCount = this.get('collectionCount');
    return( collectionCount ? this.getCollectionAtIndex( collectionCount - 1) : null);
  }.property('_collectionClients'),

  /**
   *  Returns the DG.CollectionClient for parent collection of the child or leaf collection.
   *  @returns  {DG.CollectionClient | null}
   */
  parentCollection: function() {
    var collectionCount = this.get('collectionCount');
    return( collectionCount ? this.getCollectionAtIndex( collectionCount - 2) : null);
  }.property('_collectionClients'),

  /**
   *  Returns the DG.CollectionClient at the specified index.
   *  Since collections are stored in parent --> child order,
   *  index 0 corresponds to the oldest ancestor, while the last index
   *  corresponds to the child/leaf collection.
   *  @returns  {DG.CollectionClient | undefined}
   */
  getCollectionAtIndex: function( iIndex) {
    var collections = this.get('collections'),
        collectionCount = this.get('collectionCount'),
        collection = (collections && (collectionCount > iIndex) &&
                            collections.objectAt( iIndex)) || null;
    return collection && this._collectionClients[ collection.get('id')];
  },

  /**
   *  Returns the DG.CollectionClient with the specified name.
   *  Searches its collections from child => parent => grandparent order.
   *  @returns  {DG.CollectionClient | null}
   */
  getCollectionByName: function( iName) {
    var collectionCount = this.get('collectionCount'),
        collections = this.get('collections'),
        collection;
    for( var i = 0; i < collectionCount; ++i) {
      collection = collections.objectAt(i);
      if (collection && (collection.get('name') === iName)) {
        return this._collectionClients[ collection.get('id')];
      }
    }
    return null;
  },

  /**
   *  Returns the DG.CollectionClient with the specified ID.
   *  @param    {Number}  iCollectionID -- The ID of the DG.collection
   *  @returns  {DG.CollectionClient | null}
   */
  getCollectionByID: function( iCollectionID) {
    return this._collectionClients[ iCollectionID] || null;
  },

  /**
    Returns the collection (DG.CollectionClient) which contains the specified case (DG.Case).
    @param    {DG.Case}               iCase -- The case whose collection is to be returned
    @returns  {DG.CollectionClient}   The collection which contains the specified case
   */
  getCollectionForCase: function( iCase) {
    return this.getCollectionByID( iCase.getPath('collection.id'));
  },

  /**
    Returns the collection (DG.CollectionClient) which contains
    the specified attribute (DG.Attribute).
    @param    {DG.Attribute}          iAttribute -- The attribute whose collection is to be returned
    @returns  {DG.CollectionClient}   The collection which contains the specified case
   */
  getCollectionForAttribute: function( iAttribute) {
    return this.getCollectionByID( iAttribute.getPath('collection.id'));
  },

  /**
    Returns the parent collection, if any, for the specified collection.
    Returns null if the specified collection has no parent collection.
    @param    {DG.CollectionClient}   iCollection -- The (child) collection whose parent is sought
    @returns  {DG.CollectionClient}   The parent collection (if one exists) or null
   */
  getParentCollection: function( iCollection) {
    var childCollectionID = iCollection && iCollection.get('id'),
        collectionCount = this.get('collectionCount'),
        collections = this.get('collections'),
        collection, collectionID,
        prevCollectionID = null;
    for( var i = 0; i < collectionCount; ++i) {
      collection = collections.objectAt( i);
      collectionID = collection.get('id');
      if( collection && (collectionID === childCollectionID))
        return this.getCollectionByID( prevCollectionID);
      prevCollectionID = collectionID;
    }
    return null;
  },

  /**
   Returns the child collection, if any, for the specified collection.
   Returns null if the specified collection has no child collection.
   @param    {DG.CollectionClient}   iCollection -- The (parent) collection whose parent is sought
   @returns  {DG.CollectionClient}   The child collection (if one exists) or null
   */
  getChildCollection: function( iCollection) {
    var childCollectionID = iCollection && iCollection.get('id'),
        collectionCount = this.get('collectionCount'),
        collections = this.get('collections'),
        collection, collectionID,
        prevCollectionID = null;
    for( var i = collectionCount-1; i >= 0; --i) {
      collection = collections.objectAt( i);
      collectionID = collection.get('id');
      if( collection && (collectionID === childCollectionID))
        return this.getCollectionByID( prevCollectionID);
      prevCollectionID = collectionID;
    }
    return null;
  },

  /**
    Creates a collection with the specified initial properties.
    @param    {Object}              iProperties -- The initial properties for the newly-created object
    @returns  {DG.CollectionClient} The newly-created collection
   */
  createCollection: function( iProperties) {
    var //newCollection = this.get('model').createCollection( iProperties || {}),
      tProperties = iProperties || {},
        newCollectionClient;

    tProperties.context = this.get('model');
    newCollectionClient = this.addCollection( DG.Collection.createCollection(tProperties));
    this.didCreateCollection( newCollectionClient);
    return newCollectionClient;
  },

  destroyCollection: function (collectionClient) {
    var id = collectionClient.get('id');
    this.willRemoveCollection(collectionClient);
    this._collectionClients[id].destroy();
    delete this._collectionClients[id];
  },

  /**
    Called from createCollection to give derived classes a chance to do something.
    @param  {DG.CollectionClient} iNewCollection -- The collection that was just created
   */
  didCreateCollection: function( iNewCollection) {
    // derived classes may override
  },

  /**
    Returns a collection matching the specified properties, creating it if necessary.
    @param    {Object}    iCollectionProperties -- Properties to match or to use as initial
                                                   values if the collection must be created.
    @returns  {DG.CollectionClient}   That matched or newly-created collection
   */
  guaranteeCollection: function( iCollectionProperties) {
    var aCollectionClient = this.getCollectionByName( iCollectionProperties.name);
    if (!aCollectionClient)
      aCollectionClient = this.createCollection( iCollectionProperties);
    return aCollectionClient;
  },

  /**
    Creates and connects a DG.Collection model and DG.CollectionClient controller for the
    specified DG.Collection.
    @param    {DG.Collection || DG.Collection}   iCollection -- The collection record to create the
                                                           model and controller for.
    @returns  {DG.CollectionClient}   The newly-created collection client
   */
  addCollection: function( iCollection) {
    function getCollection(iCollectionRecord) {
      DG.logWarn('Instantiating collection from collectionRecord');
      return DG.Collection.create({ collectionRecord: iCollectionRecord });
    }
    var theID = iCollection && iCollection.get('id'),
        theCollection = (theID && (iCollection.type === 'DG.CollectionRecord'))
          ? getCollection(iCollection)
          : iCollection,
        theCollectionClient = theCollection && DG.CollectionClient.create({});
    if (theCollectionClient && theCollection && theID) {
      theCollectionClient.setTargetCollection(theCollection);
      this._collectionClients[ theID ] = theCollectionClient;
      this.didAddCollection( theCollectionClient );
    }
    return theCollectionClient;
  },

  /**
    Utility function for adding observers for formula change notifications
    from individual collections.
    @param    {DG.CollectionClient}   iCollection -- The collection that was added
   */
  didAddCollection: function( iCollection) {
    iCollection.addObserver('caseIndices', this, 'caseIndicesDidChange');
    iCollection.addObserver('attrFormulaChanges', this, 'attrFormulaDidChange');
  },

  /**
    Utility function for removing observers for formula change notifications
    from individual collections.
    @param    {DG.CollectionClient}   iCollection -- The collection that will be removed
   */
  willRemoveCollection: function( iCollection) {
    iCollection.removeObserver('caseIndices', this, 'caseIndicesDidChange');
    iCollection.removeObserver('attrFormulaChanges', this, 'attrFormulaDidChange');
  },

  /*
    Observer function which invalidates formulas that depend on 'caseIndex'
    when case indices change.
   */
  caseIndicesDidChange: function() {
    var nodes = this.get('dependencyMgr').findNodesWithNames(['caseIndex']);
    this.invalidateDependentsAndNotify(nodes);
  },

  /**
   * The observer/handler for attribute formula change notifications from collections.
   * Notifies clients with an 'updateCases' notification. Note that we don't currently
   * include attribute-specific information in the notification, so clients can't make
   * attribute-specific responses. To support those, the collection would have to include
   * attribute-specific information in its notification, which this method would then
   * propagate to its observers in some fashion.
   *
   * @param iNotifier {DG.Collection}
   */
  attrFormulaDidChange: function( iNotifier, iKey) {
    var attrID = iNotifier.get(iKey),
        change = {
          operation: 'updateCases',
          collection: iNotifier,
          isComplete: true
        };
    this.applyChange( change);

    var attr = DG.Attribute.getAttributeByID(attrID),
        attrNodes = [{ type: DG.DEP_TYPE_ATTRIBUTE, id: attrID, name: attr.get('name') }];
    this.invalidateDependentsAndNotify(attrNodes);
  },

  /**
    Applies the specified function to each collection managed by this data context.
    @param    iFunction {Function}        The function to apply to each collection
    @returns  {DG.DataContext}  this, for use in method chaining
   */
  forEachCollection: function( iFunction) {
    var this_ = this,
        collections = this.get('collections');
    collections.
      forEach( function( iCollection) {
                var collectionID = iCollection.get('id'),
                    collectionClient = this_.getCollectionByID( collectionID);
                if( collectionClient)
                  iFunction( collectionClient);
              });
    return this;
  },

  /**
    Returns the string that best represents the noun form of the specified number of cases,
    e.g. "case"|"cases", "person"|"people", "deer"|"deer", "goose"|"geese", etc.
    @param    {DG.CollectionClient} iCollectionClient -- The collection whose labels are returned
    @param    {Number}              iCount -- The number of cases to represent
    @returns  {String}              The string to represent the specified number of cases
   */
  getCaseNameForCount: function( iCollectionClient, iCount) {
    var tCollection = iCollectionClient.get('collection'),
        tLabels = tCollection && tCollection.get('labels'),
        tSingName = tLabels ? tLabels.singleCase : tCollection.get('caseName'),
        tPluralName = tLabels ? tLabels.pluralCase : tCollection.get('name');
    tSingName = tSingName || 'DG.DataContext.singleCaseName'.loc();
    tPluralName = tPluralName || 'DG.DataContext.pluralCaseName'.loc();
    return (iCount === 1) ? tSingName : tPluralName;
  },

  /**
    Returns a case count string indicating the number of cases using the appropriate
    case name, e.g. "1 case"|"2 cases", "1 person"|"2 people", etc.
    @param    {DG.CollectionClient} iCollection -- The collection whose labels are returned
    @param    {Number}              iCount -- The number of cases to represent
    @returns  {String}              The string to represent the specified number of cases
   */
  getCaseCountString: function( iCollection, iCount) {
    var caseName = this.getCaseNameForCount( iCollection, iCount);
    return 'DG.DataContext.caseCountString'.loc( iCount, caseName);
  },

  /**
    Returns the string that represents a coherent set of cases, e.g. a set of Lunar Lander
    events is often called "a flight record", while in other games it might be "a round".
    @param    {DG.CollectionClient} iCollection -- The collection whose labels are returned
    @returns  {String}              The string label to represent a set of cases
   */
  getLabelForSetOfCases: function( iCollection) {
    return iCollection.getPath('collection.collection.parent.caseName') ||
        'DG.DataContext.setOfCasesLabel'.loc();
  },

  /**
   *  Returns a specification for the DG.Attribute with the specified ID.
   *  Searches its collections from child => parent => grandparent order.
   *  @param    {Number}        iAttributeID -- the ID of the attribute to be returned
   *  @returns  {Object | null} Object.collection:  {DG.CollectionClient}
   *                            Object.attribute:   {DG.Attribute}
   *                            Object.position:    {number}
   */
  getAttrRefByID: function( iAttributeID) {
    var collectionCount = this.get('collectionCount'),
        collections = this.get('collections');
    for( var i = collectionCount - 1; i >= 0; --i) {
      var collection = collections.objectAt( i),
          collectionClient = collection && this._collectionClients[ collection.get('id')],
          foundAttr = collectionClient && collectionClient.getAttributeByID( iAttributeID),
          position = foundAttr && collectionClient.getAttributeIndexByName(foundAttr.get('name'));
      if( foundAttr)
        return {
          collection: collectionClient,
          attribute: foundAttr,
          position: position
        };
    }
    return null;
  },

  /**
   *  Returns a specification for the DG.Attribute with the specified name.
   *  Searches its collections from child => parent => grandparent order.
   *  @param    {String}        iName -- the name of the attribute to be returned
   *  @returns  {Object | null} Object.collection:  {DG.CollectionClient}
   *                            Object.attribute:   {DG.Attribute}
   *                            Object.position:    {number}
   */
  getAttrRefByName: function( iName) {
    var collectionCount = this.get('collectionCount'),
        collections = this.get('collections');
    for( var i = collectionCount - 1; i >= 0; --i) {
      var collection = collections.objectAt( i),
          collectionClient = collection && this._collectionClients[ collection.get('id')],
          foundAttr = collectionClient && collectionClient.getAttributeByName( iName),
          position = collectionClient && collectionClient.getAttributeIndexByName(iName);
      if( foundAttr)
        return {
          collection: collectionClient,
          attribute: foundAttr,
          position: position
        };
    }
    return null;
  },

  /**
   * Returns a comprehensive list of attributes in this data context.
   * @return {[DG.Attribute]}
   */
  getAttributes: function () {
    var attrs = [];
    var ix;
    var collection;
    var collectionAttrs;
    for (ix = 0; ix < this.get('collectionCount'); ix += 1) {
      collection = this.getCollectionAtIndex(ix);
      collectionAttrs = collection.get('attrsController');
      collectionAttrs && collectionAttrs.forEach(function (attr) {attrs.push(attr);});
    }

    return attrs;
  },

  /**
   *  Returns the DG.Attribute with the specified name.
   *  Searches its collections from child => parent => grandparent order.
   *  @returns  {DG.Attribute | null}
   */
  getAttributeByName: function( iName) {
    var attrRef = this.getAttrRefByName( iName);
    return attrRef ? attrRef.attribute : null;
  },

  /**
    Sets the values of the specified case from the specified array of values.
    @param    iCase {DG.Case}   The case whose values are to be set
    @param    iValues{Array of values} The values to use in setting the case values
    @param    iCollection {DG.CollectionClient} (optional) -- The collection which owns the case.
              Will be looked up if it isn't provided, but more efficient if the client provides it.
   */
  setCaseValuesFromArray: function( iCase, iValues, iCollection) {
    var collection = iCollection || this.getCollectionForCase( iCase);
    if( collection)
      collection.setCaseValuesFromArray( iCase, iValues);
  },

  /**
    Returns an object which specifies the default collections for this data context along
    with some of the default properties of that collection, e.g. default attributes to plot.
    @returns    {Object}    An object specifying the defaults
                {DG.CollectionClient}   object.collectionClient -- child collection
                {DG.CollectionClient}   object.parentCollectionClient -- parent collection
                {String}                object.plotXAttr -- default X attribute on graphs
                {String}                object.plotYAttr -- default Y attribute on graphs
   */
  collectionDefaults: function() {

    return {
      collectionClient: this.get('childCollection'),
      parentCollectionClient: this.get('parentCollection'),
      plotXAttr: null,
      plotXAttrIsNumeric: true,
      plotYAttr: null,
      plotYAttrIsNumeric: true
    };
  },

  /**
    Called by the framework as part of the document writing process, to give
    DG.DataContext derived classes a chance to write out context-specific information.
    Clients should implement/override the createStorage() method rather than
    overriding this function.
   */
  willSaveContext: function() {
    var model = this.get('model');
    if( model) {
      var contextStorage = this.createStorage() || {};
      model.set('contextStorage', contextStorage);
    }
  },

  /**
    Returns a link object of the form { type: 'DG.DataContextRecord', id: contextID }.
    @returns  {Object}  linkObject -- contains the type and id of the referenced record
              {String}  linkObject.type -- the type of record ('DG.DataContextRecord' in this case).
              {Number}  linkObject.id -- the id of the data context record
   */
  toLink: function() {
    var model = this.get('model');
    return model && model.toLink();
  },

  /**
   *  Returns the object to be JSON-ified for storage.
   *  @returns  {Object}
   */
  createStorage: function() {
    return {};
  },

  /**
   *  Copies the contents of iComponentStorage to the model.
   *  @param {Object} iContextStorage -- Properties restored from document.
   */
  restoreFromStorage: function( iContextStorage) {
    var collections = this.get('collections');
    if( !SC.none( collections)) {
      collections.forEach(function( collection) {
                            this.addCollection( collection);
      }.bind(this));
    }
  }

  }; // end return from closure

}())) ; // end closure

/**
 *  A registry of creation functions for use by the DG.DataContext.factory() function.
 *  Derived classes should add their own factory function entries.
 *  Clients call DG.DataContext.factory() to create a new polymorphically-typed
 *  DataContext object.
 */
DG.DataContext.registry = {};
DG.DataContext.registry['DG.DataContext'] = function( iProperties) {
                                              return DG.DataContext.create( iProperties);
                                            };

/**
 Returns an array of keys to known data contexts.
 @param  {String}  iDocumentID -- Currently unused since DG is currently single-document

 TODO: Deprecate this method and remove references: We should be getting context
 TODO: information via the DocumentController.
 */
DG.DataContext.contextIDs = function(iDocumentID) {
  var contexts = DG.currDocumentController().contexts;
  return contexts && contexts.map(function (context) { return context.get('id'); });
};

/**
  Returns the context that contains the specified collection.
  Currently, this is implemented simply by following the 'context' property
  of the DG.Collection back to its DG.DataContextRecord and then looking
  up the DG.DataContext by ID. The current implementation (like most other
  functions here) ignores the document ID. Note that there is a bit of a code
  smell surrounding the use of this function. Clients that have access to a
  collection should really have access to the context as well.
  @param    {DG.CollectionClient} iCollectionClient -- The collection whose context is to be found
  @returns  {DG.DataContext}      The collection's DG.DataContext or null

 TODO: Deprecate this method and remove references: We should be getting context
 TODO: information via the DocumentController.
 */
DG.DataContext.getContextFromCollection = function( iCollectionClient) {
  var collection = iCollectionClient &&
                          iCollectionClient.get('collection'),
      contextID = collection && collection.getPath('context.id');
  return contextID && DG.currDocumentController().getContextByID(contextID);
};
/**
 Returns an object which specifies the default collections for this data context along
 with some of the default properties of that collection, e.g. default attributes to plot.
 @returns    {Object}    An object specifying the defaults
 {DG.CollectionClient}   object.collectionClient -- child collection
 {DG.CollectionClient}   object.parentCollectionClient -- parent collection
 {String}                object.plotXAttr -- default X attribute on graphs
 {String}                object.plotYAttr -- default Y attribute on graphs
 */
DG.DataContext.collectionDefaults = function() {
  var defaultValues = {
    collectionClient: null, //this.get('childCollection'),
    parentCollectionClient: null, //this.get('parentCollection'),
    plotXAttr: null,
    plotXAttrIsNumeric: true,
    plotYAttr: null,
    plotYAttrIsNumeric: true
  };
  return defaultValues;
};
/**
 *  A factory function for creating an appropriate DG.DataContext object, i.e.
 *  either a DG.DataContext or an appropriate derived class. Derived classes should
 *  add their own factory function entries to the DG.DataContext.registry, so that
 *  when this function is called the factory function will be available when appropriate.

 *  @param iProperties {Object}  properties object passed to the DataContext on construction.
 *  @returns  {DG.DataContext}  a DG.DataContext object or an instance of a derived class
 */
DG.DataContext.factory = function( iProperties) {
                          var type = iProperties && iProperties.type,
                              func = type && DG.DataContext.registry[type],
                              context = func ? func( iProperties) : DG.DataContext.create( iProperties);
                          return context;
                        };

