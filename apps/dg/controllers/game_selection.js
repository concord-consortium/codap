// ==========================================================================
//                      DG.gameSelectionController
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

sc_require('models/game_spec');

/** @class

  Manages the list of available games and provides information about the current game.

  @extends SC.ObjectController
*/
DG.gameSelectionController = SC.ObjectController.create((function() // closure
/** @scope DG.gameSelectionController.prototype */ {

  var kDefaultGameIndex = 0;  // 0-based index into 'games' array below

  return {  // return from closure
  
  /**
   * Array of available games.
   * @property {Array of DG.[Base]GameSpec}
   */
  baseGames: [
    // This first, 'null' gamespec is part of our transition to getting rid of Game menu
    DG.GameSpec.create({
      name: "Please choose an activity",
      dimensions: { width: 300, height: 20 },
      url: ''
    }),

    DG.GameSpec.create({
      name: "Cart Weight",
      dimensions: { width: 290, height: 350 },
      url: 'DataGames/JavaScriptGames/CartWeight/index.html'
    }),

    DG.GameSpec.create({
      name: "Proximity",
      dimensions: { width: 463, height: 344 },
      url: 'DataGames/JavaScriptGames/Proximity/index.html'
    }),

    DG.GameSpec.create({
      name: "Shuffleboard",
      dimensions: { width: 520, height: 348 },
      url: 'DataGames/JavaScriptGames/Shuffleboard/index.html'
    }),

    DG.GameSpec.create({
      name: "Markov",
      dimensions: { width: 550, height: 315 },
      url: 'DataGames/JavaScriptGames/Markov/index.html'
    }),

    DG.GameSpec.create({
      name: "Lunar Lander",
      dimensions: { width: 357, height: 541 },
      url: 'DataGames/JavaScriptGames/LunarLander/index.html'
    }),

    DG.GameSpec.create({
      name: "Floyd's of Fargo",
      dimensions: { width: 590, height: 431 }, // for better initial loading; matches FlydsFargo.?
      url: 'DataGames/JavaScriptGames/FloydsFargo/index.html'
    })
  ],  // end of baseGames

  srriGames: [

    DG.GameSpec.create({
      name: 'Chainsaw',
      dimensions: { width: 745, height: 410 }, // for better initial loading; matches Chainsaw.mxml/.html
      url: 'DataGames/FlashGames/ChainSaw.html'
    }),

    DG.GameSpec.create({
      name: 'Ship Odyssey',
      dimensions: { width: 518, height: 410 }, // for better initial loading; matches ShipOdyssey.mxml/.html
      url: 'DataGames/FlashGames/ShipOdyssey.html'
    }),

    DG.GameSpec.create({
      name: 'Inference',
      dimensions: { width: 575, height: 325 },  // for better initial loading; matches InferenceGames.mxml/.html
      url: 'DataGames/FlashGames/InferenceGames.html'
    })

  ],  // end of SRRI games

  /**
   * Array of games available only when hosted URL contains "localhost" or "dg-dev"
   * @property {Array of DG.[Base]GameSpec}
   */
  devGames: [

    DG.BaseGameSpec.create({ name: null, isSeparator: true }),
    DG.BaseGameSpec.create({ name: "*** DEV BUILD ONLY ***", isEnabled: false }),

    DG.BaseGameSpec.create({
      name: 'Find the Spy',
      collectionName: 'Readings',
      eventsAttributeName: 'reading',
      parentCollectionName: 'Games',
      xAttrName: "place",
      yAttrName: "signal",
      dimensions: {
        width: 900,
        height: 300
      },
      url: 'DataGames/FlashGames/FindTheSpy1D.html'
    }),

    DG.BaseGameSpec.create({
      name: 'Cruising',
      collectionName: 'DriveRecord',
      eventsAttributeName: 'drive_record',
      parentCollectionName: 'Try',
      xAttrName: "time",
      yAttrName: "position",
      dimensions: {
        width: 500,
        height: 412
      },
      url: 'DataGames/FlashGames/Cruising.html'
    }),

    DG.BaseGameSpec.create({
      name: 'Alien Power Plant',
      collectionName: 'PowerPlant',
      eventsAttributeName: 'power_plant',
      parentCollectionName: 'Games',
      xAttrName: "time",
      yAttrName: "OutRate",
      dimensions: {
        width: 680,
        height: 400
      },
      url: 'DataGames/FlashGames/AlienPowerPlant.html'
    }),

    DG.BaseGameSpec.create({
      name: 'Weasels',
      collectionName: 'Weasels',
      eventsAttributeName: 'weasel',
      parentCollectionName: 'Games',
      xAttrName: "length",
      yAttrName: "mass",
      dimensions: {
        width: 372,
        height: 250
      },
      url: 'DataGames/FlashGames/Weasels.html'
    }),

    DG.BaseGameSpec.create({ name: null, isSeparator: true }),

    DG.GameSpec.create({
      name: "Wheel",
      dimensions: { width: 600, height: 374 },
      url: 'DataGames/FlashGames/Wheel.html'
    }),
    
    DG.GameSpec.create({
      name: "Lunar Lander [eeps]",
      dimensions: { width: 425, height: 550 },
      // Anything in DataGames/Games/External/ is proxied to
      // http://www.eeps.com/dataGames/DGGames/
      url: 'DataGames/Games/External/LunarLander/index.html'
    }),

    DG.GameSpec.create({
      name: "Floyd's of Fargo [eeps]",
      dimensions: { width: 580, height: 520 },
      // External URL for testing and development of games.
      // Anything in DataGames/Games/External/ is proxied to
      // http://www.eeps.com/dataGames/DGGames/
      url: 'DataGames/Games/External/FloydsFargo/index.html'
    }),
    
    DG.GameSpec.create({
      name: "RoboBall",
      dimensions: { width: 700, height: 500 },
      // Anything in DataGames/Games/External/ is proxied to
      // http://www.eeps.com/dataGames/DGGames/
      url: 'DataGames/FlashGames/RoboBall.html'
    }),
 
    DG.GameSpec.create({
      name: "Prox (test short)",
      dimensions: { width: 800, height: 380 },
      url: 'DataGames/FlashGames/Prox.html'
    }),

    DG.GameSpec.create({
      name: "FruitMagnate",
      dimensions: { width: 424, height: 400 },
      url: 'DataGames/FlashGames/FruitMagnate.html'
    }),

    DG.GameSpec.create({
      name: "Sample",
      dimensions: { width: 600, height: 300 },
      url: 'DataGames/FlashGames/Sample.html'
    }),

   

//     DG.GameSpec.create({
//       name: "Rallye",
//       dimensions: { width: 540, height: 475 },
//       url: 'DataGames/JavaScriptGames/Rallye/index.html'
//     }),
// 
//     DG.GameSpec.create({
//       name: "Rallye [eeps]",
//       dimensions: { width: 540, height: 475 },
//       url: 'DataGames/Games/External/Rallye/index.html'
//     }),

//     DG.BaseGameSpec.create({
//       name: "Treasure Hunt [eeps]",
//       collectionName: 'Events',
//       eventsAttributeName: 'game',
//       parentCollectionName: 'Games',
//       dimensions: {
//         width: 540,
//         height: 475
//       },
//       // External URL for testing and development of games.
//       // Anything in DataGames/Games/External/ is proxied to
//       // http://www.eeps.com/dataGames/DGGames/
//       url: 'DataGames/Games/External/TreasureHunt/index.html'
//     }),

    DG.GameSpec.create({
      name: 'Guess My Number',
      dimensions: { width: 400, height: 250 },
      url: 'DataGames/JavaScriptGames/GuessMyNumber.html'
    }),


    DG.GameSpec.create({
      name: 'Importer',
      dimensions: { width: 750, height: 450 },
      url: 'DataGames/JavaScriptGames/Importer/Importer.html',
      contextType: 'DG.DataContext'
    }),

    DG.GameSpec.create({
      name: 'Sampler',
      dimensions: { width: 400, height: 300 },
      url: 'DataGames/JavaScriptGames/Sampler/Sampler.html',
      contextType: 'DG.DataContext'
    }),

    DG.GameSpec.create({
      name: 'Analytics',
      dimensions: { width: 450, height: 400 },
      url: 'DataGames/JavaScriptGames/Analytics/Analytics.html'
    }),

    DG.GameSpec.create({
      name: 'Sketchpad',
      dimensions: { width: 550, height: 500 },
      url: 'DataGames/Games/DN/experiments/websketchpad/target/websketchpad/GSP_DG.html'
      /*url: 'DataGames/JavaScriptGames/GSP_DG/GSP_DG.html'*/
    }),

    DG.GameSpec.create({
        name: 'Performance Harness',
        dimensions: { width: 400, height: 250 },
        url: 'DataGames/JavaScriptGames/PerformanceHarness.html'
    }),

    //---- Games in DataGames/Games/WaffleSRRI/ are proxied to
    // http://waffle.srri.umass.edu/datagames
    // a.k.a.  ssh://waffle.srri.umass.edu/Groups/gamelab/datagames-public
    // see www-root/Games/.htaccess

    DG.BaseGameSpec.create({ name: "*** on waffle.srri.umass.edu ***", isEnabled: false }),

    DG.GameSpec.create({
      name: 'Chainsaw [waffle.srri flash]',
      dimensions: { width: 745, height: 410 }, // for better initial loading; matches Chainsaw.mxml/.html
      url: 'DataGames/Games/WaffleSRRI/flash/Chainsaw.html'
    }),

    DG.GameSpec.create({
      name: 'Ship Odyssey [waffle.srri flash]',
      dimensions: { width: 518, height: 410 }, // for better initial loading; matches ShipOdyssey.mxml/.html
      url: 'DataGames/Games/WaffleSRRI/flash/ShipOdyssey.html'
    }),

    DG.GameSpec.create({
      name: 'Crop Monster [waffle.srri flash]',
      dimensions: { width: 800, height: 600 },  // for better initial loading; matches CropMonster.mxml/.html
      url: 'DataGames/Games/WaffleSRRI/flash/CropMonster.html'
    }),

    DG.GameSpec.create({
      name: 'Rock Roll [waffle.srri flash]',
      dimensions: { width: 800, height: 400 },  // for better initial loading; matches RockRoll.mxml/.html
      url: 'DataGames/Games/WaffleSRRI/flash/RockRoll.html'
    }),

    DG.BaseGameSpec.create({
      name: 'Rat Packing [waffle.srri flash]',
      dimensions: {
        width: 600,
        height: 454
      },
      url: 'DataGames/Games/WaffleSRRI/flash/RatPacking.html'
    }),

    DG.BaseGameSpec.create({
      name: 'Chainsaw [waffle.srri javascript]',
      collectionName: 'CutPieces',
      eventsAttributeName: 'Cut_Record',
      parentCollectionName: 'Games',
      xAttrName: "PieceNumber",
      yAttrName: "Length",
      dimensions: {
        width: 630,
        height: 575
      },
      url: 'DataGames/Games/WaffleSRRI/javascript/ChainSaw/index.html'
    }),

    DG.GameSpec.create({
      name: 'Inference Games [waffle.srri flash]',
      dimensions: { width: 575, height: 325 },  // for better initial loading; matches InferenceGames.mxml/.html
      url: 'DataGames/Games/WaffleSRRI/flash/InferenceGames.html'
    })

  ], // end of devGames array
  
  /**
   * The currently selected game.
   *  Defaults to the game at index 'kDefaultGameIndex' in the 'games' array.
   * @property {DG.GameSpec}
   */
  currentGame: null,
  
  /**
   * [Computed] The name of the currently selected game.
   * @property {String}
   */
  currentName: function() {
    return this.getPath('currentGame.name');
  }.property('currentGame').cacheable(),
  
  /**
   * Dimensions requested by the client setting the current game,
   * e.g. after restoring a document with user-set dimensions.
   * @property {Object}
   */
  requestedDimensions: null,
  
  /**
   * [Computed] The dimensions of the currently selected game {width,height}.
   * @property {Object}
   */
  currentDimensions: function() {
    return this.getPath('currentGame.dimensions');
  }.property('currentGame').cacheable(),
  
  /**
   * [Computed] The URL of the currently selected game.
   * @property {String}
   */
  currentUrl: function() {
    return this.getPath('currentGame.url');
  }.property('currentGame').cacheable(),
  
  /**
   *  The DataContext for the currently selected game.
   *  @property {DG.DataContext} or a derived class
   */
  currentContext: function() {
    // We don't call DG.GameContext.getContextForGame() because we don't want 
    // to force creation here. Otherwise, setting the context to null (e.g. when
    // closing the document) can result in immediate creation of new contexts.
    return this.getPath('currentGame.context');
  }.property('currentGame','currentGame.context'),
  
  /**
   * [Computed] The collection associated with the currently selected game.
   * @property {DG.Collection}
   */
  //currentCollection: function() {
  //  var collectionName = this.getPath('currentGame.collectionName');
  //  return DG.collectionWithName(collectionName);
  //}.property('currentGame').cacheable(),
  
  /**
   * Game selection menu.
   * @property {SC.MenuPane}
   */
  menuPane: null,
  
  /**
   * Initialization function.
   */
  init: function() {
    sc_super();
    this.buildGamesMenu( DG.IS_SRRI_BUILD, DG.IS_DEV_BUILD);
    this.menuPane = SC.MenuPane.create({
              items: this.games,
              itemTitleKey: 'name',
              layout: { width: 200/*, height: 200*/ }
            });
    
    // Specify the default game
    this.setDefaultGame();
  },
  
  /**
    Appends the specified game specifications to the beginning of the games menu.
    This allows documents which reference games that are not in the current games menu
    to add their game(s) to the top of the menu, for instance.
    @param  {Array of DG.GameSpecs}   iGameSpec -- The DG.GameSpecs to prepend
   */
  prependToGamesMenu: function( iGameSpecs) {
    var newGames = iGameSpecs.concat(
                      [ DG.BaseGameSpec.create({ name: null, isSeparator: true }) ],
                      this.games);
    this.games = newGames;
    this.menuPane.set('items', newGames);
  },
  
  buildGamesMenu: function( iShowSrriGames, iShowDevGames) {
  
    this.games = [];

    // Add any entries specified as URL parameters
    if( !SC.empty( DG.urlParamGames)) {
      var urlGames = SC.json.decode( DG.urlParamGames);
      if( SC.none( urlGames.length))
        urlGames = [ urlGames ];
      urlGames.forEach( function( iSpec) {
                          // sanity-check the spec
                          if( !SC.empty( iSpec.name) && !SC.empty( iSpec.url)) {
                            var newGame = DG.GameSpec.create( iSpec);
                            if( newGame) this.games.push( newGame);
                          }
                        }.bind( this));
      if( this.games.length > 0)
        this.games.push( DG.BaseGameSpec.create({ name: null, isSeparator: true }));
    }
  
    this.games = this.games.concat( this.get('baseGames'));
    
    if( iShowSrriGames || iShowDevGames )
      this.games = this.games.concat( this.get('srriGames'));
    
    if( iShowDevGames)
      this.games = this.games.concat( this.get('devGames'));
  },
  
  loginDidChange: function() {
    var isDeveloper = DG.authorizationController.get('isUserDeveloper');
    this.buildGamesMenu( DG.IS_SRRI_BUILD || isDeveloper, DG.IS_DEV_BUILD || isDeveloper);
    this.menuPane.set('items', this.games);
  }.observes('DG.authorizationController.isUserDeveloper'),
  
  /**
    Loads the specified game as the default game for a new document.
    Attempts to determine a default game by the following means:
    (1) The iDefaultGameName argument
    (2) DG.defaultGameName -- generally set by URL parameter
    (3) kDefaultGameIndex -- Hard-coded index into Games menu
    @param    {String}    iDefaultGameName -- [Optional] If specified, load the
                                              specified game as the default.
   */
  setDefaultGame: function( iDefaultGameName) {
    var defaultGame = null;
    // (1) The iDefaultGameName argument
    if( !SC.empty( iDefaultGameName))
      defaultGame = this.findGameByName( iDefaultGameName);
    // (2) DG.defaultGameName -- generally set by URL parameter
    if( !defaultGame && !SC.empty( DG.defaultGameName))
      defaultGame = this.findGameByName( DG.defaultGameName);
    // (3) kDefaultGameIndex -- Hard-coded index into Games menu
    if( !defaultGame) {
      defaultGame = this.games[kDefaultGameIndex];
      if( defaultGame) {
        // Remember the default game name so we can use it later,
        // even if game indices change.
        DG.defaultGameName = defaultGame.get('name');
      }
    }
    if( defaultGame) {
      this.beginPropertyChanges();
      this.set('requestedDimensions', null);
      this.set('currentGame', defaultGame);
      this.endPropertyChanges();
    }
  },
  
  /**
    Observer method called whenever the 'currentGame' property is changed.
   */
  currentGameDidChange: function() {
    // Clear the 'gameIsReady' flag whenever a new game is selected.
    if( DG.currGameController)
      DG.currGameController.set('gameIsReady', false);
  }.observes('currentGame'),
   
  /**
   * Action method for game selection menu.
   *  Called when the user selects a game from the menu.
   */
  gameSelected: function( target, key, value) {
    var selectedGame = target.get(key),
        selectedGameName = selectedGame && selectedGame.get('name');
    if( selectedGame && !SC.empty( selectedGameName)) {
      this.set('requestedDimensions', null);
      // If the user closes the game component, the 'selectedItem'
      // is set to null but the 'currentGame' is not automatically
      // reset so as not to immediately impact existing graphs, etc.
      // If the user reselects the same game, however, the call to
      // set() below detects that the game hasn't changed and so
      // it never sends out the notifications that clients rely
      // on to bring up the game component, etc. Therefore, we
      // test to see if this is the case, and send out the
      // notification ourselves if we detect that the notification
      // won't go out otherwise.
      if( this.get('currentGame') === selectedGame) {
        this.notifyPropertyChange('currentGame');
        return;
      }
      
      // Clear the menu item so it can be selected again, if necessary.
      this.setPath('menuPane.selectedItem', null);
      
      DG.appController.closeDocumentWithConfirmation( selectedGameName);
    }
  }.observes('.menuPane.selectedItem'),
  
  /**
    Sets the current game to the DG.[Base]GameSpec that matches the specified game name.
    @param  {String}  iGameName   The name of the game to set as the current game
   */
  setCurrentGameByName: function( iGameName, iRequestedDimensions) {
    var game = this.findGameByName( iGameName);
    if( game) {
      this.beginPropertyChanges();
      this.set('requestedDimensions', iRequestedDimensions);
      this.set('currentGame', game);
      // Don't let menu be out-of-sync with current game.
      this.menuPane.set('selectedItem', null);
      this.endPropertyChanges();
    }
  },

  /**
    Saves the current state of the current game into the 'savedGameState'
    property of the current game's context. Uses the 'doCommandFunc' property
    passed by the game as part of the 'initGame' command.
   */
  saveCurrentGameState: function() {
    var gameSpec = this.get('currentGame'),
        gameContext = gameSpec && gameSpec.get('context'),
        doAppCommandFunc = gameSpec && gameSpec.get('doCommandFunc'),
        gameElement = this.findCurrentGameElement( gameSpec && gameSpec.get('gameEmbedID')),
        saveCommand = { operation: "saveState" },
        result;
    // We can only save game state if we have a game callback function and a context.
    if( gameContext) {
      if( doAppCommandFunc ) {
        // for JavaScript games we can call directly with Objects as arguments
        result = doAppCommandFunc( saveCommand);
      } else if (gameElement && gameElement.doCommandFunc ) {
        // for flash games we use the embedded swf object, then call its 'doCommandFunc'
        result = gameElement.doCommandFunc( SC.json.encode( saveCommand ));
        result = this.safeJsonDecode( result, "Invalid JSON found in saveCurrentGameState()" );
      }
      // Stash the game state in the context's 'savedGameState' property.
      if( result && result.success)
        gameContext.set('savedGameState', result.state);
    }
  },

  /**
   * Find the current game element in DG, by searching the DOM
   *    Useful for callbacks to embedded flash .swf objects,
   *    which have functions made available by AS3's ExternalInterface.addCallback()
   * @param embeddedGameID the ID parameter of the game, e.g. set by ChainSaw.html for ChainSaw.swf
   * @return {} null or an element of an iFrame that has the given html ID.
   */
  findCurrentGameElement: function( embeddedGameID ) {
    // games are dynamically embedded objects in iFrames
    var iFrames = document.getElementsByTagName("iframe"),
        gameElement = null;
    if( embeddedGameID ) {
      var i,j; // find first iFrame with embedded element ID==embeddedGameID (expect 0 or 1 match)
      for( i=0,j=iFrames.length; i<j && !gameElement; ++i ) {
        gameElement = iFrames[i].contentWindow.document.getElementById( embeddedGameID);
      }
    }
    return gameElement;
  },

    /**
     * Decode an object that may be a JSON string, or maybe not.
     * Useful to
     * @param mayBeJSON
     * @returns {*}
     */
  safeJsonDecode: function( mayBeJSON, warningString ) {
    var result;
    if( SC.typeOf( mayBeJSON ) === SC.T_STRING) {
      try {  // Catch any exceptions thrown by the JSON parser
        result = SC.json.decode( mayBeJSON );
      }
      catch(e) {
        DG.logWarn( warningString + " [DG.GameSelection.safeJsonDecode]" );
        DG.log( "JSON: "+result );
        result = undefined;
      }
    }
    return result;
  },

  /**
    Synchronize any local state that is affected by the closing of the game component,
    e.g. clearing the games menu's notion of the currently selected game.
   */
  gameViewWillClose: function() {
    this.menuPane.set('selectedItem', null);
  },

  /**
    Resets the state, e.g. when the document is closed.
    Clears the DG.DataContext/DG.GameContext references from the DG.GameSpecs.
   */
  reset: function() {
    this.games.forEach( function( iGameSpec) {
                          if( iGameSpec) {
                            iGameSpec.set('context', null);
                            iGameSpec.set('formulas', null);
                          }
                        });
    this.menuPane.set('selectedItem', null);
  },
  
  /**
    Returns the DG.[Base]GameSpec for the specified game name.
    Returns null if no matching game is found.
    @returns  {DG.[Base]GameSpec}
   */
  findGameByName: function( iName) {
    var gameCount = this.games.length;
    for( var i = 0; i < gameCount; ++i) {
      if( this.games[i].name === iName)
        return this.games[i];
    }
    return null;
  },

  /**
   *
   * @param iName {String}
   * @param iAttrs { Array of attribute specs }
   */
  addCollectionSpecToGameSpecIfNecessary: function( iName, iAttrs) {
    var tCurrentGame = this.get('currentGame'),
        tCollections = tCurrentGame && tCurrentGame.get('collections');
    if( !SC.none( tCollections)) {
      tCollections.push( {
        name: iName,
        attrs: iAttrs
      });
    }
  },
  
  /**
    [Old API] Fill out the DG.BaseGameSpec fields from the arguments passed to the
    'newCollectionWithAttributes' command. In the old API, this code must infer some
    things that can be explicitly stated in the New Game API.
   */
  processNewCollectionArgs: function( iCmdArgs) {
    // Make sure we have a current game
    var currentGame = this.get('currentGame');
    if( !currentGame) return;
    
    // Extract the cmd args we'll be using
    var collectionName = iCmdArgs.name,
        childrenName = iCmdArgs.children,
        defaultPlotX = iCmdArgs.defaultPlotX,
        defaultPlotY = iCmdArgs.defaultPlotY;

    // Add the collection name to the list of collections.
    // Collections are assumed to be added in order from parents to children
    if( !SC.empty( collectionName)) {
      if( currentGame.collections.indexOf( collectionName) < 0)
        currentGame.collections.push( collectionName);

      switch( currentGame.collections.length) {
      
      case 1:
        // Extract the parent collection name if we don't already know it
        if( SC.empty( currentGame.parentCollectionName))
          currentGame.parentCollectionName = collectionName;
        break;
      
      case 2:
        // Extract the events collection name if we don't already know it
        if( SC.empty( currentGame.collectionName))
          currentGame.collectionName = collectionName;
        break;
      
      default:
      }
    }
    
    // Extract the name of the events attribute (which links to the child cases)
    if( SC.empty( currentGame.eventsAttributeName) && !SC.empty( childrenName))
      currentGame.eventsAttributeName = childrenName;

    // Extract the default attributes to plot on axes
    if( SC.empty( currentGame.xAttrName) && !SC.empty( defaultPlotX))
      currentGame.xAttrName = defaultPlotX;
    if( SC.empty( currentGame.yAttrName) && !SC.empty( defaultPlotY))
      currentGame.yAttrName = defaultPlotY;
  }

  }; // end return from closure
  
}())) ; // end closure
