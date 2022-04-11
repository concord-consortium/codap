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

/* global tinycolor */

sc_require('components/graph_map_common/data_display_controller');

/** @class

    DG.GraphController provides controller functionality, particular gear menu items,
 for graphs.

 @extends SC.DataDisplayController
 */
DG.GraphController = DG.DataDisplayController.extend(
    /** @scope DG.GraphController.prototype */
    (function () {

      function getCollectionClientFromDragData(iContext, iDragData) {
        var collectionID = iDragData.collection && iDragData.collection.get('id');
        return iContext && !SC.none(collectionID) && iContext.getCollectionByID(collectionID);
      }

      return {
        graphModel: function () {
          return this.get('dataDisplayModel');
        }.property('dataDisplayModel'),
        xAxisView: null,
        yAxisView: null,
        bottomAxisLabelView: null,
        leftAxisLabelView: null,
        y2AxisView: null,
        plotView: null,
        axisMultiTarget: null,
        topAxisView: null,
        rightAxisView: null,

        createComponentStorage: function () {
          var storage = {_links_: {}},
              dataContext = this.get('dataContext'),
              dataConfiguration = this.getPath('dataDisplayModel.dataConfiguration'),
              hiddenCases = dataConfiguration && dataConfiguration.get('hiddenCases');

          if (dataContext)
            storage._links_.context = dataContext.toLink();

          storage.displayOnlySelected = dataConfiguration.get('displayOnlySelected');
          dataConfiguration.addToStorageForDimension(storage, 'legend');

          if (hiddenCases) {
            storage._links_.hiddenCases = hiddenCases
                .filter(function (iCase) {
                  return !!iCase;
                })
                .map(function (iCase) {
                  return iCase.toLink();
                });
          }
          storage.pointColor = this.getPath('dataDisplayModel.pointColor');
          storage.strokeColor = this.getPath('dataDisplayModel.strokeColor');
          storage.pointSizeMultiplier = this.getPath('dataDisplayModel.pointSizeMultiplier');
          storage.transparency = this.getPath('dataDisplayModel.transparency');
          storage.strokeTransparency = this.getPath('dataDisplayModel.strokeTransparency');
          storage.strokeSameAsFill = this.getPath('dataDisplayModel.strokeSameAsFill');

          var plotModels = this.getPath('graphModel.plots');

          var storeAxis = function (iDim) {
            var tAxis = this.getPath('graphModel.' + iDim + 'Axis');
            if (tAxis)
              storage[iDim + 'AxisClass'] = String(tAxis.constructor);
            if (tAxis && tAxis.get('isNumeric')) {
              storage[iDim + 'LowerBound'] = tAxis.get('lowerBound');
              storage[iDim + 'UpperBound'] = tAxis.get('upperBound');
            }
          }.bind(this);

          storage.isTransparent = this.getPath('graphModel.isTransparent');
          storage.plotBackgroundColor = this.getPath('graphModel.plotBackgroundColor');
          storage.plotBackgroundOpacity = this.getPath('graphModel.plotBackgroundOpacity');
          storage.plotBackgroundImage = this.getPath('graphModel.plotBackgroundImage');
          storage.plotBackgroundImageLockInfo = this.getPath('graphModel.plotBackgroundImageLockInfo');
          storage.enableNumberToggle = this.getPath('graphModel.enableNumberToggle');
          if (storage.enableNumberToggle)
            storage.numberToggleLastMode = this.getPath('graphModel.numberToggle.lastMode');
          storage.enableMeasuresForSelection = this.getPath('graphModel.enableMeasuresForSelection');

          dataConfiguration.addToStorageForDimension(storage, 'x');
          dataConfiguration.addToStorageForDimension(storage, 'y');
          dataConfiguration.addToStorageForDimension(storage, 'y2');
          dataConfiguration.addToStorageForDimension(storage, 'top');
          dataConfiguration.addToStorageForDimension(storage, 'right');

          storeAxis('x');
          storeAxis('y');
          storeAxis('y2');
          storeAxis('top');
          storeAxis('right');

          if (plotModels) {
            storage.plotModels = [];
            plotModels.forEach(function (iPlot) {
              storage.plotModels.push({
                plotModelStorage: iPlot.createStorage(),
                plotClass: String(iPlot.constructor)
              });
            });
          }

          return storage;
        },

        restoreComponentStorage: function (iStorage, iDocumentID) {
          var graphModel = this.get('dataDisplayModel');

          sc_super();

          if (SC.none(iStorage._links_))
            return; // We don't support the older format 0096 and before. Just bring up the default graph
                    // that we already have.

          graphModel.restoreStorage(iStorage);

          // There may be some animations that have been set up. We have to stop them so that changes
          // we make below (e.g. to axis bounds) will stick.
          graphModel.stopAnimation();

          graphModel.updateAxisArrays();
          graphModel.updateSplitPlotArray();
          // Configure the axes
          ['x', 'y', 'y2'].forEach(function (iKey) {
            var tAxis = graphModel.get(iKey + 'Axis');
            if (tAxis && tAxis.get('isNumeric') &&
                isFinite(iStorage[iKey + 'LowerBound']) && isFinite(iStorage[iKey + 'UpperBound'])) {
              tAxis.setLowerAndUpperBounds(iStorage[iKey + 'LowerBound'], iStorage[iKey + 'UpperBound']);
            }
          });
        },

        /**
         * @property {DG.GraphView}
         */
        graphView: function () {
          return this.getPath('view.containerView.contentView');
        }.property('view'),

        viewDidChange: function () {
          this.notifyPropertyChange('graphView');
          var graphView = this.get('graphView');
          if (graphView) {
            this.set('xAxisView', graphView.get('xAxisView'));
            this.set('yAxisView', graphView.get('yAxisView'));
            this.set('bottomAxisLabelView', graphView.get('bottomAxisLabelView'));
            this.set('leftAxisLabelView', graphView.get('leftAxisLabelView'));
            this.set('y2AxisView', graphView.get('y2AxisView'));
            this.set('plotView', graphView.get('plotBackgroundView'));
            this.set('legendView', graphView.get('legendView'));
            this.set('axisMultiTarget', graphView.get('yAxisMultiTarget'));
            this.set('topAxisView', graphView.get('topAxisView'));
            this.set('rightAxisView', graphView.get('rightAxisView'));
            graphView.set('controller', this);
            graphView.addObserver('plotViewsReconfigured', this, this.addPlotViewObservers);
            graphView.addObserver('plotViewsWillBeDestroyed', this, this.removePlotViewObservers);
            this.addPlotViewObservers();
          }
        }.observes('*view.containerView.contentView'),

        /**
         * We get here through notification when our graphView has deleted all the plot views except the root
         * so that it can create new ones that work for a new attribute configuration.
         */
        addPlotViewObservers: function() {
          var this_ = this;
          this.getPath('graphView.plotBackgroundViewArray').forEach(
              function (iBackgroundViewArray, iRow) {
                iBackgroundViewArray.forEach(function (iBackgroundPlotView, iCol) {
                  // We don't have to add to the root plotView
                  if ((iRow !== 0 || iCol !== 0) && iBackgroundPlotView)
                    iBackgroundPlotView.addObserver('dragData', this_, this_.plotOrLegendViewDidAcceptDrop);
                });
              });
          this.getPath('graphView.xAxisViewArray').concat(this.getPath('graphView.yAxisViewArray')).
            forEach(function (iAxisView, iIndex) {
              if (iAxisView && !iAxisView.hasObserverFor('dragData', this_, this_.axisViewDidAcceptDrop))
                iAxisView.addObserver('dragData', this_, this_.axisViewDidAcceptDrop);
          });
        },

        /**
         * We get here through notification when our graphView is about to delete all the plot views except the root
         * so that it can create new ones that work for a new attribute configuration.
         */
        removePlotViewObservers: function() {
          var this_ = this;
          this.get('graphView').get('plotBackgroundViewArray').forEach(
              function( iBackgroundViewArray, iRow){
                iBackgroundViewArray.forEach( function( iBackgroundPlotView, iCol){
                  // We don't have to add to the root plotView
                  if( (iRow !== 0 || iCol !== 0) && iBackgroundPlotView)
                    iBackgroundPlotView.removeObserver('dragData', this_, this_.plotOrLegendViewDidAcceptDrop);
                });
              } );
          this.getPath('graphView.xAxisViewArray').concat(this.getPath('graphView.yAxisViewArray')).
          forEach(function (iAxisView, iIndex) {
            if (iAxisView)
              iAxisView.removeObserver('dragData', this_, this_.axisViewDidAcceptDrop);
          });
        },

        /**
         * The content of the values pane depends on what plot is showing; e.g. a scatterplot will have a checkbox
         * for showing a movable line, while a univariate dot plot will have one for showing a movable value.
         */
        showHideValuesPane: function () {
          var this_ = this,
              kTitleHeight = 26,
              kMargin = 20,
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
                          if( iDesc.control) {
                            this.appendChild( iDesc.control);
                          }
                          else {
                            iDesc.layout = {height: kRowHeight};
                            iDesc.localize = true;
                            this.appendChild(SC.CheckboxView.create(iDesc));
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

        addBackgroundImage: function () {

          function handleAbnormal() {
            console.log("Abort or error on file read.");
          }

          function handleRead() {
            var tImage = this.result;
            DG.UndoHistory.execute(DG.Command.create({
              name: 'graph.addBackgroundImage',
              undoString: 'DG.Undo.graph.addBackgroundImage',
              redoString: 'DG.Redo.graph.addBackgroundImage',
              _backgroundImage: null,
              executeNotification: {
                action: 'notify',
                resource: 'component',
                values: {
                  operation: 'backgroundImage',
                  type: 'DG.GraphView'
                }
              },
              execute: function () {
                tGraphModel.set('plotBackgroundImage', tImage);
              },
              undo: function () {
                this._backgroundImage = tGraphModel.get('plotBackgroundImage');
                tGraphModel.set('plotBackgroundImage', null);
              },
              redo: function () {
                tGraphModel.set('plotBackgroundImage', this._backgroundImage);
              }
            }));

          }

          function parseData(iData) {
            if (iData) {
              var tReader = new FileReader();
              tReader.onabort = handleAbnormal;
              tReader.onerror = handleAbnormal;
              tReader.onload = handleRead;
              tReader.readAsDataURL(iData.file.object);
            }
          }

          var tGraphModel = this.get('graphModel');
          return DG.cfmClient._ui.importDataDialog((function (_this) {
            return function (data) {
              return parseData(data);
            };
          })(this));

        },

        removeBackgroundImage: function () {
          var tGraphModel = this.get('graphModel');

          DG.UndoHistory.execute(DG.Command.create({
            name: 'graph.removeBackgroundImage',
            undoString: 'DG.Undo.graph.removeBackgroundImage',
            redoString: 'DG.Redo.graph.removeBackgroundImage',
            _backgroundImage: null,
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'backgroundImage',
                type: 'DG.GraphView'
              }
            },
            execute: function () {
              this._backgroundImage = tGraphModel.get('plotBackgroundImage');
              tGraphModel.set('plotBackgroundImage', null);
            },
            undo: function () {
              tGraphModel.set('plotBackgroundImage', this._backgroundImage);
            },
            redo: function () {
              tGraphModel.set('plotBackgroundImage', null);
            }
          }));
        },

        lockImageToAxes: function () {
          var tGraphModel = this.get('graphModel'),
              tInfo = {
                locked: true,
                xAxisLowerBound: tGraphModel.getPath('xAxis.lowerBound'),
                xAxisUpperBound: tGraphModel.getPath('xAxis.upperBound'),
                yAxisLowerBound: tGraphModel.getPath('yAxis.lowerBound'),
                yAxisUpperBound: tGraphModel.getPath('yAxis.upperBound')
              };

          DG.UndoHistory.execute(DG.Command.create({
            name: 'graph.lockBackgroundImage',
            undoString: 'DG.Undo.graph.lockBackgroundImage',
            redoString: 'DG.Redo.graph.lockBackgroundImage',
            _backgroundImage: null,
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'lockBackgroundImage',
                type: 'DG.GraphView'
              }
            },
            execute: function () {
              tGraphModel.set('plotBackgroundImageLockInfo', tInfo);
            },
            undo: function () {
              tGraphModel.set('plotBackgroundImageLockInfo', null);
            },
            redo: function () {
              tGraphModel.set('plotBackgroundImageLockInfo', tInfo);
            }
          }));
        },

        unlockImageFromAxes: function () {
          var tGraphModel = this.get('graphModel'),
              tInfo = tGraphModel.get('plotBackgroundImageLockInfo');

          DG.UndoHistory.execute(DG.Command.create({
            name: 'graph.unlockBackgroundImage',
            undoString: 'DG.Undo.graph.unlockBackgroundImage',
            redoString: 'DG.Redo.graph.unlockBackgroundImage',
            _backgroundImage: null,
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'unlockBackgroundImage',
                type: 'DG.GraphView'
              }
            },
            execute: function () {
              tGraphModel.set('plotBackgroundImageLockInfo', null);
            },
            undo: function () {
              tGraphModel.set('plotBackgroundImageLockInfo', tInfo);
            }
          }));
        },


        plotFunction: function () {
          this.graphModel.get('plot').togglePlotFunction();
        },

        /**
         * A case plot can't be rescaled, but it can do a mixUp.
         */
        rescaleFunction: function () {
          var tGraphModel = this.get('graphModel'),
              tPlot = tGraphModel.get('plot');
          if (tPlot && tPlot.mixUp)
            tGraphModel.mixUp();
          else if (tGraphModel.get('hasNumericAxis'))
            tGraphModel.rescaleAxesFromData(true /* allowAxisRescale */, true /* Animate action */,
                true /* log it */, true /* user action */);
        },

        /**
         * If the given drag data has a data context different than our own, we must reset the
         * graph model. (I.e. until such time as we are able to handle multiple contexts on one graph.)
         * @param iDragData
         */
        handlePossibleForeignDataContext: function (iDataContext) {
          var tDragContext = iDataContext,
              tExistingContext = this.get('dataContext');

          if (tDragContext && (tDragContext !== tExistingContext)) {
            if( tExistingContext)
              this.get('graphModel').reset();
            this.set('dataContext', tDragContext);
            var tConfig = this.getPath('graphModel.dataConfiguration');
            tConfig.set('dataContext', tDragContext);
            tConfig.invalidateCaches();
          }
        },

        /**
         An axis view has received a drop of an attribute. Our job is the tell the graph
         model which attribute and collection client to change so that we move into the
         desired configuration of attributes.
         Note that we need the '*' in the observes because the views are swapped out when the
         graph gets reconfigured.
         */
        axisViewDidAcceptDrop: function (iAxis, iKey, iDragData) {
          iDragData = iDragData || iAxis.dragData;
          if (SC.none(iDragData)) // The over-notification caused by the * in the observes
            return;       // means we get here at times there isn't any drag data.

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
                attributeName: iDragData.attribute.get('name'),
                axisOrientation: iAxis.get('orientation')
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

              controller.handlePossibleForeignDataContext(iDragData.context);

              var tDataContext = controller.get('dataContext'),
                  tCollectionClient = getCollectionClientFromDragData(tDataContext, iDragData),
                  tOrientation = iAxis.get('orientation'),
                  tModel = controller.get('graphModel'),
                  tAttrRefs = {
                    collection: tCollectionClient,
                    attributes: [iDragData.attribute]
                  };

              iAxis.dragData = null;
              tModel.changeAttributeForAxis(tDataContext, tAttrRefs, tOrientation);

              this.log = 'plotAxisAttributeChange: ' +
                  '{ "orientation": "%@", "attribute": "%@" }'
                      .fmt(iAxis.get('orientation'), iDragData.attribute.get('name'));
              controller.get('view').select();
              controller.setComponentTitleByChildmostCollection();
            },
            undo: function () {
              var controller = this._controller();
              this._afterStorage = controller.createComponentStorage();
              controller.restoreComponentStorage(this._beforeStorage);
              controller.setComponentTitleByChildmostCollection();
            },
            redo: function () {
              this._controller().restoreComponentStorage(this._afterStorage);
              this._controller().setComponentTitleByChildmostCollection();
              this._afterStorage = null;
            }
          }));
        }.observes('*xAxisView.dragData', '*yAxisView.dragData', '*bottomAxisLabelView.dragData',
            '*leftAxisLabelView.dragData', '*rightAxisView.dragData', '*topAxisView.dragData'),

        /**
         The add attribute target has received a drop of an attribute. We respond by adding an
         attribute to whatever is already on the y-axis.
         */
        multiTargetDidAcceptDrop: function (iAxisMultiTarget, iKey, iDragData) {
          if (SC.none(iDragData)) // The over-notification caused by the * in the observes
            return;       // means we get here at times there isn't any drag data.

          DG.UndoHistory.execute(DG.Command.create({
            name: 'axis.attributeChangeMultiTarget',
            undoString: 'DG.Undo.axisAttributeAdded',
            redoString: 'DG.Redo.axisAttributeAdded',
            _beforeStorage: null,
            _afterStorage: null,
            _componentId: this.getPath('model.id'),
            _controller: function () {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'add axis attribute',
                type: 'DG.GraphView'
              }
            },
            execute: function () {
              var controller = this._controller(),
                  tDataConfiguration = controller.getPath('graphModel.dataConfiguration');
              this._beforeStorage = controller.createComponentStorage();

              controller.handlePossibleForeignDataContext(iDragData.context);

              var tDataContext = controller.get('dataContext'),
                  tCollectionClient = getCollectionClientFromDragData(tDataContext, iDragData),
                  tGraphModel = controller.get('graphModel'),
                  tAttrRefs = {
                    collection: tCollectionClient,
                    attributes: [iDragData.attribute]
                  };

              iAxisMultiTarget.dragData = null;

              if (tDataConfiguration.attributeIsNominal(iDragData.attribute)) {
                tGraphModel.splitByAttribute(tDataContext, tAttrRefs, 'top');

                this.log = 'Graph split vertically attribute %@'.fmt(iDragData.attribute.get('name'));
              }
              else {
                tGraphModel.addAttributeToAxis(tDataContext, tAttrRefs);

                this.log = 'Attribute dragged and dropped: %@, %@'.fmt('vertical', iDragData.attribute.get('name'));
              }
              controller.get('view').select();
            },
            undo: function () {
              var controller = this._controller();
              this._afterStorage = controller.createComponentStorage();
              controller.restoreComponentStorage(this._beforeStorage);
              controller.get('graphModel').notifyPropertyChange('attributeRemoved');
            },
            redo: function () {
              this._controller().restoreComponentStorage(this._afterStorage);
              this._afterStorage = null;
              this._controller().get('graphModel').notifyPropertyChange('attributeAdded');
            }
          }));
        }.observes('*axisMultiTarget.dragData'),

        /**
         The Y2 axis has received a drop of an attribute. We respond by creating a new scatterplot that
         uses the existing x-axis and the Y2 axis.
         */
        y2AxisDidAcceptDrop: function (iY2Axis, iKey, iDragData) {
          if (SC.none(iDragData)) // The over-notification caused by the * in the observes
            return;       // means we get here at times there isn't any drag data.

          DG.UndoHistory.execute(DG.Command.create({
            name: 'axis.attributeChangeY2',
            undoString: 'DG.Undo.axisAttributeChangeY2',
            redoString: 'DG.Redo.axisAttributeChangeY2',
            _beforeStorage: null,
            _afterStorage: null,
            _componentId: this.getPath('model.id'),
            _controller: function () {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'add 2nd axis attribute',
                type: 'DG.GraphView'
              }
            },
            execute: function () {
              var controller = this._controller(),
                  tDataConfiguration = controller.getPath('graphModel.dataConfiguration');
              this._beforeStorage = controller.createComponentStorage();

              var tDataContext = controller.get('dataContext'),
                  tCollectionClient = getCollectionClientFromDragData(tDataContext, iDragData),
                  tOrientation = iY2Axis.get('orientation'),
                  tModel = controller.get('graphModel'),
                  tAttrRefs = {
                    collection: tCollectionClient,
                    attributes: [iDragData.attribute]
                  };

              iY2Axis.dragData = null;
              if (tDataConfiguration.attributeIsNominal(iDragData.attribute)) {
                tModel.splitByAttribute(tDataContext, tAttrRefs, 'right');
              }
              else {
                tModel.changeAttributeForY2Axis(tDataContext, tAttrRefs, tOrientation);
              }
              controller.get('view').select();

              this.log = 'changeAttributeOnSecondYAxis: { attribute: %@ }'.fmt(iDragData.attribute.get('name'));
            },
            undo: function () {
              var controller = this._controller();
              this._afterStorage = controller.createComponentStorage();
              controller.restoreComponentStorage(this._beforeStorage);
              controller.get('graphModel').notifyPropertyChange('attributeRemoved');
            },
            redo: function () {
              this._controller().restoreComponentStorage(this._afterStorage);
              this._afterStorage = null;
              this._controller().get('graphModel').notifyPropertyChange('y2AttributeAdded');
            }
          }));
        }.observes('*y2AxisView.dragData'),

        /**
         Our base class can handle this except for the situation in which this is the first attribute being dropped,
         in which case we want to override the default behavior and simulate drop on the x-axis, which is probably
         what the user intended, but missed.
         */
        plotOrLegendViewDidAcceptDrop: function (iView, iKey, iDragData) {
          var tDataConfig = this.getPath('graphModel.dataConfiguration');
          iDragData = iDragData || iView.get('dragData'); // In certain situations we have to get it directly
          if (!tDataConfig.get('xAttributeID') &&
              !tDataConfig.get('yAttributeID') &&
              !tDataConfig.get('legendAttributeID')) {
            iView.dragData = null;  // So we don't come back around
            this.axisViewDidAcceptDrop(this.get('xAxisView'), iKey, iDragData);
          }
          else
            sc_super();
        }.observes('*plotView.dragData', '*legendView.dragData'),

        styleControls: function () {
          var tResult = sc_super();
          var
              kRowHeight = 20,
              this_ = this,
              currentOpenSession = null,
              tBkgColor = tinycolor(this.getPath('graphModel.plotBackgroundColor') || 'white'),
              tOpacity = this.getPath('graphModel.plotBackgroundOpacity');
          tOpacity = SC.none(tOpacity) ? 1 : tOpacity;
          var tInitialColor = tBkgColor.setAlpha(tOpacity),
              getStylesLayer = function () {
                return this.stylesPane.layer();
              }.bind(this),
              createSetColorAndAlphaCommand = function (name, colorAttr, alphaAttr, iColor) {
                return DG.Command.create({
                  name: 'data.style.' + name,
                  undoString: 'DG.Undo.graph.' + name,
                  redoString: 'DG.Redo.graph.' + name,
                  log: "Changed background color",
                  executeNotification: {
                    action: 'notify',
                    resource: 'component',
                    values: {
                      operation: 'change background color',
                      type: 'DG.GraphView'
                    }
                  },
                  execute: function () {
                    this.reduceKey = this.name + currentOpenSession;
                    this._beforeStorage = {
                      color: this_.getPath('graphModel.' + colorAttr),
                      alpha: this_.getPath('graphModel.' + alphaAttr)
                    };
                    this_.setPath('graphModel.' + colorAttr, iColor.toHexString());
                    this_.setPath('graphModel.' + alphaAttr, iColor.getAlpha());
                  },
                  undo: function () {
                    this_.setPath('graphModel.' + colorAttr, this._beforeStorage.color);
                    this_.setPath('graphModel.' + alphaAttr, this._beforeStorage.alpha);
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
                DG.UndoHistory.execute(createSetColorAndAlphaCommand("changeBackgroundColor",
                    "plotBackgroundColor", "plotBackgroundOpacity", iColor));
              },
              setColorFinalized = function () {
                currentOpenSession = null;
              };
          tResult.push(
              DG.PickerControlView.create({
                layout: {height: 2 * kRowHeight},
                label: 'DG.Inspector.backgroundColor',
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
          tResult.push(SC.CheckboxView.create({
            layout: {height: 25},
            title: 'DG.Inspector.graphTransparency',
            value: this.getPath('graphModel.isTransparent'),
            classNames: 'dg-graph-transparent-check'.w(),
            localize: true,
            valueDidChange: function () {
              var turningTransparent = !this.getPath('graphModel.isTransparent'),
                  logMessage = "Made plot background " + (turningTransparent ? "transparent" : "opaque");
              DG.UndoHistory.execute(DG.Command.create({
                name: 'plot.transparencyChange',
                undoString: 'DG.Undo.graph.toggleTransparent',
                redoString: 'DG.Redo.graph.toggleTransparent',
                log: logMessage,
                executeNotification: {
                  action: 'notify',
                  resource: 'component',
                  values: {
                    operation: 'toggle background transparency',
                    type: 'DG.GraphView'
                  }
                },
                execute: function () {
                  this.get('graphModel').toggleProperty('isTransparent');
                }.bind(this),
                undo: function () {
                  this.get('graphModel').toggleProperty('isTransparent');
                }.bind(this)
              }));
            }.bind(this).observes('value')
          }));

          return tResult;
        }.property()
      };

    }()) // function closure
);

