// ==========================================================================
//                        DG.DocumentController
//  
//  A controller for a single document.
//  
//  Author:   Kirk Swenson
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

/** @class

  Coordinating controller for the document.

  @extends SC.Object
*/
DG.DocumentController = SC.Object.extend(
/** @scope DG.DocumentController.prototype */ {

  /**
   *  The document managed by this controller.
   *  @property {DG.Document}
   */
  content: null,
  
  /**
   *  The DataContexts which are managed by this controller.
   *  Bound to the document's 'contexts' property.
   *  @property {Array of DG.DataContextRecord}
   */
  contexts: function() {
    return this.getPath('content.contexts');
  }.property(),
  
  /**
   *  The Components which are managed by this controller.
   *  Bound to the document's 'components' property.
   *  @property {Array of DG.Component}
   */
  components: function() {
    return this.getPath('content.components');
  }.property(),
  
  /**
    Map from component ID to the component's controller
   */
  componentControllersMap: null,
  
  /** @private
    Maintain links to singleton component views
   */
  _singletonViews: null,
  
  /**
    Provide client access to the game view.
   */
  gameView: function() {
    return this._singletonViews.gameView || null;
  }.property(),
  
  /**
   *  The ID of the document managed by this controller.
   *  @property {String}
   */
  documentID: function() {
    return this.getPath('content.id');
  }.property('content.id'),
  
  /**
   *  The name of the document managed by this controller.
   *  @property {String}
   */
  documentName: function(iKey, iValue) {
    var content = this.get('content');
    if (iValue !== undefined) {
      content.set('name', iValue);
      DG.store.commitRecords();
    }
    return content.get('name');
  }.property('content.name'),

  /**
   * The permissions level of the document.
   * 0 = Private
   * 1 = Public
   * @property {Number}
   */
  documentPermissions: function() {
    return this.getPath('content._permissions') || 0;
  }.property('content._permissions'),
  
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

  init: function() {
    sc_super();
    
    this._singletonViews = {};
    
    // If we were created with a 'content' property pointing to our document,
    // then use it; otherwise, create a new document.
    this.setDocument( this.get('content') || this.createDocument());
  },
  
  destroy: function() {
    this.closeDocument();
    sc_super();
  },
  
  /**
    Creates a DG.Document with the specified name.
    If no name is passed in, uses the default document name.
    @param    {String}  iName -- [Optional] The name of the newly created document
    @returns  {DG.Document} --   The newly-created document
   */
  createDocument: function( iName) {
    return DG.Document.createDocument({ name: iName || SC.String.loc('DG.Document.defaultDocumentName') });
  },
  
  /**
    Sets the document to be managed by this controller.
    @param    {DG.Document} iDocument -- The document to be associated with this controller
   */
  setDocument: function( iDocument) {
    this.set('content', iDocument);

    DG.DataContext.clearContextMap();
    this.componentControllersMap = {};

    // Create the individual DataContexts
    this.restoreDataContexts();

    // Create the individual component views
    this.restoreComponentControllersAndViews();
    
    this.set('changeCount', 0);
    this.updateSavedChangeCount();
  },
  
  /**
    Whether or not the document contains unsaved changes such that the user
    should be prompted to confirm when closing the document, for instance.
    Note that we only respond true if the user has the ability to save,
    since there's little reason to prompt the user if they can't actually
    save. On review, however, it was pointed out that the ability to cancel
    might be useful event without the ability to save for users who didn't
    mean to logout, close the document, etc., but for now we're going to
    assume that won't happen often enough to warrant consideration.
    @property   {Boolean}
   */
  hasUnsavedChanges: function() {
    // Game controller state affects the document state
    return DG.authorizationController.get('isSaveEnabled') &&
            ((this.get('changeCount') > this.get('savedChangeCount')) ||
            DG.currGameController.get('hasUnsavedChanges'));
  }.property(),
  
  /**
    Synchronize the saved change count with the full change count.
    This method should be called when a save occurs, for instance.
   */
  updateSavedChangeCount: function() {
    // Game controller state affects the document state
    DG.currGameController.updateSavedChangeCount();
    this.set('savedChangeCount', this.get('changeCount'));
  },
  
  /**
    Creates an appropriate DG.DataContext for the specified DG.DataContextRecord object.
    If no model is specified, creates the DG.DataContextRecord as well.
    @param    {DG.DataContextRecord}  iModel -- [Optional] The model for which to create the DG.DataContext.
    @param    {Object}                iProperties -- Constructor arguments for the new DG.DataContext.
    @returns  {DG.DataContext}                  The newly created DG.DataContext.
   */
  createDataContextForModel: function( iModel, iProperties) {
    // Create the model if one isn't passed in
    if( SC.none( iModel))
      iModel = DG.DataContextRecord.createContext({ document: this.get('documentID') });
    if( !iProperties) iProperties = {};
    iProperties.type = iModel.get('type');
    iProperties.model = iModel;
    var context = DG.DataContext.factory( iProperties);
    return context;
  },
  
  /**
    Creates an appropriate DG.DataContext for each DG.DataContextRecord in the document.
    Can be used after restoring a document, for instance.
   */
  restoreDataContexts: function() {
    var contexts = this.get('contexts') || [],
        this_ = this;
    contexts.forEach( function( iContextModel) {
                        var newContext = this_.createDataContextForModel( iContextModel);
                        if( newContext) {
                          newContext.restoreFromStorage( iContextModel.get('contextStorage'));
                        }
                      });
  },
  
  /**
    Creates the specified component and its associated view.
    Clients should specify either iComponent or iComponentType.
    @param    {DG.ComponentModel} iComponent [Optional] -- The restored component.
                                      Should be specified when restoring from document.
    @param    {String}            iComponentType [Optional] -- The type of component to create.
   */
  createComponentAndView: function( iComponent, iComponentType) {
    var docView = DG.mainPage.get('docView'),
        type = (iComponent && iComponent.get('type')) || iComponentType,
        didCreateComponent = true;
    
    switch( type) {
    case 'DG.FlashView':  // For backward compatibility
      if( iComponent)
        iComponent.set('type', 'DG.GameView');
      // fallthrough intentional
      /* jshint -W086 */  // Expected a 'break' statement before 'case'. (W086)
    case 'DG.GameView':
      this.addGame( docView, iComponent);
      break;
    case 'DG.TableView':
      this.addCaseTable( docView, iComponent);
      break;
    case 'DG.GraphView':
      this.addGraph( docView, iComponent);
      break;
    case 'DG.SliderView':
      this.addSlider( docView, iComponent);
      break;
    case 'DG.Calculator':
      this.addCalculator( docView, iComponent);
      break;
    case 'DG.TextView':
      this.addText( docView, iComponent);
      break;
    case 'DG.MapView':
      this.addMap( docView, iComponent);
      break;
    case 'SC.WebView':
      this.addWebView( docView, iComponent);
      break;
    default:
      didCreateComponent = false;
      break;
    }
    
    if( iComponent)
      iComponent.didLoadRecord();
    
    if( didCreateComponent)
      this.incrementProperty('changeCount');
  },
  
  /**
    Creates an appropriate DG.ComponentView for each DG.Component in the document.
    Can be used after restoring a document, for instance.
   */
  restoreComponentControllersAndViews: function() {
    var components = this.get('components');
    if( components) {
      components.forEach( function( iComponent) {
                            this.createComponentAndView( iComponent);
                          }.bind( this));
    }
  },

  /**
    [DEPRECATED] Returns the collection with the specified name associated with the game of the specified name.
    Clients should use the DG.DataContext API instead.
    @param  {String}    iGameName -- The name of the game for which a collection is desired
    @param  {String}    iCollectionName -- The name of the collection to be returned
    @returns  {DG.CollectionClient}   The collection that matches the specified names
   */
  gameCollectionWithName: function( iGameName, iCollectionName) {
    var gameSpec = DG.gameSelectionController.findGameByName( iGameName),
        gameContext = gameSpec && DG.GameContext.getContextForGame( gameSpec),
        collection = gameContext && gameContext.getCollectionByName( iCollectionName);
    return collection;
  },

  /**
    [DEPRECATED] Returns the default DG.CollectionClient and default X and Y attributes to plot for
    development purposes. Should eventually be removed once the game is able to specify appropriate
    defaults, and clients get them from the DG.GameContext directly.
    @returns  {Object}  An Object whose properties specify usable defaults, e.g.
              {Object.collectionClient} {DG.CollectionClient} Default collection to use
              {Object.parentCollectionClient} {DG.CollectionClient} Default parent collection
              {Object.plotXAttr}  {DG.Attribute}  The attribute to plot on the X axis by default
              {Object.plotXAttrIsNumeric}  {Boolean}  Whether the default X axis attribute is numeric
              {Object.plotYAttr}  {DG.Attribute}  The attribute to plot on the Y axis by default
              {Object.plotYAttrIsNumeric}  {Boolean}  Whether the default Y axis attribute is numeric
   */
  collectionDefaults: function() {
    var gameSpec = DG.gameSelectionController.get('currentGame'),
        gameContext = gameSpec && DG.GameContext.getContextForGame( gameSpec),
        defaults = gameContext && gameContext.collectionDefaults();
    return defaults;
  },
  
  /**
    Configures/initializes the specified component, using the specified params as options.
    If iComponent is not specified, it will be created. Whether the component is created
    or passed in, it will then be initialized, using the specified parameters. This allows
    initialization to be handled in common, whether components are newly created by the
    user or restored from document.
    @param  {DG.Component}  iComponent -- [Optional] The component to be initialized/configured.
                                          If not provided, it will be created.
    @param {Object}         iParams --  Initialization/configuration properties
   */
  configureComponent: function( iComponent, iParams) {
    var isRestoring = !SC.none( iComponent),
        documentID = this.get('documentID'),
        tComponent = iComponent,
        tController = iParams.controller;

    // If we're not restoring, then we must create it.
    if( !isRestoring) {
      var tComponentProperties = { type: iParams.componentClass.type };
      // If we create it, hook it up to the document.
      if( !SC.none(documentID))
        tComponentProperties.document = documentID;
      tComponent = DG.Component.createComponent( tComponentProperties);
    }
    
    // If client specified a model, assocate it with the component in our map
    if( iParams.contentProperties && iParams.contentProperties.model)
      tComponent.set('content', iParams.contentProperties.model);
    
    // Hook up the controller to its model (the component)
    tController.set('model', tComponent);
    
    // Add the component controller to our registry of component controllers
    this.componentControllersMap[ tComponent.get('id')] = tController;
    
    // If we're restoring, restore the archived contents
    if( isRestoring) {
      // restore from archive
      tController.didRestoreComponent( documentID);
    }

    return tComponent;
  },
  
  createComponentView: function(iComponent, iParams) {
    var tLayout = iParams && iParams.defaultLayout,
        isRestoring = !SC.none( iComponent),
        tComponent, tComponentView;
    
    DG.globalEditorLock.commitCurrentEdit();
    
    //
    // Configure/create the component and hook it up to the controller
    //
    tComponent = this.configureComponent( iComponent, iParams);
    
    //
    // Configure/create the view and connect it to the controller
    //
    if( tComponent && tComponent.get('layout'))
       tLayout = tComponent.get('layout');
    
    if( isRestoring) {
      tComponentView = DG.ComponentView.restoreComponent( iParams.parentView, tLayout, 
                                                     iParams.componentClass.constructor,
                                                     iParams.contentProperties,
                                                     iParams.title, iParams.isResizable);
    }
    else {
      DG.sounds.playCreate();
      tComponentView = DG.ComponentView.addComponent( iParams.parentView, tLayout,
                                                    iParams.componentClass.constructor,
                                                    iParams.contentProperties,
                                                    iParams.title, iParams.isResizable,
                                                    iParams.useLayout);
      var defaultFirstResponder = tComponentView && tComponentView.getPath('contentView.defaultFirstResponder');
      if( defaultFirstResponder) {
        if( defaultFirstResponder.beginEditing) {
          defaultFirstResponder.beginEditing();
        }
        else if( defaultFirstResponder.becomeFirstResponder) {
          defaultFirstResponder.becomeFirstResponder();
        }
      }
    }
    
    // Tell the controller about the new view, whose layout we will need when archiving.
    if( iParams.controller) {
      iParams.controller.set('view', tComponentView);
      tComponentView.set('controller', iParams.controller);
    }
    
    if( tComponentView)
      this.incrementProperty('changeCount');
    
    return tComponentView;
  },
  
  addGame: function( iParentView, iComponent) {
    var tGameParams = DG.gameSelectionController.get('currentDimensions'),
        tGameName = DG.gameSelectionController.get('currentName');
    
    var tView = this.createComponentView(iComponent, {
                              parentView: iParentView, 
                              controller: DG.currGameController,
                              componentClass: { type: 'DG.GameView', constructor: DG.GameView},
                              contentProperties: {},             
                              defaultLayout: { width: tGameParams.width, height: tGameParams.height },
                              title: tGameName,
                              isResizable: true}  // may change this to false in the future
                            );
    this._singletonViews.gameView = tView;

    // Override default component view behavior.
    // Do nothing until we figure out how to prevent reloading of Flash object.
    tView.bringToFront = function() {};
    tView.bind('title', 'DG.gameSelectionController.currentName');
      
    return tView;
  },
  
  addCaseTable: function( iParentView, iComponent) {
    var tView = this.createComponentView(iComponent, {
                              parentView: iParentView, 
                              controller: DG.CaseTableController.create(),
                              componentClass: { type: 'DG.TableView', constructor: DG.HierTableView},
                              contentProperties: {},             
                              defaultLayout: { width: 500, height: 200 },
                              title: 'DG.DocumentController.caseTableTitle'.loc(),  // "Case Table"
                              isResizable: true}
                            );
    this._singletonViews.caseTableView = tView;
    return tView;
  },
  
  addGraph: function( iParentView, iComponent) {
  
    var tGraphModel = DG.GraphModel.create(),
        tGraphController = DG.GraphController.create();
    // Default to current context. Will be replaced by referenced context in restored documents.
    tGraphController.set('dataContext', DG.gameSelectionController.get('currentContext'));
    var tView = this.createComponentView(iComponent, {
                            parentView: iParentView, 
                            controller: tGraphController,
                            componentClass: { type: 'DG.GraphView', constructor: DG.GraphView},
                            contentProperties: { model: tGraphModel },             
                            defaultLayout: { width: 300, height: 300 },
                            title: 'DG.DocumentController.graphTitle'.loc(),  // "Graph"
                            isResizable: true}
                          );
    return tView;
  },
  
  addText: function( iParentView, iComponent) {
    var tView = this.createComponentView(iComponent, {
                              parentView: iParentView,
                              controller: DG.TextComponentController.create(),
                              componentClass: { type: 'DG.TextView', constructor: DG.TextView},
                              contentProperties: { hint: "Type some notes here…" },
                              defaultLayout: { width: 300, height: 100 },
                              title: 'DG.DocumentController.textTitle'.loc(), // "Text"
                              isResizable: true}
                            );
    return tView;
  },

  addMap: function( iParentView, iComponent) {
    var tMapModel = DG.MapModel.create();
    // map as background
//    var tMapView = DG.MapView.create( {
//          model: tMapModel,
//          layout: { left: 0, right: 0, top: 0, bottom: 0}
//        });
//    iParentView.appendChild( tMapView);
//    iParentView.sendToBack( tMapView);
//    this._singletonViews.mapView = tMapView;
//    return tMapView;

    // map as component
    var tView = this.createComponentView(iComponent, {
                              parentView: iParentView,
                              controller: DG.ComponentController.create(),
                              componentClass: { type: 'DG.MapView', constructor: DG.MapView},
                              contentProperties: { model: tMapModel },
                              defaultLayout: { width: 300, height: 300 },
                              title: 'DG.DocumentController.mapTitle'.loc(), // "Map"
                              isResizable: true}
                            );
    return tView;
  },

  addSlider: function( iParentView, iComponent) {
    var modelProps = {};
    if( !iComponent || !iComponent.get('componentStorage'))
      modelProps.content = this.createGlobalValue();
    var tSliderModel = DG.SliderModel.create( modelProps),
        tView = this.createComponentView(iComponent, {
                              parentView: iParentView, 
                              controller: DG.SliderController.create(),
                              componentClass: { type: 'DG.SliderView', constructor: DG.SliderView},
                              contentProperties: { model: tSliderModel },
                              defaultLayout: { width: 300, height: 60 },
                              title: 'DG.DocumentController.sliderTitle'.loc(), // "Slider"
                              isResizable: true}
                            );
    return tView;
  },

  addCalculator: function( iParentView, iComponent) {
    var tView = this.createComponentView(iComponent, {
                              parentView: iParentView, 
                              controller: DG.ComponentController.create(),
                              componentClass: { type: 'DG.Calculator', constructor: DG.Calculator},
                              contentProperties: { },             
                              defaultLayout: { },
                              title: 'DG.DocumentController.calculatorTitle'.loc(), // "Calculator"
                              isResizable: false}
                            );
    this._singletonViews.calcView = tView;
    return tView;                                    
  },

    /**
     * Puts a modal dialog with a place for a URL. If user OK's, the URL is used for an added web view.
     */
  viewWebPage: function() {

    var this_ = this,
        tDialog = null;

      function createWebPage() {
        // User has pressed OK
        var tURL = tDialog.get('value');
        tDialog.close();
        if( !SC.empty( tURL)) {
          this_.addWebView(  DG.mainPage.get('docView'), null,
                  tURL, 'Web Page',
                  { width: 600, height: 400 });
        }
      }

    tDialog = DG.CreateSingleTextDialog( {
                    prompt: 'DG.DocumentController.enterURLPrompt',
                    textValue: '',
                    textHint: 'URL',
                    okTarget: null,
                    okAction: createWebPage,
                    okTooltip: 'DG.DocumentController.enterViewWebPageOKTip'
                  });
  },

  addWebView: function( iParentView, iComponent, iURL, iTitle, iLayout) {
    iURL = iURL || '';
    iTitle = iTitle || '';
    iLayout = iLayout || { width: 600, height: 400 };
    return this.createComponentView(iComponent, {
                            parentView: iParentView,
                            controller: DG.WebViewController.create(),
                            componentClass: { type: 'SC.WebView', constructor: SC.WebView},
                            contentProperties: { value: iURL, backgroundColor: 'white' },
                            defaultLayout: iLayout,
                            title: iTitle,
                            isResizable: true,
                            useLayout: !SC.none(iLayout.centerX) || !SC.none(iLayout.left) }
                          );
  },

  toggleComponent: function( iDocView, iComponentName) {
    var componentView = this._singletonViews[ iComponentName];
    // If it already exists, then delete it.
    if( componentView) {
      this.removeComponentAssociatedWithView( componentView);
      componentView.destroy();
    }
    // If it doesn't exist, then create it.
    else {
      switch( iComponentName) {
        case 'calcView':
          this.addCalculator( iDocView);
          break;
        case 'caseTableView':
          this.addCaseTable( iDocView);
          break;
        case 'mapView':
          this.addMap( iDocView);
          break;
      }
    }
  },
  
  closeDocument: function() {
    DG.ObjectMap.forEach( this.componentControllersMap,
                          function( iComponentID, iController) {
                            if( iController && iController.willDestroy)
                              iController.willDestroy();
                          });

    DG.globalsController.stopAnimation();
    DG.gameSelectionController.reset();
    DG.DataContext.clearContextMap();
    
    DG.Record.destroyAllRecordsOfType( DG.GlobalValue);
    DG.Record.destroyAllRecordsOfType( DG.Case);
    DG.Record.destroyAllRecordsOfType( DG.Attribute);
    DG.Record.destroyAllRecordsOfType( DG.CollectionRecord);
    DG.Record.destroyAllRecordsOfType( DG.DataContextRecord);
    DG.Record.destroyAllRecordsOfType( DG.Component);
    DG.store.commitRecords();
    
    DG.gameSelectionController.reset();
    this.closeAllComponents();
  },
  
  closeAllComponents: function() {
    this._singletonViews = {};

    this.componentControllersMap = {};
  },
  
  removeComponentAssociatedWithView: function( iComponentView) {
    var tController = null,
        tComponentID = DG.ObjectMap.findKey( this.componentControllersMap,
                                              function( iComponentID, iController) {
                                                if( iController.view === iComponentView) {
                                                  tController = iController;
                                                  return true;
                                                }
                                                return false;
                                              });
    
    // If this is a singleton view, clear its entry
    var tViewID = DG.ObjectMap.findValue( this._singletonViews, iComponentView);
    if( tViewID && this._singletonViews[ tViewID])
      this._singletonViews[ tViewID] = null;
    
    if( tController) {
      var model = tController.get('model');
      if( model)
        DG.Component.destroyComponent( model);
      delete this.componentControllersMap[ tComponentID];
      if( tController.get('shouldDestroyOnComponentDestroy')) {
        tController.destroy();
      }
      else {
        tController.set('model', null);
        tController.set('view', null);
      }
      // Closing a component should dirty the document.
      this.incrementProperty('changeCount');
    }
    // the view will be destroyed elsewhere
  },

  addFormulaObject: function( iParentView, iComponent, iTitle, iDescription, iOutputSymbol, iNameSpaceSymbols,
                              iDescriptions, iAllowUserVariables) {
    var tView = this.createComponentView(iComponent, {
                              parentView: iParentView,
                              controller: DG.ComponentController.create({}),
                              componentClass: { type: 'DG.FormulaObject', constructor: DG.FormulaObject},
                              contentProperties: {  description: iDescription,
                                                    outputSymbol: iOutputSymbol,
                                                    nameSpaceSymbols: iNameSpaceSymbols,
                                                    variableDescriptions: iDescriptions,
                                                    allow_user_variables: iAllowUserVariables},
                              defaultLayout: {},
                              title: iTitle,
                              isResizable: true
                              }
                            );

    return tView;
  },

  createGlobalValue: function( iProperties) {
    iProperties = iProperties || {};
    iProperties.document = this.get('documentID');
    return DG.globalsController.createGlobalValue( iProperties);
  },
  
  /**
    Returns an object which contains the contents of the document suitable for conversion
    to JSON and sending to the server.
    
    @returns  {Object} Object representing the document suitable for JSON-conversion
  */
  exportDocument: function() {
    var archiver = DG.DocumentArchiver.create({}),
        docArchive = archiver.saveDocument( this.get('content'));
        
    return docArchive;
  },

    /**
     * return an object with case data from this document.
     * @return {String}
     */
  exportCaseData: function( iWhichCollection ) {
    var archiver = DG.DocumentArchiver.create({}),
        caseDataString = archiver.exportCaseData( this.get('content'), iWhichCollection );

    return caseDataString;
  },
    
  /**
    Archive the document into durable form, and save it.
    
    @param {String} iDocumentId   The unique Id of the document as known to the server.
  */
  saveDocument: function( iDocumentId, iDocumentPermissions) {
    var docArchive = this.exportDocument();
    if( !SC.none( iDocumentPermissions))
      docArchive._permissions = iDocumentPermissions;

    if( DG.assert( !SC.none(docArchive))) {
      DG.authorizationController.saveDocument(iDocumentId, docArchive, this);
      this.updateSavedChangeCount();
    }
  },
    
  receivedSaveDocumentResponse: function(iResponse) {
    var body = iResponse.get('body'),
        isError = !SC.ok(iResponse) || iResponse.get('isError') || iResponse.getPath('response.valid') === false;
    if( isError) {
      var errorMessage = 'DG.AppController.saveDocument.' + body.message;
      if (errorMessage.loc() === errorMessage)
        errorMessage = 'DG.AppController.saveDocument.error.general';
      if( isError) {
        DG.AlertPane.error({
          localize: true,
          message: errorMessage});
      }
    }
  }
});

DG.currDocumentController = function() {
  if( !DG._currDocumentController)
    DG._currDocumentController = DG.DocumentController.create();
  return DG._currDocumentController;
};

DG.gameCollectionWithName = function( iGameName, iCollectionName) {
  return DG.currDocumentController().gameCollectionWithName( iGameName, iCollectionName);
};

