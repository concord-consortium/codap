// ==========================================================================
//                          DG.GraphController
//
//  Author:   William Finzer
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

sc_require('controllers/component_controller');

/** @class

  DG.GraphController provides controller functionaly, particular gear menu items,
  for scatter plots.

  @extends SC.Controller
*/
DG.GraphController = DG.ComponentController.extend(
/** @scope DG.GraphController.prototype */ 
  (function() {

    function getCollectionClientFromDragData( iContext, iDragData) {
      var collectionID = iDragData.collection && iDragData.collection.get('id');
      return iContext && !SC.none( collectionID) && iContext.getCollectionByID( collectionID);
    }

    return {
      dataContext: null,
      graphModel: null,
      xAxisView: null,
      yAxisView: null,
      plotView: null,
      legendView: null,
      axisMultiTarget: null,
      attributeMenu: null,
      menuAnchorView: null,

      createComponentStorage: function() {
        var storage = { _links_: {} },
            dataContext = this.get('dataContext'),
            dataConfiguration = this.getPath('graphModel.dataConfiguration'),
            hiddenCases = dataConfiguration && dataConfiguration.get('hiddenCases' ),
            plotModels = this.getPath('graphModel.plots');

        var storeDimension = function( iDim) {
          var tCollection = dataConfiguration && dataConfiguration.get(iDim + 'CollectionClient' ),
              tAttrDesc = dataConfiguration && dataConfiguration.get(iDim + 'AttributeDescription' ),
              tAttrs = (tAttrDesc && tAttrDesc.get('attributes')) || [];
          if( tCollection && (tAttrs.length > 0)) {
            storage._links_[iDim + 'Coll'] = tCollection.toLink();
            var tKey = iDim + 'Attr';
            tAttrs.forEach( function( iAttr) {
              DG.ArchiveUtils.addLink( storage, tKey, iAttr);
            });
          }
          storage[iDim + 'Role'] = tAttrDesc.get('role');  // Has a role even without an attribute
          storage[iDim + 'AttributeType'] = tAttrDesc.get('attributeType');
        };

        var storeAxis = function( iDim) {
          var tAxis = this.getPath('graphModel.' + iDim + 'Axis' );
          if( tAxis)
            storage[iDim + 'AxisClass'] = String(tAxis.constructor);
          if( tAxis && tAxis.get('isNumeric')) {
            storage[iDim + 'LowerBound'] = tAxis.get('lowerBound');
            storage[iDim + 'UpperBound'] = tAxis.get('upperBound');
          }
        }.bind( this);

        if( dataContext)
          storage._links_.context = dataContext.toLink();

        storeDimension( 'x');
        storeDimension( 'y');
        storeDimension( 'legend');

        storeAxis('x');
        storeAxis('y');

        if( plotModels) {
          storage.plotModels = [];
          plotModels.forEach( function( iPlot) {
            storage.plotModels.push({ plotModelStorage: iPlot.createStorage(),
                                      plotClass: String( iPlot.constructor) });
          });
        }
        if( hiddenCases) {
          storage.hiddenCases = hiddenCases.map( function( iCase) {
            return iCase.get('id');
          });
        }
        return storage;
      },

      restoreComponentStorage: function( iStorage, iDocumentID) {
        var graphModel = this.get('graphModel'),
            contextID = this.getLinkID( iStorage, 'context'),
            dataContext = null;
        
        if( !SC.none( contextID)) {
          dataContext = DG.DataContext.retrieveContextFromMap( iDocumentID, contextID);
          if( dataContext) {
            this.set('dataContext', dataContext);
            this.setPath('graphModel.dataConfiguration.dataContext', dataContext);
          }
        }

        if( SC.none( iStorage._links_))
          return; // We don't support the older format 0096 and before. Just bring up the default graph
                  // that we already have.

        graphModel.restoreStorage( iStorage);

        // There may be some animations that have been set up. We have to stop them so that changes
        // we make below (e.g. to axis bounds) will stick.
        graphModel.stopAnimation();

        // Older versions had a single plotModelStorage, so we make ourselves backward compatible
        if( iStorage.plotModelStorage) {
          var plotModel = graphModel.get('plot');
          if( plotModel)
            plotModel.restoreStorage( iStorage.plotModelStorage);
        }
        // Newer versions always store an array of plot models even if there is only one.
        else if( iStorage.plotModels) {
          var tPlots = graphModel.get('plots');
          tPlots.forEach( function( iPlot, iIndex) {
            iPlot.restoreStorage( iStorage.plotModels[ iIndex].plotModelStorage);
          });
        }

        // Configure the axes
        var xAxis = graphModel.get('xAxis'),
            yAxis = graphModel.get('yAxis');
        if( xAxis && xAxis.get('isNumeric') &&
            isFinite( iStorage.xLowerBound) && isFinite( iStorage.xUpperBound)) {
            xAxis.setLowerAndUpperBounds( iStorage.xLowerBound, iStorage.xUpperBound);
        }
        if( yAxis && yAxis.get('isNumeric') &&
            isFinite( iStorage.yLowerBound) && isFinite( iStorage.yUpperBound)) {
            yAxis.setLowerAndUpperBounds( iStorage.yLowerBound, iStorage.yUpperBound);
        }
      },

      /**
      	When our 'dataContext' is changed, we must let our model know.
       */
      dataContextDidChange: function() {
        var graphModel = this.get('graphModel');
        if( graphModel)
          graphModel.set('dataContext', this.get('dataContext'));
      }.observes('dataContext'),

      /**
        When our model changes, make sure it has the right 'dataContext'.
       */
      modelDidChange: function() {
        // Our model is our component; its content is the graph model
        var graphModel = this.getPath('model.content');
        this.set('graphModel', graphModel);
        if( graphModel)
          graphModel.set('dataContext', this.get('dataContext'));
      }.observes('model'),

      viewDidChange: function() {
        var componentView = this.get('view'),
            graphView = componentView && componentView.get('contentView');
        if( graphView) {
          this.set('xAxisView', graphView.get('xAxisView'));
          this.set('yAxisView', graphView.get('yAxisView'));
          this.set('plotView', graphView.get('plotBackgroundView'));
          this.set('legendView', graphView.get('legendView'));
          this.set('axisMultiTarget', graphView.get('yAxisMultiTarget'));
          graphView.set('controller', this);
        }
      }.observes('view'),

      /**
      Get the menu items from the graph and its components.
        @property { Array of menu items }
      */
      gearMenuItems: function() {
        var tGraph = this.getPath('graphModel');
        return SC.none( tGraph) ? [] : tGraph.getGearMenuItems();
      }.property('graphModel'),

      rescaleAxes: function() {
        this.graphModel.rescaleAxes();
      },

      plotFunction: function() {
        this.graphModel.get('plot').togglePlotFunction();
      },

      init: function() {
        sc_super();

        // To Do: We need to have the menu dynamically compute its layout.
        this.attributeMenu = SC.MenuPane.create( {
                  layout: { width: 200, height: 150 }
                });
        this.attributeMenu.selectedAxis = null;
        this.attributeMenu.addObserver('selectedItem', this,
                        this.attributeMenuItemChanged);
        this.menuAnchorView = SC.View.create( {
                    layout: { left: 0, width: 20, top: 0, height: 20 },
                    backgroundColor: 'transparent',
                    isVisible: false
                  });
      },

      addAxisHandler: function( iAxisView) {
        var this_ = this,
            tNodes = iAxisView.get('labelNodes');

        if( SC.isArray( tNodes)) {
          tNodes.forEach( function( iNode, iIndex) {

            function mouseDownHandler( iEvent) {
              this_.setupAttributeMenu( iEvent, iAxisView, iIndex);
            }

            if( !SC.none( iNode.events))
              iNode.unmousedown( mouseDownHandler); // In case it got added already
            iNode.mousedown( mouseDownHandler);
          });
        }
      },

      /**
        An axis view has been assigned to the property named iPropertyKey.
        We want to hook up to its labelNode so that clicking on it will bring
        up an attribute menu.
      */
      axisViewChanged: function( iThis, iPropertyKey) {
        var this_ = this,
            tView = this.get( iPropertyKey);
        if( !SC.none( tView))
          tView.addObserver( 'labelNode', this,
              function() {
                this_.addAxisHandler( tView);
              });
      }.observes('xAxisView', 'yAxisView', 'legendView'),

      setupAttributeMenu: function( event, iAxisView, iAttrIndex) {
        var tGraphModel = this.get('graphModel'),
            tMenuLayout = { left: event.layerX, top: event.layerY, height: 20, width: 20 },
            tOrientation = iAxisView.get('orientation'),
            // The following parameter is supposed to specify the preferred position of the menu
            // relative to the anchor. But it doesn't seem to have any effect.
            // SC.POINTER_LAYOUT = ["perfectRight", "perfectLeft", "perfectTop", "perfectBottom"];
            tPreferMatrix = (tOrientation === 'horizontal') ?
                    [ 0, 2, 1, 3, 0 ] :
                    [ 0, 1, 3, 2, 0],
            tAxisKey = ((iAxisView.instanceOf( DG.LegendView)) ? 'legend':((tOrientation === 'horizontal') ? 'x':'y')),
            tMenuItems;

        tMenuItems = this.getAttributeMenuItems();
        // WARNING: before we added this separator, the "Remove Attribute" menu item had a bug where it would not respond correctly
        // on the first click.  It appears that SC.MenuItemView.mouseUp() gets a null 'targetMenuItem' at that point,
        // which prevents our menu handler from being called.  This may or may not a bug related to the submenu just above this point.
        // --Craig and Kirk 2012-06-07
        tMenuItems.push( { isSeparator: YES } );
        var kNotForSubmenu = false;
        tMenuItems.push( tGraphModel.createRemoveAttributeMenuItem( tAxisKey, kNotForSubmenu, iAttrIndex ));
        tMenuItems.push( tGraphModel.createChangeAttributeTypeMenuItem( tAxisKey, kNotForSubmenu, iAttrIndex ));
        this.attributeMenu.set( 'items', tMenuItems);
        this.attributeMenu.selectedAxis = tOrientation;
        this.attributeMenu.isLegend = iAxisView.instanceOf( DG.LegendView);

        // We need SC to accomplish the layout of the anchor view before we
        // show the popup menu. Initiating and ending a runloop seems to be one way
        // to accomplish this.
        SC.RunLoop.begin();
          this.menuAnchorView.removeFromParent();
          iAxisView.appendChild( this.menuAnchorView);
          this.menuAnchorView.set('layout', tMenuLayout);
          this.menuAnchorView.set('isVisible', true);
        SC.RunLoop.end();
        this.attributeMenu.popup( this.menuAnchorView, tPreferMatrix);
      },

      getAttributeMenuItems: function() {

        var tChildCollection = this.getPath('dataContext.childCollection'),
            tChildCollectionName = tChildCollection && tChildCollection.get('name'),
            tChildNames = tChildCollection ? tChildCollection.getAttributeNames() : [],
            tChildItems = tChildNames.map(
                            function( aName) {
                              return { title: aName, collection: tChildCollection };
                            }),
            tParentCollection = this.getPath('dataContext.parentCollection'),
            tParentCollectionName = tParentCollection && tParentCollection.get('name'),
            tParentNames = tParentCollection ? tParentCollection.getAttributeNames() : [],
            tParentItems = tParentNames.map(
                              function( aName) {
                                return { title: aName, collection: tParentCollection };
                              });
        if( tParentItems.length === 0) {
          return tChildItems;
        }
        else if (tChildItems.length === 0) {
          return tParentItems;
        }
        else
          return [ { title: tChildCollectionName, subMenu: tChildItems },
                    { title: tParentCollectionName, subMenu: tParentItems } ];
      },

      /** 
        Handle a 'Change...' or 'Remove {location} Attribute' menu item.
        Menu items set up by setupAttributeMenu()
      */
      attributeMenuItemChanged: function() {
        var tNewItem = this.attributeMenu.selectedItem,
            tCollectionClient = tNewItem && tNewItem.collection,
            tAxisOrientation = this.attributeMenu.selectedAxis,
            tAttrRefs,
            tGraphModel = this.get('graphModel'),
            tDataContext = this.get('dataContext');
        if( ! tNewItem )
          return;
        if( tCollectionClient ) {
          // change attribute
          tAttrRefs = { collection: tCollectionClient,
                       attributes: [tCollectionClient.attrsController.objectAt( tNewItem.contentIndex)] };
          if( this.attributeMenu.isLegend)
            tGraphModel.changeAttributeForLegend( tDataContext, tAttrRefs);
          else
            tGraphModel.changeAttributeForAxis( tDataContext, tAttrRefs, tAxisOrientation);
        } else if ( tNewItem.target === tGraphModel ) {
          // remove or change attribute
          tNewItem.itemAction.apply( tNewItem.target, tNewItem.args );
        }
        this.menuAnchorView.set('isVisible', false);
      },

      /**
        An axis view has received a drop of an attribute. Our job is the tell the graph
        model which attribute and collection client to change so that we move into the
        desired configuration of attributes.
      */
      axisViewDidAcceptDrop: function( iAxis, iKey, iDragData) {
        if( SC.none(iDragData)) // The over-notification caused by the * in the observes
          return;       // means we get here at times there isn't any drag data.
        var tDataContext = this.get('dataContext'),
            tCollectionClient = getCollectionClientFromDragData( tDataContext, iDragData);

        iAxis.dragData = null;

         this.get('graphModel').changeAttributeForAxis(
                  tDataContext,
                  { collection: tCollectionClient,
                    attributes: [ iDragData.attribute ] },
                  iAxis.get('orientation'));
      }.observes('*xAxisView.dragData', '*yAxisView.dragData'),

      /**
        The add attribute target has received a drop of an attribute. We respond by adding an
       attribute to whatever is already on the y-axis.
      */
      multiTargetDidAcceptDrop: function( iAxisMultiTarget, iKey, iDragData) {
        if( SC.none(iDragData)) // The over-notification caused by the * in the observes
          return;       // means we get here at times there isn't any drag data.
        var tDataContext = this.get('dataContext'),
            tCollectionClient = getCollectionClientFromDragData( tDataContext, iDragData);

        iAxisMultiTarget.dragData = null;

        this.get('graphModel').addAttributeToAxis(
                  tDataContext,
                  { collection: tCollectionClient,
                    attribute: iDragData.attribute });
      }.observes('*axisMultiTarget.dragData'),

      /**
        The plot or legend view has received a drop of an attribute. Our job is to forward this properly on to
        the graph so that the configuration can be changed.
      */
      plotOrLegendViewDidAcceptDrop: function( iView, iKey, iDragData) {
        if( SC.none(iDragData)) // The over-notification caused by the * in the observes
          return;       // means we get here at times there isn't any drag data.
        var tDataContext = this.get('dataContext'),
            tCollectionClient = getCollectionClientFromDragData( tDataContext, iDragData);

        iView.dragData = null;

        this.get('graphModel').changeAttributeForLegend(
                  tDataContext,
                  { collection: tCollectionClient,
                    attributes: [ iDragData.attribute ]});
      }.observes('*plotView.dragData', '*legendView.dragData')
    };

  }()) // function closure
);

