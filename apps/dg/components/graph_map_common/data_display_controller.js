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

/* global tinycolor, Promise */

sc_require('controllers/component_controller');

/** @class

    DG.DataDisplayController provides controller functionaly, particular gear menu items,
 for scatter plots.

 @extends SC.Controller
 */
DG.DataDisplayController = DG.ComponentController.extend(
    /** @scope DG.DataDisplayController.prototype */
    (function () {

      function getCollectionClientFromDragData(iContext, iDragData) {
        var collectionID = iDragData.collection && iDragData.collection.get('id');
        return iContext && !SC.none(collectionID) && iContext.getCollectionByID(collectionID);
      }


      return {
        dataContext: null,
        dataDisplayModel: null,
        legendView: null,
        attributeMenu: null,
        menuAnchorView: null,
        stylesPane: null,

        storeDimension: function (iDataConfiguration, iStorage, iDim) {
          var tCollection = iDataConfiguration && iDataConfiguration.get(iDim + 'CollectionClient'),
              tAttrDesc = iDataConfiguration && iDataConfiguration.get(iDim + 'AttributeDescription'),
              tAttrs = (tAttrDesc && tAttrDesc.get('attributes')) || [];
          if (tCollection && (tAttrs.length > 0)) {
            iStorage._links_[iDim + 'Coll'] = tCollection.toLink();
            var tKey = iDim + 'Attr';
            tAttrs.forEach(function (iAttr) {
              DG.ArchiveUtils.addLink(iStorage, tKey, iAttr);
            });
          }
          iStorage[iDim + 'Role'] = tAttrDesc.get('role');  // Has a role even without an attribute
          iStorage[iDim + 'AttributeType'] = tAttrDesc.get('attributeType');
        },

        createComponentStorage: function () {
          var storage = {_links_: {}},
              dataContext = this.get('dataContext'),
              dataConfiguration = this.getPath('dataDisplayModel.dataConfiguration'),
              hiddenCases = dataConfiguration && dataConfiguration.get('hiddenCases');

          if (dataContext)
            storage._links_.context = dataContext.toLink();

          this.storeDimension(dataConfiguration, storage, 'legend');

          if (hiddenCases) {
            storage._links_.hiddenCases = hiddenCases.map(function (iCase) {
              return iCase.toLink();
            });
          }
          storage.pointColor = this.getPath('dataDisplayModel.pointColor');
          storage.strokeColor = this.getPath('dataDisplayModel.strokeColor');
          storage.pointSizeMultiplier = this.getPath('dataDisplayModel.pointSizeMultiplier');
          storage.transparency = this.getPath('dataDisplayModel.transparency');
          storage.strokeTransparency = this.getPath('dataDisplayModel.strokeTransparency');
          return storage;
        },

        restoreComponentStorage: function (iStorage, iDocumentID) {
          var contextID = this.getLinkID(iStorage, 'context'),
              dataContext = null;

          if (!SC.none(contextID)) {
            dataContext = DG.DataContext.retrieveContextFromMap(iDocumentID, contextID);
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
          var dataDisplayModel = this.getPath('model.content'),
              tDataContext = this.get('dataContext');
          this.set('dataDisplayModel', dataDisplayModel);
          if (dataDisplayModel && tDataContext)
            dataDisplayModel.set('dataContext', this.get('dataContext'));
        }.observes('model'),

        init: function () {
          sc_super();

          // To Do: We need to have the menu dynamically compute its layout.
          this.attributeMenu = DG.MenuPane.create({
            layout: {width: 200, height: 150}
          });
          this.attributeMenu.selectedAxis = null;
          this.attributeMenu.addObserver('selectedItem', this,
              this.attributeMenuItemChanged);
          this.menuAnchorView = SC.View.create({
            layout: {left: 0, width: 20, top: 0, height: 20},
            backgroundColor: 'transparent',
            isVisible: false
          });
        },

        createInspectorButtons: function () {
          var tResult = sc_super(),
              this_ = this;
          if( !this.get('dataDisplayModel').wantsInspector())
              return tResult;

          tResult.push(DG.IconButton.create({
            layout: {width: 32, left: 0},
            classNames: 'display-rescale'.w(),
            iconClass: 'moonicon-icon-scaleData',
            iconExtent: {width: 30, height: 25},
            isEnabled: function () {
              return this_.getPath('dataDisplayModel.canRescale');
            }.property(),
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
              this.set('toolTip', this_.getPath('dataDisplayModel.canMixUp') ?
                  'DG.Inspector.mixUp.toolTip' : 'DG.Inspector.rescale.toolTip');
            }
          }));

          var showHideShowPopup = function () {
            var tMenu = DG.MenuPane.create({
                  classNames: 'display-hideshow-popup'.w(),
                  layout: {width: 200, height: 150}
                }),
                tMenuItems = this.get('dataDisplayModel').createHideShowSelectionMenuItems();
            tMenu.set('items', tMenuItems);
            tMenu.popup(tHideShowButton);
          }.bind(this);

          var tHideShowButton = DG.IconButton.create({
            layout: {width: 32},
            classNames: 'display-hideshow'.w(),
            iconClass: 'moonicon-icon-hideShow',
            showBlip: true,
            target: this,
            action: showHideShowPopup,
            toolTip: 'DG.Inspector.hideShow.toolTip',  // "Show all cases or hide selected/unselected cases"
            localize: true
          });
          tResult.push(tHideShowButton);

          var showDeletePopup = function () {
            var tMenu = DG.MenuPane.create({
                  classNames: 'display-delete-popup'.w(),
                  layout: {width: 200, height: 150}
                }),
                tModel = this.get('dataDisplayModel'),
                tSelection = tModel.get('selection'),
                tCases = tModel.get('cases'),
                tDeleteSelectedIsEnabled = tSelection && tSelection.get('length') !== 0,
                tDeleteUnselectedIsEnabled = !tSelection || tSelection.get('length') < tCases.length,
            // TODO: Provide localization by defining in dg.strings
                tMenuItems = [
                  {title: "Select All", target: tModel, action: 'selectAll', isEnabled: true},
                  {
                    title: "Delete Selected Cases", target: tModel, action: 'deleteSelectedCases',
                    isEnabled: tDeleteSelectedIsEnabled
                  },
                  {
                    title: "Delete Unselected Cases", target: tModel, action: 'deleteUnselectedCases',
                    isEnabled: tDeleteUnselectedIsEnabled
                  }
                ];
            tMenu.set('items', tMenuItems);
            tMenu.popup(this.get('inspectorButtons')[2]);
          }.bind(this);

          tResult.push(DG.IconButton.create({
            layout: {width: 32},
            classNames: 'display-trash'.w(),
            iconClass: 'moonicon-icon-trash',
            showBlip: true,
            target: this,
            action: showDeletePopup,
            toolTip: 'DG.Inspector.delete.toolTip',
            localize: true
          }));

          tResult.push(DG.IconButton.create({
            layout: {width: 32},
            classNames: 'display-values'.w(),
            iconClass: 'moonicon-icon-values',
            showBlip: true,
            target: this,
            action: 'showValuesPane',
            toolTip: 'DG.Inspector.displayValues.toolTip',
            localize: true
          }));

          tResult.push(DG.IconButton.create({
            layout: {width: 32},
            classNames: 'display-styles'.w(),
            iconClass: 'moonicon-icon-styles',
            showBlip: true,
            target: this,
            action: 'showStylesPane',
            toolTip: 'DG.Inspector.displayStyles.toolTip',
            localize: true
          }));

          if (this.makePngImage) {  // Not implemented for map yet
            tResult.push(DG.IconButton.create({
              layout: {width: 32},
              iconExtent: {width: 30, height: 25},
              classNames: 'display-camera'.w(),
              iconClass: 'moonicon-icon-tileScreenshot',
              target: this,
              action: 'makePngImage',
              toolTip: 'DG.Inspector.makeImage.toolTip',
              localize: true
            }));
          }

          return tResult;
        },

        /**
         * The content of the values pane depends on what plot is showing; e.g. a scatterplot will have a checkbox
         * for showing a movable line, while a univariate dot plot will have one for showing a movable value.
         */
        showValuesPane: function () {
          var this_ = this,
              kTitleHeight = 26,
              kMargin = 20,
              kLeading = 5,
              kRowHeight = 20;
          DG.InspectorPickerPane.create(
              {
                classNames: 'inspector-picker'.w(),
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
                      childViews: 'title showLabel'.w(),
                      title: DG.PickerTitleView.extend({
                        layout: {height: kTitleHeight},
                        flowSpacing: {left: 0, bottom: kLeading},
                        title: 'DG.Inspector.values',
                        localize: true,
                        iconURL: static_url('images/icon-values.svg')
                      }),
                      showLabel: SC.LabelView.extend({
                        layout: {height: kRowHeight},
                        value: 'DG.Inspector.displayShow',
                        localize: true
                      }),
                      init: function () {
                        sc_super();
                        this_.getPath('dataDisplayModel.checkboxDescriptions').forEach(function (iDesc) {
                          iDesc.layout = {height: kRowHeight};
                          iDesc.localize = true;
                          this.appendChild(SC.CheckboxView.create(iDesc));
                        }.bind(this));
                      }
                    }),
                transitionIn: SC.View.SCALE_IN/*,
               popup: function() {
               var tFrame = this.getPath('contentView.frame'),
               tBottom = tFrame.y + tFrame.height;
               this.adjust({ height: tBottom + kLeading})
               sc_super();
               }*/
              }).popup(this.get('inspectorButtons')[3], SC.PICKER_POINTER);
        },

        /**
         * The styles pane provides control over point size, color, and transparency.
         */
        showStylesPane: function () {
          var this_ = this,
              kTitleHeight = 26,
              kMargin = 20,
              kLeading = 5;

          this.stylesPane = DG.InspectorPickerPane.create(
              {
                classNames: 'inspector-picker'.w(),
                layout: {width: 250, height: 150},
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
                        title: 'DG.Inspector.styles',
                        localize: true,
                        iconURL: static_url('images/icon-styles.svg')
                      }),
                      init: function () {
                        sc_super();
                        this_.get('styleControls').forEach(function (iControl) {
                          this.appendChild(iControl);
                        }.bind(this));
                      }
                    }),
                popup: function () {
                  sc_super();
                  var tHeight = 0;
                  this.getPath('contentView.childViews').forEach(function (iView) {
                    tHeight += iView.frame().height + kLeading;
                  });
                  this.adjust('height', tHeight);
                }
              });
          this.stylesPane.popup(this.get('inspectorButtons')[4], SC.PICKER_POINTER);
        },

        styleControls: function () {
          var this_ = this,
              tLegendAttrDesc = this.getPath('dataDisplayModel.dataConfiguration.legendAttributeDescription'),
              tColorMap = tLegendAttrDesc.getPath('attribute.colormap'),
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
                      color: tColorMap[iColorKey],
                      alpha: this_.getPath('dataDisplayModel.transparency')
                    };
                    tColorMap[iColorKey] = iColor.toHexString();
                    this_.setPath('dataDisplayModel.transparency', iColor.getAlpha());
                    this_.get('dataDisplayModel').propertyDidChange('pointColor');
                  },
                  undo: function () {
                    tColorMap[iColorKey] = this._beforeStorage.color;
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
                    this.reduceKey = this.name + currentOpenSession;
                    this._beforeStorage = {
                      color: this_.getPath('dataDisplayModel.' + colorAttr),
                      alpha: this_.getPath('dataDisplayModel.' + alphaAttr)
                    };
                    this_.setPath('dataDisplayModel.' + colorAttr, iColor.toHexString());
                    this_.setPath('dataDisplayModel.' + alphaAttr, iColor.getAlpha());
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
                    classNames: 'graph-pointSize-slider'.w(),
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
          if (!tLegendAttrDesc.get('isCategorical')) {
            tResult.push(
                DG.PickerControlView.create({
                  layout: {height: 2 * kRowHeight},
                  label: 'DG.Inspector.color',
                  controlView: DG.PickerColorControl.create({
                    layout: {width: 120},
                    classNames: 'graph-point-color'.w(),
                    initialColor: tinycolor(this.getPath('dataDisplayModel.pointColor'))
                        .setAlpha(this.getPath('dataDisplayModel.transparency')),
                    setColorFunc: setColor,
                    closedFunc: setColorFinalized,
                    appendToLayerFunc: getStylesLayer
                  })
                })
            );
          }
          tResult.push(
              DG.PickerControlView.create({
                layout: {height: 2 * kRowHeight},
                label: 'DG.Inspector.stroke',
                controlView: DG.PickerColorControl.create({
                  layout: {width: 120},
                  classNames: 'graph-stroke-color'.w(),
                  initialColor: tinycolor(this.getPath('dataDisplayModel.strokeColor'))
                      .setAlpha(this.getPath('dataDisplayModel.strokeTransparency')),
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
                tCategoryMap = tLegendAttrDesc.getPath('attributeStats.cellMap');
            DG.ObjectMap.forEach(tCategoryMap, function (iCategory) {
              var tInitialColor = tColorMap[iCategory] ?
                  tColorMap[iCategory] :
                  DG.ColorUtilities.calcCaseColor(iCategory, tLegendAttrDesc).colorString;
              tInitialColor = tinycolor(tInitialColor.colorString || tInitialColor).
                                setAlpha(this.getPath('dataDisplayModel.transparency'));
              tContentView.appendChild(DG.PickerControlView.create({
                layout: {height: 2 * kRowHeight},
                label: iCategory,
                controlView: DG.PickerColorControl.create({
                  layout: {width: 120},
                  classNames: 'graph-point-color'.w(),
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
              }

              if (!SC.none(iNode.events))
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
        }.observes('xAxisView', 'yAxisView', 'y2AxisView', 'legendView'),

        setupAttributeMenu: function (event, iAxisView, iAttrIndex) {
          var tDataDisplayModel = this.get('dataDisplayModel'),
              tMenuLayout = {left: event.layerX, top: event.layerY, height: 20, width: 20},
              tOrientation = iAxisView.get('orientation'),
          // The following parameter is supposed to specify the preferred position of the menu
          // relative to the anchor. But it doesn't seem to have any effect.
          // SC.POINTER_LAYOUT = ["perfectRight", "perfectLeft", "perfectTop", "perfectBottom"];
              tPreferMatrix = (tOrientation === 'horizontal') ?
                  [0, 2, 1, 3, 0] :
                  [0, 1, 3, 2, 0],
              tAxisKey = '',
              tMenuItems;

          if (iAxisView.instanceOf(DG.LegendView))
            tAxisKey = 'legend';
          else {
            switch (tOrientation) {
              case 'horizontal':
                tAxisKey = 'x';
                break;
              case 'vertical':
                tAxisKey = 'y';
                break;
              case 'vertical2':
                tAxisKey = 'y2';
                break;
            }
          }

          tMenuItems = this.getAttributeMenuItems();
          // WARNING: before we added this separator, the "Remove Attribute" menu item had a bug where it would not respond correctly
          // on the first click.  It appears that SC.MenuItemView.mouseUp() gets a null 'targetMenuItem' at that point,
          // which prevents our menu handler from being called.  This may or may not a bug related to the submenu just above this point.
          // --Craig and Kirk 2012-06-07
          tMenuItems.push({isSeparator: YES});
          var kNotForSubmenu = false;
          tMenuItems.push(tDataDisplayModel.createRemoveAttributeMenuItem(tAxisKey, kNotForSubmenu, iAttrIndex));
          if (tAxisKey !== 'y2')
            tMenuItems.push(tDataDisplayModel.createChangeAttributeTypeMenuItem(tAxisKey, kNotForSubmenu, iAttrIndex));
          this.attributeMenu.set('items', tMenuItems);
          this.attributeMenu.selectedAxis = tOrientation;
          this.attributeMenu.isLegend = iAxisView.instanceOf(DG.LegendView);

          // We need SC to accomplish the layout of the anchor view before we
          // show the popup menu. Initiating and ending a runloop seems to be one way
          // to accomplish this.
          SC.run(function(){
            this.menuAnchorView.removeFromParent();
            iAxisView.appendChild(this.menuAnchorView);
            this.menuAnchorView.set('layout', tMenuLayout);
            this.menuAnchorView.set('isVisible', true);
            this.attributeMenu.popup(this.menuAnchorView, tPreferMatrix);
          }.bind(this));
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
                  tAttrNames = iCollClient.getAttributeNames();
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
        attributeMenuItemChanged: function () {
          DG.UndoHistory.execute(DG.Command.create({
            name: 'axis.attributeChange',
            undoString: 'DG.Undo.axisAttributeChange',
            redoString: 'DG.Redo.axisAttributeChange',
            _beforeStorage: null,
            _afterStorage: null,
            _componentId: this.getPath('model.id'),
            _controller: function () {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            execute: function () {
              var controller = this._controller();
              this._beforeStorage = controller.createComponentStorage();

              var tNewItem = controller.attributeMenu.selectedItem,
                  tCollectionClient = tNewItem && tNewItem.collection,
                  tAxisOrientation = controller.attributeMenu.selectedAxis,
                  tAttrRefs,
                  tDataDisplayModel = controller.get('dataDisplayModel'),
                  tDataContext = tNewItem && tNewItem.context;
              if (!tNewItem) {
                this.set('causedChange', false);
                return;
              }
              if (tCollectionClient) {
                // change attribute
                tAttrRefs = {
                  collection: tCollectionClient,
                  attributes: [tCollectionClient.attrsController.objectAt(tNewItem.contentIndex)]
                };
                if (controller.attributeMenu.isLegend) {
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
              controller.menuAnchorView.set('isVisible', false);
              this.log = tNewItem.log || 'Axis attribute menu item selected: %@'.fmt(tNewItem.title);
            },
            undo: function () {
              var controller = this._controller();
              this._afterStorage = controller.createComponentStorage();
              controller.restoreComponentStorage(this._beforeStorage);
            },
            redo: function () {
              this._controller().restoreComponentStorage(this._afterStorage);
              this._afterStorage = null;
            }
          }));
        },

        /**
         The plot or legend view has received a drop of an attribute. Our job is to forward this properly on to
         the graph so that the configuration can be changed.
         */
        plotOrLegendViewDidAcceptDrop: function (iView, iKey, iDragData) {
          if (SC.none(iDragData)) // The over-notification caused by the * in the observes
            return;       // means we get here at times there isn't any drag data.

          DG.UndoHistory.execute(DG.Command.create({
            name: 'axis.attributeChange',
            undoString: 'DG.Undo.axisAttributeChange',
            redoString: 'DG.Redo.axisAttributeChange',
            _beforeStorage: null,
            _afterStorage: null,
            _componentId: this.getPath('model.id'),
            _controller: function () {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            execute: function () {
              var controller = this._controller();
              this._beforeStorage = controller.createComponentStorage();

              var tDragContext = iDragData.context;
              if (!SC.none(tDragContext) && (tDragContext !== controller.get('dataContext'))) {
                controller.get('dataDisplayModel').reset();
                controller.set('dataContext', tDragContext);
              }

              var tDataContext = controller.get('dataContext'),
                  tCollectionClient = getCollectionClientFromDragData(tDataContext, iDragData);

              iView.dragData = null;

              controller.get('dataDisplayModel').changeAttributeForLegend(
                  tDataContext,
                  {
                    collection: tCollectionClient,
                    attributes: [iDragData.attribute]
                  });

              this.log = 'legendAttributeChange: { to attribute %@ }'.fmt(iDragData.attribute.get('name'));
            },
            undo: function () {
              var controller = this._controller();
              this._afterStorage = controller.createComponentStorage();
              controller.restoreComponentStorage(this._beforeStorage);
            },
            redo: function () {
              this._controller().restoreComponentStorage(this._afterStorage);
              this._afterStorage = null;
            }
          }));
        }.observes('*legendView.dragData', '*mapView.dragData'),

        convertToImage: function (svgs, x, y, width, height) {

          var getCSSText = function () {
            var text = [], ix, jx;
            for (ix = 0; ix < document.styleSheets.length; ix += 1) {
              var styleSheet = document.styleSheets[ix];
              var rules = styleSheet.rules || styleSheet.cssRules;
              for (jx = 0; jx < rules.length; jx += 1) {
                var rule = rules[jx];
                text.push(rule.cssText);
              }
            }
            return text.join('\n');
          };

          var makeDataURLFromSVGElement = function (svgEl) {
            var svgClone = $(svgEl).clone();
            var css = $('<style>').text(getCSSText());
            svgClone.prepend(css);
            var svgData = new XMLSerializer().serializeToString(svgClone[0]);
            // Raphael overspecifies the url for the gradient. It prepends the
            // windows.location.href. This causes problems with the data url,
            // because we are no longer in this namespace. So, we remove.
            svgData = svgData.replace(
                new RegExp('url\\(\'[^#]*#', 'g'), 'url(\'#');
            // The use of unescape and encodeURIComponent are part of a well-
            // known hack work around btoa's handling of unicode characters.
            // see, eg:
            // http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
            return "data:image/svg+xml;base64,"
                + window.btoa(window.unescape(window.encodeURIComponent(svgData)));
          };

          /**
           * Create a canvas element with a white background. Not yet appended to
           * the DOM.
           * @param {number} width
           * @param {number} height
           * @returns {Canvas}
           */
          var makeCanvasEl = function (width, height) {
            var canvas = $("<canvas>").prop({width: width, height: height})[0];
            var ctx = canvas.getContext("2d");
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
            return canvas;
          };

          /**
           * Add an image to the canvas at the specified location.
           * @param {Canvas} canvas DOM Element
           * @param {img} image DOM Element
           * @param {number} x
           * @param {number} y
           * @param {number} width
           * @param {number} height
           */
          var addImageToCanvas = function (canvas, image, x, y, width, height) {
            var ctx = canvas.getContext("2d");
            ctx.drawImage(image, x, y, width, height);
          };

          /**
           * Convert a canvas object to a blob.
           * @param canvas
           * @returns {*}
           */
          var makeCanvasBlob = function (canvas) {
            var canvasDataURL = canvas.toDataURL("image/png");
            var canvasData = atob(canvasDataURL.substring("data:image/png;base64,".length));
            var canvasAsArray = new Uint8Array(canvasData.length);

            for (var i = 0, len = canvasData.length; i < len; ++i) {
              canvasAsArray[i] = canvasData.charCodeAt(i);
            }

            return new Blob([canvasAsArray.buffer], {type: "image/png"});
          };

          /**
           * @returns a promise of an image.
           * @param dataURL
           */
          var makeSVGImage = function (dataURL) {
            var promise = new Promise(function (resolve, reject) {
                  try {
                    var img = $('<img/>')[0];
                    img.onload = function () {
                      resolve(img);
                    };
                    img.src = dataURL;
                  } catch (ex) {
                    reject(ex);
                  }
                }
            );
            return promise;
          };

          var saveImage = function (pngObject) {
            var saveImageFromDialog = function () {
              var rawDocName = tDialog.get('value');
              var docName = (/.*\.png$/.test(rawDocName))
                  ? rawDocName
                  : (rawDocName + '.png');

              if (!SC.empty(docName)) {
                docName = docName.trim();
                window.saveAs(pngObject, docName);
              }

              // Close the open/save dialog.
              tDialog.close();
            };
            var tDialog = DG.CreateSingleTextDialog({
              prompt: 'DG.AppController.exportDocument.prompt'.loc() +
              " (Safari users may need to control-click <a href=\"" + pngObject +
              "\">this link</a>)",
              escapePromptHTML: false,
              okTitle: 'DG.AppController.saveDocument.okTitle', // "Save"
              okTooltip: 'DG.AppController.saveDocument.okTooltip', // "Save the document with the specified name"
              okAction: function () {
                saveImageFromDialog();
              },
              cancelVisible: true
            });
          };

          var canvas = makeCanvasEl(width, height);
          var promises = [];

          //if (imgs) {
          //  imgs.forEach(function (img) {
          //    var width = img.width;
          //    var height = img.height;
          //    var left = img.offsetParent? img.offsetParent.offsetLeft: (img.parentElement? img.parentElement.offsetLeft: 0);
          //    var top = img.offsetParent? img.offsetParent.offsetTop: (img.parentElement? img.parentElement.offsetTop: 0);
          //    // copy image? I don't think it is necessary
          //    addImageToCanvas(canvas, img, left, top, width, height);
          //  });
          //}

          // for each svg we calculate its geometry, then add it to the canvas
          // through a promise.
          if (svgs) {
            svgs.forEach(function (svg) {
              var width = svg.offsetWidth || svg.width.baseVal.value;
              var height = svg.offsetHeight || svg.height.baseVal.value;
              var left = svg.offsetParent ? svg.offsetParent.offsetLeft : (svg.parentElement ? svg.parentElement.offsetLeft : 0);
              var top = svg.offsetParent ? svg.offsetParent.offsetTop : (svg.parentElement ? svg.parentElement.offsetTop : 0);
              var imgPromise = makeSVGImage(makeDataURLFromSVGElement(svg));
              imgPromise.then(function (img) {
                    addImageToCanvas(canvas, img, left, top, width, height);
                  },
                  function (error) {
                    DG.logError(error);
                  }
              );
              promises.push(imgPromise);
            });
          }

          // when all promises have been fulfilled we make a blob, then invoke the
          // save image dialog.
          Promise.all(promises).then(function () {
                return makeCanvasBlob(canvas);
              },
              function (error) {
                DG.logError(error);
              }
          ).then(function (blob) {
            saveImage(blob);
          });
        }


      };

    }()) // function closure
);

