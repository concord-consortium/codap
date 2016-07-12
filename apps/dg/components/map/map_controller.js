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
        var tLegendAttrDesc = this.getPath('mapModel.dataConfiguration.legendAttributeDescription'),
            tColorMap = tLegendAttrDesc.getPath('attribute.colormap'),
            tAttrColor = !tLegendAttrDesc.get('isNull') ? DG.ColorUtilities.calcAttributeColor( tLegendAttrDesc) : null;

        if (this.getPath('mapModel.hasLatLongAttributes')) {
          return sc_super();
        }
        else if (this.getPath('mapModel.areaVarID') !== DG.Analysis.kNullAttribute) {
          var tPickerArray = [],

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
          else if( tLegendAttrDesc.get('isNumeric')){
             var setLowColor = function( iColor) {
                  tColorMap['low-attribute-color'] = iColor.toHexString();
                  setLegendColor( iColor);
                },
                setHighColor = function( iColor) {
                  tColorMap['high-attribute-color'] = iColor.toHexString();
                  setLegendColor( iColor);
                },
                setLegendColor = function (iColor) {
                  this.setPath('mapModel.areaTransparency', iColor.getAlpha());
                  this.get('mapModel').propertyDidChange('areaColor');  // To force update
                }.bind(this),
                tControlView = SC.View.create(SC.FlowedLayout,
                    {
                      layoutDirection: SC.LAYOUT_HORIZONTAL,
                      layout: {width: 120 },
                      isResizable: false,
                      isClosable: false,
                      //defaultFlowSpacing: {right: 5},
                      canWrap: false,
                      align: SC.ALIGN_TOP
                    }
                ),
                tSpectrumEnds = DG.ColorUtilities.getAttributeColorSpectrumEndsFromColorMap( tColorMap, tAttrColor),
                tLowEndColor = tinycolor(tSpectrumEnds.low.colorString)
                    .setAlpha(this.getPath('dataDisplayModel.transparency')),
                tHighEndColor = tinycolor(tSpectrumEnds.high.colorString)
                    .setAlpha(this.getPath('dataDisplayModel.transparency'));
            tControlView.appendChild( DG.PickerColorControl.create({
                  layout: {width: 60},
                  classNames: 'graph-point-color'.w(),
                  initialColor: tLowEndColor,
                  setColorFunc: setLowColor,
                  //closedFunc: setColorFinalized,
                  appendToLayerFunc: getStylesLayer
                })
            );
            tControlView.appendChild( DG.PickerColorControl.create({
                  layout: {width: 60},
                  classNames: 'graph-point-color'.w(),
                  initialColor: tHighEndColor,
                  setColorFunc: setHighColor,
                  //closedFunc: setColorFinalized,
                  appendToLayerFunc: getStylesLayer
                })
            );
            tPickerArray.push(
                DG.PickerControlView.create({
                  layout: {height: 2 * kRowHeight},
                  label: 'DG.Inspector.legendColor',
                  controlView: tControlView
                })
            );
          }
          else if( tLegendAttrDesc.get('isCategorical')) {
            var setCategoryColor = function (iColor, iColorKey) {
                  tColorMap[iColorKey] = iColor.toHexString();
                  this.setPath('mapModel.transparency', iColor.getAlpha());
                  this.get('mapModel').propertyDidChange('areaColor');
                }.bind(this),
                tContentView = SC.View.create(SC.FlowedLayout,
                    {
                      layoutDirection: SC.LAYOUT_VERTICAL,
                      isResizable: false,
                      isClosable: false,
                      defaultFlowSpacing: {bottom: 5},
                      canWrap: false,
                      align: SC.ALIGN_TOP,
                    }
                ),
                tScrollView = SC.ScrollView.create({
                  layout: {height: 100},
                  hasHorizontalScroller: false,
                  contentView: tContentView
                }),
                tCategoryMap = tLegendAttrDesc.getPath('attributeStats.cellMap');
            DG.ObjectMap.forEach(tCategoryMap, function (iCategory) {
              var tInitialColor = tColorMap[iCategory] ?
                  tColorMap[iCategory] :
                  DG.ColorUtilities.calcCaseColor(iCategory, tLegendAttrDesc).colorString;
              tInitialColor = tinycolor(tInitialColor.colorString || tInitialColor).setAlpha(this.getPath('mapModel.transparency'));
              tContentView.appendChild(DG.PickerControlView.create({
                layout: {height: 2 * kRowHeight},
                label: iCategory,
                controlView: DG.PickerColorControl.create({
                  layout: {width: 120},
                  classNames: 'graph-point-color'.w(),
                  initialColor: tInitialColor,
                  colorKey: iCategory,
                  setColorFunc: setCategoryColor,
                  //closedFunc: setCategoryColorFinalized,
                  appendToLayerFunc: getStylesLayer
                })
              }));
            }.bind(this));
            tPickerArray.push(tScrollView);
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

