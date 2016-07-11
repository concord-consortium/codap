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

/* global tinycolor */
sc_require('components/graph_map_common/data_display_controller');

/** @class

  DG.MapController provides controller functionality, for maps.

  @extends SC.DataDisplayController
*/
DG.MapController = DG.DataDisplayController.extend(
/** @scope DG.MapController.prototype */
  (function() {

/*
    function getCollectionClientFromDragData( iContext, iDragData) {
      var collectionID = iDragData.collection && iDragData.collection.get('id');
      return iContext && !SC.none( collectionID) && iContext.getCollectionByID( collectionID);
    }
*/

    return {
      mapModel: function() {
        return this.get('dataDisplayModel');
      }.property('dataDisplayModel'),
      mapView: null,

      createComponentStorage: function() {
        var storage = sc_super();

        storage.mapModelStorage = this.get('mapModel').createStorage();
        return storage;
      },

      restoreComponentStorage: function( iStorage, iDocumentID) {
        sc_super();

        this.get('dataDisplayModel').restoreStorage( iStorage);
      },

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
       * If I'm displaying points, then my superclass returns the right thing. But if I'm displaying boundaries,
       * I have to do my own thing.
       */
      styleControls: function () {

        if (this.getPath('mapModel.hasLatLongAttributes')) {
          return sc_super();
        }
        else if (this.getPath('mapModel.areaVarID') !== DG.Analysis.kNullAttribute) {
          var tPickerArray = [],
              tLegendAttrDesc = this.getPath('dataDisplayModel.dataConfiguration.legendAttributeDescription'),

              setColor = function (iColor) {
                this.setPath('mapModel.areaColor', iColor.toHexString());
                this.setPath('mapModel.areaTransparency', iColor.getAlpha());
              }.bind(this),
              setStroke = function (iColor) {
                this.setPath('mapModel.areaStrokeColor', iColor.toHexString());
                this.setPath('mapModel.areaStrokeTransparency', iColor.getAlpha());
              }.bind(this),
              getStylesLayer = function () {
                return this.stylesPane.layer();
              }.bind(this),
              kRowHeight = 20;

          if( tLegendAttrDesc.get('isNull')) {
            tPickerArray.push(
              DG.PickerControlView.create({
                layout: {height: 2 * kRowHeight},
                label: 'DG.Inspector.color',
                controlView: DG.PickerColorControl.create({
                  layout: {width: 120},
                  classNames: 'map-fill-color'.w(),
                  initialColor: tinycolor(this.getPath('mapModel.areaColor'))
                      .setAlpha(this.getPath('mapModel.areaTransparency')),
                  setColorFunc: setColor,
                  appendToLayerFunc: getStylesLayer
                })
              })
            );
          }
          else {
            var tColorMap = tLegendAttrDesc.getPath('attribute.colormap'),
                tAttrColor = DG.ColorUtilities.calcAttributeColor( tLegendAttrDesc),
                setLegendColor = function (iColor) {
                  tColorMap['attribute-color'] = iColor.toHexString();
                  this.setPath('mapModel.areaTransparency', iColor.getAlpha());
                  this.get('mapModel').propertyDidChange('areaColor');  // To force update
                }.bind(this);
            tPickerArray.push(
                DG.PickerControlView.create({
                  layout: {height: 2 * kRowHeight},
                  label: 'DG.Inspector.legendColor',
                  controlView: DG.PickerColorControl.create({
                    layout: {width: 120},
                    classNames: 'map-fill-color'.w(),
                    initialColor: tinycolor(tAttrColor.colorString)
                        .setAlpha(this.getPath('mapModel.areaTransparency')),
                    setColorFunc: setLegendColor,
                    appendToLayerFunc: getStylesLayer
                  })
                })
            );
          }
          tPickerArray.push(DG.PickerControlView.create({
            layout: {height: 2 * kRowHeight},
            label: 'DG.Inspector.stroke',
            controlView: DG.PickerColorControl.create({
              layout: {width: 120},
              classNames: 'map-areaStroke-color'.w(),
              initialColor: tinycolor(this.getPath('mapModel.areaStrokeColor'))
                  .setAlpha(this.getPath('mapModel.areaStrokeTransparency')),
              setColorFunc: setStroke,
              appendToLayerFunc: getStylesLayer
            })
          }));
          return tPickerArray;
        }
      }.property(),

      /**
       * Called from inspector rescale button
       */
      rescaleFunction: function() {
        this.get('mapView').fitBounds();
      }

    };

  }()) // function closure
);

