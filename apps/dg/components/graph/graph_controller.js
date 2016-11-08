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
        y2AxisView: null,
        plotView: null,
        axisMultiTarget: null,

        createComponentStorage: function () {
          var storage = sc_super(),
              dataConfiguration = this.getPath('graphModel.dataConfiguration'),
              plotModels = this.getPath('graphModel.plots');

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

          this.storeDimension(dataConfiguration, storage, 'x');
          this.storeDimension(dataConfiguration, storage, 'y');
          this.storeDimension(dataConfiguration, storage, 'y2');

          storeAxis('x');
          storeAxis('y');
          storeAxis('y2');

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

          // Configure the axes
          var xAxis = graphModel.get('xAxis'),
              yAxis = graphModel.get('yAxis'),
              y2Axis = graphModel.get('y2Axis');
          if (xAxis && xAxis.get('isNumeric') &&
              isFinite(iStorage.xLowerBound) && isFinite(iStorage.xUpperBound)) {
            xAxis.setLowerAndUpperBounds(iStorage.xLowerBound, iStorage.xUpperBound);
          }
          if (yAxis && yAxis.get('isNumeric') &&
              isFinite(iStorage.yLowerBound) && isFinite(iStorage.yUpperBound)) {
            yAxis.setLowerAndUpperBounds(iStorage.yLowerBound, iStorage.yUpperBound);
          }
          if (y2Axis && y2Axis.get('isNumeric') &&
              isFinite(iStorage.y2LowerBound) && isFinite(iStorage.y2UpperBound)) {
            y2Axis.setLowerAndUpperBounds(iStorage.y2LowerBound, iStorage.y2UpperBound);
          }
        },

        viewDidChange: function () {
          var componentView = this.get('view'),
              graphView = componentView && componentView.get('contentView');
          if (graphView) {
            this.set('xAxisView', graphView.get('xAxisView'));
            this.set('yAxisView', graphView.get('yAxisView'));
            this.set('y2AxisView', graphView.get('y2AxisView'));
            this.set('plotView', graphView.get('plotBackgroundView'));
            this.set('legendView', graphView.get('legendView'));
            this.set('axisMultiTarget', graphView.get('yAxisMultiTarget'));
            graphView.set('controller', this);
          }
        }.observes('view'),

        makePngImage: function () {
          var componentView = this.get('view');
          var graphView = componentView && componentView.get('contentView');
          var svgElements = graphView.$('svg');
          var width = graphView.getPath('frame.width');
          var height = graphView.getPath('frame.height');
          this.convertToImage(svgElements, 0, 0, width, height);
        },


        rescaleAxes: function () {
          this.graphModel.rescaleAxes();
        },

        plotFunction: function () {
          this.graphModel.get('plot').togglePlotFunction();
        },

        /**
         * A case plot can't be rescaled, but it can do a mixUp.
         */
        rescaleFunction: function () {
          var tPlot = this.getPath('graphModel.plot');
          if (tPlot && tPlot.mixUp)
            tPlot.mixUp();
          else if (this.getPath('graphModel.hasNumericAxis') && tPlot && tPlot.rescaleAxesFromData)
            tPlot.rescaleAxesFromData(true /* allowAxisRescale */, true /* Animate action */,
                true /* log it */, true /* user action */);
        },

        /**
         * If the given drag data has a data context different than our own, we must reset the
         * graph model. (I.e. until such time as we are able to handle multiple contexts on one graph.)
         * @param iDragData
         */
        handlePossibleForeignDataContext: function (iDragData) {
          var tDragContext = iDragData.context;

          if (!SC.none(tDragContext) && (tDragContext !== this.get('dataContext'))) {
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
        if (SC.none(iDragData)) // The over-notification caused by the * in the observes
          return;       // means we get here at times there isn't any drag data.

        DG.UndoHistory.execute(DG.Command.create({
          name: 'axis.attributeChange',
          undoString: 'DG.Undo.axisAttributeChange',
          redoString: 'DG.Redo.axisAttributeChange',
          _beforeStorage: null,
          _afterStorage: null,
          _componentId: this.getPath('model.id'),
          _controller: function() {
            return DG.currDocumentController().componentControllersMap[this._componentId];
          },
          execute: function() {
            var tBenchmarkName = 'Drag attribute ' + iDragData.attribute.get('name') + ' to graph axis';
            SC.Benchmark.start(tBenchmarkName);
            //console.profile(tBenchmarkName);
            var controller = this._controller();
            this._beforeStorage = controller.createComponentStorage();

            controller.handlePossibleForeignDataContext( iDragData);

            var tDataContext = controller.get('dataContext'),
                tCollectionClient = getCollectionClientFromDragData(tDataContext, iDragData);

            iAxis.dragData = null;

            controller.get('graphModel').changeAttributeForAxis(
                tDataContext,
                {
                  collection: tCollectionClient,
                  attributes: [iDragData.attribute]
                },
                iAxis.get('orientation')
            );

            this.log = 'plotAxisAttributeChange: ' +
                '{ "orientation": "%@", "attribute": "%@" }'
                    .fmt(iAxis.get('orientation'), iDragData.attribute.get('name'));
            SC.Benchmark.end(tBenchmarkName);
            SC.Benchmark.log(tBenchmarkName);
            //console.profileEnd();
          },
          undo: function() {
            var controller = this._controller();
            this._afterStorage = controller.createComponentStorage();
            controller.restoreComponentStorage(this._beforeStorage);
          },
          redo: function() {
            this._controller().restoreComponentStorage(this._afterStorage);
            this._afterStorage = null;
          }
        }));
      }.observes('*xAxisView.dragData', '*yAxisView.dragData'),

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
            _controller: function() {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            execute: function() {
              var controller = this._controller();
              this._beforeStorage = controller.createComponentStorage();

              controller.handlePossibleForeignDataContext( iDragData);

              var tDataContext = controller.get('dataContext'),
                tCollectionClient = getCollectionClientFromDragData(tDataContext, iDragData);

              iAxisMultiTarget.dragData = null;

              controller.get('graphModel').addAttributeToAxis(
                tDataContext,
                {
                  collection: tCollectionClient,
                  attributes: [iDragData.attribute]
                });

              this.log = 'Attribute dragged and dropped: %@, %@'.fmt('vertical', iDragData.attribute.get('name'));
            },
            undo: function() {
              var controller = this._controller();
              this._afterStorage = controller.createComponentStorage();
              controller.restoreComponentStorage(this._beforeStorage);
              controller.get('graphModel').notifyPropertyChange('attributeRemoved');
            },
            redo: function() {
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
            _controller: function() {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            execute: function() {
              var controller = this._controller();
              this._beforeStorage = controller.createComponentStorage();

              controller.handlePossibleForeignDataContext( iDragData);

              var tDataContext = controller.get('dataContext'),
                tCollectionClient = getCollectionClientFromDragData(tDataContext, iDragData);

              iY2Axis.dragData = null;

              controller.get('graphModel').changeAttributeForY2Axis(
                tDataContext,
                {
                  collection: tCollectionClient,
                  attributes: [iDragData.attribute]
                });

              this.log = 'changeAttributeOnSecondYAxis: { attribute: %@ }'.fmt(iDragData.attribute.get('name'));
            },
            undo: function() {
              var controller = this._controller();
              this._afterStorage = controller.createComponentStorage();
              controller.restoreComponentStorage(this._beforeStorage);
              controller.get('graphModel').notifyPropertyChange('attributeRemoved');
            },
            redo: function() {
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
        plotOrLegendViewDidAcceptDrop: function( iView, iKey, iDragData) {
          var tDataConfig = this.getPath('graphModel.dataConfiguration');
          if( !tDataConfig.get('xAttributeID') &&
              !tDataConfig.get('yAttributeID') &&
              !tDataConfig.get('legendAttributeID')) {
            iView.dragData = null;  // So we don't come back around
            this.axisViewDidAcceptDrop( this.get('xAxisView'), iKey, iDragData);
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
          tOpacity = SC.none( tOpacity) ? 1 : tOpacity;
          var tInitialColor = tBkgColor.setAlpha(tOpacity),
              getStylesLayer = function () {
                return this.stylesPane.layer();
              }.bind(this),
              createSetColorAndAlphaCommand = function (name, colorAttr, alphaAttr, iColor) {
                return DG.Command.create({
                  name: 'data.style.'+name,
                  undoString: 'DG.Undo.graph.'+name,
                  redoString: 'DG.Redo.graph.'+name,
                  log: "Changed background color",
                  execute: function() {
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
                  classNames: 'graph-point-color'.w(),
                  initialColor: tInitialColor,
                  setColorFunc: setColor,
                  closedFunc: setColorFinalized,
                  appendToLayerFunc: getStylesLayer
                })
              })
          );
          tResult.push( SC.CheckboxView.create({
            layout: {height: 25 },
            title: 'DG.Inspector.graphTransparency',
            value: this.getPath('graphModel.isTransparent'),
            classNames: 'graph-transparent-check'.w(),
            localize: true,
            valueDidChange: function () {
              var turningTransparent = !this.getPath('graphModel.isTransparent'),
                  logMessage = "Made plot background " + (turningTransparent ? "transparent" : "opaque");
              DG.UndoHistory.execute(DG.Command.create({
                name: 'plot.transparencyChange',
                undoString: 'DG.Undo.graph.toggleTransparent',
                redoString: 'DG.Redo.graph.toggleTransparent',
                log: logMessage,
                execute: function() {
                  this.get('graphModel').toggleProperty('isTransparent');
                }.bind(this),
                undo: function() {
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

