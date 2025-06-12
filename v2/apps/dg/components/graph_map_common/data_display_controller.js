// ==========================================================================
//                          DG.DataDisplayController
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

sc_require('controllers/component_controller');

/** @class

    DG.DataDisplayController provides controller functionaly, particular gear menu items,
 for scatter plots.

 @extends SC.Controller
 */
DG.DataDisplayController = DG.ComponentController.extend(
    /** @scope DG.DataDisplayController.prototype */
    (function () {

      var kConfigPaneIconClass = 'moonicon-icon-segmented-bar-chart',
          kStylesPaneIconClass = 'moonicon-icon-styles';

      function getCollectionClientFromDragData(iContext, iDragData) {
        var collectionID = iDragData.collection && iDragData.collection.get('id');
        return iContext && !SC.none(collectionID) && iContext.getCollectionByID(collectionID);
      }


      return {
        kValuesPaneIconClass: 'moonicon-icon-values',

        dataContext: null,
        dataDisplayModel: null,
        legendView: null,
        stylesPane: null,

        /**
         * With the advent of map plotting multiple data contexts there is nothing we can do in common for
         * maps and graphs.
         * @return {{}}
         */
        createComponentStorage: function () {
          return {};
        },

        restoreComponentStorage: function (iStorage, iDocumentID) {
          sc_super();
          var contextID = this.getLinkID(iStorage, 'context'),
              dataContext = null;

          if (!SC.none(contextID)) {
            dataContext = DG.currDocumentController().getContextByID(contextID);
            if (dataContext) {
              this.set('dataContext', dataContext);
              this.setPath('dataDisplayModel.dataConfiguration.dataContext', dataContext);
            }
          }
        },

        /**
         When our 'dataContext' is changed, we must let our model know.
         */
        dataContextDidChange: function () {
          var dataDisplayModel = this.get('dataDisplayModel');
          if (dataDisplayModel)
            dataDisplayModel.set('dataContext', this.get('dataContext'));
        }.observes('dataContext'),

        /**
         When our model changes, make sure it has the right 'dataContext'.
         */
        modelDidChange: function () {
          // Our model is our component; its content is the graph model
          var dataDisplayModel = this.getPath('model.content');
          this.set('dataDisplayModel', dataDisplayModel);
          if (dataDisplayModel) {
            dataDisplayModel.set('dataContext', this.get('dataContext'));
            dataDisplayModel.set('componentID', this.getPath('model.id'));
          }
        }.observes('model'),

        init: function () {
          sc_super();
        },

        childmostCollectionTitle: function() {
          return this.getPath('dataDisplayModel.childmostCollectionTitle');
        }.property(),

        setComponentTitleByChildmostCollection: function() {
          if( !this.getPath('model.userSetTitle'))
            this.setPath('model.title', this.get('childmostCollectionTitle'));
        },

      /** Submenu items for copying/exporting component images */
      createImageExportMenuItems: function() {
        var tIsMapView = this.getPath('model.type') === 'DG.MapView',
            tBackground = this.getPath('graphModel.plotBackgroundImage'),
            tBackgroundCue = tBackground ?
                  'DG.DataDisplayMenu.removeBackgroundImage' : 'DG.DataDisplayMenu.addBackgroundImage',
            tBackgroundAction = tBackground ? 'removeBackgroundImage' : 'addBackgroundImage',
            tBackgroundItems = tIsMapView ? [] : [
                  { title: tBackgroundCue, isEnabled: true,
                    target: this, action: tBackgroundAction }
                ],
            tBothAxesAreNumeric = this.getPath('graphModel.bothAxesAreNumeric');
        if( tBackground && tBothAxesAreNumeric) {
          var tLockInfo = this.getPath('graphModel.plotBackgroundImageLockInfo'),
              tLocked = tLockInfo && tLockInfo.locked,
              tLockedCue = tLocked ? 'DG.DataDisplayMenu.unlockImageFromAxes' :
                  'DG.DataDisplayMenu.lockImageToAxes',
              tLockAction = tLocked ? 'unlockImageFromAxes' : 'lockImageToAxes';
          tBackgroundItems.push(
              { title: tLockedCue, isEnabled: true,
                target: this, action: tLockAction }
          );
        }
        return tBackgroundItems.concat([
          { title: ('DG.DataDisplayMenu.copyAsImage'), isEnabled: (SC.browser.name !== SC.BROWSER.safari),
            target: this, action: 'copyAsImage' },
          { title: ('DG.DataDisplayMenu.exportImage'), isEnabled: true,
            target: this, action: 'makePngImage' }
        ]);
      },

      createInspectorButtons: function () {
          var tResult = sc_super(),
              this_ = this;
          if( !this.get('dataDisplayModel').wantsInspector())
              return tResult;

          tResult.push(DG.IconButton.create({
            layout: {width: 32, left: 0, height: 25},
            classNames: 'dg-display-rescale'.w(),
            iconClass: 'moonicon-icon-scaleData',
            iconExtent: {width: 30, height: 25},
            target: this,
            action: 'rescaleFunction',
            toolTip: 'DG.Inspector.rescale.toolTip',  // "Rescale graph axes to encompass data"
            localize: true,
            init: function () {
              sc_super();
              this_.get('dataDisplayModel').addObserver('canRescale', this, 'plotDidChange');
            },
            plotDidChange: function () {
              this.displayDidChange();
              this.set('isEnabled', this_.getPath('dataDisplayModel.canRescale'));
              this.set('toolTip', this_.getPath('dataDisplayModel.canMixUp') ?
                  'DG.Inspector.mixUp.toolTip' : 'DG.Inspector.rescale.toolTip');
            }
          }));

          var showHideShowPopup = function () {
            var tMenu = DG.MenuPane.create({
                  classNames: 'dg-display-hideshow-popup'.w(),
                  layout: {width: 200, height: 150}
                }),
                tMenuItems = this.get('dataDisplayModel').createHideShowSelectionMenuItems();
            tMenu.set('items', tMenuItems);
            tMenu.popup(tHideShowButton);
          }.bind(this);

          var tHideShowButton = DG.IconButton.create({
            layout: {width: 32},
            classNames: 'dg-display-hideshow'.w(),
            iconClass: 'moonicon-icon-hideShow',
            showBlip: true,
            target: this,
            action: showHideShowPopup,
            toolTip: 'DG.Inspector.hideShow.toolTip',  // "Show all cases or hide selected/unselected cases"
            localize: true
          });
          tResult.push(tHideShowButton);

          tResult.push(DG.IconButton.create({
            layout: {width: 32},
            classNames: 'dg-inspector-pane-button dg-display-values'.w(),
            iconClass: this.kValuesPaneIconClass,
            showBlip: true,
            target: this,
            action: 'showHideValuesPane',
            toolTip: 'DG.Inspector.displayValues.toolTip',
            localize: true
          }));

          var tConfigurationButton = DG.IconButton.create({
            layout: {width: 32},
            classNames: 'dg-inspector-pane-button dg-display-configuration'.w(),
            iconClass: kConfigPaneIconClass,
            showBlip: true,
            target: this,
            action: 'showHideConfigurationPane',
            toolTip: 'DG.Inspector.displayConfiguration.toolTip',
            localize: true,
            init: function () {
              sc_super();
              this_.get('dataDisplayModel').addObserver('canSupportConfigurations', this, 'plotDidChange');

              this.plotDidChange(); // For initialization of visibility
            },
            plotDidChange: function () {
              this.set('isVisible', this_.getPath('dataDisplayModel.canSupportConfigurations'));
            }
          });
          tResult.push(tConfigurationButton);

          // iconClass is different for MapView style control
        var tIsMapView = this.getPath('model.type') === 'DG.MapView';
          tResult.push(DG.IconButton.create({
            layout: {width: 32},
            classNames: 'dg-inspector-pane-button dg-display-styles'.w(),
            iconClass: tIsMapView ? 'moonicon-icon-layers' : 'moonicon-icon-styles',
            showBlip: true,
            target: this,
            action: 'showHideStylesPane',
            toolTip: tIsMapView ? 'DG.Inspector.displayLayers.toolTip' : 'DG.Inspector.displayStyles.toolTip',
            localize: true
          }));

          var tImageExportButton;

          var showImageExportPopup = function () {
            var tMenu = DG.MenuPane.create({
                  classNames: 'dg-display-show-image-popup'.w(),
                  layout: {width: 200, height: 150}
                }),
                tMenuItems = this.createImageExportMenuItems();
            tMenu.set('items', tMenuItems);
            tMenu.popup(tImageExportButton);
          }.bind(this);

          if (this.makePngImage) {
            tImageExportButton = DG.IconButton.create({
              layout: {width: 32},
              iconExtent: {width: 30, height: 25},
              classNames: 'dg-display-camera'.w(),
              iconClass: 'moonicon-icon-tileScreenshot',
              target: this,
              action: showImageExportPopup,
              toolTip: 'DG.Inspector.makeImage.toolTip',
              localize: true
            });
            tResult.push(tImageExportButton);
          }

          return tResult;
        },

        /**
         * The content of the configuration pane depends on what plot is showing.
         */
        showHideConfigurationPane: function () {
          var this_ = this,
              kTitleHeight = 26,
              kMargin = 20,
              kLeading = 5,
              kRowHeight = 20;
              if (DG.InspectorPickerPane.close(kConfigPaneIconClass)) {
                return; // don't reopen if we just closed
              }
              this.configurationPane = DG.InspectorPickerPane.create(
              {
                buttonIconClass: kConfigPaneIconClass,
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
                      layout: {right: 22},
                      childViews: 'title'.w(),
                      title: DG.PickerTitleView.extend({
                        layout: {height: kTitleHeight},
                        flowSpacing: {left: 0, bottom: kLeading},
                        title: 'DG.Inspector.configuration',
                        localize: true,
                        iconURL: static_url('images/icon-segmented-bar-chart.svg')
                      }),
                      init: function () {
                        sc_super();
                        this_.getPath('dataDisplayModel.configurationDescriptions').forEach(function (iDesc) {
                          iDesc.properties.layout = Object.assign({height: kRowHeight}, iDesc.properties.layout);
                          iDesc.properties.localize = true;
                          this.appendChild(iDesc.constructorClass.create(iDesc.properties));
                        }.bind(this));
                        this_.getPath('dataDisplayModel.lastConfigurationControls').forEach(function (iControl) {
                          this.appendChild(iControl);
                        }.bind(this));
                      }
                    })
              });
          this.configurationPane.popup(this.get('inspectorButtons')[3], SC.PICKER_POINTER);
        },

        /**
         * The styles pane provides control over point size, color, and transparency.
         */
        showHideStylesPane: function () {
          var this_ = this,
              kTitleHeight = 26,
              kMargin = 20,
              kLeading = 5,
              tIsMapView = this.getPath('model.type') === 'DG.MapView',
              tStylesButton = this.get('inspectorButtons').find( function( iButton) {
                return iButton.get('classNames').indexOf( 'dg-display-styles') >= 0;
              });
          if (DG.InspectorPickerPane.close(kStylesPaneIconClass)) {
            return; // don't reopen if we just closed
          }

          // Note: Styles-pane title and icon are different for map views.
          this.stylesPane = DG.InspectorPickerPane.create(
              {
                // So we can identify closure through click on button icon
                buttonIconClass: tIsMapView ? 'moonicon-icon-layers' : 'moonicon-icon-styles',
                classNames: 'dg-inspector-picker'.w(),
                layout: {width: 250, height: 150},
                contentView: SC.View.extend(SC.FlowedLayout,
                    {
                      layoutDirection: SC.LAYOUT_VERTICAL,
                      isResizable: false,
                      isClosable: false,
                      defaultFlowSpacing: {left: kMargin, bottom: kLeading},
                      canWrap: false,
                      align: SC.ALIGN_TOP,
                      childViews: 'title'.w(),
                      title: DG.PickerTitleView.extend({
                        layout: {height: kTitleHeight},
                        flowSpacing: {left: 0, bottom: kLeading},
                        title: this.getPath('model.type') === 'DG.MapView' ? 'DG.Inspector.layers' : 'DG.Inspector.styles',
                        localize: true,
                        iconURL: tIsMapView ? static_url('images/icon-layers.svg') :
                            static_url('images/icon-styles.svg')
                      }),
                      init: function () {
                        sc_super();
                        this_.get('styleControls').forEach(function (iControl) {
                          this.appendChild(iControl);
                        }.bind(this));
                      }
                    })
              });
          this.stylesPane.popup(tStylesButton, SC.PICKER_POINTER);
        },

        styleControls: function () {
          var this_ = this,
              tLegendAttrDesc = this.getPath('dataDisplayModel.dataConfiguration.legendAttributeDescription'),
              tCategoryMap = tLegendAttrDesc.getPath('attribute.categoryMap'),
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
                      alpha: this_.getPath('dataDisplayModel.transparency')
                    };
                    tCategoryMap[iColorKey] = iColor.toHexString();
                    this_.setPath('dataDisplayModel.transparency', iColor.getAlpha());
                    this_.get('dataDisplayModel').propertyDidChange('pointColor');
                    if( tLegendAttrDesc.get('attribute'))
                      tLegendAttrDesc.get('attribute').propertyDidChange('categoryMap');
                  },
                  undo: function () {
                    tCategoryMap[iColorKey] = this._beforeStorage.color;
                    this_.setPath('dataDisplayModel.transparency', this._beforeStorage.alpha);
                    this_.get('dataDisplayModel').propertyDidChange('pointColor');
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
                        color: this_.getPath('dataDisplayModel.' + colorAttr),
                        alpha: this_.getPath('dataDisplayModel.' + alphaAttr)
                      };
                      this_.setPath('dataDisplayModel.' + colorAttr, iColor.toHexString());
                      this_.setPath('dataDisplayModel.' + alphaAttr, iColor.getAlpha());
                      if( tLegendAttrDesc.get('attribute'))
                        tLegendAttrDesc.get('attribute').propertyDidChange('categoryMap');
                    }.bind( this));
                  },
                  undo: function () {
                    this_.setPath('dataDisplayModel.' + colorAttr, this._beforeStorage.color);
                    this_.setPath('dataDisplayModel.' + alphaAttr, this._beforeStorage.alpha);
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
                      alpha: this_.getPath('dataDisplayModel.' + alphaAttr)
                    };
                    tCategoryMap[end + '-attribute-color'] = iColor.toHexString();
                    this_.setPath('dataDisplayModel.' + alphaAttr, iColor.getAlpha());
                    this_.get('dataDisplayModel').propertyDidChange('pointColor');
                    if( tLegendAttrDesc.get('attribute'))
                      tLegendAttrDesc.get('attribute').propertyDidChange('categoryMap');
                  },
                  undo: function () {
                    tCategoryMap['attribute-color'] = this._beforeStorage.color;
                    this_.setPath('dataDisplayModel.' + alphaAttr, this._beforeStorage.alpha);
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
              kRowHeight = 20,
              tResult = [
                DG.PickerControlView.create({
                  layout: {height: kRowHeight},
                  label: 'DG.Inspector.pointSize',
                  controlView: SC.SliderView.create({
                    layout: {width: 120},
                    classNames: 'dg-graph-pointSize-slider'.w(),
                    controlSize: SC.SMALL_CONTROL_SIZE,
                    value: this.getPath('dataDisplayModel.pointSizeMultiplier'),
                    minimum: 0, maximum: 3, step: 0,
                    valueChanged: function () {
                      var picker = this;
                      DG.UndoHistory.execute(DG.Command.create({
                        name: 'data.style.pointSizeChanged',
                        undoString: 'DG.Undo.graph.changePointSize',
                        redoString: 'DG.Redo.graph.changePointSize',
                        log: "Changed point size",
                        execute: function() {
                          this._beforeStorage = this_.getPath('dataDisplayModel.pointSizeMultiplier');
                          this_.setPath('dataDisplayModel.pointSizeMultiplier', picker.get('value'));
                        },
                        undo: function () {
                          this_.setPath('dataDisplayModel.pointSizeMultiplier', this._beforeStorage);
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
            var tInitialColor = tinycolor(this.getPath('dataDisplayModel.pointColor'))
                  .setAlpha(this.getPath('dataDisplayModel.transparency'));
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
              var tColor = DG.ColorUtilities.calcAttributeColor( tLegendAttrDesc);
              tCategoryMap['attribute-color'] = tColor.colorString || tColor;
            }
            var tAttrColor = tCategoryMap && tCategoryMap['attribute-color'],
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
                    .setAlpha(this.getPath('dataDisplayModel.transparency')),
                tHighEndColor = tinycolor(tSpectrumEnds.high.colorString)
                    .setAlpha(this.getPath('dataDisplayModel.transparency'));
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
                  initialColor: tinycolor(this.getPath('dataDisplayModel.strokeColor'))
                      .setAlpha(this.getPath('dataDisplayModel.strokeTransparency')),
                  setColorFunc: setStroke,
                  closedFunc: setStrokeFinalized,
                  appendToLayerFunc: getStylesLayer
                })
              })
          );
          tResult.push(SC.CheckboxView.create({
            layout: {height: 25},
            title: 'DG.Inspector.strokeSameAsFill',
            value: this.getPath('dataDisplayModel.strokeSameAsFill'),
            classNames: 'dg-graph-strokeSameAsFill-check'.w(),
            localize: true,
            valueDidChange: function () {
              var becomingSameAsFill = !this.getPath('dataDisplayModel.strokeSameAsFill'),
                  logMessage = "Made stroke color " + (becomingSameAsFill ? "same as fill" : "independent of fill");
              DG.UndoHistory.execute(DG.Command.create({
                name: 'plot.strokeSameAsFillChange',
                undoString: becomingSameAsFill ? 'DG.Undo.graph.makeStrokeSameAsFill' : 'DG.Undo.graph.makeStrokeIndependent',
                redoString: becomingSameAsFill ? 'DG.Redo.graph.makeStrokeSameAsFill' : 'DG.Redo.graph.makeStrokeIndependent',
                log: logMessage,
                execute: function () {
                  this.get('dataDisplayModel').toggleProperty('strokeSameAsFill');
                }.bind(this),
                undo: function () {
                  this.get('dataDisplayModel').toggleProperty('strokeSameAsFill');
                }.bind(this)
              }));
            }.bind(this).observes('value')
          }));
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
              var tCalcColor = DG.ColorUtilities.calcCaseColor(iCategory, tLegendAttrDesc),
                  tInitialColor = tCategoryMap[iCategory] ?
                  tCategoryMap[iCategory] :
                      tCalcColor.colorString || tCalcColor;
              tInitialColor = tinycolor(tInitialColor.colorString || tInitialColor).
                                setAlpha(this.getPath('dataDisplayModel.transparency'));
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
          return tResult;
        }.property(),

        addAxisHandler: function (iAxisView) {
          var this_ = this,
              tNodes = iAxisView.get('labelNodes');

          if (SC.isArray(tNodes)) {
            tNodes.forEach(function (iNode, iIndex) {

              function mouseDownHandler(iEvent) {
                SC.run( function() {
                  this_.setupAttributeMenu(iEvent, iAxisView, iIndex);
                });
                iEvent.preventDefault();
                iEvent.stopImmediatePropagation();
              }

              iNode.unmousedown(mouseDownHandler); // In case it got added already
              iNode.mousedown(mouseDownHandler);
            });
          }
        },

        /**
         An axis view has been assigned to the property named iPropertyKey.
         We want to hook up to its labelNode so that clicking on it will bring
         up an attribute menu.
         */
        axisViewChanged: function (iThis, iPropertyKey) {
          var this_ = this,
              tView = this.get(iPropertyKey);
          if (!SC.none(tView)) {
            this.addAxisHandler( tView);
            tView.addObserver('labelNode', this,
                function () {
                  this_.addAxisHandler(tView);
                });
          }
        }.observes('xAxisView', 'yAxisView', 'y2AxisView', 'legendView', 'topAxisView', 'rightAxisView'),

        setupAttributeMenu: function (event, iAxisView, iAttrIndex) {
          var tDataDisplayModel = this.get('dataDisplayModel'),
              tMenuLayout = {left: event.layerX, top: event.layerY, height: 20, width: 20},
              tMenuAnchorView = SC.View.create({
                layout: tMenuLayout,
                backgroundColor: 'transparent'
              }),

              tOrientation = iAxisView.get('orientation'),
          // The following parameter is supposed to specify the preferred position of the menu
          // relative to the anchor. But it doesn't seem to have any effect.
          // SC.POINTER_LAYOUT = ["perfectRight", "perfectLeft", "perfectTop", "perfectBottom"];
              tPreferMatrix = (tOrientation === DG.GraphTypes.EOrientation.kHorizontal) ?
                  [0, 2, 1, 3, 0] :
                  [0, 1, 3, 2, 0],
              tAxisKey = '',
              tMenuItems,

          tAttributeMenu = DG.MenuPane.create({});

          // A FormulaAxisView has its own handler for its menu
          var tChangeHandler = iAxisView.menuChangeHandler ? iAxisView.menuChangeHandler.bind(iAxisView) :
              this.attributeMenuItemChanged;
          tAttributeMenu.addObserver('selectedItem', this, tChangeHandler);

          iAxisView.appendChild(tMenuAnchorView);

          if (iAxisView.instanceOf(DG.LegendView))
            tAxisKey = 'legend';
          else {
            switch (tOrientation) {
              case DG.GraphTypes.EOrientation.kHorizontal:
                tAxisKey = 'x';
                break;
              case DG.GraphTypes.EOrientation.kVertical:
                tAxisKey = 'y';
                break;
              case DG.GraphTypes.EOrientation.kVertical2:
                tAxisKey = 'y2';
                break;
              default:
                tAxisKey = tOrientation;
            }
          }

          tMenuItems = iAxisView.getMenuItems ? iAxisView.getMenuItems() : this.getAttributeMenuItems();
          // WARNING: before we added this separator, the "Remove Attribute" menu item had a bug where it would not respond correctly
          // on the first click.  It appears that SC.MenuItemView.mouseUp() gets a null 'targetMenuItem' at that point,
          // which prevents our menu handler from being called.  This may or may not a bug related to the submenu just above this point.
          // --Craig and Kirk 2012-06-07
          tMenuItems.push({isSeparator: YES});
          var kNotForSubmenu = false;
          tMenuItems.push(tDataDisplayModel.createRemoveAttributeMenuItem(
              iAxisView, tAxisKey, kNotForSubmenu, iAttrIndex));
          if (tAxisKey !== 'y2')
            tMenuItems.push(tDataDisplayModel.createChangeAttributeTypeMenuItem(iAxisView, tAxisKey));
          tAttributeMenu.set('items', tMenuItems);
          tAttributeMenu.selectedAxis = tOrientation;
          tAttributeMenu.isLegend = iAxisView.instanceOf(DG.LegendView);

          // We need SC to accomplish the layout of the anchor view before we
          // show the popup menu. Initiating and ending a runloop seems to be one way
          // to accomplish this.
          SC.run(function(){
            tAttributeMenu.popup(tMenuAnchorView, tPreferMatrix);
          }.bind(this));
          iAxisView.removeChild(tMenuAnchorView);
        },

        /**
         *
         * @returns {[{title,subMenu]}
         */
        getAttributeMenuItems: function () {
          var tMenuItems = [],
              //tContext = this.get('dataContext'),
              tContexts = DG.currDocumentController().get('contexts');
          tContexts.forEach( function( iContext) {
            iContext.forEachCollection( function( iCollClient) {
              var tName = iCollClient.get('name'),
                  tAttrNames = iCollClient.getVisibleAttributeNames();
              tMenuItems.push({ title: tName,
                subMenu: tAttrNames.map( function( iAttrName) {
                  return { title: iAttrName, collection: iCollClient, context: iContext };
                })});
            });
          });
          if( tMenuItems.length === 1) {
            return tMenuItems[0].subMenu;
          }
          else
            return tMenuItems;
        },

        /**
         Handle a 'Change...' or 'Remove {location} Attribute' menu item.
         Menu items set up by setupAttributeMenu()
         */
        attributeMenuItemChanged: function ( iMenu) {
          var tNewItem = iMenu.get('selectedItem'),
              tCollectionClient = tNewItem && tNewItem.collection,
              tAxisOrientation = iMenu.selectedAxis,
              tIsLegend = iMenu.isLegend;

          // For safety's sake, remove this method as an observer of iMenu
          iMenu.removeObserver('selectedItem', this, this.attributeMenuItemChanged);

          DG.UndoHistory.execute(DG.Command.create({
            name: 'axis.attributeChange',
            undoString: 'DG.Undo.axisAttributeChange',
            redoString: 'DG.Redo.axisAttributeChange',
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'attributeChange',
                type: 'DG.GraphView',
                id: this.getPath('model.id'),
                attributeName: tNewItem.get('title'),
                axisOrientation: tAxisOrientation
              }
            },
            _beforeStorage: null,
            _afterStorage: null,
            _componentId: this.getPath('model.id'),
            _controller: function () {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            execute: function () {
              var controller = this._controller();
              this._beforeStorage = controller.createComponentStorage();

              var tAttrRefs,
                  tDataDisplayModel = controller.get('dataDisplayModel'),
                  tDataContext = tNewItem && tNewItem.context;

              controller.handlePossibleForeignDataContext && controller.handlePossibleForeignDataContext(tDataContext);

              if (!tNewItem) {
                this.set('causedChange', false);
                return;
              }
              if (tCollectionClient) {
                // change attribute. Note: Can't use index because of possible hidden attributes.
                var tAttr = tCollectionClient.attrsController.get('content').find(function(iObject) {
                  return iObject.name === tNewItem.title;
                });
                tAttrRefs = {
                  collection: tCollectionClient,
                  attributes: [tAttr]
                };
                if (tIsLegend) {
                  tNewItem.log = "legendAttributeChange: { to attribute %@ }".fmt(tAttrRefs.attributes[0].get('name'));
                  tDataDisplayModel.changeAttributeForLegend(tDataContext, tAttrRefs);
                } else {
                  tNewItem.log = 'plotAxisAttributeChange: { orientation: %@, attribute: %@ }'.fmt(tAxisOrientation, tAttrRefs.attributes[0].get('name'));
                  tDataDisplayModel.changeAttributeForAxis(tDataContext, tAttrRefs, tAxisOrientation);
                }
              } else if (tNewItem.target === tDataDisplayModel) {
                // remove or change attribute
                tNewItem.itemAction.apply(tNewItem.target, tNewItem.args);
              }
              controller.setComponentTitleByChildmostCollection();
              this.log = tNewItem.log || 'Axis attribute menu item selected: %@'.fmt(tNewItem.title);
            },
            undo: function () {
              var controller = this._controller();
              this._afterStorage = controller.createComponentStorage();
              controller.restoreComponentStorage(this._beforeStorage);
              controller.setComponentTitleByChildmostCollection();
            },
            redo: function () {
              this._controller().restoreComponentStorage(this._afterStorage);
              this._afterStorage = null;
              this._controller().setComponentTitleByChildmostCollection();
            }
          }));
        },

        /**
         The plot, map, or legend view has received a drop of an attribute. Our job is to forward this properly on to
         the graph so that the configuration can be changed.
         */
        plotOrLegendViewDidAcceptDrop: function (iView, iKey, iDragData) {
          if (SC.none(iDragData)) // The over-notification caused by the * in the observes
            return;       // means we get here at times there isn't any drag data.

          var controller = this;

          DG.UndoHistory.execute(DG.Command.create({
            name: 'axis.attributeChange',
            undoString: 'DG.Undo.axisAttributeChange',
            redoString: 'DG.Redo.axisAttributeChange',
            _beforeStorage: null,
            _afterStorage: null,
            _componentId: this.getPath('model.id'),
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'legendAttributeChange',
                type: this.get('dataDisplayModel').constructor.toString(),
                id: this.getPath('model.id'),
                attributeName: iDragData.attribute.get('name')
              }
            },
            execute: function () {
              this._beforeStorage = controller.createComponentStorage();

              var tDragContext = iDragData.context,
                  tCollectionClient = getCollectionClientFromDragData(tDragContext, iDragData),
                  tDisplayModel = controller.get('dataDisplayModel');
              tDisplayModel.handleDroppedContext( tDragContext);
              controller.set('dataContext', tDragContext);

              iView.dragData = null;

              tDisplayModel.changeAttributeForLegend(
                  tDragContext,
                  {
                    collection: tCollectionClient,
                    attributes: [iDragData.attribute]
                  });
              controller.get('view').select();
              controller.setComponentTitleByChildmostCollection();

              this.log = 'legendAttributeChange: { to attribute %@ }'.fmt(iDragData.attribute.get('name'));
            },
            undo: function () {
              this._afterStorage = controller.createComponentStorage();
              controller.restoreComponentStorage(this._beforeStorage);
              controller.setComponentTitleByChildmostCollection();
            },
            redo: function () {
              controller.restoreComponentStorage(this._afterStorage);
              this._afterStorage = null;
              controller.setComponentTitleByChildmostCollection();
            }
          }));
        },

        convertToImage: function (rootEl, width, height, title) {

          function saveImage(pngObject) {
            var reader = new FileReader();
            reader.addEventListener("loadend", function() {
              var data = reader.result.split(",").pop();  // get rid of base64 header
              DG.exportFile(data, "png", "image/png");
            });
            reader.readAsDataURL(pngObject);
          }

          DG.ImageUtilities.captureSVGElementsToImage(rootEl, width, height, title)
            .then(function (blob) {
              saveImage(blob);
            }, function (msg) {
              DG.log(msg);
            });
        },

        openDrawToolWithImage: function (rootEl, width, height, title) {

          DG.ImageUtilities.captureSVGElementsToImage(rootEl, width, height, title, true)
            .then(function (dataURL) {
              SC.run(function () {
                DG.appController.importDrawToolWithDataURL(dataURL, title);
              });
            }, function (msg) {
              DG.log(msg);
            });
        },

        makePngImage: function () {
          var componentView = this.get('view');
          var graphView = componentView && componentView.get('contentView');
          var width = graphView.getPath('frame.width');
          var height = graphView.getPath('frame.height');
          var title = componentView.get('title');
          this.convertToImage(graphView.get('layer'), width, height, title);
        },

        copyAsImage: function () {
          var componentView = this.get('view'),
              title = (componentView && componentView.get('title')) ||
                  "DG.DocumentController.graphTitle".loc(),
              graphView = componentView && componentView.get('contentView'),
              layer = graphView && graphView.get('layer'),
              width = graphView && graphView.getPath('frame.width'),
              height = graphView && graphView.getPath('frame.height');
          if (graphView)
            this.openDrawToolWithImage(layer, width, height, title);
        },


      };

    }()) // function closure
);
