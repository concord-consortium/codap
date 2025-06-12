// ==========================================================================
//                          DG.GameContext
//
//  The GameContext is a derived class of DG.DataContext specialized to
//  support the game components.
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

sc_require('controllers/data_context');

/** @class DG.GameContext

  Coordinating controller which manages a set of collections that form a
  hierarchical data model.

  @extends DG.DataContext
*/
DG.GameContext = DG.DataContext.extend(
/** @scope DG.GameContext.prototype */ {

  /**
   *  The type of DataContext, for use when archiving/restoring.
   *  @property {String}
   */
  type: 'DG.GameContext',
  
  /**
   * The name of the currently selected game.
   * @property {String}
   */
  gameName: null,
  
  /**
   * The dimensions of the currently selected game {width,height}.
   * @property {{width: number, height}}
   */
  gameDimensions: null,
  
  /**
   * The URL of the currently selected game.
   * @property {String}
   */
  gameUrl: null,

  /**
   * The version string for the game.
   * @property {String}
   */
  gameVersion: null,

  /**
    Called after a collection has been created to make sure it's hooked up properly.
    @param    {DG.CollectionClient}   iCollectionClient -- The collection just created
   */
  didCreateCollection: function( iCollectionClient) {
    // The prior logic for this method relied upon properties in the deprecated
    // gameSpec that were not widely employed to determine proper parent/child
    // relationships. Presently this is left in as a no-op, pending a new
    // mechanism.
  },

  /**
    Returns the default DG.CollectionClient and default attributes to plot for
    newly created graphs, as indicated by this context's game.
   */
  collectionDefaults: function() {
    var defaults = { collectionClient: null,
                     plotXAttr: null, plotXAttrIsNumeric: true,
                     plotYAttr: null, plotYAttrIsNumeric: true };

    // If no default specified (or we can't find it), default to the child collection.
    if (SC.none( defaults.collectionClient)) {
      defaults.collectionClient = this.get('childCollection');
      defaults.parentCollectionClient = this.get('parentCollection');
    }

    /**
      Utility function for use in specifying default plot attributes.
      @param  {DG.CollectionClient} collectionClient
      @param  {String}    iAttrPrefix -- {'x','y','legend'}
      @param  {String}    iAttrInfix -- {'X','Y','Legend'}
     */
    function configureDefaultPlotAttr(collectionClient, iAttrPrefix, iAttrInfix) {
      // Retrieve the attribute name
      var attrName = collectionClient && collectionClient.getPath('defaults.' +
        iAttrPrefix + 'Attr'),
        attr, isNumeric;
      if( defaults.collectionClient && !SC.empty( attrName)) {
        // Set default attribute
        attr = defaults.collectionClient.getAttributeByName(attrName);
        defaults['plot' + iAttrInfix + 'Attr'] = attr;
        // Indicate the type of the default attribute
        isNumeric = collectionClient && collectionClient.getPath('defaults.' +
              iAttrPrefix + 'AttrIsNumeric');
        if(SC.none( isNumeric)) {
          isNumeric = (attr.get('type') === 'numeric');
        }
        if( !SC.none( isNumeric))
          defaults['plot' + iAttrInfix + 'AttrIsNumeric'] = isNumeric;
      }
    }
  
    // Find the game-specified default attributes and configure them appropriately.
    configureDefaultPlotAttr(defaults.collectionClient, 'x', 'X');
    configureDefaultPlotAttr(defaults.collectionClient, 'y', 'Y');
    configureDefaultPlotAttr(defaults.collectionClient, 'legend', 'Legend');

    return defaults;
  },
  
  /**
    Returns the 'labels' object from the specification of the collection with the
    specified name.
    @param    {DG.CollectionClient} iCollection -- The collection whose labels are returned
    @returns  {Object}              The 'labels' portion of the collection specification
   */
  getLabelsForCollection: function( iCollection) {
    return iCollection.get('labels');
  },
  
  /**
    Returns the string that best represents the noun form of the specified number of cases,
    e.g. "case"|"cases", "person"|"people", "deer"|"deer", "goose"|"geese", etc.
    @param    {DG.CollectionClient} iCollection -- The collection whose labels are returned
    @param    {Number}              iCount -- The number of cases to represent
    @returns  {String}              The string to represent the specified number of cases
   */
  getCaseNameForCount: function( iCollection, iCount) {
    var labels = this.getLabelsForCollection( iCollection);
    if( !labels || !labels.singleCase || !labels.pluralCase)
      return sc_super();
    
    return iCount === 1 ? labels.singleCase : labels.pluralCase;
  },
  
  /**
    Returns the string that represents a coherent set of cases, e.g. a set of Lunar Lander
    events is often called "a flight record", while in other games it might be "a round".
    @param    {DG.CollectionClient} iCollection -- The collection whose labels are returned
    @returns  {String}              The string label to represent a set of cases
   */
  getLabelForSetOfCases: function( iCollection) {
    // Use the 'labels' specification if it's available
    var labels = this.getLabelsForCollection( iCollection),
        setOfCasesWithArticle = labels && labels.setOfCasesWithArticle;
    if( !SC.empty( setOfCasesWithArticle)) return setOfCasesWithArticle;

    // Use the base class implementation as a final fallback
    return sc_super();
  },
  
  /**
   *  Returns the object to be JSONified for storage.
   *  @returns  {Object}
   */
  createStorage: function() {
    var theStorage = sc_super();
    theStorage.gameName = this.get('gameName');
    theStorage.gameUrl = this.get('gameUrl');

    // If a saved game state has been cached, add it to the
    // returned storage object and then clear the cache.
    var gameState = this.get('savedGameState');
    if( gameState) {
      // Copy _links_ from gameState to theStorage
      DG.ObjectMap.forEach( gameState._links_,
                            function( iKey, iLinkID) {
                              // We prepend '_game_' so we can distinguish game links from DG
                              // app links. Currently, all game links are to DG.Cases, since
                              // the game doesn't have access to any other record IDs.
                              DG.ArchiveUtils.addLinkID( theStorage, '_game_' + iKey, 'DG.Case', iLinkID);
                            });
      theStorage.gameState = gameState;
      // Clear it once we've transferred it to storage
      this.set('savedGameState', null);
    }
    
    return theStorage;
  },
  
  /**
   *  Copies the contents of iComponentStorage to the model.
   *  @param {Object} iContextStorage -- Properties restored from document.
   */
  restoreFromStorage: function( iContextStorage) {
    sc_super();
    
    // At the point at which we're restoring the context(s), the game may not
    // have been loaded yet. We need to cache the game state locally until we
    // receive some indication that the game is ready for the restored state.
    if( iContextStorage && iContextStorage.gameState) {
      // Copy _links_ from iContextStorage into gameState
      if( iContextStorage._links_) {
        DG.ObjectMap.forEach( iContextStorage._links_,
                              function( iKey, iLinkSpec) {
                                // Game links are prepended with '_game_'
                                if( iKey.slice( 0, 6) === '_game_') {
                                  // Remove the prefix before storing in gameState
                                  var tKey = iKey.slice( 6);
                                  // Create the gameState's _links_ property if necessary
                                  if( !iContextStorage.gameState._links_)
                                    iContextStorage.gameState._links_ = {};
                                    // Store it in gameState's _links_ property
                                  iContextStorage.gameState._links_[ tKey] = iLinkSpec.id;
                                }
                              });
      }
      
      this.set('restoredGameState', iContextStorage.gameState);
    }
  }
  
});

DG.DataContext.registry['DG.GameContext'] = function( iProperties) {
                                              return DG.GameContext.create( iProperties);
                                            };

/**
 *  Retrieve the DataContext for the specified game, creating it if necessary.
 *  @property {DG.DataContext} or a derived class
 */
DG.GameContext.getContextForGame = function( iGameSpec) {
  if( !iGameSpec) return null;
  var context = iGameSpec.get('context');
  if( !context) {
    var props = { type: iGameSpec.get('contextType') || 'DG.GameContext' };
    if( props.type === 'DG.GameContext') {
      props.gameSpec = iGameSpec;
    }
    var documentID = DG.currDocumentController().getPath('content.id'),
        model = DG.DataContextRecord.createContext({ type: props.type, document: documentID });
    if( model) { props.model = model; }
    context = DG.DataContext.factory( props);
    if( context)
      iGameSpec.set('context', context);
  }
  return context;
};

