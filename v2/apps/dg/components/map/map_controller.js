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
    (function () {

      /*
          function getCollectionClientFromDragData( iContext, iDragData) {
            var collectionID = iDragData.collection && iDragData.collection.get('id');
            return iContext && !SC.none( collectionID) && iContext.getCollectionByID( collectionID);
          }
      */

      return {
        mapModel: function () {
          return this.get('dataDisplayModel');
        }.property('dataDisplayModel'),
        mapView: function() {
          return this.get('contentView');
        }.property('contentView'),

        mapViewDidChange: function () {
          this.setPath('mapView.legendViewCreationCallback', this.setUpLegendView.bind(this));
          this.setPath('mapView.controller', this);
        }.observes('mapView'),

        init: function() {
          sc_super();

          // We respond to changes in the number data contexts
          DG.currDocumentController().addObserver('contextsLength', this, this.handleDataContextChange);
          DG.currDocumentController().notificationManager.addObserver('mostRecentDataContextChanges', this,
              this.dataContextDidChange);
        },

        destroy: function() {
          var tDocController = DG.currDocumentController(),
              tNotificationManager = tDocController && tDocController.notificationManager;
          tDocController && tDocController.removeObserver('contextsLength', this, this.handleDataContextChange);
          tNotificationManager && tNotificationManager.removeObserver('mostRecentDataContextChanges', this,
              this.dataContextDidChange);

          sc_super();
        },

        handleDataContextChange: function() {
          this.invokeLater( function() {
            SC.run( function() {
              this.get('mapModel').adaptToNewOrRemovedContexts();
              this.destroyInspectorButtons();
            }.bind( this));
          }.bind( this), 100);
        },

        /**
         *
         * @param iNotificationManager {DG.NotificationManager}
         */
        dataContextDidChange: function( iNotificationManager) {
          var tChanges = iNotificationManager.get('mostRecentDataContextChanges'),
              tMeaningfulChange = false;
          if (!tChanges) { return; }
          tChanges.forEach( function( iChange) {
            switch (iChange.operation) {
              case 'updateAttributes':
              case 'createAttributes':
                tMeaningfulChange = true;
                break;
            }
          });
          if( tMeaningfulChange)
            this.handleDataContextChange();
        },

        /**
         * A MapView may have multiple legend views. The Label of each needs to be configured
         * properly to show its menu on mouseDown.
         * @param iLegendView {DG.LegendView}
         */
        setUpLegendView: function (iLegendView) {
          this.addAxisHandler(iLegendView);
          iLegendView.addObserver('labelNode', this,
              function () {
                this.addAxisHandler(iLegendView);
              }.bind(this));
        },

        /**
         * We must store information for the mapModel.
         * @return {Object}
         */
        createComponentStorage: function () {
          var storage = sc_super();

          storage.mapModelStorage = this.get('mapModel').createStorage();
          return storage;
        },

        restoreComponentStorage: function (iStorage, iDocumentID) {
          sc_super();

          this.get('dataDisplayModel').restoreStorage(iStorage);
        },

        /**
         * We override here just so we can be observing things that make sense.
         * But superclass can do the work regardless.
         */
        plotOrLegendViewDidAcceptDrop: function (iView, iKey, iDragData) {
          sc_super();
        }.observes('*mapView.dragData'),

        /**
         * The content of the values pane depends on what plot is showing; e.g. a scatterplot will have a checkbox
         * for showing a movable line, while a univariate dot plot will have one for showing a movable value.
         */
        showHideValuesPane: function () {
          var this_ = this,
              kTitleHeight = 26,
              kMargin = 5,
              kLeading = 5,
              kRowHeight = 20;
          if (DG.InspectorPickerPane.close(this.kValuesPaneIconClass)) {
            return; // don't reopen if we just closed
          }
          this.valuesPane = DG.InspectorPickerPane.create(
              {
                buttonIconClass: this.kValuesPaneIconClass,
                classNames: 'dg-inspector-picker'.w(),
                layout: {width: 200, height: 260},
                contentView: SC.View.extend(SC.FlowedLayout,
                    {
                      layoutDirection: SC.LAYOUT_VERTICAL,
                      isResizable: false,
                      isClosable: false,
                      defaultFlowSpacing: {left: kMargin, bottom: kLeading},
                      canWrap: false,
                      align: SC.ALIGN_TOP,
                      // layout: {right: 22},
                      childViews: 'title'.w(),
                      title: DG.PickerTitleView.extend({
                        layout: {height: kTitleHeight},
                        flowSpacing: {left: 0, bottom: kLeading},
                        title: 'DG.Inspector.values',
                        localize: true,
                        iconURL: static_url('images/icon-values.svg')
                      }),
                      init: function () {
                        sc_super();
                        this_.getPath('mapModel.mapLayerModels').forEach(function (iLayerModel) {
                          var tCheckboxDescriptions = iLayerModel.get('checkboxDescriptions');
                          if (tCheckboxDescriptions.length > 0) {
                            var tControlsView = SC.View.create(SC.FlowedLayout,
                                {
                                  layoutDirection: SC.LAYOUT_VERTICAL,
                                  isResizable: false,
                                  isCloseable: false,
                                  defaultFlowSpacing: {left: kMargin, bottom: kLeading},
                                  canWrap: false,
                                  align: SC.ALIGN_TOP,
                                  // layout: {right: 22},
                                  childViews: 'layerName'.w(),
                                  layerName: SC.LabelView.extend({
                                    classNames: 'dg-inspector-layer-title'.w(),
                                    layout: {left: 0, height: kRowHeight },
                                    value: iLayerModel.getPath('dataConfiguration.collectionClient.name')
                                  })
                                });
                            tCheckboxDescriptions.forEach(function (iDesc) {
                              iDesc.layout = {left: 20, height: kRowHeight};
                              iDesc.localize = true;
                              tControlsView.appendChild(SC.CheckboxView.create(iDesc));
                            }.bind(this));
                            this.appendChild(tControlsView);
                          }
                        }.bind(this));
                        this_.getPath('dataDisplayModel.lastValueControls').forEach(function (iControl) {
                          this.appendChild(iControl);
                        }.bind(this));
                      }
                    })
              });
          this.valuesPane.popup(this.get('inspectorButtons')[2], SC.PICKER_POINTER);
        },

        /**
         * If I'm displaying points, then my superclass returns the right thing. But if I'm displaying boundaries,
         * I have to do my own thing.
         */
        styleControls: function () {
          var tMapLayerModels = this.getPath('mapModel.mapLayerModels');

          // For maps, we now have multiple vis-layer configurations with a single shared Base layer.
          // This result is iterated and placed in a vertical flowed layout.
          var tResultArray = [],
              createBaseLayer = function () {
                var tBaseLayer = SC.View.create(SC.FlowedLayout, {
                  layoutDirection: SC.LAYOUT_HORIZONTAL,
                  layout: {right: 0},
                  isResizable: false,
                  isClosable: false,
                  canWrap: false,
                  align: SC.ALIGN_TOP
                });

                tBaseLayer.appendChild(SC.CheckboxView.create({
                  layout: {height: 25, width: 50},
                  title: 'Base',
                  value: this.getPath('mapModel.baseMapLayerIsVisible'),
                  localize: false,
                  valueDidChange: function (iThisView) {
                    this.setPath('mapModel.baseMapLayerIsVisible', iThisView.get('value'));
                    var tMapLayer = this.getPath('mapView.mapLayer');
                    tMapLayer.getPath('backgroundChanged').call(tMapLayer);
                  }.bind(this).observes('value')
                }));

                var tItems = [
                  SC.Object.create({
                    label: 'Oceans',
                    value: 'Oceans', id: 'dg-map-oceans-background-button'
                  }),
                  SC.Object.create({
                    label: 'Topo',
                    value: 'Topographic', id: 'dg-map-topographic-background-button'
                  }),
                  SC.Object.create({
                    label: 'Streets',
                    value: 'Streets', id: 'dg-map-streets-background-button'
                  })
                ];

                tBaseLayer.appendChild(SC.SegmentedView.create({
                  controlSize: SC.SMALL_CONTROL_SIZE,
                  layout: {width: 170, height: 18, top: 5, right: 5},
                  items: tItems,
                  value: this.getPath('mapView.model.baseMapLayerName'),
                  itemTitleKey: 'label',
                  itemValueKey: 'value',
                  itemLayerIdKey: 'id',
                  action: 'changeBaseMap', // Defined below
                  target: this
                }));

                return tBaseLayer;
              }.bind(this);

          tResultArray.push(createBaseLayer());

          tMapLayerModels.forEach(function (iMapLayerModel) {
            var currentOpenSession = null,
                this_ = this,
                tDataConfig = iMapLayerModel.get('dataConfiguration'),
                tLegendAttrDesc = tDataConfig.get('legendAttributeDescription');
            if( !tLegendAttrDesc)
              return; // No legend indicates this layer model has nothing to contribute
            var tCategoryMap = tLegendAttrDesc.getPath('attribute.categoryMap'),
                tAttrColor = !tLegendAttrDesc.get('isNull') ? DG.ColorUtilities.calcAttributeColor(tLegendAttrDesc) : null,
                kRowHeight = 20,
                setCategoryColor = function (iColor, iColorKey) {
                  currentOpenSession = currentOpenSession || Math.random();
                  DG.UndoHistory.execute(DG.Command.create({
                    name: 'data.style.categoryColorChange',
                    undoString: 'DG.Undo.graph.changePointColor',
                    redoString: 'DG.Redo.graph.changePointColor',
                    log: "Changed categorical point color",
                    executeNotification: {
                      action: 'notify',
                      resource: 'component',
                      values: {
                        operation: 'change point color',
                        type: 'DG.MapView'
                      }
                    },
                    execute: function () {
                      this.reduceKey = this.name + iColorKey + currentOpenSession;
                      this._beforeStorage = {
                        color: tCategoryMap[iColorKey],
                        alpha: iMapLayerModel.getPath('transparency')
                      };
                      tCategoryMap[iColorKey] = iColor.toHexString();
                      iMapLayerModel.setPath('transparency', iColor.getAlpha());
                      iMapLayerModel.propertyDidChange('pointColor');
                      if( tLegendAttrDesc.get('attribute'))
                        tLegendAttrDesc.get('attribute').propertyDidChange('categoryMap');
                    },
                    undo: function () {
                      tCategoryMap[iColorKey] = this._beforeStorage.color;
                      iMapLayerModel.setPath('transparency', this._beforeStorage.alpha);
                      iMapLayerModel.propertyDidChange('pointColor');
                    },
                    reduce: function (previous) {
                      if (previous.reduceKey === this.reduceKey) {
                        this._beforeStorage = previous._beforeStorage;
                        return this;
                      }
                    }
                  }));
                },
                createSetColorAndAlphaCommand = function (name, colorAttr, alphaAttr, iColor) {
                  return DG.Command.create({
                    name: 'data.style.' + name,
                    undoString: 'DG.Undo.graph.' + name,
                    redoString: 'DG.Redo.graph.' + name,
                    log: "Changed point color",
                    executeNotification: {
                      action: 'notify',
                      resource: 'component',
                      values: {
                        operation: 'change ' + name,
                        type: 'DG.MapView'
                      }
                    },
                    execute: function () {
                      SC.run(function () {
                        this.reduceKey = this.name + currentOpenSession;
                        this._beforeStorage = {
                          color: iMapLayerModel.getPath(colorAttr),
                          alpha: iMapLayerModel.getPath(alphaAttr)
                        };
                        iMapLayerModel.setPath(colorAttr, iColor.toHexString());
                        iMapLayerModel.setPath(alphaAttr, iColor.getAlpha());
                      }.bind(this));
                    },
                    undo: function () {
                      iMapLayerModel.setPath(colorAttr, this._beforeStorage.color);
                      iMapLayerModel.setPath(alphaAttr, this._beforeStorage.alpha);
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
                    name: 'data.style.' + name,
                    undoString: 'DG.Undo.graph.' + name,
                    redoString: 'DG.Redo.graph.' + name,
                    log: "Changed " + end + " attribute color",
                    executeNotification: {
                      action: 'notify',
                      resource: 'component',
                      values: {
                        operation: 'change attribute color',
                        type: 'DG.MapView'
                      }
                    },
                    execute: function () {
                      this.reduceKey = this.name + currentOpenSession;
                      this._beforeStorage = {
                        color: tCategoryMap[end + '-attribute-color'],
                        alpha: iMapLayerModel.getPath(alphaAttr)
                      };
                      tCategoryMap[end + '-attribute-color'] = iColor.toHexString();
                      iMapLayerModel.setPath(alphaAttr, iColor.getAlpha());
                      iMapLayerModel.propertyDidChange('pointColor');
                      if( tLegendAttrDesc.get('attribute'))
                        tLegendAttrDesc.get('attribute').propertyDidChange('categoryMap');
                    },
                    undo: function () {
                      tCategoryMap['attribute-color'] = this._beforeStorage.color;
                      iMapLayerModel.setPath(alphaAttr, this._beforeStorage.alpha);
                    },
                    reduce: function (previous) {
                      if (previous.reduceKey === this.reduceKey) {
                        this._beforeStorage = previous._beforeStorage;
                        return this;
                      }
                    }
                  });
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
                getStylesLayer = function () {
                  return this_.stylesPane.layer();
                },
                tControlView, tSpectrumEnds, tLowEndColor, tHighEndColor,
                tContentView, tScrollView
            ;

            // E.g., Points and grid layers associated to a data collection.
            var tDataCollectionLayer = SC.View.create(SC.FlowedLayout, {
              layoutDirection: SC.LAYOUT_VERTICAL,
              // layout: {height: 110},
              isResizable: false,
              isClosable: false,
              canWrap: false,
              align: SC.ALIGN_CENTER
            });

            // layer toggle
            tDataCollectionLayer.appendChild(SC.CheckboxView.create({
              layout: {right: 0, height: 20},
              title: tDataConfig.getPath('collectionClient.name'),
              value: iMapLayerModel.get('isVisible'),
              localize: false,
              valueDidChange: function (iThisView) {
                iMapLayerModel.set('isVisible', iThisView.get('value'));
              }.bind(this).observes('value')
            }));

            tResultArray.push(tDataCollectionLayer);

            // Below the toggle we have controls for points or polygons
            var tDataCollectionLayerControls = SC.View.create(SC.FlowedLayout, {
              classNames: 'dg-inspector-map-color-controls'.w(),
              layoutDirection: SC.LAYOUT_VERTICAL,
              // layout: {top: 16, left: 16, right: 0},
              isResizable: false,
              isClosable: false,
              canWrap: false,
              align: SC.ALIGN_LEFT
            });

            tDataCollectionLayer.appendChild(tDataCollectionLayerControls);

            if (iMapLayerModel.get('hasLatLongAttributes')) {
              var setCategoryColorFinalized = function () {
                    currentOpenSession = null;
                  },
                  setColor = function (iColor) {
                    currentOpenSession = currentOpenSession || Math.random();
                    DG.UndoHistory.execute(createSetColorAndAlphaCommand("changePointColor",
                        "pointColor", "transparency", iColor));
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
                  tResult = [
                    DG.PickerControlView.create({
                      layout: {height: kRowHeight},
                      label: 'DG.Inspector.pointSize',
                      controlView: SC.SliderView.create({
                        layout: {left: 80, right: 25},
                        classNames: 'dg-map-pointSize-slider'.w(),
                        controlSize: SC.SMALL_CONTROL_SIZE,
                        value: iMapLayerModel.getPath('pointSizeMultiplier'),
                        minimum: 0, maximum: 3, step: 0,
                        valueChanged: function () {
                          var picker = this;
                          DG.UndoHistory.execute(DG.Command.create({
                            name: 'data.style.pointSizeChanged',
                            undoString: 'DG.Undo.graph.changePointSize',
                            redoString: 'DG.Redo.graph.changePointSize',
                            log: "Changed point size",
                            executeNotification: {
                              action: 'notify',
                              resource: 'component',
                              values: {
                                operation: 'change point size',
                                type: 'DG.MapView'
                              }
                            },
                            execute: function () {
                              this._beforeStorage = iMapLayerModel.getPath('pointSizeMultiplier');
                              iMapLayerModel.setPath('pointSizeMultiplier', picker.get('value'));
                            },
                            undo: function () {
                              iMapLayerModel.setPath('pointSizeMultiplier', this._beforeStorage);
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
                var tInitialColor = tinycolor(iMapLayerModel.getPath('pointColor'))
                    .setAlpha(iMapLayerModel.getPath('transparency'));
                tResult.push(
                    DG.PickerControlView.create({
                      layout: {height: 2 * kRowHeight},
                      label: 'DG.Inspector.color',
                      controlView: DG.PickerColorControl.create({
                        layout: {left: 80, right: 0},
                        classNames: 'dg-graph-point-color'.w(),
                        initialColor: tInitialColor,
                        setColorFunc: setColor,
                        closedFunc: setColorFinalized,
                        appendToLayerFunc: getStylesLayer
                      })
                    })
                );
              }
              else if (tLegendAttrDesc.get('isNumeric')) {
                if (tCategoryMap && SC.none(tCategoryMap['attribute-color'])) {
                  var tColor = DG.ColorUtilities.calcAttributeColor(tLegendAttrDesc);
                  tCategoryMap['attribute-color'] = tColor.colorString || tColor;
                }

                tAttrColor = tCategoryMap && tCategoryMap['attribute-color'];

                tControlView = SC.View.create(SC.FlowedLayout,
                    {
                      layoutDirection: SC.LAYOUT_HORIZONTAL,
                      layout: {width: 120, right: 20},
                      isResizable: false,
                      isClosable: false,
                      //defaultFlowSpacing: {right: 5},
                      canWrap: false,
                      align: SC.ALIGN_TOP
                    }
                );
                tSpectrumEnds = DG.ColorUtilities.getAttributeColorSpectrumEndsFromColorMap(tCategoryMap, tAttrColor);
                tLowEndColor = tinycolor(tSpectrumEnds.low.colorString)
                    .setAlpha(iMapLayerModel.getPath('transparency'));
                tHighEndColor = tinycolor(tSpectrumEnds.high.colorString)
                    .setAlpha(iMapLayerModel.getPath('transparency'));
                tControlView.appendChild(DG.PickerColorControl.create({
                      layout: {width: 60},
                      classNames: 'dg-graph-point-color'.w(),
                      initialColor: tLowEndColor,
                      setColorFunc: setLowColor,
                      closedFunc: setColorFinalized,
                      appendToLayerFunc: getStylesLayer
                    })
                );
                tControlView.appendChild(DG.PickerColorControl.create({
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
                      controlView: tControlView
                    })
                );
              }
              tResult.push(
                  DG.PickerControlView.create({
                    layout: {height: 2 * kRowHeight},
                    label: 'DG.Inspector.stroke',
                    controlView: DG.PickerColorControl.create({
                      layout: {left: 80, right: 0},
                      classNames: 'dg-graph-stroke-color'.w(),
                      initialColor: tinycolor(iMapLayerModel.get('strokeColor'))
                          .setAlpha(iMapLayerModel.get('strokeTransparency')),
                      setColorFunc: setStroke,
                      closedFunc: setStrokeFinalized,
                      appendToLayerFunc: getStylesLayer
                    })
                  })
              );
              tResult.push(SC.CheckboxView.create({
                layout: {height: 25},
                title: 'DG.Inspector.strokeSameAsFill',
                value: iMapLayerModel.get('strokeSameAsFill'),
                classNames: 'dg-graph-strokeSameAsFill-check'.w(),
                localize: true,
                valueDidChange: function () {
                  var becomingSameAsFill = !iMapLayerModel.get('strokeSameAsFill'),
                      logMessage = "Made stroke color " + (becomingSameAsFill ? "same as fill" : "independent of fill");
                  DG.UndoHistory.execute(DG.Command.create({
                    name: 'map.strokeSameAsFillChange',
                    undoString: becomingSameAsFill ? 'DG.Undo.graph.makeStrokeSameAsFill' : 'DG.Undo.graph.makeStrokeIndependent',
                    redoString: becomingSameAsFill ? 'DG.Redo.graph.makeStrokeSameAsFill' : 'DG.Redo.graph.makeStrokeIndependent',
                    log: logMessage,
                    executeNotification: {
                      action: 'notify',
                      resource: 'component',
                      values: {
                        operation: 'toggle stroke same as fill',
                        type: 'DG.MapView'
                      }
                    },
                    execute: function () {
                      iMapLayerModel.toggleProperty('strokeSameAsFill');
                    }.bind(this),
                    undo: function () {
                      iMapLayerModel.toggleProperty('strokeSameAsFill');
                    }.bind(this)
                  }));
                }.bind(this).observes('value')
              }));
              if (tLegendAttrDesc.get('isCategorical')) {
                tContentView = SC.View.create(SC.FlowedLayout,
                    {
                      layoutDirection: SC.LAYOUT_VERTICAL,
                      isResizable: false,
                      isClosable: false,
                      defaultFlowSpacing: {bottom: 5},
                      canWrap: false,
                      align: SC.ALIGN_TOP
                    }
                );
                tScrollView = SC.ScrollView.create({
                  layout: {height: 100},
                  hasHorizontalScroller: false,
                  contentView: tContentView
                });
                var tAttribute = tLegendAttrDesc.get('attribute');
                tAttribute.forEachCategory(function (iCategory) {
                  var tCalcColor = DG.ColorUtilities.calcCaseColor(iCategory, tLegendAttrDesc),
                      tInitialColor = tCategoryMap[iCategory] ?
                      tCategoryMap[iCategory] :
                          tCalcColor.colorString || tCalcColor;
                  tInitialColor = tinycolor(tInitialColor.colorString || tInitialColor).setAlpha(iMapLayerModel.getPath('transparency'));
                  tContentView.appendChild(DG.PickerControlView.create({
                    layout: {height: 2 * kRowHeight},
                    label: iCategory,
                    controlView: DG.PickerColorControl.create({
                      layout: {width: 80, right: 0},
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
            else if (iMapLayerModel.get('hasPolygonAttribute')) {
              var tPickerArray = [],

                  setAreaColor = function (iColor) {
                    iMapLayerModel.setPath('areaColor', iColor.toHexString());
                    iMapLayerModel.setPath('areaTransparency', iColor.getAlpha());
                  }.bind(this),
                  setAreaStroke = function (iColor) {
                    iMapLayerModel.setPath('areaStrokeColor', iColor.toHexString());
                    iMapLayerModel.setPath('areaStrokeTransparency', iColor.getAlpha());
                  }.bind(this);

              if (tLegendAttrDesc.get('isNull')) {
                tPickerArray.push(
                    DG.PickerControlView.create({
                      layout: {height: 2 * kRowHeight},
                      label: 'DG.Inspector.color',
                      controlView: DG.PickerColorControl.create({
                        layout: {left: 80, right: 0},
                        classNames: 'dg-map-fill-color'.w(),
                        initialColor: tinycolor(iMapLayerModel.getPath('areaColor'))
                            .setAlpha(iMapLayerModel.getPath('areaTransparency')),
                        setColorFunc: setAreaColor,
                        appendToLayerFunc: getStylesLayer
                      })
                    })
                );
              }
              else if (tLegendAttrDesc.get('isNumeric')) {
                tControlView = SC.View.create(SC.FlowedLayout,
                    {
                      layoutDirection: SC.LAYOUT_HORIZONTAL,
                      layout: {right: 0},
                      isResizable: false,
                      isClosable: false,
                      //defaultFlowSpacing: {right: 5},
                      canWrap: false,
                      align: SC.ALIGN_TOP
                    }
                );
                tSpectrumEnds = DG.ColorUtilities.getAttributeColorSpectrumEndsFromColorMap(tCategoryMap, tAttrColor);
                tLowEndColor = tinycolor(tSpectrumEnds.low.colorString)
                    .setAlpha(iMapLayerModel.getPath('transparency'));
                tHighEndColor = tinycolor(tSpectrumEnds.high.colorString)
                    .setAlpha(iMapLayerModel.getPath('transparency'));
                tControlView.appendChild(DG.PickerColorControl.create({
                      layout: {width: 60},
                      classNames: 'dg-graph-point-color'.w(),
                      initialColor: tLowEndColor,
                      setColorFunc: setLowColor,
                      //closedFunc: setColorFinalized,
                      appendToLayerFunc: getStylesLayer
                    })
                );
                tControlView.appendChild(DG.PickerColorControl.create({
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
              else if (tLegendAttrDesc.get('isCategorical')) {
                tContentView = SC.View.create(SC.FlowedLayout,
                    {
                      layoutDirection: SC.LAYOUT_VERTICAL,
                      isResizable: false,
                      isClosable: false,
                      defaultFlowSpacing: {bottom: 5},
                      canWrap: false,
                      align: SC.ALIGN_TOP
                    }
                );
                tScrollView = SC.ScrollView.create({
                  layout: {height: 100},
                  hasHorizontalScroller: false,
                  contentView: tContentView
                });
                var tLegendAttribute = tLegendAttrDesc.get('attribute');
                tLegendAttribute.forEachCategory(function (iCategory) {
                  var tCalcColor = DG.ColorUtilities.calcCaseColor(iCategory, tLegendAttrDesc),
                      tInitialColor = tCategoryMap[iCategory] ?
                      tCategoryMap[iCategory] :
                          tCalcColor.colorString || tCalcColor;
                  tInitialColor = tinycolor(tInitialColor.colorString || tInitialColor).setAlpha(iMapLayerModel.get('transparency'));
                  tContentView.appendChild(DG.PickerControlView.create({
                    layout: {height: 2 * kRowHeight},
                    label: iCategory,
                    controlView: DG.PickerColorControl.create({
                      layout: {width: 80, right: 0},
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
                  layout: {left: 80, right: 0},
                  classNames: 'map-areaStroke-color'.w(),
                  initialColor: tinycolor(iMapLayerModel.getPath('areaStrokeColor'))
                      .setAlpha(iMapLayerModel.getPath('areaStrokeTransparency')),
                  setColorFunc: setAreaStroke,
                  appendToLayerFunc: getStylesLayer
                })
              }));

              tPickerArray.push(SC.CheckboxView.create({
                layout: {height: 25},
                title: 'DG.Inspector.strokeSameAsFill',
                value: iMapLayerModel.get('strokeSameAsFill'),
                classNames: 'dg-graph-strokeSameAsFill-check'.w(),
                localize: true,
                valueDidChange: function () {
                  var becomingSameAsFill = !iMapLayerModel.get('strokeSameAsFill'),
                      logMessage = "Made stroke color " + (becomingSameAsFill ? "same as fill" : "independent of fill");
                  DG.UndoHistory.execute(DG.Command.create({
                    name: 'map.strokeSameAsFillChange',
                    undoString: becomingSameAsFill ? 'DG.Undo.graph.makeStrokeSameAsFill' : 'DG.Undo.graph.makeStrokeIndependent',
                    redoString: becomingSameAsFill ? 'DG.Redo.graph.makeStrokeSameAsFill' : 'DG.Redo.graph.makeStrokeIndependent',
                    log: logMessage,
                    executeNotification: {
                      action: 'notify',
                      resource: 'component',
                      values: {
                        operation: 'toggle stroke same as fill',
                        type: 'DG.MapView'
                      }
                    },
                    execute: function () {
                      iMapLayerModel.toggleProperty('strokeSameAsFill');
                    }.bind(this),
                    undo: function () {
                      iMapLayerModel.toggleProperty('strokeSameAsFill');
                    }.bind(this)
                  }));
                }.bind(this).observes('value')
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
        rescaleFunction: function () {
          this.get('mapView').fitBounds();
        },

        // Copied and modified from map_view.js so it calls back the original and updates its value
        changeBaseMap: function (iSegmentedView) {
          this.getPath('mapView').changeBaseMap(iSegmentedView.get('value'));
        }
      };

    }()) // function closure
);

