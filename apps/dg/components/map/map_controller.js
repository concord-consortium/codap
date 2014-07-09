// ==========================================================================
//                          DG.MapController
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

  DG.MapController provides controller functionaly, particular gear menu items,
  for scatter plots.

  @extends SC.Controller
*/
DG.MapController = DG.ComponentController.extend(
/** @scope DG.MapController.prototype */ 
  (function() {

    function getCollectionClientFromDragData( iContext, iDragData) {
      var collectionID = iDragData.collection && iDragData.collection.get('id');
      return iContext && !SC.none( collectionID) && iContext.getCollectionByID( collectionID);
    }

    return {
      dataContext: null,
      mapModel: null,
      mapView: null,
      legendView: null,

      createComponentStorage: function() {
        var storage = { _links_: {} },
            dataContext = this.get('dataContext'),
            dataConfiguration = this.getPath('mapModel.dataConfiguration'),
            hiddenCases = dataConfiguration && dataConfiguration.get('hiddenCases' );

//        var storeDimension = function( iDim) {
//          var tCollection = dataConfiguration && dataConfiguration.get(iDim + 'CollectionClient' ),
//              tAttrDesc = dataConfiguration && dataConfiguration.get(iDim + 'AttributeDescription' ),
//              tAttrs = (tAttrDesc && tAttrDesc.get('attributes')) || [];
//          if( tCollection && (tAttrs.length > 0)) {
//            storage._links_[iDim + 'Coll'] = tCollection.toLink();
//            var tKey = iDim + 'Attr';
//            tAttrs.forEach( function( iAttr) {
//              DG.ArchiveUtils.addLink( storage, tKey, iAttr);
//            });
//          }
//          storage[iDim + 'Role'] = tAttrDesc.get('role');  // Has a role even without an attribute
//          storage[iDim + 'AttributeType'] = tAttrDesc.get('attributeType');
//        };

        if( dataContext)
          storage._links_.context = dataContext.toLink();

//        storeDimension( 'x');
//        storeDimension( 'y');
//        storeDimension( 'legend');

        if( hiddenCases) {
          storage.hiddenCases = hiddenCases.map( function( iCase) {
            return iCase.get('id');
          });
        }
        return storage;
      },

      restoreComponentStorage: function( iStorage, iDocumentID) {
//        var mapModel = this.get('mapModel'),
//            contextID = this.getLinkID( iStorage, 'context'),
//            dataContext = null;
//
//        if( !SC.none( contextID)) {
//          dataContext = DG.DataContext.retrieveContextFromMap( iDocumentID, contextID);
//          if( dataContext) {
//            this.set('dataContext', dataContext);
//            this.setPath('mapModel.dataConfiguration.dataContext', dataContext);
//          }
//        }
//
//        if( SC.none( iStorage._links_))
//          return; // We don't support the older format 0096 and before. Just bring up the default graph
//                  // that we already have.
//
//        mapModel.restoreStorage( iStorage);
//
//        // There may be some animations that have been set up. We have to stop them so that changes
//        // we make below (e.g. to axis bounds) will stick.
//        mapModel.stopAnimation();
//
      },

      /**
      	When our 'dataContext' is changed, we must let our model know.
       */
      dataContextDidChange: function() {
        var mapModel = this.get('mapModel');
        if( mapModel)
          mapModel.set('dataContext', this.get('dataContext'));
      }.observes('dataContext'),

      /**
        When our model changes, make sure it has the right 'dataContext'.
       */
      modelDidChange: function() {
        // Our model is our component; its content is the graph model
        var mapModel = this.getPath('model.content');
        this.set('mapModel', mapModel);
        if( mapModel)
          mapModel.set('dataContext', this.get('dataContext'));
      }.observes('model'),

      viewDidChange: function() {
        var componentView = this.get('view'),
            mapView = componentView && componentView.get('contentView');
        if( mapView) {
          this.set('mapView', mapView);
          this.set('legendView', mapView.get('legendView'));
          mapView.set('controller', this);
        }
      }.observes('view'),

      /**
      Get the menu items from the graph and its components.
        @property { Array of menu items }
      */
      gearMenuItems: function() {
        var tMap = this.getPath('mapModel');
        return SC.none( tMap) ? [] : tMap.getGearMenuItems();
      }.property('mapModel'),

      mapOrLegendViewDidAcceptDrop: function( iView, iKey, iDragData) {
        if( SC.none(iDragData)) // The over-notification caused by the * in the observes
          return;       // means we get here at times there isn't any drag data.
        var tDataContext = this.get('dataContext'),
            tCollectionClient = getCollectionClientFromDragData( tDataContext, iDragData);

        iView.dragData = null;

        this.get('mapModel').changeAttributeForLegend(
                  tDataContext,
                  { collection: tCollectionClient,
                    attributes: [ iDragData.attribute ]});
      }.observes('*mapView.dragData', '*legendView.dragData')
    };

  }()) // function closure
);

