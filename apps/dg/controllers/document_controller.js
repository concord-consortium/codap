// ==========================================================================
//                        DG.DocumentController
//
//  A controller for a single document.
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

sc_require('models/document_model');
sc_require('models/remote_boundaries');
sc_require('models/component_model');

/* globals Promise */

/** @class
 *
 * Coordinating controller for the document. This class centralizes access to
 * operations affecting the document that the user is viewing and interacting
 * with in CODAP. It provides the means to create new top level objects, such
 * as data contexts or components. One can destroy or find these objects. It
 * provides the ability to restore these objects accurately from a serializable
 * representation of these objects or to create a serializable representation,
 * but it does not provide the means to persist or restore them to or from
 * an external location.
 *
 * An instance of CODAP will only manage one document at a time, so this object
 * is effectively a singleton, though not managed as only. Any object can find
 * the current document by calling DG.currDocumentController.
 *
 * @extends SC.Object
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
       *  @property {{contextID: DG.DataContextRecord}} A hash map mapping
       *  contextIDs to DataContext records
       */
      contextRecords: function () {
        return this.getPath('content.contexts');
      }.property(),

      /**
       * @property {[DG.DataContext]} Indexed sequentially.
       */
      contexts: null,

      /**
       *  The Components which are managed by this controller.
       *  Bound to the document's 'components' property.
       *  @property {Object} Hashmap of Components
       */
      components: function () {
        return this.getPath('content.components');
      }.property(),

      /**
       *  The current in-bounds mode scaling preferences.
       *  Bound to the document's 'inBoundsScaling' property.
       *  @property {Object} containing scaleFactor, scaleBoundsX, scaleBoundsY
       */
      _inBoundsScaling: null,
      inBoundsScaling: function () {
        return this._inBoundsScaling;
      }.property(),

      setInBoundsScaleFactor: function (sF) {
        if (this._inBoundsScaling && sF) {
          this._inBoundsScaling.scaleFactor = sF;
        }
      },

      setInBoundsScaleBounds: function (sX, sY) {
        if (this._inBoundsScaling && sX && sY) {
          this._inBoundsScaling.scaleBoundsX = sX;
          this._inBoundsScaling.scaleBoundsY = sY;
        }
      },

      setInBoundsScaling: function (sF, sX, sY) {
        if (!this._inBoundsScaling) {
          this._inBoundsScaling = {scaleFactor: sF, scaleBoundsX: sX, scaleBoundsY: sY};
        } else {
          this.setInBoundsScaleFactor(sF);
          this.setInBoundsScaleBounds(sX, sY);
        }
      },

      /**
       * Returns an array of the GameControllers defined in this document.
       */
      dataInteractives: function () {
        var componentControllers = this.get('componentControllersMap'),
            result = [];
        if (componentControllers) {
          DG.ObjectMap.forEach(componentControllers, function (key, component) {
            var type = component.getPath('model.type');
            if (type === 'DG.GameView') {
              result.push(component);
            }
          });
        }
        return result;
      }.property('componentControllersMap'),

      /**
       Map from component ID to the component's controller
       */
      componentControllersMap: null,

      /** @private
       * Maintain links to singleton component views
       *
       * @property {Object} Maps component type to DG.ComponentView
       */
      _singletonViews: null,

      /**
       * caseTable/Card views
       *
       * Handled like singleton views. We do not destroy them. We make them
       * invisible.
       *
       * @property {Object} Maps data context id to DG.ComponentView.
       */
      tableCardRegistry: DG.TableCardRegistry.create(),

      /**
       * The state of the document. The document is not ready during document load.
       */
      ready: true,

      /**
       * Set by singleton AppController on startup
       * @property {SC.MenuPane}
       */
      guideMenuPane: null,

      /**
       * Set by singleton MainPage on startup
       * @property {DG.IconButton}
       */
      guideButton: null,

      _guideModel: null,
      guideModel: function () {
        if (!this._guideModel) {
          this._guideModel = DG.GuideModel.create();
        }
        return this._guideModel;
      }.property(),

      _guideController: null,
      guideController: function () {
        if (!this._guideController) {
          this._guideController = DG.GuideController.create({
            guideModel: this.get('guideModel')
          });
        }
        return this._guideController;
      }.property(),

      _caseTableComponents: null,
      /**
       * Get or construct a case table component.
       *
       * Case tables need to retain their properties when closed, so we
       * keep them here. The reference in DocumentController.components may
       * come and go.
       * @param {DG.Component||null} originalComponent An existing component,
       *            if present. Will be provided if the component is already
       *            defined in a document.
       * @param {DG.DataContext} context
       * @param {object} properties
       * @returns {DG.Component}
       */
      getCaseTableComponent: function (originalComponent, context, properties) {
        if (SC.none(this._caseTableComponents)) {
          this._caseTableComponents = {};
        }
        var contextID = context && context.get('id');
        var component = originalComponent || this._caseTableComponents[contextID];
        var caseTableModel;
        if (SC.none(component)) {
          caseTableModel = DG.CaseTableModel.create({context: context});
          properties.document = this.content;
          properties.type = 'DG.TableView';
          component = DG.Component.createComponent(properties);
          component.set('content', caseTableModel);
        }
        this._caseTableComponents[contextID] = component;
        return component;
      },

      /**
       *  The ID of the document managed by this controller.
       *  @property {String}
       */
      documentID: function () {
        return this.getPath('content.id');
      }.property(),

      documentIDDidChange: function () {
        this.notifyPropertyChange('documentID');
      }.observes('*content.id'),

      /**
       *  The name of the document managed by this controller.
       *  @property {String}
       */
      documentName: function (iKey, iValue) {
        var content = this.get('content');
        if (!content) {
          return;
        }
        if (iValue !== undefined) {
          content.set('name', iValue);
          DG.store.commitRecords();
        }
        return content.get('name');
      }.property(),

      documentNameDidChange: function () {
        this.notifyPropertyChange('documentName');
      }.observes('*content.name'),

      setPageTitle: function () {
        if ((DG.get('componentMode') === 'yes') || (DG.get('embeddedMode') === 'yes')) {
          return;
        }
        var name = this.get('documentName');
        if (SC.empty(name)) {
          name = 'DG.Document.defaultDocumentName'.loc();
        }
        var nameString = 'DG.main.page.title'.loc(name, DG.USER_APPNAME);
        $('title').text(nameString);
      }.observes('documentName'),

      sharedMetadata: function (iKey, iSharedMetadata) {
        if (iSharedMetadata !== undefined) {
          var contentMetadata = this.getPath('content.metadata'),
              sharedMetadata = $.extend(true, {}, iSharedMetadata);
          if (contentMetadata != null) {
            contentMetadata.shared = sharedMetadata;
          } else {
            this.setPath('content.metadata', {shared: sharedMetadata});
          }
          // Currently, Concord Document Store requires '_permissions' at top-level
          this.setPath('content._permissions', sharedMetadata._permissions || 0);
          return this;
        }
        return this.getPath('content.metadata.shared');
      }.property(),

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

      _changedObjects: null,
      _skipPatchNextTime: [],

      /**
       Object containing data interactive log monitor properties used in DG.DataInteractivePhoneHandler
       @property {Object} dataInteractiveLogMonitor
       {Array}  logMonitors -- array of active log monitors set in DG.DataInteractivePhoneHandler
       {Number} nextLogMonitorId -- incrementing id of log monitor instances
       */
      dataInteractiveLogMonitor: null,

      init: function () {
        sc_super();

        this._singletonViews = {};
        this.tableCardRegistry = DG.TableCardRegistry.create();

        this.contexts = [];

        this.dataInteractiveLogMonitor = SC.Object.create({
          logMonitors: [],
          nextLogMonitorId: 1
        });

        this.clearChangedObjects();

        // If we were created with a 'content' property pointing to our document,
        // then use it; otherwise, create a new document.
        this.setDocument(this.get('content') || this.createDocument());

        if (DG.KEEP_IN_BOUNDS_PREF) {
          this.setInBoundsScaling(1, 0, 0);
        }
      },

      destroy: function () {
        this.closeDocument();
        sc_super();
      },

      /**
       * Creates a DG.Document with the specified name.
       * If no name is passed in, uses the default document name.
       * @param    {String}  iName -- [Optional] The name of the newly created document
       * @returns  {DG.Document} --   The newly-created document
       *
       * TODO: Move to DocumentHelper. This seems like a suspect path for creating
       * TODO: a new document.
       */
      createDocument: function (iName) {
        var doc = DG.Document.createDocument({
          name: iName || SC.String.loc('DG.Document.defaultDocumentName'),
          isNewDocument: true // mark this document as not having been saved and restored.
                              // this property will not be persisted with the document.
        });
        if (SC.none(iName)) {
          doc.set('_isPlaceholder', true);
        }
        return doc;
      },

      /**
       * Sets the document to be managed by this controller.
       * @param    {DG.Document} iDocument -- The document to be associated with
       * this controller
       *
       * TODO: This method is part of a convoluted and solipsistic process to open
       * TODO: a new document. Shouldn't a document be created from outside itself?
       *
       */
      setDocument: function (iDocument) {

        try {
          this.set('ready', false);
          this.set('content', iDocument);

          if (DG.mainPage.mainPane.hideInspectorPicker)  // undefined if not fully initialized yet
            DG.mainPage.mainPane.hideInspectorPicker(); // we don't want it showing for new doc
          DG.Component.clearContentMap();
          this.componentControllersMap = {};
          this._caseTableComponents = {};

          this.notificationManager = DG.NotificationManager.create({});

          // Create the individual DataContexts
          this.restoreDataContexts();

          // Set guide index if query parameter set.
          // Bypass for new documents, because new Documents do not have guides.
          if (!iDocument.isNewDocument) {
            this.updateGuideFromURL();
          }

          // Create the individual component views
          SC.run(function () {
            this.restoreComponentControllersAndViews();
          }.bind(this));

          this.clearChangedObjects();
          this.set('changeCount', 0);
          this.updateSavedChangeCount();
          this.set('ready', true);

          this.invokeLater(function () {
            DG.RemoteBoundaries.registerDefaultBoundaries();
          });
        } catch (e) {
          DG.logError(e);
        }
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
      hasUnsavedChanges: function () {
        // Game controller state affects the document state
        return this.get('changeCount') > this.get('savedChangeCount');
      }.property('changeCount', 'savedChangeCount'),

      /**
       Synchronize the saved change count with the full change count.
       This method should be called when a save occurs, for instance.
       */
      updateSavedChangeCount: function () {
        // Game controller state affects the document state
        this.dataInteractives().forEach(function (gameController) {
          gameController.updateSavedChangeCount();
        });
        this.set('savedChangeCount', this.get('changeCount'));
      },

      objectChanged: function (obj) {
        var changes = this.get('_changedObjects');
        if (changes.indexOf(obj) === -1) {
          changes.push(obj);
          this.set('_changedObjects', changes);
        }
      },

      clearChangedObjects: function () {
        this.set('_changedObjects', []);
      },

      clearChangedObject: function (obj) {
        var changes = this.get('_changedObjects');
        var idx = changes.indexOf(obj);
        if (idx !== -1) {
          changes.splice(idx, 1);
          this.set('_changedObjects', changes);
        }
      },

      objectHasUnsavedChanges: function (obj) {
        var changes = this.get('_changedObjects');
        return changes.indexOf(obj) !== -1;
      },

      getComponentControllerForModel: function (iComponentModel) {
        var id = iComponentModel && iComponentModel.get('id');
        return id && this.componentControllersMap[id];
      },

      /**
       Creates an appropriate DG.DataContext for the specified DG.DataContextRecord object.
       If no model is specified, creates the DG.DataContextRecord as well.
       @param    {DG.DataContextRecord}  iModel -- [Optional] The model for which to create the DG.DataContext.
       @param    {Object}                iProperties -- Constructor arguments for the new DG.DataContext.
       @returns  {DG.DataContext}                  The newly created DG.DataContext.
       */
      createDataContextForModel: function (iModel, iProperties) {
        // Create the model if one isn't passed in
        if (SC.none(iModel))
          iModel = DG.DataContextRecord.createContext({document: this.get('documentID')});
        if (!iProperties) iProperties = {};
        iProperties.type = iModel.get('type');
        iProperties.model = iModel;
        var context = DG.DataContext.factory(iProperties);
        this.get('contexts').pushObject(context);
        this.propertyDidChange('contextsLength');
        return context;
      },

      /**
       * Destroys the identified data context.
       * @param dataContextID
       * @return whether successful. That is whether there was a dataContext
       *    with the id to be destroyed.
       */
      destroyDataContext: function (dataContextID) {
        var dataContext = this.getContextByID(dataContextID);
        var dataContextIndex = this.contexts.findIndex(function (dc) {
          return dc === dataContext;
        });
        if (dataContext) {
          if (dataContextIndex >= 0) {
            dataContext.applyChange({operation: 'deleteDataContext'});
            this.contexts.splice(dataContextIndex, 1);
            this.propertyDidChange('contextsLength');
            this.tableCardRegistry.deregisterViews(dataContextID);

            // Send notification indicating which data context was deleted
            this.notificationManager.sendNotification({
              action: 'notify',
              resource: 'documentChangeNotice',
              values: {
                operation: 'dataContextDeleted',
                deletedContext: dataContext.get('name'),
              }
            }, function (response) {
              DG.log('Sent notification for deletion of context ' + dataContextID);
              DG.log('Response: ' + JSON.stringify(response));
            });
          } else {
            DG.logWarn('Attempt to destroy data context %@. Not known to document'.loc(dataContextID));
          }
        } else {
          return false;
        }
      },

      /**
       Creates an appropriate DG.DataContext for each DG.DataContextRecord in the document.
       Can be used after restoring a document, for instance.
       */
      restoreDataContexts: function () {
        var contextRecords = this.get('contextRecords') || [];
        DG.ObjectMap.forEach(contextRecords, function (key, iContextModel) {
          var newContext = this.createDataContextForModel(iContextModel);
          if (newContext) {
            newContext.restoreFromStorage(iContextModel.get('contextStorage'));
          }
        }.bind(this));
      },

      createNewDataContext: function (iProps) {
        var contextRecord = DG.DataContextRecord.createContext(iProps),
            context = this.createDataContextForModel(contextRecord);
        if (contextRecord.contextStorage) {
          context.restoreFromStorage(contextRecord.contextStorage);
        }
        return context;
      },

      /**
       * Creates the specified component and its associated view.
       * Clients should specify either iComponent or iComponentType.
       * @param iComponent     {DG.Component} [Optional] -- The restored component.
       *                                              Should be specified when restoring from document.
       * @param iComponentType {String}            [Optional] -- The type of component to create.
       * @param iArgs          {Object}            [Optional] -- parameters defining this object.
       *
       * @return {DG.ComponentView||[DG.CaseTableView]} In most instances we return
       * the view created. For backward compatibility, we can create one case table for
       * each data context that does not already have a case table. In this instance
       * we return an array of views.
       */
      createComponentAndView: function (iComponent, iComponentType, iArgs) {
        var docView = DG.mainPage.get('docView'),
            type = (iComponent && iComponent.get('type')) || iComponentType,
            tView = null,
            isInitialization = !(iArgs && iArgs.initiatedViaCommand);
        try {
          switch (type) {
            case 'DG.FlashView':  // For backward compatibility
              if (iComponent)
                iComponent.set('type', 'DG.GameView');
              /* jshint -W086 */  // Expected a 'break' statement before 'case'. (W086)
              // fallthrough intentional
            case 'DG.GameView':
              tView = this.addGame(docView, iComponent, isInitialization);
              break;
            case 'DG.TableView':
              if (iComponent && iComponent.componentStorage && iComponent.componentStorage._links_) {
                tView = this.addCaseTable(docView, iComponent);
              } else {
                tView = this.openCaseTablesForEachContext();
              }
              break;
            case 'DG.CaseCard':
              tView = this.addCaseCard(docView, null, null, iComponent);
              break;
            case 'DG.GraphView':
              // ToDo: pass iArgs along to other 'add' methods in addition to addGraph
              tView = this.addGraph(docView, iComponent, isInitialization, iArgs);
              break;
            case 'DG.SliderView':
              tView = this.addSlider(docView, iComponent, isInitialization);
              break;
            case 'DG.Calculator':
              this.toggleComponent(docView, 'calcView', iComponent);
              tView = this._singletonViews.calcView;
              break;
            case 'DG.TextView':
              tView = this.addText(docView, iComponent, isInitialization);
              break;
            case 'DG.MapView':
              tView = this.addMap(docView, iComponent, isInitialization);
              break;
            case 'SC.WebView':
            case 'DG.WebView':
              tView = this.addWebView(docView, iComponent, null, null, null, isInitialization);
              break;
            case 'DG.ImageComponentView':
              tView = this.addImageView(docView, iComponent, null, null, null, isInitialization);
              break;
            case 'DG.GuideView':
              tView = this.addGuideView(docView, iComponent, isInitialization);
              break;
            default:
              break;
          }
        } catch (e) {
          DG.logError(e);
        }

        if (iComponent)
          iComponent.didLoadRecord();

        return tView;
      },

      /**
       Creates an appropriate DG.ComponentView for each DG.Component in the document.
       Can be used after restoring a document, for instance.
       */
      restoreComponentControllersAndViews: function () {
        var components = this.get('components');
        if (components) {
          if (DG.KEEP_IN_BOUNDS_PREF) {
            this.setInBoundsScaling(1, 0, 0);
            this.computeScaleBounds();
            if (Object.keys(components).length) {
              this.computeScaleFactor();
            }
          }
          DG.ObjectMap.forEach(components, function (key, iComponent) {
            this.createComponentAndView(iComponent);
          }.bind(this));
        }
      },

      enforceViewBounds: function () {
        this.computeScaleFactor();
        DG.ObjectMap.forEach(this.componentControllersMap,
            function (iComponentID, iController) {
              if (iController) {
                var view = iController.get('view');
                if (view && !view.get('isStandaloneComponent')) {
                  view.enforceViewBounds();
                }
              }
            });
      },
      /**
       Sets scaleBoundsX and scaleBoundsY of inBoundsScaling property, these
       values are the target bounds of the component layout and used to determine
       when we need to scale and reposition components due to changes in the
       parent container size.
       Computed when we add, delete, move, resize component.
       @param iNewPos: a new position that will be included in the component
       list once the component creation is complete
       */
      computeScaleBounds: function (iNewPos) {
        var components = this.get('components');
        if (components) {
          var scaleBounds = {x: 0, y: 0},
              storedScaleFactor = this.get('inBoundsScaling').scaleFactor,
              scaleFactor = storedScaleFactor ? storedScaleFactor : 1;
          // Only compute new bounds if scaleFactor = 1, the max value.
          // In this case we are showing the components with original layout
          // and the container may include additional space where the bounds
          // can grow. If scaleFactor < 1, then the container edge has
          // already reached the boundary edge and there is no space for the
          // bounds to grow.
          if (scaleFactor === 1) {
            if (iNewPos) {
              scaleBounds.x = Math.max(scaleBounds.x, iNewPos.x + iNewPos.width);
              scaleBounds.y = Math.max(scaleBounds.y, iNewPos.y + iNewPos.height);
            }
            DG.ObjectMap.forEach(components, function (key, iComponent) {
              // If we have a valid, visible component, determine if its position and
              // size are determining factors in the computing the scaleBounds
              if (iComponent.type !== 'DG.GuideView' || !this.guideViewHidden()) {
                if (iComponent.get('isVisible') &&
                    iComponent.layout &&
                    ((iComponent.layout.left != null) &&
                        (iComponent.layout.width != null) &&
                        (iComponent.layout.top != null) &&
                        (iComponent.layout.height != null))) {

                  // Include the inspector size in scaleBounds calculation
                  var tInspectorDimensions = {width: 0, height: 0};
                  var controller = DG.currDocumentController().componentControllersMap[iComponent.get('id')];
                  if (controller) {
                    var view = controller.get('view');
                    if (view) {
                      tInspectorDimensions = view.getInspectorDimensions();
                    }
                  }
                  // Get the rightmost edge of the component
                  var unscaledRightEdge = (iComponent.layout.left + iComponent.layout.width);
                  if (tInspectorDimensions.width) {
                    unscaledRightEdge += tInspectorDimensions.width;
                  }
                  // Get the bottommost edge of the component
                  var unscaledBottomEdge = (iComponent.layout.top + iComponent.layout.height);
                  if (tInspectorDimensions.height && tInspectorDimensions.height > iComponent.layout.height) {
                    unscaledBottomEdge = iComponent.layout.top + tInspectorDimensions.height;
                  }
                  // Do the rightmost or bottommost edge determine new scaleBounds?
                  scaleBounds.x = Math.max(scaleBounds.x, unscaledRightEdge);
                  scaleBounds.y = Math.max(scaleBounds.y, unscaledBottomEdge);
                }
              }
            }.bind(this));
            this.setInBoundsScaleBounds(scaleBounds.x, scaleBounds.y);
          }
        }
      },
      /**
       Computed when we resize browser or load document.
       ScaleFactor is used to compute non-scaled position and size of components.
       */
      computeScaleFactor: function () {
        var docView = DG.mainPage.get('docView'),
            containerWidth = $('#codap').width(),
            containerHeight = $('#codap').height(),
            storedInBoundsScaling = this.get('inBoundsScaling'),
            scaleBoundsX = storedInBoundsScaling.scaleBoundsX,
            scaleBoundsY = storedInBoundsScaling.scaleBoundsY,
            scaleFactor = 1;
        if (!SC.none(docView)) {
          while (!SC.none(docView.parentView.parentView)) {
            docView = docView.parentView;
          }
          containerHeight -= docView.get('frame').y;
        }
        if (containerWidth < scaleBoundsX || containerHeight < scaleBoundsY) {
          scaleFactor = Math.min(containerWidth / scaleBoundsX, containerHeight / scaleBoundsY);
        }
        this.setInBoundsScaleFactor(scaleFactor);
      },

      /**
       The client is a GraphDataConfiguration that wants to know what data context to use to
       display points in a case plot when no attributes have yet been assigned. If there is
       exactly one data context we use it. If there is exactly one data context that has a case table
       or case card, we use it. Otherwise we use the default with null for all properties.
       @returns  {Object}  An Object whose properties specify usable defaults, e.g.
       {Object.collectionClient} {DG.CollectionClient} Default collection to use
       {Object.parentCollectionClient} {DG.CollectionClient} Default parent collection
       {Object.plotXAttr}  {DG.Attribute}  The attribute to plot on the X axis by default
       {Object.plotXAttrIsNumeric}  {Boolean}  Whether the default X axis attribute is numeric
       {Object.plotYAttr}  {DG.Attribute}  The attribute to plot on the Y axis by default
       {Object.plotYAttrIsNumeric}  {Boolean}  Whether the default Y axis attribute is numeric
       */
      collectionDefaults: function () {
        var tContexts = this.get('contexts'),
            tUsableContext = null;
        if (tContexts.length === 1)
          tUsableContext = tContexts[0];
        else {
          tContexts = tContexts.filter(function (iContext) {
            var tView = this.tableCardRegistry.getViewForContext(iContext);
            return tView && tView.get('isVisible');
          }.bind(this));
          if (tContexts.length === 1)
            tUsableContext = tContexts[0];
        }
        return (tUsableContext && tUsableContext.collectionDefaults()) || DG.DataContext.collectionDefaults();
      },

      /**
       * Add a component to the 'components' list, if not already present.
       *
       * @param iComponent {DG.Component} The new component.
       */
      registerComponent: function (iComponent) {
        var registeredComponents = this.get('components');
        var componentID = iComponent.get('id');
        if (SC.none(registeredComponents[componentID])) {
          registeredComponents[componentID] = iComponent;
        }
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
      configureComponent: function (iComponent, iParams) {
        var isRestoring = !SC.none(iComponent),
            documentID = this.get('documentID'),
            tComponent = iComponent,
            tController = iParams.controller;

        // If we're not restoring, then we must create it.
        if (!isRestoring) {
          var tComponentProperties = {type: iParams.componentClass.type, id: iParams.contentProperties.id};
          // If we create it, hook it up to the document.
          if (!SC.none(this.content))
            tComponentProperties.document = this.content;
          tComponent = DG.Component.createComponent(tComponentProperties);
          if (!SC.none(iParams.isResizable))
            tComponent.set('isResizable', iParams.isResizable);
        } else {
          this.registerComponent(tComponent);
        }

        // If client specified a model, associate it with the component in our map
        if (iParams.contentProperties && iParams.contentProperties.model)
          tComponent.set('content', iParams.contentProperties.model);

        // Hook up the controller to its model (the component)
        tController.set('model', tComponent);

        // Add the component controller to our registry of component controllers
        this.componentControllersMap[tComponent.get('id')] = tController;

        // If we're restoring, restore the archived contents
        if (isRestoring) {
          // restore from archive
          tController.didRestoreComponent(documentID);
        }

        return tComponent;
      },

      createComponentView: function (iComponent, iParams) {
        var tParams = $.extend({}, iParams, {layout: $.extend(true, {}, iParams.defaultLayout)}),
            isRestoring = !SC.none(iComponent),
            tComponent, tComponentView;

        DG.globalEditorLock.commitCurrentEdit();

        //
        // Configure/create the component and hook it up to the controller
        //
        tComponent = this.configureComponent(iComponent, iParams);
        tParams.model = tComponent;

        //
        // Configure/create the view and connect it to the controller
        //
        var tComponentLayout = tComponent.get('layout');
        if (tComponent && tComponentLayout && Object.keys(tComponentLayout).length > 0)
          tParams.layout = $.extend(true, {}, tComponentLayout);

        if (isRestoring) {
          var tRestoredTitle = iComponent.getPath('componentStorage.title');
          var tRestoredName = iComponent.getPath('componentStorage.name');
          iComponent.set('title', tRestoredTitle || tRestoredName);
          if (tRestoredName)
            iComponent.set('name', tRestoredName);
          if (DG.isStandaloneComponent(iComponent.get('name') || iComponent.get('title'), iComponent.get('type'))) {
            tParams.useLayout = true;
            tParams.layout = {};
            tParams.isStandaloneComponent = true;
          }
          tComponentView = DG.ComponentView.restoreComponent(tParams);
        } else {
          DG.sounds.playCreate();
          if (DG.isStandaloneComponent(iParams.name, iParams.componentClass.type)) {
            tParams.isStandaloneComponent = true;
          }
          tComponentView = DG.ComponentView.addComponent(tParams);
          var defaultFirstResponder = tComponentView && tComponentView.getPath('contentView.defaultFirstResponder');
          tComponent.set('title', iParams.title || iParams.name);
          tComponent.set('name', iParams.name || iParams.title);
          if (defaultFirstResponder) {
            if (defaultFirstResponder.beginEditing) {
              defaultFirstResponder.beginEditing();
            } else if (defaultFirstResponder.becomeFirstResponder) {
              defaultFirstResponder.becomeFirstResponder();
            }
          }
        }

        if (tComponentView) {
          // Tell the controller about the new view, whose layout we will need when archiving.
          if (iParams.controller) {
            iParams.controller.set('view', tComponentView);
          }
          tComponent.set('layout', tComponentView.get('layout'));
        }

        return tComponentView;
      },

      addGame: function (iParentView, iComponent, isInitialization) {
        // It should return a document name, e.g.:
        // /datagame/game.html => game
        // /datagame/game.html?param=abc.123 => game
        // /datagame/game?param=abc.123 => game
        function getNameFromURL(iUrl) {
          if (!iUrl) {
            return;
          }
          var a = document.createElement("a");
          a.href = iUrl;
          var doc = a.pathname.split("/").slice(-1)[0].split(".");
          // At this point doc could be equal to ["game", "html"] or ["game"] if .html was not present.
          return doc[0];
        }

        var tGameParams = {
              width: 300, height: 200
            },
            tLayout = iComponent && iComponent.layout,
            tIsVisible = tLayout && !SC.none(tLayout.isVisible) ? tLayout.isVisible : true,
            // if we are restoring a component from a document then it will have
            // a position in the hierarchy
            tIsRestoredComponent = tLayout && tLayout.zIndex,
            // 'di' URL param can override stored URL
            storedGameUrl = iComponent && iComponent.getPath('componentStorage.currentGameUrl'),
            tGameUrl = DG.finalGameUrl(storedGameUrl),
            tGameName = (iComponent && iComponent.getPath(
                    'componentStorage.currentGameName')) ||
                getNameFromURL(tGameUrl) ||
                'Unknown Game',
            tView;
        if (!DG.STANDALONE_MODE && iComponent.get('type') === 'DG.GameView'
            && iComponent.layout && !iComponent.layout.width) {
          iComponent.layout.width = tGameParams.width;
          iComponent.layout.height = tGameParams.height;
        }
        DG.UndoHistory.execute(DG.Command.create({
          name: 'game.create',
          undoString: 'DG.Undo.game.add',
          redoString: 'DG.Redo.game.add',
          log: 'addGame: {name: "%@", url: "%@"}'.fmt(tGameName, tGameUrl),
          isUndoable: !isInitialization,
          _component: null,
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'create game controller',
              type: 'DG.WebView'
            }
          },
          execute: function () {
            var tController = DG.GameController.create();
            tView = DG.currDocumentController().createComponentView(iComponent || this._component, {
              parentView: iParentView,
              controller: tController,
              componentClass: {
                type: 'DG.GameView',
                constructor: DG.GameView
              },
              contentProperties: {
                controller: tController,
                value: tGameUrl,
                model: DG.DataInteractiveModel.create({title: tGameName})
              },
              defaultLayout: {
                width: tGameParams.width,
                height: tGameParams.height
              },
              position: iComponent && iComponent.position,
              title: tGameName,
              useLayout: !!tLayout,
              positionOnCreate: true
            });
            if (!tIsVisible) {
              tView.set('isVisible', false);
            } else if (!tIsRestoredComponent) {
              tView.select();
            }
            this._component = tController.get('model');
          },
          undo: function () {
            var controller = DG.currDocumentController().componentControllersMap[this._component.get('id')],
                view = controller.get('view');
            controller.willSaveComponent();
            view.parentView.removeComponentView(view);
          }
        }));

        // Override default component view behavior.
        // Do nothing until we figure out how to prevent reloading of data interactive.
        //tView.select = function () {
        //};

        return tView;
      },

      /**
       * Adds a case table to the workspace view.
       *
       * When a document is restored, iComponent is the object restored from the
       * document component. Otherwise it is null.
       *
       * @param {SC.View} iParentView
       * @param {DG.Component||null} iComponent
       * @param {object||null} iProperties
       * @returns {DG.HierTableView}
       */
      addCaseTable: function (iParentView, iComponent, iProperties) {
        function resolveContextLink(iComponent) {
          var id = DG.ArchiveUtils.getLinkID(iComponent.componentStorage, 'context');
          if (id) {
            return DG.currDocumentController().get('contexts').find(function (context) {
              return context.get('id') === id;
            });
          }
        }

        if (SC.none(iProperties)) {
          iProperties = {};
        }
        var context = iProperties.dataContext || resolveContextLink(iComponent);
        var caseTableView = this.tableCardRegistry.getViewForContext(context);
        var component = this.getCaseTableComponent(iComponent, context, iProperties);
        var model = component.get('content') || DG.CaseTableModel.create({context: context});

        if (!caseTableView) {
          var controller = DG.CaseTableController.create(iProperties);
          var componentClassDef = {type: 'DG.TableView', constructor: DG.HierTableView};
          var props = {
            parentView: iParentView,
            controller: controller,
            componentClass: componentClassDef,
            contentProperties: {model: model, id: iProperties.id}, // Temporarily using context as model in order to get a title
            defaultLayout: {width: 500, height: 200},
            useLayout: iProperties.useLayout,
            position: iComponent ? iComponent.position : iProperties.position
          };
          caseTableView = this.createComponentView(component, props);
          if (iComponent && iComponent.layout && !iComponent.layout.isVisible) {
            caseTableView.savedLayout = iComponent.layout;
          }

        } else {
          caseTableView.set('isVisible', true);
        }

        if (caseTableView.get('isVisible')) {
          model.set('isActive', true);
        }
        this.tableCardRegistry.registerView(context, caseTableView);
        return caseTableView;
      },

      /**
       * Create a case table for each context if the components do not exist
       * already.
       *
       * This method is supported for backwards compatibility.
       *
       * @return {[DG.CaseTableView]} one for each case table created.
       */
      openCaseTablesForEachContext: function () {
        var docController = this,
            newViews = {};
        DG.UndoHistory.execute(DG.Command.create({
          name: 'caseTable.display',
          undoString: 'DG.Undo.caseTable.open',
          redoString: 'DG.Redo.caseTable.open',
          log: 'Create caseTable component',
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'open case table',
              type: 'DG.CaseTable'
            }
          },
          execute: function () {
            var view;
            docController.contexts.forEach(function (context) {
              view = this.addCaseTable(DG.mainPage.get('docView'), null,
                  {dataContext: context, id: newViews[context]});
              newViews[context] = view.getPath('controller.model.id');
            }.bind(docController));
            if (newViews.length === 0) {
              this.causedChange = false;
            }
          },
          undo: function () {
            var view, controller, containerView;
            DG.ObjectMap.forEach(newViews, function (context, modelId) {
              controller = docController.componentControllersMap[modelId];
              view = controller.get('view');
              containerView = view.parentView;
              containerView.removeComponentView(view);
            });
          }
        }));
        return Object.values(newViews);
      },

      addGraph: function (iParentView, iComponent, isInitialization, iStorage) {
        var tView,
            this_ = this,
            tLayout = iStorage && iStorage.layout,
            tDefaultLayout = iComponent && iComponent.size ? iComponent.size :
                (tLayout ? tLayout : {width: 300, height: 300});
        iStorage = (iStorage && iStorage.componentStorage) || (iComponent && iComponent.componentStorage);

        DG.UndoHistory.execute(DG.Command.create({
          name: "graphComponent.create",
          undoString: 'DG.Undo.graphComponent.create',
          redoString: 'DG.Redo.graphComponent.create',
          executeNotification: DG.UndoHistory.makeComponentNotification('create', 'graph'),
          undoNotification: DG.UndoHistory.makeComponentNotification('delete', 'graph'),
          log: 'Create graph component',
          _component: null,
          isUndoable: !isInitialization,
          execute: function () {
            var tContextIds = DG.DataContext.contextIDs(null),
                tController = DG.GraphController.create();

            if ((SC.none(iComponent) && SC.none(this._component) || !(iStorage && iStorage.dataContext)) &&
                DG.ObjectMap.length(tContextIds) === 1) {
              tController.set('dataContext',
                  this_.getContextByID(tContextIds[0]));
            } else if (iStorage && iStorage.dataContext) {
              tController.set('dataContext', iStorage.dataContext);
            }
            tView = this_.createComponentView(iComponent, {
                  parentView: iParentView,
                  controller: tController,
                  componentClass: {type: 'DG.GraphView', constructor: DG.GraphView},
                  contentProperties: {
                    model: DG.GraphModel.create({
                      initialDataContext: iStorage && iStorage.dataContext,
                      xAttributeName: iStorage && iStorage.xAttributeName,
                      yAttributeName: iStorage && iStorage.yAttributeName,
                      y2AttributeName: iStorage && iStorage.y2AttributeName,
                      legendAttributeName: iStorage && iStorage.legendAttributeName,
                      enableNumberToggle: iStorage && iStorage.enableNumberToggle,
                      numberToggleLastMode: iStorage && iStorage.numberToggleLastMode,
                      enableMeasuresForSelection: iStorage && iStorage.enableMeasuresForSelection
                    })
                  },
                  defaultLayout: tDefaultLayout,
                  position: iComponent && iComponent.position,
                }
            );
            this._component = tView.getPath('controller.model');

            // add id's to notifications
            this.executeNotification.values.id = this.undoNotification.values.id = tView.getPath('controller.model.id');


          },
          undo: function () {
            var view = DG.currDocumentController().componentControllersMap[this._component.get('id')].get('view');
            view.parentView.removeComponentView(view);
          }
        }));
        return tView;
      },

      addText: function (iParentView, iComponent, isInitialization) {
        var tView, docController = this;

        DG.UndoHistory.execute(DG.Command.create({
          name: "textComponent.create",
          undoString: 'DG.Undo.textComponent.create',
          redoString: 'DG.Redo.textComponent.create',
          log: 'Create text component',
          isUndoable: !isInitialization,
          _component: null,
          executeNotification: DG.UndoHistory.makeComponentNotification('create', 'text'),
          undoNotification: DG.UndoHistory.makeComponentNotification('delete', 'text'),
          execute: function () {
            tView = docController.createComponentView(iComponent || this._component, {
                  parentView: iParentView,
                  controller: DG.TextComponentController.create(),
                  componentClass: {type: 'DG.TextView', constructor: DG.TextView},
                  contentProperties: {
                    hint: "Type some notes here…",
                    model: DG.TextModel.create({})
                  },
                  defaultLayout: {width: 300, height: 100},
                  position: iComponent && iComponent.position,
                  title: 'DG.DocumentController.textTitle'.loc(), // "Text"
                }
            );
            this._component = tView.getPath('controller.model');
          },
          undo: function () {
            var controller = DG.currDocumentController().componentControllersMap[this._component.get('id')],
                view = controller.get('view');
            controller.willSaveComponent();
            view.parentView.removeComponentView(view);
          }
        }));
        return tView;
      },

      addMap: function (iParentView, iComponent, isInitialization) {
        var tView, docController = this;

        DG.UndoHistory.execute(DG.Command.create({
          name: "map.create",
          undoString: 'DG.Undo.map.create',
          redoString: 'DG.Redo.map.create',
          log: 'Create map component',
          isUndoable: !isInitialization,
          _component: null,
          executeNotification: DG.UndoHistory.makeComponentNotification('create', 'map'),
          undoNotification: DG.UndoHistory.makeComponentNotification('delete', 'map'),
          execute: function () {
            var tProperties = (iComponent && iComponent.componentStorage) ? {
                      legendAttributeName: iComponent.componentStorage.legendAttributeName,
                      context: iComponent.componentStorage.context
                    } : {},
                tMapModel = DG.MapModel.create(tProperties),
                tMapController = DG.MapController.create();

            // map as component
            tView = docController.createComponentView(iComponent || this._component, {
                  parentView: iParentView,
                  controller: tMapController,
                  componentClass: {type: 'DG.MapView', constructor: DG.MapView},
                  contentProperties: {model: tMapModel},
                  defaultLayout: {width: 530, height: 360},
                  position: iComponent && iComponent.position,
                  title: 'DG.DocumentController.mapTitle'.loc(), // "Map"
                }
            );
            this._component = tView.getPath('controller.model');
          },
          undo: function () {
            var view = DG.currDocumentController().componentControllersMap[this._component.get('id')].get('view');
            view.parentView.removeComponentView(view);
          }
        }));
        return tView;
      },

      addSlider: function (iParentView, iComponent, isInitialization) {
        var tView, docController = this;

        DG.UndoHistory.execute(DG.Command.create({
          name: "sliderComponent.create",
          undoString: 'DG.Undo.sliderComponent.create',
          redoString: 'DG.Redo.sliderComponent.create',
          log: 'Create slider component',
          isUndoable: !isInitialization,
          _global: null,
          _componentId: null,
          executeNotification: DG.UndoHistory.makeComponentNotification('create', 'slider'),
          undoNotification: DG.UndoHistory.makeComponentNotification('delete', 'slider'),
          execute: function () {
            var globalName = iComponent && (iComponent.componentStorage.name || iComponent.componentStorage.title);
            this._global = this._global ||
                (iComponent && iComponent.componentStorage &&
                    DG.store.find(DG.GlobalValue, DG.ArchiveUtils.getLinkID(iComponent.componentStorage, 'model'))) ||
                docController.createGlobalValue({name: globalName});
            if (!DG.globalsController.getGlobalValueByID(Number(this._global.get('id')))) {
              DG.globalsController.registerGlobalValue(this._global);
            }

            var tSliderModel = DG.SliderModel.create({content: this._global});
            tView = docController.createComponentView(iComponent, {
                  parentView: iParentView,
                  controller: DG.SliderController.create(),
                  componentClass: {type: 'DG.SliderView', constructor: DG.SliderView},
                  contentProperties: {id: this._componentId, model: tSliderModel},
                  defaultLayout: {width: 300, height: 98},
                  position: iComponent && iComponent.position,
                  isResizable: {width: true, height: false}
                }
            );
            this._componentId = tView.getPath('controller.model.id');
          },
          undo: function () {
            var controller = DG.currDocumentController().componentControllersMap[this._componentId];
            var view = controller.get('view');
            view.parentView.removeComponentView(view);
            DG.globalsController.destroyGlobalValue(this._global);
          }
        }));
        return tView;
      },

      addCalculator: function (iParentView, iComponent) {
        // No Undo wrapping for this here, as it's handled in toggleComponent()
        var tView = this.createComponentView(iComponent, {
              parentView: iParentView,
              controller: DG.ComponentController.create(),
              componentClass: {type: 'DG.Calculator', constructor: DG.Calculator},
              contentProperties: {},
              defaultLayout: {},
              position: iComponent && iComponent.position,
              title: 'DG.DocumentController.calculatorTitle'.loc(), // "Calculator"
              isResizable: {width: false, height: false}
            }
        );
        this._singletonViews.calcView = tView;
        return tView;
      },

      addCaseCard: function (iParentView, iLayout, iContext, iComponent, iTitle) {

        function findPreexistingCaseCardComponentView() {
          return DG.mainPage.getPath('docView.childViews').find(function (iChildView) {
            return iChildView.contentIsInstanceOf && iChildView.contentIsInstanceOf(DG.CaseCardView) &&
                iChildView.getPath('contentView.context') === iContext;
          });
        }

        var tTableView = iContext && this.tableCardRegistry.getTableView(iContext);
        var tPreexistingCaseCard = findPreexistingCaseCardComponentView();
        if (tPreexistingCaseCard) { // We've already got one for this context. Only one allowed.
          return tPreexistingCaseCard;
        }
        var tNewComponent = !(iComponent || tPreexistingCaseCard);
        var tController = DG.CaseCardController.create({
              dataContext: iContext
            }),
            tTitle = iTitle || (iContext ? iContext.get('name') : 'DG.DocumentController.caseCardTitle'.loc()),
            tComponent = iComponent, tRestoredLayout = iLayout || {};
        if (!tComponent) {
          // creating component
          tComponent = this.configureComponent(iComponent, {
            controller: tController,
            componentClass: {type: 'DG.CaseCard'},
            contentProperties: {}
          });
          tComponent.set('content', DG.CaseCardModel.create({context: iContext}));
          tComponent.set('title', tTitle);
        } else {
          // restoring component
          var tRestoredTitle = tComponent.getPath('componentStorage.title'),
              tRestoredName = tComponent.getPath('componentStorage.name');
          tRestoredLayout = tComponent.get('layout');
          tComponent.set('content', DG.CaseCardModel.create({context: iContext}));
          tComponent.set('title', tRestoredTitle || tRestoredName);
          if (tRestoredName)
            tComponent.set('name', tRestoredName);
          tController.set('model', tComponent);
          this.componentControllersMap[tComponent.get('id')] = tController;
          tController.didRestoreComponent(this.get('documentID'));
          iContext = tController.get('dataContext');
        }
        var tComponentView = DG.ComponentView.create({
              layout: tRestoredLayout,
              isVisible: !SC.none(tRestoredLayout.isVisible) ? tRestoredLayout.isVisible : true,
              showTitleBar: true
            }),
            tContentView = DG.CaseCardView.create({
              classNames: 'dg-opaque'.w() /*dg-scrollable'.w()*/,
              model: tComponent.get('content'),
              isSelectedCallback: function () {
                return tComponentView.get('isSelected');
              }
            });
        tComponentView.set('model', tComponent);
        iParentView.appendChild(tComponentView);
        tComponentView.addContent(tContentView);
        tComponentView.set('contentView', tContentView);
        tComponentView.set('controller', tController);
        // If the case table has existed, our position has been determined by
        // its position, so we bypass the layout operation.
        if (tNewComponent && !tTableView) {
          iParentView.positionNewComponent(tComponentView);
        }
        tController.set('view', tComponentView);
        this.registerComponent(tComponent);
        if (tComponentView.get('isVisible')) {
          tComponent.setPath('content.isActive', true);
        }
        this.tableCardRegistry.registerView(iContext, tComponentView);

        return tComponentView;
      },

      /**
       * Puts a modal dialog with a place for a URL.
       * If user OK's, the URL is used for an added web view.
       */
      viewWebPage: function () {

        var tDialog = null;

        function createWebPage() {
          // User has pressed OK. tURL must have a value or 'OK' disabled.
          var tURL = tDialog.get('value');
          tDialog.close();
          // If url does not contain http:// or https:// at the beginning, append http://
          if (!/^https?:\/\//i.test(tURL)) {
            tURL = 'http://' + tURL;
          }
          DG.appController.importURL(tURL, "DG.WebView", tURL);
        }

        tDialog = DG.CreateSingleTextDialog({
          prompt: 'DG.DocumentController.enterURLPrompt',
          textValue: '',
          textHint: 'URL',
          okTarget: null,
          okAction: createWebPage,
          okTooltip: 'DG.DocumentController.enterViewWebPageOKTip'
        });
      },
      addWebView: function (iParentView, iComponent, iURL, iTitle, iLayout, isInitialization) {
        iURL = iURL || '';
        iTitle = iTitle || '';
        iLayout = iLayout || {width: 600, height: 400};
        var tView;
        DG.UndoHistory.execute(DG.Command.create({
          name: 'webView.show',
          undoString: 'DG.Undo.webView.show',
          redoString: 'DG.Redo.webView.show',
          log: 'Show webView: {title: "%@", url: "%@"}'.fmt(iTitle, iURL),
          isUndoable: !isInitialization,
          _component: null,
          model: SC.Object.create({
            defaultTitle: iTitle,
            URL: iURL
          }),
          executeNotification: DG.UndoHistory.makeComponentNotification('create', 'webView'),
          undoNotification: DG.UndoHistory.makeComponentNotification('delete', 'webView'),
          execute: function () {
            tView = DG.currDocumentController().createComponentView(iComponent || this._component, {
                  parentView: iParentView,
                  controller: DG.WebViewController.create({model: this.model}),
                  componentClass: {type: 'DG.WebView', constructor: DG.WebView},
                  contentProperties: {value: iURL, backgroundColor: 'white', model: this.model},
                  defaultLayout: iLayout,
                  position: iComponent && iComponent.position,
                  title: iTitle,
                  useLayout: !SC.none(iComponent) || !SC.none(iLayout.centerX) || !SC.none(iLayout.left)
                }
            );
            this._component = tView.getPath('controller.model');
          },
          undo: function () {
            var view = DG.currDocumentController().componentControllersMap[this._component.get('id')].get('view');
            view.parentView.removeComponentView(view);
          }
        }));
        return tView;
      },

      addImageView: function (iParentView, iComponent, iURL, iTitle, iLayout, isInitialization) {
        iURL = iURL || '';
        iTitle = iTitle || iURL || '';
        iLayout = iLayout || {width: 600, height: 400};
        var tView;
        DG.UndoHistory.execute(DG.Command.create({
          name: 'webView.show',
          undoString: 'DG.Undo.imageComponent.show',
          redoString: 'DG.Redo.imageComponent.show',
          log: 'Show webView: {title: "%@", url: "%@"}'.fmt(iTitle, iURL),
          isUndoable: !isInitialization,
          _component: null,
          model: SC.Object.create({
            defaultTitle: iTitle || 'DG.ImageComponent.defaultTitle'.loc(),
            URL: iURL
          }),
          executeNotification: DG.UndoHistory.makeComponentNotification('create', 'imageComponent'),
          undoNotification: DG.UndoHistory.makeComponentNotification('delete', 'imageComponent'),
          execute: function () {
            tView = DG.currDocumentController().createComponentView(iComponent || this._component, {
                  parentView: iParentView,
                  controller: DG.ImageComponentController.create({model: this.model}),
                  componentClass: {type: 'DG.ImageComponentView', constructor: DG.ImageComponentView},
                  contentProperties: {value: iURL, backgroundColor: 'white', model: this.model},
                  defaultLayout: iLayout,
                  position: iComponent && iComponent.position,
                  title: iTitle,
                  useLayout: true
                }
            );
            this._component = tView.getPath('controller.model');
          },
          undo: function () {
            var view = DG.currDocumentController().componentControllersMap[this._component.get('id')].get('view');
            view.parentView.removeComponentView(view);
          }
        }));
        return tView;
      },

      addGuideView: function (iParentView, iComponent, isInitialization) {
        if (this._singletonViews.guideView) {
          // only one allowed
          DG.UndoHistory.execute(DG.Command.create({
            name: 'guide.show',
            undoString: 'DG.Undo.guide.show',
            redoString: 'DG.Redo.guide.show',
            log: 'Show guide',
            isUndoable: !isInitialization,
            execute: function () {
              DG.currDocumentController()._singletonViews.guideView.set('isVisible', true);
            },
            undo: function () {
              DG.currDocumentController()._singletonViews.guideView.set('isVisible', false);
            }
          }));
        } else {
          var tModel = this.get('guideModel'),
              tController = this.get('guideController'),
              tView = this.createComponentView(iComponent, {
                    parentView: iParentView,
                    controller: tController,
                    componentClass: {type: 'DG.GuideView', constructor: DG.GuideView},
                    contentProperties: {
                      backgroundColor: 'white', guideModel: tModel, model: tModel,
                      controller: tController,
                      closeAction: {action: this.closeGuideView, target: this}
                    },
                    defaultLayout: {width: 400, height: 200},
                    position: iComponent && iComponent.position,
                    useLayout: true
                  }
              );
          this._singletonViews.guideView = tView;
        }
        return this._singletonViews.guideView;
      },

      /**
       * This gets called when the user 'closes' the guide view. Instead of removing the
       * component and its view, we just hide it for future use.
       */
      closeGuideView: function () {
        var tGuideComponentView = this._singletonViews.guideView;
        if (tGuideComponentView) {
          tGuideComponentView.set('isVisible', false);
        }
      },

      guideViewHidden: function () {
        var tGuideComponentView = this._singletonViews.guideView,
            guideHidden = false;
        if (tGuideComponentView) {
          guideHidden = !tGuideComponentView.get('isVisible');
        }
        return guideHidden;
      },

      /**
       * Puts a modal dialog with a place for a URL. If user OK's, the URL is used for an added web view.
       */
      configureGuide: function () {

        var this_ = this,
            tDialog = null,
            tGuideModel = this.get('guideModel'),  // guideModel is a singleton, so it's ok to reference it directly.

            storeGuideModel = function () {
              DG.UndoHistory.execute(DG.Command.create({
                name: 'guide.configure',
                undoString: 'DG.Undo.guide.configure',
                redoString: 'DG.Redo.guide.configure',
                log: 'Show guide',
                changedObject: tGuideModel,
                _oldValues: {
                  title: tGuideModel.get('title'),
                  items: tGuideModel.get('items'),
                  currentItemIndex: tGuideModel.get('currentItemIndex')
                },
                _newValues: {
                  title: tDialog.get('title'),
                  items: tDialog.get('items')
                },
                execute: function () {
                  if (tDialog) {
                    // Only do this the first time we're executed.
                    DG.currDocumentController().addGuideView(DG.mainPage.docView);  // Make sure we have one hooked up to model
                  }
                  tGuideModel.beginPropertyChanges();
                  tGuideModel.set('title', this._newValues.title);
                  tGuideModel.set('items', this._newValues.items);
                  tGuideModel.endPropertyChanges();
                  if (tDialog) {
                    tDialog.close();
                    tDialog = null;
                  }
                  if (!SC.empty(this._newValues.title) || this._newValues.items.length !== 0) {
                    // The configuration is such that we must make sure the guide is visible
                    this_._singletonViews.guideView.set('isVisible', true);
                  }
                },
                undo: function () {
                  tGuideModel.beginPropertyChanges();
                  tGuideModel.set('title', this._oldValues.title);
                  tGuideModel.set('items', this._oldValues.items);
                  tGuideModel.set('currentItemIndex', this._oldValues.currentItemIndex);
                  tGuideModel.endPropertyChanges();
                  if (SC.empty(this._oldValues.title) && this._oldValues.items.length === 0) {
                    // We're undoing the original making of the guide view just by hiding it
                    this_._singletonViews.guideView.set('isVisible', false);
                  }
                }
              }));
            };


        tDialog = DG.CreateGuideConfigurationView({
          okTarget: null,
          okAction: storeGuideModel,
          model: tGuideModel
        });
      },

      /**
       * If we have both a button and a menu pane, we can pass them to the guideController.
       */
      guideButtonOrMenuDidChange: function () {
        var tButton = this.get('guideButton'),
            tPane = this.get('guideMenuPane');
        if (tButton && tPane) {
          var tController = this.get('guideController');
          tController.set('guideButton', tButton);
          tController.set('guideMenuPane', tPane);
        }
      }.observes('guideButton', 'guideMenuPane'),

      /**
       * There is currently only one component that comes through here, 'CalcView'
       * @param iDocView
       * @param iComponentName
       */
      toggleComponent: function (iDocView, iComponentName, iComponent) {
        var componentView = this._singletonViews[iComponentName],
            componentArchive;
        // If it already exists, then delete it.
        if (componentView) {
          DG.UndoHistory.execute(DG.Command.create({
            name: 'component.toggle.delete',
            undoString: 'DG.Undo.toggleComponent.delete.' + iComponentName,
            redoString: 'DG.Redo.toggleComponent.delete.' + iComponentName,
            log: 'Remove toggle component: %@'.fmt(iComponentName),
            executeNotification: DG.UndoHistory.makeComponentNotification('hide', iComponentName),
            undoNotification: DG.UndoHistory.makeComponentNotification('show', iComponentName),
            execute: function () {
              componentArchive = this._archiveComponent(iComponentName);
              this._deleteComponent(iComponentName);
            }.bind(this),
            undo: function () {
              this._addCalcComponent(iComponentName, iDocView, componentArchive);
            }.bind(this),
            redo: function () {
              this._deleteComponent(iComponentName);
            }.bind(this)
          }));
        }
        // If it doesn't exist, then create it.
        else {
          DG.UndoHistory.execute(DG.Command.create({
            name: 'component.toggle.add',
            undoString: 'DG.Undo.toggleComponent.add.' + iComponentName,
            redoString: 'DG.Redo.toggleComponent.add.' + iComponentName,
            log: 'Add toggle component: %@'.fmt(iComponentName),
            executeNotification: DG.UndoHistory.makeComponentNotification('show', iComponentName),
            undoNotification: DG.UndoHistory.makeComponentNotification('hide', iComponentName),
            execute: function () {
              this._addCalcComponent(iComponentName, iDocView, iComponent);
            }.bind(this),
            undo: function () {
              componentArchive = this._archiveComponent(iComponentName);
              this._deleteComponent(iComponentName);
            }.bind(this),
            redo: function () {
              this._addCalcComponent(iComponentName, iDocView, componentArchive);
            }.bind(this)
          }));
        }
      },

      toggleTableToCard: function (iTableComponentView) {
        var kDefaultCardWidth = 200,
            kDefaultCardHeight = 400,
            tContext = iTableComponentView.getPath('controller.dataContext'),
            tCannotClose = iTableComponentView.getPath('model.cannotClose'),
            tTableLayout = iTableComponentView.get('layout'),
            tCardInitialLayout = {
              top: tTableLayout.top, left: tTableLayout.left,
              width: kDefaultCardWidth, height: DG.ViewUtilities.kTitleBarHeight
            },
            tCardFinalLayout = {
              height: kDefaultCardHeight
            },
            tCardComponentView;
        iTableComponentView.set('savedLayout', tTableLayout);
        // animate case table to default card width, then animate to closed height,
        // then toggle to case card and animate to final position
        iTableComponentView.animate({width: kDefaultCardWidth}, {duration: 0.3, timing: 'ease-in-out'});
        this.invokeLater(function () {
          iTableComponentView.animate({height: DG.ViewUtilities.kTitleBarHeight},
              {duration: 0.3, timing: 'ease-in-out'});
        }, 300);
        this.invokeLater(function () {
          iTableComponentView.set('isVisible', false);
          tTableLayout.isVisible = false;
          // restore position of invisible component, so it will come back to the right place.
          iTableComponentView.set('layout', tTableLayout);
          iTableComponentView.setPath('model.content.isActive', false);
          tCardComponentView = this.tableCardRegistry.getCardView(tContext) ||
              this.addCaseCard(iTableComponentView.get('parentView'),
                  tCardInitialLayout, tContext, null, iTableComponentView.get('title'));
          tCardComponentView.setPath('model.cannotClose', tCannotClose);
          tCardComponentView.set('layout', tCardInitialLayout);
          var tCardLayout = tCardComponentView.get('savedLayout') || tCardFinalLayout;
          if (!tCardComponentView.get('savedLayout')) {
            tCardComponentView.set('savedLayout', tCardLayout);
          }
          tCardComponentView.set('isVisible', true);

          tCardComponentView.select();
          tCardComponentView.setPath('model.content.isActive', true);
          this.tableCardRegistry.registerView(tContext, tCardComponentView);
        }.bind(this), 600);
      },

      toggleCardToTable: function (iCardComponentView) {
        var kDefaultCardWidth = 200,
            tCardLayout = iCardComponentView.get('layout'),
            tCannotClose = iCardComponentView.getPath('model.cannotClose'),
            tTableInitialLayout = {
              top: tCardLayout.top, left: tCardLayout.left,
              width: kDefaultCardWidth, height: DG.ViewUtilities.kTitleBarHeight
            },
            tContext = iCardComponentView.getPath('controller.dataContext');
        iCardComponentView.set('isAnimating', true);
        iCardComponentView.set('savedLayout', tCardLayout);
        // animate case card to default card width, then animate to closed height,
        // then toggle to case table and animate to final position
        iCardComponentView.animate({width: kDefaultCardWidth}, {duration: 0.3, timing: 'ease-in-out'},
            function () {
              iCardComponentView.animate({height: DG.ViewUtilities.kTitleBarHeight},
                  {duration: 0.3, timing: 'ease-in-out'},
                  function () {
                    iCardComponentView.set('isVisible', false);
                    iCardComponentView.set('isAnimating', false);
                    tCardLayout.isVisible = false;
                    iCardComponentView.set('layout', tCardLayout);
                    iCardComponentView.setPath('model.content.isActive', false);
                    var tTableComponentView = this.tableCardRegistry.getTableView(tContext) ||
                            this.addCaseTable(iCardComponentView.get('parentView'), null, {
                              dataContext: iCardComponentView.getPath('controller.dataContext'),
                              useLayout: true // use layout for position
                            }),
                        tTableLayout = tTableComponentView.get('savedLayout') || {width: 500, height: 200},
                        tAnimatableLayout = {
                          left: tTableLayout.left,
                          top: tTableLayout.top,
                          width: tTableLayout.width,
                          height: tTableLayout.height
                        };
                    tTableComponentView.setPath('model.cannotClose', tCannotClose);
                    tTableComponentView.set('layout', tTableInitialLayout);
                    tTableComponentView.set('isVisible', true);
                    tAnimatableLayout.height++;
                    tTableComponentView.animate(tAnimatableLayout, {duration: 0.3, timing: 'ease-in-out'},
                        function () {
                          SC.run(function () {
                            tTableComponentView.select();
                            tAnimatableLayout.height--;
                            tTableComponentView.adjust('height',
                                tAnimatableLayout.height);
                            this.invokeNext(function () {
                              tTableComponentView.get(
                                  'contentView').scrollSelectionToView();
                            }.bind(this));
                          }.bind(this));
                        });
                    tTableComponentView.setPath('model.content.isActive', true);
                    this.tableCardRegistry.registerView(tContext, tTableComponentView);
                  }.bind(this));
            }.bind(this));
      },

      /**
       * Helper for toggleComponent. Creates a new component and adds it to the view/document.
       * Though awkward, we currently only use this for DG.Calculator. The componentArchive parameter
       * can be missing, an archive object, or the model object. If it's the model object, we
       * check to make sure it is already stored and, if so, use it as the component.
       */
      _addCalcComponent: function (iComponentName, iDocView, componentArchive) {
        var tComponentID = componentArchive && componentArchive.get('id'),
            tStoredComponent = DG.store.find(tComponentID),
            component = (tStoredComponent && tStoredComponent === componentArchive) ? tStoredComponent :
                (componentArchive ? DG.Component.createComponent(componentArchive) : null);
        switch (iComponentName) {
          case 'calcView':
            this.addCalculator(iDocView, component);
            break;
        }
      },

      /**
       * Helper for toggleComponent. Saves a component's state in preparation for being deleted,
       * so we can restore it later.
       */
      _archiveComponent: function (iComponentName) {
        var component = this._singletonViews[iComponentName].getPath('controller.model'),
            componentArchive = component.toArchive();
        componentArchive.document = component.get('document');
        return componentArchive;
      },

      /**
       * Helper for toggleComponent. Finds the right component and removes it from the view/document.
       */
      _deleteComponent: function (iComponentName) {
        var componentView = this._singletonViews[iComponentName];
        this.removeComponentAssociatedWithView(componentView);
        componentView.destroy();
      },


      /**
       * Close the document in an orderly way.
       *
       * (a) stop any globals from animating.
       * (b) remove component controllers and components
       * (c) remove contexts
       * (d) remove globals
       *
       * Note: there are a number of singletons involved in, and complicating,
       * this process. We wish to get to a single singleton managing dynamic
       * objects, the app controller. The DG object should remain a singleton, but
       * for managing constants and class prototypes. There should only ever be
       * a single document controller, but a new one should be created with each
       * new document.
       */
      closeDocument: function () {
        /** stop any animation and then destroy globals */
        DG.globalsController.stopAnimation();
        DG.globalsController.reset();

        // Close components
        DG.mainPage.closeAllComponents();

        DG.ObjectMap.forEach(this.componentControllersMap,
            function (iComponentID, iController) {
              if (iController && iController.willDestroy) {
                iController.willDestroy();
              }
            });
        // We need to call closeAllComponents before destroying the controllers
        // Otherwise notifications do not happen that reset the guide button.
        this.closeAllComponents();
        DG.ObjectMap.forEach(this.componentControllersMap,
            function (iComponentID, iController) {
              if (iController && iController.constructor !== DG.GuideController) {
                iController.destroy();
              }
            });
        this.componentControllersMap = {};

        // remove dataContexts
        this.contexts = [];

        if (this.notificationManager) {
          this.notificationManager.destroy();
          this.notificationManager = null;
        }

        // remove document
        DG.Document.destroyDocument(DG.activeDocument);

        // clean up undo history.
        DG.UndoHistory.clearUndoRedoHistory();
      },

      closeAllComponents: function () {
        this._singletonViews = {};
        this.tableCardRegistry.reset();

        // Reset the guide
        if (this._guideController)
          this._guideController.reset();
      },

      findComponentsByType: function (iType) {
        var tResults = [];
        DG.ObjectMap.forEach(this.componentControllersMap, function (key, componentController) {
          if (componentController.constructor === iType && componentController.getPath('view.isVisible')) {
            tResults.push(componentController);
          }
        });
        return tResults;
      },

      removeComponentAssociatedWithView: function (iComponentView) {
        var tController = null,
            tComponentID = DG.ObjectMap.findKey(this.componentControllersMap,
                function (iComponentID, iController) {
                  if (iController.view === iComponentView) {
                    tController = iController;
                    return true;
                  }
                  return false;
                });

        // If this is a singleton view, clear its entry
        var tViewID = DG.ObjectMap.findValue(this._singletonViews, iComponentView);
        if (tViewID && this._singletonViews[tViewID])
          this._singletonViews[tViewID] = null;

        if (tController) {
          var model = tController.get('model');
          if (model)
            DG.Component.destroyComponent(model);
          delete this.componentControllersMap[tComponentID];
          if (tController.get('shouldDestroyOnComponentDestroy')) {
            tController.destroy();
          } else {
            tController.set('model', null);
            tController.set('view', null);
          }
        }
        // the view will be destroyed elsewhere
      },

      addFormulaObject: function (iParentView, iComponent, iTitle, iDescription, iOutputSymbol, iNameSpaceSymbols,
                                  iDescriptions, iAllowUserVariables) {
        var tView = this.createComponentView(iComponent, {
              parentView: iParentView,
              controller: DG.ComponentController.create({}),
              componentClass: {type: 'DG.FormulaObject', constructor: DG.FormulaObject},
              contentProperties: {
                description: iDescription,
                outputSymbol: iOutputSymbol,
                nameSpaceSymbols: iNameSpaceSymbols,
                variableDescriptions: iDescriptions,
                allow_user_variables: iAllowUserVariables
              },
              defaultLayout: {},
              position: iComponent && iComponent.position,
              title: iTitle,
              isResizable: true
            }
        );

        return tView;
      },

      createGlobalValue: function (iProperties) {
        iProperties = iProperties || {};
        iProperties.document = this.get('content');
        return DG.globalsController.createGlobalValue(iProperties);
      },

      /**
       * Retrieve data context by name.
       * @param {string} name
       * @returns {DG.DataContext}
       */
      getContextByName: function (name) {
        return this.contexts.find(function (context) {
          return context.get('name') === name;
        });
      },

      /**
       * Retrieve data context by name.
       * @param {string} name
       * @returns {DG.DataContext}
       */
      getContextByTitle: function (name) {
        return this.contexts.find(function (context) {
          return context.get('title') === name;
        });
      },

      /**
       * Retrieve data context by id.
       *
       * @param {number} id
       * @returns {DG.DataContext}
       */
      getContextByID: function (id) {
        var tID = Number(id);
        return this.contexts.find(function (context) {
          return context.get('id') === tID;
        });
      },

      /**
       * Retrieve component by name.
       * @param {string} name
       * @returns {DG.Component}
       */
      getComponentByName: function (name) {
        var components = DG.ObjectMap.values(DG.currDocumentController().get('components'));
        return components.find(function (c) {
          return c.get('name') === name;
        });
      },

      /**
       * Retrieve component by id.
       *
       */
      getComponentByID: function (id) {
        if (isNaN(id)) {
          return;
        }
        var components = DG.ObjectMap.values(DG.currDocumentController().get('components'));
        return components.find(function (c) {
          return Number(c.get('id')) === Number(id);
        });
      },

      /**
       * The guide index of a restored document can be modified with a URL query
       * parameter. This method performs that operation if the query parameter
       * is present. The method edits the component storage object. **It should,
       * thus, be called only before the component controller and view are
       * constructed.**
       */
      updateGuideFromURL: function () {
        var guideIndex = DG.get('initialGuideIndex');
        if (SC.empty(guideIndex)) return;
        DG.set('initialGuideIndex', '');
        var components = this.get('components');
        var guideComponentKey = Object.keys(components).find(function (iComponentKey) {
          var tComponent = components[iComponentKey];
          return tComponent.type === 'DG.GuideView';
        });
        var guideComponent = guideComponentKey && components[guideComponentKey];
        if (guideComponent && !Number.isNaN(guideIndex)) {
          guideComponent.componentStorage.isVisible = true;
          guideComponent.componentStorage.currentItemIndex = Number(guideIndex);
        }
      },
      /**
       * Ensures that the state of all components, data contexts and
       * data contexts are current and up-to-date.
       *
       * Saves the current state of all the current Data Interactives into the
       * 'savedGameState' property of the current game's context.
       * Getting state of interactives may be asynchronous, so returns a promise
       * that is fulfilled with a streamable archive.
       *
       * @param {boolean} fullData  Whether to make an archive of the full document
       *                            or to omit parts savable separately (e.g.
       *                            data contexts.
       *
       * @return {Promise} fulfilled when all data interactives have reported their
       * states. The promise is fulfilled with a return value of the streamable
       * document archive.
       */
      captureCurrentDocumentState: function (fullData) {
        var gameControllers = this.get('dataInteractives'),
            promises = [],
            returnPromise;
        if (gameControllers) {
          gameControllers.forEach(function (gameController) {
            // create an array of promises, one for each data interactive.
            // issue the request in the promise.
            promises.push(new Promise(function (resolve, reject) {
              try {
                if (gameController.saveGameState) {
                  gameController.saveGameState(function (result) {
                    if (!(result && result.success)) {
                      DG.log('Unable to retrieve plugin state');
                      result = {success: false};
                    }
                    resolve(result);
                  });
                } else {
                  // This would occur if there is no means of communicating with
                  // a data interactive. We immediately resolve.
                  resolve({success: true});
                }
              } catch (ex) {
                DG.logWarn("Exception saving game context: " + ex);
                resolve({success: false});
              }
            }));
          });
        }

        returnPromise = Promise.all(promises).then(function () {
          // Prepare the component-specific storage for saving
          DG.ObjectMap.forEach(this.componentControllersMap,
              function (iComponentID, iController) {
                iController.willSaveComponent();
              });

          this.contexts.forEach(function (iContext) {
            iContext.willSaveContext();
          });
          return Promise.resolve(this.get('content').toArchive(fullData));
        }.bind(this))/*.then(undefined, function (reason) { // should be 'catch', but eslint and yui-compressor complain
          console.warn(reason);
        })*/;

        return returnPromise;
      }
    }
);

DG.currDocumentController = function () {
  if (!DG._currDocumentController) {
    DG._currDocumentController = DG.DocumentController.create();
    DG._currDocumentController.set('guideMenuPane', DG.appController.get('guideMenuPane'));
  }
  return DG._currDocumentController;
}.property();

/**
 * A global convenience function for dirtying the document.
 *
 * @param changedObject The object that caused the document to be dirty
 * @param retainUndo (optional) If set, do not inform UndoHistory of the change,
 * avoiding stack truncation.
 */
DG.dirtyCurrentDocument = function (changedObject, retainUndo) {
  // Tell the UndoHistory that something changed the document.
  // If this didn't occur inside a Command.execute, then it will clear
  // the undo stack.
  if (!retainUndo) {
    DG.UndoHistory.documentWasChanged();
  }

  if (SC.none(changedObject)) {
    changedObject = DG.currDocumentController().get('content');
  }

  var update = function () {
    DG.currDocumentController().objectChanged(changedObject);
    DG.currDocumentController().incrementProperty('changeCount');
    //DG.log('changeCount = %@', DG.currDocumentController().get('changeCount'));
  };

  // Dirty the document after the current save finishes so that we don't miss sending to the server any changes that
  // didn't make it into this save cycle.
  var saveInProgress = DG.currDocumentController().get('saveInProgress');
  if (!SC.none(saveInProgress)) {
    saveInProgress.done(update);
  } else {
    update();
  }

  /* For a while in building the StoryBuilder/MomentBar plugin, we were sending our document to subscribers every
      time the document was dirtied. We may again encounter this need, so we leave this code commented out.
    if (DG.currDocumentController().notificationManager)
      DG.currDocumentController().notificationManager.sendDocumentToSubscribers();
  */
};
