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
        var dataConfigurations = this.getPath('mapModel.mapDataConfigurations');
        // var mapPointLayers = this.getPath('mapView.mapPointView.mapPointLayers');

        // For maps, we now have multiple vis-layer configurations with a single shared Base layer.
        // This result is iterated and placed in a vertical flowed layout.
        var tResultArray = [];

        // Using left/right 2-pane layout for each vertical layer.
        var tBaseLayer = SC.View.create(SC.FlowedLayout, {
          layoutDirection: SC.LAYOUT_HORIZONTAL,
          layout: { width: 100 },
          isResizable: false,
          isClosable: false,
          canWrap: false,
          align: SC.ALIGN_TOP
        });

        tBaseLayer.appendChild(SC.CheckboxView.create({
          layout: { height: 25, width: 50 },
          title: 'Base',
          value: this.getPath('mapModel.baseMapLayerToggle'),
          localize: false,
          valueDidChange: function (iThisView) {
            this.setPath('mapModel.baseMapLayerToggle', iThisView.get('value'));
            var tMapLayer = this.getPath('mapView.mapLayer');
            tMapLayer.getPath('backgroundChanged').call(tMapLayer);
          }.bind(this).observes('value')
        }));

        // Note: Copied from map_view.js. The IDs had to be different from the original, otherwise the selection by click does not work!
        var tItems = [
          SC.Object.create( { label: 'Oceans',
            value: 'Oceans', id: 'dg-map-oceans-background-button2'}),
          SC.Object.create( { label: 'Topo',
            value: 'Topographic', id: 'dg-map-topographic-background-button2'} ),
          SC.Object.create( { label: 'Streets',
            value: 'Streets', id: 'dg-map-streets-background-button2'} )
        ];

        tBaseLayer.appendChild(SC.SegmentedView.create({
          controlSize: SC.SMALL_CONTROL_SIZE,
          layout: { width: 170, height: 18, top: 5, right: 5 },
          items: tItems,
          value: this.getPath('mapView.backgroundControl.value'),
          itemTitleKey: 'label',
          itemValueKey: 'value',
          itemLayerIdKey: 'id',
          action: 'changeBaseMap', // Defined below
          target: this
        }));

        tResultArray.push(tBaseLayer);

        dataConfigurations.forEach(function (iDataConfig, iConfigIdx) {
          var tMapLayerModel = this.getPath('mapModel.mapLayerModels')[iConfigIdx];

          var tLegendAttrDesc = iDataConfig.get('legendAttributeDescription'),
              tCategoryMap = tLegendAttrDesc.getPath('attribute.categoryMap'),
              tAttrColor = !tLegendAttrDesc.get('isNull') ? DG.ColorUtilities.calcAttributeColor( tLegendAttrDesc) : null,
              kRowHeight = 20;

          // E.g., Points and grid layers associated to a data collection.
          var tDataCollectionLayer = SC.View.create(SC.FlowedLayout, {
            layoutDirection: SC.LAYOUT_HORIZONTAL,
            layout: { width: 200, height: 100 },
            isResizable: false,
            isClosable: false,
            canWrap: false,
            align: SC.ALIGN_CENTER
          });

          // Left-side layer toggle
          tDataCollectionLayer.appendChild(SC.CheckboxView.create({
            layout: { width: 80 },
            title: iDataConfig.getPath('collectionClient.title'),
            value: true,
            localize: false,
            valueDidChange: function (iThisView) {
              // tMapLayerModel.togglePoints(iThisView.get('value'));
              tMapLayerModel.set('pointsShouldBeVisible', iThisView.get('value'));
              this.getPath('mapView.plottedPointsDidChange');
              // tMapLayerModel.propertyDidChange('pointsShouldBeVisible');
              // mapPointLayers[iConfigIdx].notifyPropertyChange('pointsShouldBeVisible');
            }.bind(this).observes('value')
          }));

          tResultArray.push(tDataCollectionLayer);

          // Right-side controls for a map layer
          var tDataCollectionLayerControls = SC.View.create(SC.FlowedLayout, {
            layoutDirection: SC.LAYOUT_VERTICAL,
            layout: { width: 200 },
            isResizable: false,
            isClosable: false,
            canWrap: false,
            align: SC.ALIGN_LEFT
          });

          tDataCollectionLayer.appendChild(tDataCollectionLayerControls);

          if (tMapLayerModel.get('hasLatLongAttributes')) {
            var this_ = this,
                currentOpenSession = null,
                setCategoryColor = function (iColor, iColorKey) {
                  currentOpenSession = currentOpenSession || Math.random();
                  DG.UndoHistory.execute(DG.Command.create({
                    name: 'data.style.categoryColorChange',
                    undoString: 'DG.Undo.graph.changePointColor',
                    redoString: 'DG.Redo.graph.changePointColor',
                    log: "Changed categorical point color",
                    execute: function() {
                      this.reduceKey = this.name + iColorKey + currentOpenSession;
                      this._beforeStorage = {
                        color: tCategoryMap[iColorKey],
                        alpha: tMapLayerModel.getPath('transparency')
                      };
                      tCategoryMap[iColorKey] = iColor.toHexString();
                      tMapLayerModel.setPath('transparency', iColor.getAlpha());
                      tMapLayerModel.propertyDidChange('pointColor');
                    },
                    undo: function () {
                      tCategoryMap[iColorKey] = this._beforeStorage.color;
                      tMapLayerModel.setPath('transparency', this._beforeStorage.alpha);
                      tMapLayerModel.propertyDidChange('pointColor');
                    },
                    reduce: function (previous) {
                      if (previous.reduceKey === this.reduceKey) {
                        this._beforeStorage = previous._beforeStorage;
                        return this;
                      }
                    }
                  }));
                },
                setCategoryColorFinalized = function () {
                  currentOpenSession = null;
                },
                createSetColorAndAlphaCommand = function (name, colorAttr, alphaAttr, iColor) {
                  return DG.Command.create({
                    name: 'data.style.'+name,
                    undoString: 'DG.Undo.graph.'+name,
                    redoString: 'DG.Redo.graph.'+name,
                    log: "Changed point color",
                    execute: function() {
                      SC.run( function() {
                        this.reduceKey = this.name + currentOpenSession;
                        this._beforeStorage = {
                          color: tMapLayerModel.getPath(colorAttr),
                          alpha: tMapLayerModel.getPath(alphaAttr)
                        };
                        tMapLayerModel.setPath(colorAttr, iColor.toHexString());
                        tMapLayerModel.setPath(alphaAttr, iColor.getAlpha());
                      }.bind( this));
                    },
                    undo: function () {
                      tMapLayerModel.setPath(colorAttr, this._beforeStorage.color);
                      tMapLayerModel.setPath(alphaAttr, this._beforeStorage.alpha);
                    },
                    reduce: function (previous) {
                      if (previous.reduceKey === this.reduceKey) {
                        this._beforeStorage = previous._beforeStorage;
                        return this;
                      }
                    }
                  });
                },
                createSetAttributeColorCommand = function (name, end, alphaAttr, iColor) {
                  return DG.Command.create({
                    name: 'data.style.'+name,
                    undoString: 'DG.Undo.graph.'+name,
                    redoString: 'DG.Redo.graph.'+name,
                    log: "Changed" + end + " attribute color",
                    execute: function() {
                      this.reduceKey = this.name + currentOpenSession;
                      this._beforeStorage = {
                        color: tCategoryMap[end + '-attribute-color'],
                        alpha: tMapLayerModel.getPath(alphaAttr)
                      };
                      tCategoryMap[end + '-attribute-color'] = iColor.toHexString();
                      tMapLayerModel.setPath(alphaAttr, iColor.getAlpha());
                      tMapLayerModel.propertyDidChange('pointColor');
                    },
                    undo: function () {
                      tCategoryMap['attribute-color'] = this._beforeStorage.color;
                      tMapLayerModel.setPath(alphaAttr, this._beforeStorage.alpha);
                    },
                    reduce: function (previous) {
                      if (previous.reduceKey === this.reduceKey) {
                        this._beforeStorage = previous._beforeStorage;
                        return this;
                      }
                    }
                  });
                },
                setColor = function (iColor) {
                  currentOpenSession = currentOpenSession || Math.random();
                  DG.UndoHistory.execute(createSetColorAndAlphaCommand("changePointColor",
                    "pointColor", "transparency", iColor));
                },
                setLowColor = function (iColor) {
                  currentOpenSession = currentOpenSession || Math.random();
                  DG.UndoHistory.execute(createSetAttributeColorCommand("changeAttributeColor", "low",
                    "transparency", iColor));
                },
                setHighColor = function (iColor) {
                  currentOpenSession = currentOpenSession || Math.random();
                  DG.UndoHistory.execute(createSetAttributeColorCommand("changeAttributeColor", "high",
                    "transparency", iColor));
                },
                setColorFinalized = function () {
                  currentOpenSession = null;
                },
                setStroke = function (iColor) {
                  currentOpenSession = currentOpenSession || Math.random();
                  DG.UndoHistory.execute(createSetColorAndAlphaCommand("changeStrokeColor",
                    "strokeColor", "strokeTransparency", iColor));
                },
                setStrokeFinalized = function () {
                  currentOpenSession = null;
                },
                getStylesLayer = function () {
                  return this_.stylesPane.layer();
                },
                tResult = [
                  DG.PickerControlView.create({
                    layout: {height: kRowHeight},
                    label: 'DG.Inspector.pointSize',
                    controlView: SC.SliderView.create({
                      layout: {width: 120},
                      classNames: 'dg-graph-pointSize-slider'.w(),
                      controlSize: SC.SMALL_CONTROL_SIZE,
                      value: tMapLayerModel.getPath('pointSizeMultiplier'),
                      minimum: 0, maximum: 3, step: 0,
                      valueChanged: function () {
                        var picker = this;
                        DG.UndoHistory.execute(DG.Command.create({
                          name: 'data.style.pointSizeChanged',
                          undoString: 'DG.Undo.graph.changePointSize',
                          redoString: 'DG.Redo.graph.changePointSize',
                          log: "Changed point size",
                          execute: function() {
                            this._beforeStorage = tMapLayerModel.getPath('pointSizeMultiplier');
                            tMapLayerModel.setPath('pointSizeMultiplier', picker.get('value'));
                          },
                          undo: function () {
                            tMapLayerModel.setPath('pointSizeMultiplier', this._beforeStorage);
                          },
                          reduce: function (previous) {
                            if (previous.name === this.name) {
                              this._beforeStorage = previous._beforeStorage;
                              return this;
                            }
                          }
                        }));
                      }.observes('value')
                    })
                  })
                ];

            if (tLegendAttrDesc.get('isNull')) {
              var tInitialColor = tinycolor(tMapLayerModel.getPath('pointColor'))
                .setAlpha(tMapLayerModel.getPath('transparency'));
              tResult.push(
                DG.PickerControlView.create({
                  layout: {height: 2 * kRowHeight},
                  label: 'DG.Inspector.color',
                  controlView: DG.PickerColorControl.create({
                    layout: {width: 120},
                    classNames: 'dg-graph-point-color'.w(),
                    initialColor: tInitialColor,
                    setColorFunc: setColor,
                    closedFunc: setColorFinalized,
                    appendToLayerFunc: getStylesLayer
                  })
                })
              );
            }
            else if( tLegendAttrDesc.get('isNumeric')) {
              if(tCategoryMap && SC.none( tCategoryMap['attribute-color'])) {
                tCategoryMap['attribute-color'] = DG.ColorUtilities.calcAttributeColor( tLegendAttrDesc).colorString;
              }

              tAttrColor = tCategoryMap && tCategoryMap['attribute-color'];

              var tControlView = SC.View.create(SC.FlowedLayout,
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
                tSpectrumEnds = DG.ColorUtilities.getAttributeColorSpectrumEndsFromColorMap( tCategoryMap, tAttrColor),
                tLowEndColor = tinycolor(tSpectrumEnds.low.colorString)
                  .setAlpha(tMapLayerModel.getPath('transparency')),
                tHighEndColor = tinycolor(tSpectrumEnds.high.colorString)
                  .setAlpha(tMapLayerModel.getPath('transparency'));
              tControlView.appendChild( DG.PickerColorControl.create({
                  layout: {width: 60},
                  classNames: 'dg-graph-point-color'.w(),
                  initialColor: tLowEndColor,
                  setColorFunc: setLowColor,
                  closedFunc: setColorFinalized,
                  appendToLayerFunc: getStylesLayer
                })
              );
              tControlView.appendChild( DG.PickerColorControl.create({
                  layout: {width: 60},
                  classNames: 'dg-graph-point-color'.w(),
                  initialColor: tHighEndColor,
                  setColorFunc: setHighColor,
                  closedFunc: setColorFinalized,
                  appendToLayerFunc: getStylesLayer
                })
              );
              tResult.push(
                DG.PickerControlView.create({
                  layout: {height: 2 * kRowHeight},
                  label: 'DG.Inspector.legendColor',
                  controlView:tControlView
                })
              );
            }
            tResult.push(
              DG.PickerControlView.create({
                layout: {height: 2 * kRowHeight},
                label: 'DG.Inspector.stroke',
                controlView: DG.PickerColorControl.create({
                  layout: {width: 120},
                  classNames: 'dg-graph-stroke-color'.w(),
                  initialColor: tinycolor(tMapLayerModel.getPath('strokeColor'))
                    .setAlpha(tMapLayerModel.getPath('strokeTransparency')),
                  setColorFunc: setStroke,
                  closedFunc: setStrokeFinalized,
                  appendToLayerFunc: getStylesLayer
                })
              })
            );
            if (tLegendAttrDesc.get('isCategorical')) {
              var tContentView = SC.View.create(SC.FlowedLayout,
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
                tAttribute = tLegendAttrDesc.get('attribute');
              tAttribute.forEachCategory(function (iCategory) {
                var tInitialColor = tCategoryMap[iCategory] ?
                  tCategoryMap[iCategory] :
                  DG.ColorUtilities.calcCaseColor(iCategory, tLegendAttrDesc).colorString;
                tInitialColor = tinycolor(tInitialColor.colorString || tInitialColor).
                setAlpha(tMapLayerModel.getPath('transparency'));
                tContentView.appendChild(DG.PickerControlView.create({
                  layout: {height: 2 * kRowHeight},
                  label: iCategory,
                  controlView: DG.PickerColorControl.create({
                    layout: {width: 120},
                    classNames: 'dg-graph-point-color'.w(),
                    initialColor: tInitialColor,
                    colorKey: iCategory,
                    setColorFunc: setCategoryColor,
                    closedFunc: setCategoryColorFinalized,
                    appendToLayerFunc: getStylesLayer
                  })
                }));
              }.bind(this));
              tResult.push(tScrollView);
            }

            tResult.forEach(function (iLayerComponent) {
              tDataCollectionLayerControls.appendChild(iLayerComponent);
            });
          }
          else if (tMapLayerModel.getPath('areaVarID') !== DG.Analysis.kNullAttribute) {
            var tPickerArray = [],

              setAreaColor = function (iColor) {
                tMapLayerModel.setPath('areaColor', iColor.toHexString());
                tMapLayerModel.setPath('areaTransparency', iColor.getAlpha());
              }.bind(this),
              setAreaStroke = function (iColor) {
                tMapLayerModel.setPath('areaStrokeColor', iColor.toHexString());
                tMapLayerModel.setPath('areaStrokeTransparency', iColor.getAlpha());
              }.bind(this),
              getStylesLayer = function () {
                return this.stylesPane.layer();
              }.bind(this);

            if( tLegendAttrDesc.get('isNull')) {
              tPickerArray.push(
                DG.PickerControlView.create({
                  layout: {height: 2 * kRowHeight},
                  label: 'DG.Inspector.color',
                  controlView: DG.PickerColorControl.create({
                    layout: {width: 120},
                    classNames: 'dg-map-fill-color'.w(),
                    initialColor: tinycolor(tMapLayerModel.getPath('areaColor'))
                      .setAlpha(tMapLayerModel.getPath('areaTransparency')),
                    setColorFunc: setAreaColor,
                    appendToLayerFunc: getStylesLayer
                  })
                })
              );
            }
            else if( tLegendAttrDesc.get('isNumeric')){
              var setLowColor = function( iColor) {
                  tCategoryMap['low-attribute-color'] = iColor.toHexString();
                  setLegendColor( iColor);
                },
                setHighColor = function( iColor) {
                  tCategoryMap['high-attribute-color'] = iColor.toHexString();
                  setLegendColor( iColor);
                },
                setLegendColor = function (iColor) {
                  tMapLayerModel.setPath('areaTransparency', iColor.getAlpha());
                  tMapLayerModel.propertyDidChange('areaColor');  // To force update
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
                tSpectrumEnds = DG.ColorUtilities.getAttributeColorSpectrumEndsFromColorMap( tCategoryMap, tAttrColor),
                tLowEndColor = tinycolor(tSpectrumEnds.low.colorString)
                  .setAlpha(tMapLayerModel.getPath('transparency')),
                tHighEndColor = tinycolor(tSpectrumEnds.high.colorString)
                  .setAlpha(tMapLayerModel.getPath('transparency'));
              tControlView.appendChild( DG.PickerColorControl.create({
                  layout: {width: 60},
                  classNames: 'dg-graph-point-color'.w(),
                  initialColor: tLowEndColor,
                  setColorFunc: setLowColor,
                  //closedFunc: setColorFinalized,
                  appendToLayerFunc: getStylesLayer
                })
              );
              tControlView.appendChild( DG.PickerColorControl.create({
                  layout: {width: 60},
                  classNames: 'dg-graph-point-color'.w(),
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
                  tCategoryMap[iColorKey] = iColor.toHexString();
                  tMapLayerModel.setPath('transparency', iColor.getAlpha());
                  tMapLayerModel.propertyDidChange('areaColor');
                }.bind(this),
                tContentView = SC.View.create(SC.FlowedLayout,
                  {
                    layoutDirection: SC.LAYOUT_VERTICAL,
                    isResizable: false,
                    isClosable: false,
                    defaultFlowSpacing: {bottom: 5},
                    canWrap: false,
                    align: SC.ALIGN_TOP
                  }
                ),
                tScrollView = SC.ScrollView.create({
                  layout: {height: 100},
                  hasHorizontalScroller: false,
                  contentView: tContentView
                }),
                tLegendAttribute = tLegendAttrDesc.get('attribute');
              tLegendAttribute.forEachCategory(function (iCategory) {
                var tInitialColor = tCategoryMap[iCategory] ?
                  tCategoryMap[iCategory] :
                  DG.ColorUtilities.calcCaseColor(iCategory, tLegendAttrDesc).colorString;
                tInitialColor = tinycolor(tInitialColor.colorString || tInitialColor).setAlpha(tMapLayerModel('transparency'));
                tContentView.appendChild(DG.PickerControlView.create({
                  layout: {height: 2 * kRowHeight},
                  label: iCategory,
                  controlView: DG.PickerColorControl.create({
                    layout: {width: 120},
                    classNames: 'dg-graph-point-color'.w(),
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
                initialColor: tinycolor(tMapLayerModel.getPath('areaStrokeColor'))
                  .setAlpha(tMapLayerModel.getPath('areaStrokeTransparency')),
                setColorFunc: setAreaStroke,
                appendToLayerFunc: getStylesLayer
              })
            }));

            // Instead of returning tPickerArray...
            tPickerArray.forEach(function (item) {
              tDataCollectionLayerControls.appendChild(item);
            });
          }
        }.bind(this));

        return tResultArray;

      }.property(),

      /**
       * Called from inspector rescale button
       */
      rescaleFunction: function() {
        this.get('mapView').fitBounds();
      },

      // Copied and modified from map_view.js so it calls back the original and updates its value
      changeBaseMap: function(iThisView) {
        var tMapView = this.getPath('mapView'),
            tMapViewBgControl = tMapView.getPath('backgroundControl');
        tMapViewBgControl.set('value', iThisView.get('value'));
        tMapView.get('changeBaseMap').call(tMapView);
      }
    };

  }()) // function closure
);

