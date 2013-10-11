// ==========================================================================
//                          DG.GameController
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

sc_require('controllers/component_controller');

/** @class

  (Document Your Controller Here)

  @extends SC.Object
*/
DG.GameController = DG.ComponentController.extend(
/** @scope DG.GameController.prototype */ {

  /**
    Array of case IDs of currently open cases.
    @property {Array of Number}
   */
  openCaseIDs: null,
  
  // Currently, DG.currGameController is a singleton that
  // outlives the game component and view.
  shouldDestroyOnComponentDestroy: false,
  
  gameIsReady: true,  // Will be set to false at the point we discover we're going to have a default game loaded
  
  /**
    The total number of document-dirtying changes.
    @property   {Number}
   */
  changeCount: 0,
  
  /**
    The number of document-dirtying changes that have been saved.
    If this is less than the total change count, then the document is dirty.
    @property   {Number}
   */
  savedChangeCount: 0,
  
  /**
    Initialization method
   */
  init: function() {
    sc_super();
    
    this.openCaseIDs = [];
  },
  
  /**
    Whether or not the document contains unsaved changes such that the user
    should be prompted to confirm when closing the document, for instance.
    @property   {Boolean}
   */
  hasUnsavedChanges: function() {
    return this.get('changeCount') > this.get('savedChangeCount');
  }.property(),
  
  /**
    Synchronize the saved change count with the full change count.
    This method should be called when a save occurs, for instance.
   */
  updateSavedChangeCount: function() {
    this.set('savedChangeCount', this.get('changeCount'));
  },
  
  /**
    Returns the IDs of any currently open game cases.
    @returns  {Array of Number}   Array of open case IDs
   */
  getOpenCaseIDs: function() {
    var openCaseIDs = [];
    
    // Adds the id of the specified case and all of its child cases to openCaseIDs.
    function addCase( iCase) {
      openCaseIDs.push( iCase.get('id'));

      var childCases = iCase.get('children');
      childCases.forEach( function( iChildCase) { addCase( iChildCase); });
    }
    
    // New Game API support -- Add open parent cases, child cases, and their values
    this.openCaseIDs.forEach( function( iCaseID) {
                                var parentCase = DG.store.find( DG.Case, iCaseID);
                                if( parentCase) addCase( parentCase);
                              });
    
    // Old Game API support -- Add open parent cases, child cases, and their values
    DG.ObjectMap.forEach( this._openParentCases,
                          function( iCollectionName, iOpenCase) {
                            addCase( iOpenCase);
                          });
    
    // Return the caseIDs to the caller
    return openCaseIDs;
  },

  doCommand: function( iCmd) {
    //DG.logWarn("DG.currGameController.doCommand is deprecated. Use DG.doCommand instead.");
    var this_ = this, result;
    SC.run( function() { result = this_.dispatchCommand( iCmd); });
    return result;
  },
  
  dispatchCommand: function( iCmd) {
    var cmdObj = null;
    
    var ret = { 'success' : false };
    
    // If it's a string, parse it as JSON
    if( SC.typeOf( iCmd) === SC.T_STRING) {
      // Catch any exceptions thrown by the parser
      try {
        cmdObj = SC.json.decode( iCmd);
      }
      catch(e) {
        // TODO: Report invalid JSON back to caller
        DG.logWarn("Invalid JSON in doCommand(), reported from DG.GameController.dispatchCommand()");
      }
    }
    
    // If it's not a JSON-formatted string, assume it's a JavaScript cmd object
    else {
      cmdObj = iCmd;
    }
    
    // Bail if we don't have a valid cmdObj at this point
    if( !cmdObj) return ret;
    
    // Dispatch the action to the appropriate handler
    var shouldDirtyDocument = true;
    switch( cmdObj.action) {
    
    /*
     * New API
     */
    case 'initGame':
      ret = this.handleInitGame( cmdObj.args);
      this.set('changeCount', 0);
      this.updateSavedChangeCount();
      shouldDirtyDocument = false;
      break;
    
    case 'createComponent':
      ret = this.handleCreateComponent( cmdObj.args);
      break;
    
    case 'createCollection':
      ret = this.handleCreateCollection( cmdObj.args);
      break;

    case 'openCase':
      ret = this.handleOpenCase( cmdObj.args);
      break;
    
    case 'updateCase':
      ret = this.handleUpdateCase( cmdObj.args);
      break;
    
    case 'closeCase':
      ret = this.handleCloseCase( cmdObj.args);
      break;
    
    case 'createCase':
      ret = this.handleCreateCase( cmdObj.args);
      break;
    
    case 'createCases':
      ret = this.handleCreateCases( cmdObj.args);
      break;

    case 'deleteAllCaseData':
      ret = this.handleDeleteAllCaseData( cmdObj.args);
      break;
    
    case 'logAction':
      ret = this.handleLogAction( cmdObj.args);
      shouldDirtyDocument = false;
      break;
    
    /*
     * Old API
     */
    case 'newCollection':
      DG.gameSelectionController.processNewCollectionArgs( cmdObj.args);

      // Extract the attribute names into an array for newCollectionWithAttributes().
      var tAttrNames = [];
      cmdObj.args.attrs.forEach( function( iAttr) { tAttrNames.push( iAttr.name); });
      this.newCollectionWithAttributes( cmdObj.args.name, tAttrNames);
      ret.success = true;
      break;
    
    case 'newCase':
      this.addCaseToCollectionWithValues( cmdObj.args.collection, cmdObj.args.values);
      ret.success = true;
      break;

    case 'requestFormulaObject':
      ret.success = DG.formulaObjectCoordinator.requestFormulaObject( cmdObj.args.title,
                                                                      cmdObj.args.description,
                                                                      cmdObj.args.output, cmdObj.args.inputs,
                                                                      cmdObj.args.descriptions,
                                                                      cmdObj.args.allow_user_variables);
      shouldDirtyDocument = false;
      break;

      case 'updateFormulaObject':
        ret.success = DG.formulaObjectCoordinator.updateFormulaObject( cmdObj.args.description,
                                                                        cmdObj.args.output, cmdObj.args.inputs,
                                                                        cmdObj.args.descriptions,
                                                                        cmdObj.args.allow_user_variables);
        shouldDirtyDocument = false;
        break;

    case 'requestFormulaValue':
      ret = DG.formulaObjectCoordinator.requestFormulaValue( cmdObj.args.output, cmdObj.args);
      shouldDirtyDocument = false;
      break;

    case 'requestAttributeValues':
      ret = this.handleRequestAttributeValues( cmdObj.args );
      shouldDirtyDocument = false;
      break;
    
    default:
      shouldDirtyDocument = false;
      break;
    }
    
    if( shouldDirtyDocument)
      this.incrementProperty('changeCount');
    
    return ret;
  },
  
  /**
    'initGame' handler
    @param {Object}   iArgs   See below for arguments
    @returns {Object}         { success: {Boolean} }
    args: {
      name: "GameName",
      dimensions: { width: _WIDTH_PIX_, height: _HEIGHT_PIX_ },
      contextType: 'DG.GameContext' // or 'DG.DataContext', ...
      // Collections required to be ordered from grandparent-to-parent-to-child
      collections: [  // array of collections to create
        {
          name: "Collection1",
          attrs: [  // array of attributes to create/guarantee for this collection
            { name: "AttrName", type: 'numeric'|'nominal', [precision: _DECIMAL_PRECISION_] },
            ...
          ],
          defaults: {
            xAttr: "defaultXAttr",
            yAttr: "defaultYAttr",
            groupAttr: "defaultGroupAttr"
          }
        },
        ...
      ]
    }
   */
  handleInitGame: function( iArgs) {
  
    // The game-specified arguments form the core of the new DG.GameSpec.
    var currentGame = DG.gameSelectionController.get('currentGame'),
        currentGameName = currentGame && currentGame.get('name'),
        gameContext,
        gameCollections = [];

    if( currentGame) {
      // Fill out the contents of the DG.GameSpec with the properties passed
      // by the game. Don't replace the name, however, so that we can keep
      // multiple copies of the same game code in use, e.g. "Local Lunar Lander"
      // and "External Lunar Lander".
      DG.ObjectMap.copySome( currentGame, iArgs,
                              function( iKey) { return iKey !== 'name'; });
      // Ask for the context after we've copied the arguments/properties,
      // so that if there's a 'contextType' it will be used.
      gameContext = DG.GameContext.getContextForGame( currentGame);
      if( iArgs.dimensions) {
        var prevDimensions = DG.gameSelectionController.get('currentDimensions'),
            prevWidth = prevDimensions && prevDimensions.width,
            prevHeight = prevDimensions && prevDimensions.height,
            newDimensions = { width: iArgs.dimensions.width, height: iArgs.dimensions.height };
        // If game specifies a different size, update to the new size
        if( (prevWidth !== newDimensions.width) || (prevHeight !== newDimensions.height))
          DG.gameSelectionController.set('currentDimensions', newDimensions );
      }
      this.view.set('version', SC.none( currentGame.version) ? '' : currentGame.version);
    }
    
    // Function for creating each collection and its required attributes
    function handleNewCollection( iCollectionArgs) {
      var collectionProperties = { name: iCollectionArgs.name,
                                  areParentChildLinksConfigured: true };

      // Each collection is the child of the previous collection
      if( gameCollections.length > 0)
        collectionProperties.parent = gameCollections[ gameCollections.length - 1].get('id');

      // Create/guarantee each collection and its required attributes
      var collection = gameContext.guaranteeCollection( collectionProperties);
      if (collection) {
        gameCollections.push( collection);
        iCollectionArgs.attrs.
          forEach( function( iAttrArgs) { collection.guaranteeAttribute( iAttrArgs); });
      }
    }
    
    // Create/guarantee each collection and its required attributes
    if( iArgs.collections)
      iArgs.collections.forEach( handleNewCollection);

    if( currentGame) {
      // Notify that the collections have changed
      currentGame.notifyPropertyChange('collections');

      // If we have restored game state for this game, we pass it to the game
      // at this point, before we've signalled that the game is ready. This way,
      // clients that respond to 'gameIsReady' won't have a chance to query the
      // game until it has finished restoring its state.
      var currentContext = currentGame.get('context'),
          restoredGameState = currentContext && currentContext.get('restoredGameState'),
          doAppCommandFunc = currentGame.get('doCommandFunc');
      if( doAppCommandFunc && restoredGameState) {
        doAppCommandFunc({ operation: 'restoreState', args: { state: restoredGameState }});
      }
    }

    // Once all the collections and attributes are created, we're ready to play the game.
    this.set('gameIsReady', true);
    
    if( (iArgs.log === undefined) || iArgs.log)
      DG.logUser("initGame: '%@', Collections: [%@]",
                  currentGameName, gameCollections.getEach('name').join(", "));
  },
  
  /**
    Create a component of the specified type.
   */
  handleCreateComponent: function( iArgs) {
    // We use sendAction() here to avoid Lakosian issues
    return SC.RootResponder.responder.sendAction('createComponentAndView', null, this, null, iArgs);
  },
  
  /**
    Returns the ID of the created case for passing to further 'openCase' or 'createCase' calls.
    @param {String} iAction   Command being executed (e.g. 'openCase', 'createCase')
    @param {Object} iArgs     Arguments passed to the command
    @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
   */
  doCreateCase: function( iAction, iArgs) {
    // TODO: Consolidate with doCreateCases() method below.
    var currentGame = DG.gameSelectionController.get('currentGame'),
        gameContext = DG.GameContext.getContextForGame( currentGame),
        collection = gameContext.getCollectionByName( iArgs.collection),
        caseProperties = {},
        ret = { success: false };
    if( !SC.none( iArgs.parent))
      caseProperties.parent = iArgs.parent;
    
    if( !DG.assert( gameContext))
      return ret;
    
    var change = {
                    operation: 'createCase',
                    properties: caseProperties,
                    values: iArgs.values
                  };
    if( collection)
      change.collection = collection;
    else  // We don't assert, because the data context will default to the child collection.
      DG.logWarn("DG.GameController.doCreateCase: Can't find collection '%@'", iArgs.collection);
    
    ret = gameContext.applyChange( change);
    
    if( ret.success && ((iArgs.log === undefined) || iArgs.log))
      DG.logUser("%@: %@ [%@]", iAction, iArgs.collection, iArgs.values.join(", "));
    return ret;
  },

  /**
    Returns the ID of the created case for passing to further 'openCase' or 'createCase' calls.
    @param {String} iAction   Command being executed (e.g. 'openCase', 'createCase')
    @param {Object} iArgs     Arguments passed to the command
    @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
   */
  doCreateCases: function( iAction, iArgs) {
    var currentGame = DG.gameSelectionController.get('currentGame'),
        gameContext = DG.GameContext.getContextForGame( currentGame),
        collection = gameContext.getCollectionByName( iArgs.collection),
        caseProperties = {},
        ret = { success: false };
    if( !SC.none( iArgs.parent))
      caseProperties.parent = iArgs.parent;
    
    if( !DG.assert( gameContext))
      return ret;
    
    var change = {
                    operation: 'createCases',
                    properties: caseProperties,
                    values: iArgs.values
                  };
    if( collection)
      change.collection = collection;
    else  // We don't assert, because the data context will default to the child collection.
      DG.logWarn("DG.GameController.doCreateCase: Can't find collection '%@'", iArgs.collection);
    
    ret = gameContext.applyChange( change);
    
    if( ret.success && ((iArgs.log === undefined) || iArgs.log))
      DG.logUser("%@: %@ %@ cases created", iAction, iArgs.collection, iArgs.values.length);
    return ret;
  },

  /**
    Update the values of an existing case.
    @param {String} iAction   Command being executed (e.g. 'openCase', 'createCase')
    @param {Object} iArgs     Arguments passed to the command
    @returns {Object}         { success: {Boolean} }
   */
  doUpdateCase: function( iAction, iArgs) {
    var currentGame = DG.gameSelectionController.get('currentGame'),
        gameContext = DG.GameContext.getContextForGame( currentGame),
        collection = gameContext.getCollectionByName( iArgs.collection),
        theCase = DG.store.find( DG.Case, iArgs.caseID),
        ret = { success: false };
    if( collection && theCase && iArgs.values) {
      var change = {
            operation: 'updateCases',
            collection: collection,
            cases: [ theCase ],
            values: [ iArgs.values ]
          };
      gameContext.applyChange( change);
      ret.success = true;
    }
    if( (iArgs.log === undefined) || iArgs.log) {
      DG.logUser("%@: %@ [%@]", iAction, collection.get('name'),
                                iArgs.values ? iArgs.values.join(", ") : "");
    }
    return ret;
  },

  /**
    Create a new parent case, i.e. one that is expected to have child cases attached to it.
    Returns the ID of the created case for passing to further 'openCase' or 'createCase' calls.
    @param {Object} iArgs     Arguments passed to the 'openCase' command
    @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
   */
  handleOpenCase: function( iArgs) {
    var tResult = this.doCreateCase('openCase', iArgs);
    if( tResult.success && !SC.none( tResult.caseID))
      this.openCaseIDs.pushObject( tResult.caseID);
    return tResult;
  },

  /**
    Update an open parent case with intermediate values.
    @param {Object} iArgs     Arguments passed to the 'updateCase' command
    @returns {Object}         { success: {Boolean} }
   */
  handleUpdateCase: function( iArgs) {
    return this.doUpdateCase('updateCase', iArgs);
  },

  /**
    Close an open parent case once the last of its child cases has been created.
    @param {Object} iArgs     Arguments passed to the 'closeCase' command
    @returns {Object}         { success: {Boolean} }
   */
  handleCloseCase: function( iArgs) {
    var tResult = this.doUpdateCase('closeCase', iArgs);
    if( !SC.none( iArgs.caseID))
      this.openCaseIDs.removeObject( iArgs.caseID);
    return tResult;
  },

  /**
    Create a leaf case, i.e. one which does not have any child cases.
    Returns the ID of the created case.
    @param {Object} iArgs     Arguments passed to the 'openCase' command
    @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
   */
  handleCreateCase: function( iArgs) {
    return this.doCreateCase('createCase', iArgs);
  },

  /**
    Create a leaf case, i.e. one which does not have any child cases.
    Returns the ID of the created case.
    @param {Object} iArgs     Arguments passed to the 'openCase' command
    @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
   */
  handleCreateCases: function( iArgs) {
    return this.doCreateCases('createCases', iArgs);
  },


  /**
     Delete all case data not associated with the current game case.
     @param {Object} iArgs     Arguments passed to the 'deleteAllCaseData' command
     @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
   */
  handleDeleteAllCaseData: function( iArgs) {
      DG.logUser("deleteAllCaseData by Game");  // deleted via Game API, not via Delete Data button.
      var preserveGameCasesOption = iArgs && iArgs.preserveGameCollectionCases;
      return this.doDeleteAllCaseData( preserveGameCasesOption );
   },

  /**
   Delete all case data (except data linked to the currently open game case).
   Design for use by user (DG.AppController.deleteAllCaseData()) or by game (this.handleDeleteAllCaseData())
   @param {Boolean} preserveTopCasesOption (optional) prevent delete of all top level cases (delete child cases only)
   @returns {{success: boolean}}
   */
  doDeleteAllCaseData: function( preserveTopCasesOption ) {
    var dataContext = DG.gameSelectionController.get('currentContext'),
        tCaseIDsToPreserve = this.getOpenCaseIDs(), // don't delete the open cases (parent or child)
        tGameCollection = null,
        tDeletedCaseIDs = null;

    if( preserveTopCasesOption ) {
      // add all top-level case IDs to tCaseIDsToPreserve, removing duplicates with getOpenCaseIDs() above.
      tGameCollection = dataContext && dataContext.getCollectionAtIndex(0); // get top-level collection
      if( tGameCollection ) {
        tGameCollection.getCaseIDs().forEach( function( iID ) {
          if( tCaseIDsToPreserve.indexOf( iID ) === -1 ) {
            tCaseIDsToPreserve.push( iID );       // not a duplicate, so preserve this game case
          }
        });
      }
    }
    tDeletedCaseIDs = DG.Record.destroyAllRecordsOfType( DG.Case, tCaseIDsToPreserve);
    DG.store.commitRecords();

    // Note that for efficiency, the record deletion above is carried out
    // for all cases at once rather than game-by-game or context-by-context.
    // Therefore, this notification may be insufficient in a situation in
    // which data are being cleared from multiple game contexts. We have
    // said that in the future a document may only contain data from a
    // single game, however, so we're not putting effort into solving
    // that problem at the moment. The only current symptom should be that
    // graphs which are showing data from a different game (e.g. after
    // switching games with a graph showing) might not refresh immediately.
    var tChange = {
          operation: 'deleteCases',
          // signal that the action has already been completed
          isComplete: true,
          ids: tDeletedCaseIDs
        },
        result = { success: false };
    if( dataContext)
      result = dataContext.applyChange( tChange);
    return result;
  },

  /**
    Create a collection.
    Returns the ID of the created collection.
    @param {Object}       iArgs -- An object that specifies the properties of the collection
            {String}          iArgs.name -- Name of the new collection
            {Array of Object} iArgs.attrs -- Array of attribute specification objects
    @returns {Object}     { success: {Boolean}, collectionID: {Number} }
   */
  handleCreateCollection: function( iArgs) {
    DG.gameSelectionController.addCollectionSpecToGameSpecIfNecessary( iArgs.name, iArgs.attrs);
    var currentGame = DG.gameSelectionController.get('currentGame'),
        gameContext = DG.GameContext.getContextForGame( currentGame),
        tCollectionProperties = { name: iArgs.name, areParentChildLinksConfigured: true },
        tGameCollections = DG.gameSelectionController.getPath('currentGame.collections');
    if( tGameCollections && tGameCollections.length > 1) {
      var tParentCollectionSpec = tGameCollections[ tGameCollections.length - 2],
          tParentCollection = tParentCollectionSpec && gameContext && gameContext.getCollectionByName( tParentCollectionSpec.name);
      if( tParentCollection)
        tCollectionProperties.parent = tParentCollection.get('id');
    }

    var tResult = gameContext && 
                  gameContext.applyChange({
                    operation: 'createCollection',
                    properties: tCollectionProperties,
                    attributes: iArgs.attrs
                  }),
        tCollection = tResult && tResult.success && tResult.collection;
    if (tCollection) {
      if( (iArgs.log === undefined) || iArgs.log)
        DG.logUser("newCollectionCreated: %@ with %@ attributes", iArgs.name, iArgs.attrs.length);
      return { success: true, collectionID: tCollection.get('id')};
    }
    else
      return { success: false };
  },
  
  /**
    Calls logUser with the specified arguments.
    Uses Function.apply to package the formatStr and replaceArgs for use by the logUser function.
    @param    {Object}    iArgs
              {String}    iArgs.formatStr -- the format string to use for the log statement
                                             instances of %@ will be replaced by replaceArgs
              {Array}     iArgs.replaceArgs -- Array of values used to replace %@ instances in formatStr
   */
  handleLogAction: function( iArgs) {
    // Must have formatStr to log anything.
    if( iArgs.formatStr) {
      // Combine the formatStr and replaceArgs into an array for Function.apply.
      var applyArgs = [iArgs.formatStr];
      if( iArgs.replaceArgs)
        applyArgs = applyArgs.concat( iArgs.replaceArgs);
      DG.logUser.apply( this, applyArgs);
      return { success: true };
    }
    return { success: false };
  },

  /**
    Get attribute values of the case, matching each of the supplied attribute names.
    Typically used to get values of formula attributes after doUpdateCase().
        
    If the case exists an array of values will be returned, with success==true.  Array
    values will be null if the matching attribute does not exist, or has a missing value.
    
    @param {Object} iArgs     Arguments { collection, caseID, attributeNames:[] }
    @returns {Object}         { success: {Boolean}, values: [] }
   */
  handleRequestAttributeValues: function( iArgs) {

    // get the case from the requested collection
    var currentGame = DG.gameSelectionController.get('currentGame'),
        gameContext = DG.GameContext.getContextForGame( currentGame),
        collection = gameContext.getCollectionByName( iArgs.collection),
        theCase = DG.store.find( DG.Case, iArgs.caseID),
        ret = { success: false, values: [] };
        
    if( collection && theCase && iArgs.attributeNames) {
      // get the attribute values matching each attribute name
      var attrIDs = collection.getAttributeIDs(),
          attrIndex,
          attrValue,
          i, j = iArgs.attributeNames.length;
      for( i=0; i<j; ++i ) {
        attrIndex = collection.getAttributeIndexByName( iArgs.attributeNames[i] );
        attrValue = null;
        if( attrIndex > 0 && attrIndex < attrIDs.length ) {
          attrValue = theCase.getValue( attrIDs[attrIndex]);
        }
        ret.values.push( attrValue );
      }
      ret.success = true;
    }
    return ret;
  },

  /**
    [Old Game API] Creates a new collection with the specified attributes.
    This function is called directly by games using the old Game API.
    New games should use the New Game API 'initGame' command.
    @param  {String}  iCollectionName -- The name of the collection to create
    @param  {Array of String}  iAttributeNames -- The names of the attributes to create
   */
  newCollectionWithAttributes: function(iCollectionName, iAttributeNames)
  {
    DG.logUser("newCollectionCreated: %@ [%@]", iCollectionName, iAttributeNames.join(', '));

    var currentGame = DG.gameSelectionController.get('currentGame'),
        gameContext = DG.GameContext.getContextForGame( currentGame),
        aCollection = gameContext && gameContext.guaranteeCollection( { name: iCollectionName });
    if (aCollection) {
      iAttributeNames.forEach( function( iAttributeName) {
                                  aCollection.guaranteeAttribute( { name: iAttributeName });
                               });
    }
  
    // Weasels kluge -- Create the Games collection automatically
    if( iCollectionName === "Weasels")
      this.newCollectionWithAttributes("Games", ["game"]);

    // Notify that the collections have changed
    if( currentGame) currentGame.notifyPropertyChange('collections');

    this.set('gameIsReady', true);
  },
  
  queuedCases: [],  // When we get a request to add a case, we stash it in this array
            // for later processing
  addCasesTimer: null,  // Set when we get a case to add.
  startQueueTime: null,
  
  _openGameName: '',
  _openParentCollectionName: '',
  _openParentCases: {},
  
  openParentCase: function( iGameName, iCollectionName, iParentCollectionName, iParentCase) {
    this._openGameName = iGameName;
    this._openParentCollectionName = iParentCollectionName;
    this._openParentCases[ iCollectionName] = iParentCase;
  },
  
  closeParentCases: function() {
    this._openGameName = '';
    this._openParentCollectionName = '';
    this._openParentCases = {};
  },
  
  closeParentCase: function( iValues) {
    this.closeParentCases();
  },
  
  getParentCaseFor: function( iValues) {
    return this._openParentCases[ Object.keys( this._openParentCases).pop()];
  },

  addCasesFromQueue: function()
  {
    var this_ = this,
        currentGame = DG.gameSelectionController.get('currentGame'),
        currentGameName = DG.gameSelectionController.get('currentName'),
        parentCollectionName = currentGame && currentGame.get('parentCollectionName'),
        parentCollection = DG.gameCollectionWithName( currentGameName, parentCollectionName);

    this.queuedCases.forEach( function( anItem) {
      var iCollectionName = anItem.collectionName,
          iValues = anItem.values,
          collectionClient = DG.gameCollectionWithName( currentGameName, iCollectionName),
          attrIDs = collectionClient && collectionClient.getAttributeIDs(),
          attrCount = attrIDs ? attrIDs.length : 0;
      
      DG.logUser("caseCreated: %@ [%@]", iCollectionName, iValues.join(', '));
  
      if (attrCount > iValues.length)
        attrCount = iValues.length;
        
      var isParentCollection = (iCollectionName === parentCollectionName);
      
      // If we've switched games, close the open case from the previous game
      if (currentGameName !== this_._openGameName)
        this_.closeParentCases();
  
      // First child case for a given parent must "open" the parent case
      if (!isParentCollection && !SC.none( parentCollection) && 
          SC.none( this_._openParentCases[ iCollectionName])) {
        var parentCase = parentCollection.createCase();
        this_.openParentCase( currentGameName, iCollectionName, parentCollectionName, parentCase);
      }
  
      var newCase = null;
      if (iCollectionName !== this_._openParentCollectionName) {
        var caseInitializerList = {};
        // Link child cases to their parent case if there's an open parent case
        if (!isParentCollection && !SC.none( this_._openParentCases[ iCollectionName])) {
          caseInitializerList.parent = this_._openParentCases[ iCollectionName].get('id');
        }
        newCase = collectionClient.createCase( caseInitializerList);
      }
      else {
        // Parent case was created earlier when it was "opened"
        newCase = this_.getParentCaseFor( iValues);
        // If we don't have an open parent case, then skip it.
        if( newCase)
          newCase.beginCaseValueChanges();
      }
  
      // If we don't have an open parent case, then skip it.
      // Game must be sending us extraneous parent case requests.
      if( newCase) {
        for (var i = 0; i < attrCount; ++i) {
          var tValue = DG.DataUtilities.canonicalizeInputValue( iValues[i]);
          newCase.setValue( attrIDs[i], tValue);
        }
      }
  
      // Close the open parent case once its values have been created/set.
      if ((iCollectionName === this_._openParentCollectionName)) {
        this_.closeParentCase( iValues);
        // If we don't have an open parent case, then skip it.
        if( newCase)
          newCase.endCaseValueChanges();
      }
    });
  },
  
  addCaseToCollectionWithValues: function(iCollectionName, iValues)
  {
    var this_ = this,
        tTime;
    
    function processQueue() {
//      console.log('Queue length: ' + this_.queuedCases.length + ' at ',
//              (new Date()).valueOf() - this_.startQueueTime);
      SC.run( function() {
        this_.addCasesFromQueue();
        this_.queuedCases.length = 0;
      });
    }
    
    if( !SC.none( this.addCasesTimer))
      this.addCasesTimer.invalidate();
    tTime = (new Date()).valueOf();
//    console.log('New case at ' + (tTime - this.startQueueTime));
    if( this.queuedCases.length === 0)
      this.startQueueTime = tTime;

    this.queuedCases.push( { collectionName: iCollectionName, values: iValues });
    this.addCasesTimer = SC.Timer.schedule( { 
                            action: processQueue,
                            interval: 20
                          });
  },
  
  /**
   *  Returns an object that should be stored with the document when the document is saved.
   *  @returns  {Object}  An object whose properties should be stored with the document.
   */
  createComponentStorage: function() {
    var currentGame = DG.gameSelectionController.get('currentGame'),
        storage = { };
    
    // Save information about the current game
    if( currentGame) {
      storage.currentGameName = currentGame.get('name');
      storage.currentGameUrl = currentGame.get('url');
      
      var dataContext = currentGame.get('context');
      if( dataContext)
        this.addLink( storage, 'context', dataContext);

      // Save any user-created formulas from DG.FormulaObjects.
      // Currently, only formulas from the current game are saved.
      // Eventually, the formulas should be stored with the DG.GameContext
      // and they should be saved for any game in which formulas are defined.
      storage.currentGameFormulas = SC.clone( currentGame.get('formulas'));
    }
    
    return storage;
  },
  
  /**
   *  Restores the properties of the DG.GameController from the specified Object.
   *  @param  {Object}  iComponentStorage -- The object whose properties should be restored.
   *  @param  {String}  iDocumentID -- The ID of the document being restored.
   */
  restoreComponentStorage: function(iComponentStorage, iDocumentID) {
    var layout = this.getPath('model.layout'),
        requestedDimensions = layout ? { width: layout.width, height: layout.height } : null,
        gameName = iComponentStorage.currentGameName,
        gameSpec = DG.gameSelectionController.findGameByName( gameName);

    if( !gameSpec) {
      // If we didn't find a match in the menu, add an entry for the restored game and URL
      // in the game selection menu. This allows games loaded via URL parameter to be reloaded
      // from saved documents as well as support for legacy games that may have been removed
      // from the active/current game menu for some reason but for which documents should
      // still be able to load which reference that game.
      gameSpec = DG.GameSpec.create({ name: gameName,
                                      url: iComponentStorage.currentGameUrl });
      DG.gameSelectionController.prependToGamesMenu([ gameSpec ]);
    }
    
    // If the gameSpec was just created above, or if it isn't associated with
    // a DG.GameContext (e.g. the Importer, which uses only a DG.DataContext),
    // then we get here with a gameSpec without an associated context. In that
    // case, we try to hook up the appropriate restored context.
    if( gameSpec && !gameSpec.get('context')) {
      // Try to restore the data context for the current game.
      // First, see if it was written out with the document.
      // (Writing out the link began in build 0175.)
      var contextID = this.getLinkID( iComponentStorage, 'context'),
          dataContext = contextID && DG.DataContext.retrieveContextFromMap( iDocumentID, contextID),
          firstContext = null;
      if( !dataContext) {
        // If it wasn't written out with the document, look for one
        // associated with a game of the correct name, or for the
        // first context as a last resort.
        DG.DataContext.forEachContextInMap(
                          iDocumentID,
                          function( iContextID, iContext) {
                            // Look for a context with matching game name.
                            // Note that at the moment, 'gameName' is a computed
                            // property which relies on the 'gameSpec' property
                            // having been set, which is unlikely to have occurred
                            // given that the gameSpec doesn't know about the context.
                            // This could change down the road, however, so we leave it.
                            if( !dataContext && iContext) {
                              var contextGameName = iContext.get('gameName');
                              if( contextGameName === gameName) {
                                dataContext = iContext;
                              }
                              // First context may be a last resort
                              else if( !firstContext) {
                                firstContext = iContext;
                              }
                            }
                          });
        // No context with matching name -- default to first context.
        if( !dataContext && firstContext)
          dataContext = firstContext;
      }
      if( dataContext) {
        gameSpec.set('context', dataContext);
        if( dataContext.get('type') === 'DG.GameContext')
          dataContext.set('gameSpec', gameSpec);
      }
    }

    // If there are user-created formulas to restore, set them in the DG.GameSpec.
    if( gameSpec && iComponentStorage.currentGameFormulas)
      gameSpec.set('formulas', iComponentStorage.currentGameFormulas);

    // Use invokeLater() to delay the actual changing of the game until after all the
    // components have been read in successfully. Otherwise, we can end up with multiple
    // instances of the game component and other anomalies.
    DG.gameSelectionController.invokeLater( function() {
                                  DG.gameSelectionController.
                                    setCurrentGameByName( gameName,
                                                          requestedDimensions);
                                  this.set('gameIsReady', true);
                               }.bind(this));
  },
  
  /**
    Logs a user action with the specified action name and array of values.
    If no values are passed, the logged message is simply the iActionString.
    If values are specified, they are appended to the log message:
      logUserAction("doSomething") --> "doSomething"
      logUserAction("doSomething", ["John Doe", 37]) --> "doSomething: [John Doe, 37]"
    @param    {String}    iActionString -- The name of the action/command being logged
    @param    {Array}     iValues -- Additional values to be included in the log message
   */
  logUserAction: function( iActionString, iValues) {
    DG.logUser( iActionString + (iValues && iValues.length ? ": [" + iValues.join( ", ") + "]" : ""));
  }
}) ;

DG.currGameController = DG.GameController.create({});

/**
  Calls the doCommand() method of the current game controller (DG.currGameController).
  This is a convenience function for use by games, particularly JavaScript games.
  */
DG.doCommand = function( iCmd) {
  var result;
  SC.run( function() { result = DG.currGameController.dispatchCommand( iCmd); });
  return result;
};

