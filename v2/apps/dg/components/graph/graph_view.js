// ==========================================================================
//                            DG.GraphView
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

/** @class  DG.GraphView - The view for a graph. Coordinates axes and plots.

 @extends SC.View
 */
DG.GraphView = SC.View.extend(
    /** @scope DG.GraphView.prototype */
    {
      displayProperties: ['model.dataConfiguration.attributeAssignment'],

      classNames: ['dg-graph-view'],

      /**
       The model on which this view is based.
       @property { DG.GraphModel }
       */
      model: null,

      controller: null,

      /**
       * @property { SC.View }
       */
      leftEdgeBackground: null,
      rightEdgeBackground: null,

      yAxisMultiTarget: null,
      legendView: null,
      numberToggleView: null,
      measuresForSelectedInfoView: null,  // DG.SelectedInfoView

      /**
       * The following three arrays are instrumental in bringing about splitting of a graph
       * into multiple plot views.
       * @property [{DG.AxisView}]
       */
      xAxisViewArray: null,
      yAxisViewArray: null,
      y2AxisViewArray: null,

      /**
       * The following two axis views lay out the categories when the graph is split in one
       * or both dimensions.
       * @property {DG.CellAxisView}
       */
      topAxisView: null,
      rightAxisView: null,

      // When a graph is split, we have multiple axis views, but we only want one label
      // We use these for bottom and left axis labels regardless, though.
      bottomAxisLabelView: null,
      leftAxisLabelView: null,

      /**
       @property { DG.AxisView }
       */
      xAxisView: function (iKey, iValue) {
        if (!this.xAxisViewArray)
          this.xAxisViewArray = [];
        if (iValue) {
          this.get('xAxisViewArray')[0] = iValue;
        }
        return this.xAxisViewArray[0];
      }.property(),

      /**
       @property { DG.AxisView }
       */
      yAxisView: function (iKey, iValue) {
        if (!this.yAxisViewArray)
          this.yAxisViewArray = [];
        if (iValue) {
          this.get('yAxisViewArray')[0] = iValue;
        }
        return this.yAxisViewArray[0];
      }.property(),

      /**
       * @property { DG.AxisView }
       */
      y2AxisView: function (iKey, iValue) {
        if (!this.y2AxisViewArray)
          this.y2AxisViewArray = [];
        if (iValue) {
          this.get('y2AxisViewArray')[0] = iValue;
        }
        return this.y2AxisViewArray[0];
      }.property(),

      /**
       * @property {DG.PlotBackgroundView}
       */
      plotBackgroundView: null,

      /**
       * When the graph is split into multiple plots, this 2-dim array holds one plot background view
       * for each cell. It is shared by the possibly multiple (scatter)plot views in that cell.
       * @property [[{DG.PlotBackgroundView}]]
       */
      plotBackgroundViewArray: null,

      _functionEditorView: null,
      functionEditorView: function (iKey, iValue) {
        if (iValue !== undefined) {
          if (this._functionEditorView) {
            this.removeChild(this._functionEditorView);
          }
          if (iValue) {
            this.appendChild(iValue);
            iValue.addObserver('isVisible', this, this.handleAxisOrLegendLayoutChange);
          }
          this._functionEditorView = iValue;
        }
        return this._functionEditorView;
      }.property(),

      _plottedValueEditorView: null,
      plottedValueEditorView: function (iKey, iValue) {
        if (iValue !== undefined) {
          if (this._plottedValueEditorView) {
            this.removeChild(this._plottedValueEditorView);
          }
          if (iValue) {
            this.appendChild(iValue);
            iValue.addObserver('isVisible', this, this.handleAxisOrLegendLayoutChange);
          }
          this._plottedValueEditorView = iValue;
        }
        return this._plottedValueEditorView;
      }.property(),

      /**
       * Returns the first plotView in _plotViews, if any. When used to set,
       * wipes out the current array and replaces it with a new array
       * containing just iValue
       *
       * @param iKey
       * @param iValue
       * @return {DG.PlotView}
       */
      plotView: function (iKey, iValue) {
        if (!SC.none(iValue)) {
          this._plotViews.forEach(function (iPlotView) {
            iPlotView.destroy();
          });
          this._plotViews[0] = iValue;
          this._plotViews.length = 1;
        }
        return (this._plotViews.length < 1) ? null : this._plotViews[0];
      }.property(),

      _plotViews: null,
      _drawPlotsInvocations: 0, // Used to limit redrawing of plots to what is necessary
      _displayDidChangeInvocationsOfDrawPlots: 0, // Another attempt to limit redrawing

      /**
       * This array of plot views is the one that is the only such if the graph is not split.
       * @property [{DG.PlotView}]
       */
      plotViews: function () {
        return this._plotViews;
      }.property(),

      /**
       * This 3-dim array of plot views is parallel to the array of plot models owned by my model.
       * @property [[[{DG.PlotView}]]]
       */
      splitPlotViewArray: null,

      /**
       * If not already present, adds the given plotView to my array.
       * We have to put the new plotView in the same position in the array that the
       * new plot is in the array of plots my model holds onto.
       * @param iPlotView
       */
      addPlotView: function (iPlotView) {
        if (!this._plotViews.contains(iPlotView)) {
          var tNewPlot = iPlotView.get('model'),
              tPlots = this.getPath('model.plots'),
              tIndexOfNewPlot = this._plotViews.length;
          tPlots.forEach(function (iPlot, iPlotIndex) {
            if (iPlot === tNewPlot)
              tIndexOfNewPlot = iPlotIndex;
          });
          this._plotViews.splice(tIndexOfNewPlot, 0, iPlotView);
          iPlotView.setIfChanged('paperSource', this.get('plotBackgroundView'));
          this._plotViews.forEach( function( _plotView, iIndex) {
            _plotView.setIfChanged('plotIndex', iIndex);
            _plotView.setIfChanged('numPlots', tPlots.length);
          });
          iPlotView.set('isFirstPlot', tIndexOfNewPlot === 0);  // Important to do this _after_ plotIndex is set
        }
      },

      plotDisplayDidChange: function () {
        this._displayDidChangeInvocationsOfDrawPlots++;
        this.invokeOnceLater(function () {
          this._displayDidChangeInvocationsOfDrawPlots--;
          if (this._displayDidChangeInvocationsOfDrawPlots === 0) {
            this.drawPlots();
          }
        });
      },

      addPlotViewObserver: function (iPlotView) {
        if( !iPlotView.hasObserverFor('plotDisplayDidChange', this, this.plotDisplayDidChange))
          iPlotView.addObserver('plotDisplayDidChange', this, this.plotDisplayDidChange);
      },

      removePlotViewObserver: function (iPlotView) {
        iPlotView.removeObserver('plotDisplayDidChange', this, this.plotDisplayDidChange);
      },

      /**
       * Bottleneck for configuring a plotView
       * @param iPlotView
       * @param iPlotModel
       * @param iCurrentPoints
       */
      setPlotViewProperties: function (iPlotView, iPlotModel, iYAxisKey, iCurrentPoints) {
        var tAxisModelWasChanged = false;

        var installAxisView = function (iAxisViewDescription) {
          var tNewViewClass = iAxisViewDescription.axisClass,
              tPrefix = iAxisViewDescription.axisKey;
          if (!SC.none(tNewViewClass)) {
            var tOldView = this.get(tPrefix + 'AxisView');
            if (tOldView.constructor === tNewViewClass)
              return; // Already done

            var tNewModelClass = DG.PlotUtilities.mapAxisViewClassToAxisModelClass(tNewViewClass),
                tExistingAxisModel = this.getPath('model.' + tPrefix + 'Axis'),
                tExistingAxisModelClass = tExistingAxisModel && tExistingAxisModel.constructor,
                tOrientation = tOldView.get('orientation'),
                tPaperSource = iAxisViewDescription.axisKey === 'x' ?
                    this.get('bottomAxisLabelView') : this.get('leftAxisLabelView'),
                tNewAxisModel = (tExistingAxisModelClass === tNewModelClass) ? tExistingAxisModel :
                    tNewModelClass.create(iAxisViewDescription.axisModelProperties || {}, {
                      dataConfiguration: this.getPath('model.dataConfiguration')
                    }),
                tNewView = tNewViewClass.create({
                  orientation: tOrientation,
                  model: tNewAxisModel,
                  paperSourceForLabel: tPaperSource
                });
            this.removeChild(tOldView);
            this.appendChild(tNewView);
            this.set(tPrefix + 'AxisView', tNewView);
            this.setPath('plotBackgroundView.' + tPrefix + 'AxisView', tNewView);
            this.setPath('plotView.' + tPrefix + 'AxisView', tNewView);
            this.setPath('controller.' + tPrefix + 'AxisView', tNewView);
            tOldView.destroy();
            if (tExistingAxisModelClass !== tNewModelClass) {
              tNewAxisModel.set('attributeDescription',
                  this.getPath('model.dataConfiguration.' + tPrefix + 'AttributeDescription'));
              this.setPath('model.' + tPrefix + 'Axis', tNewAxisModel);
              this.setPath('model.plot.' + tPrefix + 'Axis', tNewAxisModel);
              tAxisModelWasChanged = true;
            }
          }
        }.bind(this);

        iYAxisKey = iYAxisKey || 'yAxisView';
        iPlotView.beginPropertyChanges();
        iPlotView.setIfChanged('paperSource', this.get('plotBackgroundView'));
        iPlotView.setIfChanged('model', iPlotModel);
        iPlotView.setIfChanged('parentView', this);
        iPlotView.setIfChanged('xAxisView', this.get('xAxisView'));
        iPlotView.setIfChanged('yAxisView', this.get(iYAxisKey));
        // special requirements set up here, with possible return of description of an axis to be added
        iPlotView.getAxisViewDescriptions().forEach(installAxisView);
        if (tAxisModelWasChanged && iPlotModel.rescaleAxesFromData)
          iPlotModel.rescaleAxesFromData(true /* allow scale shrinkage */,
              true /* animate points */);
        iPlotView.setupAxes();
        if (!SC.none(iCurrentPoints))
          iPlotView.set('transferredElementCoordinates', iCurrentPoints);
        iPlotView.endPropertyChanges();

        this.addPlotViewObserver(iPlotView);
      },

      init: function () {
        var this_ = this;

        this.currTime = 0; // For measuring time spent

        function getAxisViewClass(iAxis, iAttributeType) {
          switch (iAxis.constructor) {
            case DG.AxisModel:
              return DG.AxisView;
            case DG.CellLinearAxisModel:
              return (iAttributeType === 'qualitative') ? DG.QualCellLinearAxisView : DG.CellLinearAxisView;
            case DG.FormulaAxisModel:
              return DG.FormulaAxisView;
            case DG.CellAxisModel:
              return DG.CellAxisView;
            case DG.CountAxisModel:
              return DG.CountAxisView;
            case DG.BinnedAxisModel:
              return DG.BinnedAxisView;
          }
          return null;
        }

        function initPlotViewArrays() {
          this_._plotViews = [];
          this_.splitPlotViewArray = [[this_._plotViews]];
          this_.plotBackgroundViewArray = [[this_.plotBackgroundView]];
        }

        var tXAxis = this.getPath('model.xAxis'),
            tXAxisAttributeType = this.getPath('model.dataConfiguration.xAttributeDescription.attribute.type'),
            tYAxis = this.getPath('model.yAxis'),
            tYAxisAttributeType = this.getPath('model.dataConfiguration.yAttributeDescription.attribute.type'),
            tY2Axis = this.getPath('model.y2Axis'),
            tDataConfiguration = this.getPath('model.dataConfiguration'),
            tBottomAxisLabelView = DG.AxisLabelView.create({
              orientation: DG.GraphTypes.EOrientation.kHorizontal,
              plottedAttribute: tXAxis.get('firstAttribute'),
              dataConfiguration: tDataConfiguration
            }),
            tLeftAxisLabelView = DG.AxisLabelView.create({orientation: DG.GraphTypes.EOrientation.kVertical,
              plottedAttribute: tYAxis.get('firstAttribute'),
              dataConfiguration: tDataConfiguration}),
            tXAxisView = getAxisViewClass(tXAxis, tXAxisAttributeType).create({
              orientation: DG.GraphTypes.EOrientation.kHorizontal, paperSourceForLabel: tBottomAxisLabelView
            }),
            tYAxisView = getAxisViewClass(tYAxis, tYAxisAttributeType).create({
              orientation: DG.GraphTypes.EOrientation.kVertical, paperSourceForLabel: tLeftAxisLabelView
            }),
            tY2AxisView = getAxisViewClass(tY2Axis).create({orientation: DG.GraphTypes.EOrientation.kVertical2}),
            tTopAxis = this.getPath('model.topAxis'),
            tTopAxisView = getAxisViewClass(tTopAxis).create({orientation: DG.GraphTypes.EOrientation.kTop, centering: 'true'}),
            tRightAxis = this.getPath('model.rightAxis'),
            tRightAxisView = getAxisViewClass(tRightAxis).create({orientation: DG.GraphTypes.EOrientation.kRight, centering: 'true'}),
            tBackgroundView = DG.PlotBackgroundView.create({
              xAxisView: tXAxisView, yAxisView: tYAxisView,
              graphModel: this.get('model'),
              rowIndex: 0,
              colIndex: 0
            }),
            tSelectedInfoView = DG.SelectedInfoView.create({ graphModel: this.get('model')});

        sc_super();

        this.set('leftEdgeBackground', SC.View.create({classNames: 'dg-axis-view'.w()}));
        this.appendChild(this.get('leftEdgeBackground'));
        this.set('rightEdgeBackground', SC.View.create({classNames: 'dg-axis-view'.w()}));
        this.appendChild(this.get('rightEdgeBackground'));
        this.appendChild(tBottomAxisLabelView);
        this.set('bottomAxisLabelView', tBottomAxisLabelView);
        this.appendChild(tLeftAxisLabelView);
        this.set('leftAxisLabelView', tLeftAxisLabelView);


        this.set('plotBackgroundView', tBackgroundView);
        initPlotViewArrays();

        this.set('xAxisView', tXAxisView);
        this.appendChild(tXAxisView);
        this.set('yAxisView', tYAxisView);
        this.appendChild(tYAxisView);

        // y2AxisView must be 'under' plotBackgroundView for dragging to work properly when there is no
        // attribute on y2 axis.
        this.set('y2AxisView', tY2AxisView);
        tY2AxisView.set('xAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
        tY2AxisView.set('otherYAttributeDescription', this.getPath('model.yAxis.attributeDescription'));
        tYAxisView.set('otherYAttributeDescription', this.getPath('model.y2Axis.attributeDescription'));

        this.set('topAxisView', tTopAxisView);
        this.appendChild(tTopAxisView);
        this.set('rightAxisView', tRightAxisView);
        this.appendChild(tRightAxisView);

        this.appendChild(tBackgroundView);

        this.legendView = DG.LegendView.create({model: this.getPath('model.legend')});
        this.appendChild(this.legendView);

        this.createMultiTarget();

        if (this.getPath('model.numberToggle')) {
          var isNumberToggleEnabled = this.getPath('model.numberToggle.isEnabled'),
              tNumberToggleView = DG.NumberToggleView.create({
                model: this.getPath('model.numberToggle'),
                isVisible: isNumberToggleEnabled
              });
          this.set('numberToggleView', tNumberToggleView);
          this.appendChild(tNumberToggleView);
        }

        this.set('measuresForSelectedInfoView', tSelectedInfoView);
        this.appendChild( tSelectedInfoView);

        tXAxisView.set('model', tXAxis);
        tYAxisView.set('model', tYAxis);

        tY2AxisView.set('model', tY2Axis);

        tTopAxisView.set('model', tTopAxis);
        tRightAxisView.set('model', tRightAxis);

        this.assignPlotViewToEachPlot();

        this.appendChild(tY2AxisView); // So it will be on top and drag-hilite will show over plot
        tY2AxisView.set('isVisible', tY2AxisView.get('model').constructor !== DG.AxisModel);
        tTopAxisView.set('isVisible', this.getPath('model.numSplitColumns') > 1);
        tRightAxisView.set('isVisible', this.getPath('model.numSplitRows') > 1);

        // If we're split, now is the time to initialize arrays
        this.handleSplitAttributeChange();
      },

      destroy: function () {
        var tPlotViews = this.get('plotViews'),
            tModel = this.get('model');
        sc_super();
        // Plotviews are not actually subviews so sc_super doesn't destroy them
        tPlotViews.forEach(function (iPlotView) {
          iPlotView.destroy();
        });
        tModel.destroy(); // so that it can unlink observers
      },

      /**
       * Override to deal with removing functionEditorView & plottedValueEditorView
       * @param iChildView {SC.View}
       */
      removeChild: function (iChildView) {
        if (!iChildView.isDescendantOf(this))
          return; // In a splitting scenario multiple plot views can add editor views.
                  // Each time, pre-existing editor is removed.
        if (iChildView && iChildView === this._functionEditorView) {
          this._functionEditorView.removeObserver('isVisible', this, this.handleAxisOrLegendLayoutChange);
          this._functionEditorView = null;
        }
        if (iChildView && iChildView === this._plottedValueEditorView) {
          this._plottedValueEditorView.removeObserver('isVisible', this, this.handleAxisOrLegendLayoutChange);
          this._plottedValueEditorView = null;
        }

        sc_super();
      },

      mouseDown: function () {
        DG.globalEditorLock.commitCurrentEdit();
        return false;
      },

      /**
       * Signature of iFunc is <DG.PlotView, iRow, iCol, iIndex>
       * @param iFunc {Function}
       */
      forEachPlotViewDo: function (iFunc) {
        if (this.getPath('model.isSplit')) {
          this.get('splitPlotViewArray').forEach(function (iColArray, iRowIndex) {
            iColArray.forEach(function (iPlotViewArray, iColIndex) {
              iPlotViewArray.forEach(function (iPlotView, iIndex) {
                iFunc(iPlotView, iRowIndex, iColIndex, iIndex);
              });
            });
          });
        }
        else {
          var tPlotViews = this.get('plotViews');
          tPlotViews.forEach(function (iPlotView, iIndex) {
            iFunc(iPlotView, 0, 0, iIndex);
          });
        }
      },

      /**
       * We use this during init and during an undo restore (which doesn't go through init) to make sure each
       * plot has a corresponding plotview.
       */
      assignPlotViewToEachPlot: function() {
        // Make a copy of the array of plotViews so we can see if any are left over that should be removed
        var tPlotViewsCopy = this._plotViews.map(function(iPlotView) { return iPlotView;});
        this.getPath('model.plots').forEach(function (iPlotModel) {
          var tFoundPlotView;
          this.forEachPlotViewDo( function( iPlotView) {
            if( !tFoundPlotView && iPlotView.get('model') === iPlotModel)
              tFoundPlotView = iPlotView;
          });
          if( !tFoundPlotView) {
            var tPlotView = this.mapPlotModelToPlotView(iPlotModel).create({model: iPlotModel});
            this.addPlotView(tPlotView);
            this.setPlotViewProperties(tPlotView, iPlotModel,
                iPlotModel.get('verticalAxisIsY2') ? 'y2AxisView' : 'yAxisView');
          }
          else {
            var tIndex = tPlotViewsCopy.indexOf( tFoundPlotView);
            tPlotViewsCopy.splice( tIndex, 1);
          }
        }.bind(this));
        // Destroy any remaining plotViews of the originals
        tPlotViewsCopy.forEach( function( iPlotView) {
          iPlotView.destroy();
        });
      },

      /**
       * Draw my plot views
       */
      drawPlots: function (iChangedProperty) {
        if (this._isConfigurationInProgress)
          return; // Not a good time to draw
        var tNumPlots = this.get('plotViews').length;
          this.forEachPlotViewDo(function (iPlotView, iRow, iCol, iIndex) {
            if (iPlotView.readyToDraw())
              iPlotView.doDraw(iIndex, tNumPlots, iChangedProperty);
          });
      },

      pointsDidChange: function (iModel, iProperty) {
        this.drawPlots(iProperty);
        this.get('legendView').displayDidChange();
        this.get('yAxisView').displayDidChange();
      }.observes('model.pointColor', 'model.strokeColor', 'model.pointSizeMultiplier',
          'model.transparency', 'model.strokeTransparency', 'model.strokeSameAsFill'),

      categoriesDidChange: function (iAxisView, iProperty) {
        if (this.getPath('model.aboutToChangeConfiguration') || !this.get('plotViews'))
          return; // So we don't attempt to draw during init or in the midst of a configuration change

/*
        var tOrientation = iAxisView.get('orientation');
        if( tOrientation === 'top' || tOrientation === 'right')
          this.get('model').splitCategoriesDidChange();
*/

        this.get('plotViews').forEach(function (iPlotView, iIndex) {
          iPlotView.categoriesDidChange();
        });

        var tLegendView = this.get('legendView');
        this.drawPlots();
        if (tLegendView)
          tLegendView.displayDidChange();
        // Note: Asterisks below are necessary in case axis view gets swapped out
      }.observes('*xAxisView.categoriesDragged', '*yAxisView.categoriesDragged',
          '*topAxisView.categoriesDragged', '*rightAxisView.categoriesDragged'),

      selectionOrDisplayOnlySelectedDidChange: function() {
        var tMsgs = [];
        if(this.getPath('model.dataConfiguration.displayOnlySelected') &&
            this.getPath('model.dataConfiguration.selection').length === 0) {
          tMsgs = [0, 1,2,3,4,5].map( function(i) {
            return ('DG.PlotBackgroundView.msg' + i).loc();
          });
        }
        this.get('plotBackgroundViewArray').forEach(function( iBackgroundViewSubArray) {
          iBackgroundViewSubArray[0].setIfChanged('messages', tMsgs);
        });
      }.observes('model.dataConfiguration.displayOnlySelected',
          'model.dataConfiguration.selection'),

      prepareToSelectPoints: function () {
        this.forEachPlotViewDo(function (iPlotView) {
          iPlotView.hideDataTip();
          iPlotView.preparePointSelection();
        });
      },
      completeSelection: function () {
        this.get('plotViews').forEach(function (iPlotView) {
          iPlotView.cleanUpPointSelection();
        });
      },

      /**
       * Give each plotView a chance
       * Note that it would be more natural for the graph view to tell the graph model to select the cases than
       * to do it here directly with the data context.
       * Ignore the cases found in iLast
       * @param iRect
       * @param iBaseSelection
       * @param iLast {{x:number,y:number,width:number,height:number}}
       * iRowIndex {{Number}} Index into splitPlotViewArray
       * iColIndex {{Number}} Index into splitPlotViewArray
       */
      selectPointsInRect: function (iRect, iBaseSelection, iLast, iRowIndex, iColIndex) {
        iBaseSelection = iBaseSelection || [];
        var tDataContext = this.getPath('model.dataContext');
        var tCollection = this.getPath('model.collectionClient');
        var tSelectChange = {
          operation: 'selectCases',
          collection: tCollection,
          cases: iBaseSelection,
          select: true,
          extend: true
        };
        var tDeselectChange = {
          operation: 'selectCases',
          collection: tCollection,
          cases: [],
          select: false,
          extend: true
        };

        if (SC.none(tDataContext))
          return;

        this.get('splitPlotViewArray')[iRowIndex][iColIndex].forEach(function (iPlotView) {
          var tPlotSelection = iPlotView.getCasesForDelta(iRect, iLast);
          tSelectChange.cases = tSelectChange.cases.concat(tPlotSelection);
          var tPlotDeselection = iPlotView.getCasesForDelta(iLast, iRect);
          tDeselectChange.cases = tDeselectChange.cases.concat(tPlotDeselection);
        });

        if (tSelectChange.cases.length !== 0) {
          tDataContext.applyChange(tSelectChange);
        }
        if (tDeselectChange.cases.length !== 0) {
          tDataContext.applyChange(tDeselectChange);
        }
      },

      /**
       * Pass to first plotview
       * @param iEvent
       */
      handleBackgroundClick: function (iEvent) {
        this.get('plotView').handleBackgroundClick(iEvent);
      },

      /**
       * Pass to first plotview
       * @param iEvent
       */
      handleBackgroundDblClick: function (iEvent) {
        this.get('plotView').handleBackgroundDblClick(iEvent);
      },

      measuresForSelectedInfoVisibilityDidChange: function() {
        this.renderLayout(this.renderContext(this.get('tagName')));
      }.observes('measuresForSelectedInfoView.isVisible'),

      /**
       Set the layout (view position) for our three subviews.
       @param {SC.RenderContext} the render context
       @param {Boolean} Is this the first time the rendering is happening?  Set to true if any of the 3 view are new.
       @returns {void}
       */
      renderLayout: function (context, firstTime) {
        // Prevent recursive calls
        if (this._isRenderLayoutInProgress)
          return;
        this._isRenderLayoutInProgress = true;

        sc_super();

        function layoutUnsplitPlot() {
          tTopAxisView.adjust({width: 0, height: 0});
          tRightAxisView.adjust({width: 0, height: 0});
          if (firstTime) {
            // set or reset all layout parameters (initializes all parameters)
            tXAxisView.set('layout', {
              left: tYWidth, right: tSpaceForY2,
              bottom: tLegendHeight + tHeightForBottomLabel, height: tXAxisHeight
            });
            tYAxisView.set('layout', {
              left: tWidthForLeftLabel,
              top: tTopSpace,
              bottom: tLegendHeight + tXHeight, width: tYAxisWidth
            });
            tY2AxisView.set('layout', {
              right: 0,
              top: tTopSpace,
              bottom: tLegendHeight + tXHeight,
              width: tY2DesiredWidth
            });
            tPlotBackground.set('layout', {
              left: tYWidth,
              right: tSpaceForY2,
              top: tTopSpace,
              bottom: tXHeight + tLegendHeight
            });
            this_.makeSubviewFrontmost(tY2AxisView);
          }
          else {
            // adjust() method avoids triggering observers if layout parameter is already at correct value.
            var tCurrXHeight = tXAxisView.get('layout').height;
            tXAxisView.adjust({
              left: tYWidth, right: tSpaceForY2, bottom: tLegendHeight + tHeightForBottomLabel,
              height: tXAxisHeight
            });
            if (tCurrXHeight !== tXAxisHeight)
              tXAxisView.notifyPropertyChange('drawHeight');

            var tCurrYWidth = tYAxisView.get('layout').width;
            tYAxisView.adjust({
              bottom: tXHeight + tLegendHeight, width: tYAxisWidth,
              top: tTopSpace
            });
            if (tCurrYWidth !== tYAxisWidth)
              tYAxisView.notifyPropertyChange('drawWidth');

            tY2AxisView.adjust({
              bottom: tLegendHeight + tXHeight, width: tY2DesiredWidth,
              top: tTopSpace
            });
            if (!tHasY2Attribute) {
              tY2AxisView.set('isVisible', false);
            }
            tPlotBackground.adjust({
              left: tYWidth,
              right: tSpaceForY2,
              top: tTopSpace,
              bottom: tXHeight + tLegendHeight
            });
          }
        }

        function layoutSplitPlots( iTopHeight, iRightSpace) {
          var tXAxisViewArray = this_.get('xAxisViewArray'),
              tYAxisViewArray = this_.get('yAxisViewArray'),
              tY2AxisViewArray = this_.get('y2AxisViewArray'),
              tPlotBackgroundViewArray = this_.get('plotBackgroundViewArray'),
              tNumRows = tPlotBackgroundViewArray.length,
              tNumColumns = tPlotBackgroundViewArray[0].length,
              tFrame = this_.get('frame'),
              tRowHeight = (tFrame.height - tXHeight - tLegendHeight - tTopSpace - iTopHeight) / tNumRows,
              tColWidth = (tFrame.width - tYWidth - tSpaceForY2 - iRightSpace) / tNumColumns,
              tRowIndex, tColIndex;
          if (firstTime) {
            tTopAxisView.set('layout', {
              left: tYWidth, top: tTopSpace,
              right: iRightSpace, height: iTopHeight
            });
            tRightAxisView.set('layout', {
              width: iRightSpace, top: tTopSpace + iTopHeight,
              right: 0, bottom: tLegendHeight + tXHeight
            });
          }
          else {
            tTopAxisView.adjust({top: tTopSpace, left: tYWidth, right: iRightSpace, height: iTopHeight});
            tRightAxisView.adjust({
              width: iRightSpace, top: tTopSpace + iTopHeight,
              bottom: tLegendHeight + tXHeight
            });
          }
          for (tRowIndex = 0; tRowIndex < tNumRows; tRowIndex++) {
            var tThisYAxisView = tYAxisViewArray[tRowIndex],
                tTop = tTopSpace + iTopHeight + (tNumRows - tRowIndex - 1) * tRowHeight;
            if (tThisYAxisView) {
              if (firstTime) {
                tThisYAxisView.set('layout', {
                  left: tWidthForLeftLabel, top: tTop, height: tRowHeight, width: tYAxisWidth
                });
                tY2AxisViewArray[tRowIndex].set('layout', {
                  right: iRightSpace, top: tTop, height: tRowHeight, width: tY2DesiredWidth
                });
                if (!tHasY2Attribute) {
                  tY2AxisViewArray[tRowIndex].set('isVisible', false);
                }
              }
              else {
                var tCurrYWidth = tThisYAxisView.get('layout').width;
                tThisYAxisView.adjust({left: tWidthForLeftLabel, height: tRowHeight,
                  width: tYAxisWidth, top: tTop});
                if (tCurrYWidth !== tYAxisWidth && tRowIndex === 0)
                  tThisYAxisView.notifyPropertyChange('drawWidth');
                tY2AxisViewArray[tRowIndex].adjust({
                  right: iRightSpace, top: tTop,
                  height: tRowHeight, width: tY2DesiredWidth
                });
              }
              for (tColIndex = 0; tColIndex < tNumColumns; tColIndex++) {
                var tBackgroundView = tPlotBackgroundViewArray[tRowIndex][tColIndex],
                    tLeft = tYWidth + tColIndex * tColWidth;

                if (tRowIndex === 0) {
                  var tThisXAxisView = tXAxisViewArray[tColIndex],
                      tCurrXHeight;
                  if (tThisXAxisView) {
                    if (firstTime) {
                      tThisXAxisView.set('layout',
                          {
                            left: tLeft, width: tColWidth + 1, bottom: tLegendHeight + tHeightForBottomLabel,
                            height: tXAxisHeight
                          });
                    }
                    else {
                      tCurrXHeight = tThisXAxisView.get('layout').height;
                      tThisXAxisView.adjust({
                        left: tLeft, width: tColWidth + 1,
                        bottom: tLegendHeight + tHeightForBottomLabel, height: tXAxisHeight,
                        top: null, right: null
                      });
                      if (tCurrXHeight !== tXAxisHeight && tRowIndex === 0 && tColIndex === 0)
                        tThisXAxisView.notifyPropertyChange('drawHeight');
                    }
                  }
                }
                if (tBackgroundView) {
                  if (firstTime)
                    tBackgroundView.set('layout', {
                      left: tLeft,
                      top: tTop,
                      width: tColWidth + 1,
                      height: tRowHeight + 1
                    });
                  else
                    tBackgroundView.adjust({left: tLeft, top: tTop, width: tColWidth + 1, height: tRowHeight + 1});
                }
              }
            }
          }


        }

        var this_ = this,
            tLeftEdgeBackgroundView = this.get('leftEdgeBackground'),
            tRightEdgeBackgroundView = this.get('rightEdgeBackground'),
            tBottomAxisLabelView = this.get('bottomAxisLabelView'),
            tHeightForBottomLabel = tBottomAxisLabelView ? tBottomAxisLabelView.get('desiredExtent') : 0,
            tLeftAxisLabelView = this.get('leftAxisLabelView'),
            tWidthForLeftLabel = tLeftAxisLabelView ? tLeftAxisLabelView.get('desiredExtent') : 0,
            tXAxisView = this.get('xAxisView'),
            tYAxisView = this.get('yAxisView'),
            tY2AxisView = this.get('y2AxisView'),
            tTopAxisView = this.get('topAxisView'),
            tRightAxisView = this.get('rightAxisView'),
            tY2AttributeID = this.getPath('model.dataConfiguration.y2AttributeID'),
            tHasY2Attribute = tY2AttributeID && (tY2AttributeID !== DG.Analysis.kNullAttribute),
            tPlotBackground = this.get('plotBackgroundView'),
            tPlotViews = this.get('plotViews'),
            tLegendView = this.get('legendView'),
            tNumberToggleView = this.get('numberToggleView'),
            tSelectedInfoView = this.get('measuresForSelectedInfoView'),
            tFunctionView = this.get('functionEditorView'),
            tPlottedValueView = this.get('plottedValueEditorView'),
            tShowNumberToggle = tNumberToggleView && tNumberToggleView.shouldShow(),
            tXAxisHeight = !tXAxisView ? 0 : Math.min(tXAxisView.get('desiredExtent'), this.get('frame').height / 3),
            tXHeight = tXAxisHeight + tHeightForBottomLabel,
            tYAxisWidth = !tYAxisView ? 0 : Math.min(tYAxisView.get('desiredExtent'), this.get('frame').width / 3),
            tYWidth = tYAxisWidth + tWidthForLeftLabel,
            tSpaceForY2 = (!tY2AxisView || !tHasY2Attribute) ? 0 : tY2AxisView.get('desiredExtent'),
            tY2DesiredWidth = !tY2AxisView ? 0 : tY2AxisView.get('desiredExtent'),
            tLegendHeight = !tLegendView ? 0 : tLegendView.get('desiredExtent'),
            tNumberToggleHeight = tShowNumberToggle ? tNumberToggleView.get('desiredExtent') : 0,
            tSelectedInfoHeight = tSelectedInfoView ? tSelectedInfoView.get('desiredExtent') : 0,
            tFunctionViewHeight = (tFunctionView && tFunctionView.get('isVisible')) ?
                tFunctionView.get('desiredExtent') : 0,
            tPlottedValueViewHeight = (tPlottedValueView && tPlottedValueView.get('isVisible')) ?
                tPlottedValueView.get('desiredExtent') : 0,
            tTopSpace = tNumberToggleHeight + tFunctionViewHeight + tPlottedValueViewHeight + tSelectedInfoHeight;
        if (!SC.none(tXAxisView) && !SC.none(tYAxisView) &&
            !SC.none(tPlotViews) && (tPlotViews.length > 0)) {
          if( tSelectedInfoView)
            tSelectedInfoView.adjust( { height: tSelectedInfoHeight, top: tNumberToggleHeight});
          tTopAxisView.set('isVisible', this_.getPath('model.numSplitColumns') > 1);
          tRightAxisView.set('isVisible', this_.getPath('model.numSplitRows') > 1);
          var tTopHeight = tTopAxisView.get('isVisible') ? Math.min( tTopAxisView.get('desiredExtent'), this.get('frame').height / 3) : 0,
              tRightSpace = tRightAxisView.get('isVisible') ? Math.min( tRightAxisView.get('desiredExtent'), this.get('frame').width / 3) : 0;
          tLeftEdgeBackgroundView.set('layout', {left: 0, bottom: 0, top: 0, width: tYWidth});
          tRightEdgeBackgroundView.set('layout', {right: 0, bottom: 0, top: 0, width: tRightSpace + tSpaceForY2});

          tBottomAxisLabelView.set('layout', {
            bottom: tLegendHeight, left: tYWidth, right: tSpaceForY2 + tRightSpace,
            height: tHeightForBottomLabel
          });
          tLeftAxisLabelView.set('layout', {
            top: tTopSpace,
            bottom: tHeightForBottomLabel + tLegendHeight, left: 0, width: tWidthForLeftLabel
          });
          if (this.getPath('model.isSplit'))
            layoutSplitPlots( tTopHeight, tRightSpace);
          else
            layoutUnsplitPlot();
          if (tFunctionView)
            tFunctionView.adjust('top', tNumberToggleHeight + tSelectedInfoHeight);
          if (tPlottedValueView)
            tPlottedValueView.adjust('top', tNumberToggleHeight + tFunctionViewHeight + tSelectedInfoHeight);
          if (firstTime) {
            tLegendView.set('layout', {bottom: 0, height: tLegendHeight});
          }
          else {
            tLegendView.adjust('height', tLegendHeight);
            if (tNumberToggleView)
              tNumberToggleView.adjust({height: tNumberToggleHeight});
            // NumberToggleView visibility is handled by binding
          }
        }
        this._isRenderLayoutInProgress = false;
        this._drawPlotsInvocations++;
        this.invokeOnceLater(function () {
          this._drawPlotsInvocations--;
          if (this._drawPlotsInvocations === 0) {
            this.drawPlots();
          }
        }.bind(this));
      },

      viewDidResize: function () {
        sc_super();
        this.renderLayout(this.renderContext(this.get('tagName')));
      },

      /**
       * Better if this were in SC.View, but it's fraught with problems, so we specialize it here.
       * @param iChildView
       */
      makeSubviewFrontmost: function (iChildView) {
        if (iChildView && this.get('childViews').indexOf(iChildView) >= 0) {
          this.removeChild(iChildView);
          this.appendChild(iChildView);
        }
      },

      /**
       * Private property to prevent recursive execution of renderLayout. Seems most important in Firefox.
       */
      _isRenderLayoutInProgress: false,

      /**
       * Private property to prevent recursive execution of renderLayout. Seems most important in Firefox.
       */
      _isConfigurationInProgress: false,

      /**
       When a model axis changes, we need to respond by changing its corresponding view.
       */
      handleAxisModelChange: function () {
        var this_ = this,
            tInitLayout = false,
            tPlotBackgroundView = this.get('plotBackgroundView');

        function handleOneAxis(iAxisKey, iAxisViewKey) {
          var tModel = this_.getPath(iAxisKey),
              tModelClass = tModel && tModel.constructor,
              tView = this_.get(iAxisViewKey),
              tViewClass = tView && tView.constructor,
              tNewViewClass, tNewView,
              tPlotView = this_.get('plotView'),
              tLabelView, tPlace, tAttr, tAttrType = '',
              tSetup;
          switch (iAxisViewKey) {
            case 'xAxisView':
              tLabelView = this_.get('bottomAxisLabelView');
              tSetup = {orientation: DG.GraphTypes.EOrientation.kHorizontal, paperSourceForLabel: tLabelView};
              tPlace = DG.GraphTypes.EPlace.eX;
              break;
            case 'yAxisView':
              tLabelView = this_.get('leftAxisLabelView');
              tSetup = {orientation: DG.GraphTypes.EOrientation.kVertical, paperSourceForLabel: tLabelView};
              tPlace = DG.GraphTypes.EPlace.eY;
              break;
            case 'y2AxisView':
              tSetup = {orientation: DG.GraphTypes.EOrientation.kVertical2};
              tPlace = DG.GraphTypes.EPlace.eY2;
              break;
          }
          if (tLabelView && tModel) {
            tLabelView.set('plottedAttribute', tModel.get('firstAttribute'));
          }
          tSetup.layout = {left: 0, top: 0, width: 0, height: 0};
          if (this_.getPath('model.dataConfiguration')) {
            tAttr = this_.getPath('model.dataConfiguration').attributesByPlace[tPlace][0].get('attribute');
            if (tAttr !== DG.Analysis.kNullAttribute) {
              tAttrType = tAttr.get('type');
            }
          }
          switch (tModelClass) {
            case DG.AxisModel:
              tNewViewClass = DG.AxisView;
              break;
            case DG.CellAxisModel:
              tNewViewClass = DG.CellAxisView;
              break;
            case DG.CellLinearAxisModel:
              // todo: It's a lot work to get to make this one decision. We could simplify things with a QualCellLinearAxis
              // model that would fall into the existing pattern for choosing the view class.
              tNewViewClass = (tAttrType === 'qualitative') ?
                  DG.QualCellLinearAxisView : DG.CellLinearAxisView;
              break;
            case DG.FormulaAxisModel:
              tNewViewClass = DG.FormulaAxisView;
              break;
            case DG.CountAxisModel:
              tNewViewClass = DG.CountAxisView;
              break;
            case DG.BinnedAxisModel:
              tNewViewClass = DG.BinnedAxisView;
              break;
            default:
              tNewViewClass = null;
          }
          if (tNewViewClass && (tViewClass !== tNewViewClass)) {
            tNewView = tNewViewClass.create(tSetup);
            // tNewView.adjust({top: 400});
            tNewView.set('model', tModel);
            this_.removeChild(tView);
            this_.appendChild(tNewView);
            this_.set(iAxisViewKey, tNewView);
            tPlotBackgroundView.set(iAxisViewKey, tNewView);
            if (!SC.none(tPlotView)) {
              tPlotView.set(iAxisViewKey, tNewView);
              tPlotView.setupAxes();
            }
            tView.destroy();
            this_.controller.set(iAxisViewKey, tNewView);
            tInitLayout = true; // new view requires a new layout
          }
        }
        this.beginPropertyChanges();
        handleOneAxis('model.xAxis', 'xAxisView');
        handleOneAxis('model.yAxis', 'yAxisView');
        handleOneAxis('model.y2Axis', 'y2AxisView');
        this.setPath('y2AxisView.otherYAttributeDescription', this.getPath('model.yAxis.attributeDescription'));
        this.setPath('y2AxisView.xAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
        this.setPath('yAxisMultiTarget.attributeDescription', this.getPath('model.yAxis.attributeDescription'));
        this.setPath('yAxisMultiTarget.otherAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
        this.renderLayout(this.renderContext(this.get('tagName')), tInitLayout);
        this.endPropertyChanges();
      }.observes('.model.xAxis', '.model.yAxis', '.model.y2Axis'),

      handleLegendModelChange: function () {
        var tLegendModel = this.getPath('model.legend');
        this.setPath('legendView.model', tLegendModel);
      }.observes('.model.legend'),

      /**
       When my plot model changes, we need to respond by changing its corresponding view.
       */
      handlePlotModelChange: function () {
        var tPlot = this.getPath('model.plot'),
            tCurrentView = this.get('plotView'),
            tViewClass = tCurrentView && tCurrentView.constructor,
            tCurrentPoints, tNewViewClass, tNewView,
            tInitLayout = false;

        if( !tCurrentView || tPlot.get('isDestroyed'))  // We get here without a current plotview or plot during close
          return;

        tNewViewClass = this.mapPlotModelToPlotView(tPlot);
        if (tNewViewClass && (tViewClass !== tNewViewClass)) {
          tNewView = tNewViewClass.create();
          tInitLayout = true;
        }
        if (!SC.none(tCurrentView))
          tCurrentPoints = tCurrentView.get('cachedPointCoordinates');

        if (SC.none(tNewView)) {
          // Make sure the current view has all the right properties
          this.setPlotViewProperties(tCurrentView, tPlot, 'yAxisView', tCurrentPoints);
        }
        else {
          this.set('plotView', tNewView); // Destroys tCurrentView
          this.setPlotViewProperties(tNewView, tPlot, 'yAxisView', tCurrentPoints);
          if (tInitLayout) {
            this.renderLayout(this.renderContext(this.get('tagName')), tInitLayout);
          }
        }
      }.observes('.model.plot'),

      /**
       * Our model has experienced a change in attributes that determine the splitting into multiple
       * plots. We make sure we have the necessary axis views and plot views assigned to the correct
       * models.
       */
      handleSplitAttributeChange: function () {
        var this_ = this;

        function configureAxisViewArrays() {

          function configureOneAxisViewArray(iAxisModelArray, ioAxisViewArray) {
            // The zeroth element of the view array is already correctly configured
            var tZerothView = ioAxisViewArray[0],
                tViewClass = tZerothView.constructor,
                tOrientation = tZerothView.get('orientation'),
                tCentering = tZerothView.get('centering'),
                tNumModels = iAxisModelArray.length,
                tIndex;
            for (tIndex = 1; tIndex < tNumModels; tIndex++) {
              var tCurrentView = ioAxisViewArray[tIndex],
                  tNewView;
              if (!tCurrentView || tCurrentView.constructor !== tViewClass) {
                tNewView = tViewClass.create({
                  orientation: tOrientation,
                  centering: tCentering,
                  model: iAxisModelArray[tIndex],
                  suppressLabel: true
                });
                this_.appendChild(tNewView);
                if (tCurrentView) {
                  this_.removeChild(tCurrentView);
                  tCurrentView.destroy();
                }
                ioAxisViewArray[tIndex] = tNewView;
              }
              else {
                tCurrentView.set('model', iAxisModelArray[tIndex]);
              }
            }
            for (tIndex = tNumModels; tIndex < ioAxisViewArray.length; tIndex++) {
              ioAxisViewArray[tIndex].destroy();
            }
            ioAxisViewArray.length = tNumModels;
          }

          configureOneAxisViewArray(this_.getPath('model.xAxisArray'), this_.get('xAxisViewArray'));
          configureOneAxisViewArray(this_.getPath('model.yAxisArray'), this_.get('yAxisViewArray'));
          configureOneAxisViewArray(this_.getPath('model.y2AxisArray'), this_.get('y2AxisViewArray'));
        }

        function configurePlotViewArrays() {
          var tModel = this_.get('model'),
              tPlotViewArray = this_.get('splitPlotViewArray'),
              tPlotBackgroundViewArray = this_.get('plotBackgroundViewArray'),
              tPlotViewClass = tPlotViewArray[0][0][0].constructor;
          tModel.forEachSplitPlotElementDo(function (iPlotModelArray, iRow, iColumn) {
            if (iRow !== 0 || iColumn !== 0) {
              iPlotModelArray.forEach(function (iPlotModel, iIndex) {
                if (!tPlotViewArray[iRow])
                  tPlotViewArray[iRow] = [];
                if (!tPlotViewArray[iRow][iColumn])
                  tPlotViewArray[iRow][iColumn] = [];
                if (!tPlotBackgroundViewArray[iRow])
                  tPlotBackgroundViewArray[iRow] = [];
                var
                    tBackgroundView = tPlotBackgroundViewArray[iRow][iColumn],
                    tCurrentPlotView = tPlotViewArray[iRow][iColumn][iIndex],
                    tNewPlotView;
                if (!tBackgroundView) {
                  tBackgroundView = DG.PlotBackgroundView.create({
                    xAxisView: this_.get('xAxisViewArray')[iColumn],
                    yAxisView: this_.get('yAxisViewArray')[iRow],
                    graphModel: this_.get('model'),
                    darkenBackground: (iRow + iColumn) % 2 !== 0,
                    rowIndex: iRow,
                    colIndex: iColumn
                  });
                  tPlotBackgroundViewArray[iRow][iColumn] = tBackgroundView;
                  this_.invokeLast(function () {
                    // Don't append until after we've established the plot view
                    this_.appendChild(tBackgroundView);
                  });
                }
                else {
                  tBackgroundView.set('xAxisView', this_.get('xAxisViewArray')[iColumn]);
                  tBackgroundView.set('yAxisView', this_.get('yAxisViewArray')[iRow]);
                }
                tBackgroundView.set('rowIndex', iRow);
                tBackgroundView.set('colIndex', iColumn);
                if (!tCurrentPlotView || tCurrentPlotView.constructor !== tPlotViewClass) {
                  var tYAxisViewArrayKey = iPlotModel.get('verticalAxisIsY2') ? 'y2AxisViewArray' : 'yAxisViewArray';
                  tNewPlotView = tPlotViewClass.create({
                    paperSource: tPlotBackgroundViewArray[iRow][iColumn],
                    model: iPlotModel,
                    parentView: this_,
                    xAxisView: this_.get('xAxisViewArray')[iColumn],
                    yAxisView: this_.get(tYAxisViewArrayKey)[iRow]
                  });
                  tPlotViewArray[iRow][iColumn][iIndex] = tNewPlotView;
                  this_.addPlotViewObserver(tNewPlotView);
                  if (tCurrentPlotView) {
                    this_.removePlotViewObserver(tCurrentPlotView);
                    tCurrentPlotView.destroy();
                  }
                }
              });
            }
          });
          this_.notifyPropertyChange('plotViewsReconfigured');
        }

        this._isConfigurationInProgress = true; // Prevent drawing until all this is done
        configureAxisViewArrays();
        configurePlotViewArrays();
        this._isConfigurationInProgress = false;
        this.renderLayout(this.renderContext(this.get('tagName')), false);
        this.invokeLater( function() {
          // This will take place after appendChild of any new background view
          this.forEachPlotViewDo(function( iPlotView) {
            iPlotView.updateSelection();
          });
        }, 10);
      }.observes('.model.splitPlotChange'),

      allModelSplitsWereRemoved: function () {
        var this_ = this,
            tBackgroundViews = this.get('plotBackgroundViewArray');
        // Our controller is observing these plot views that are about to be deleted so we have to
        // give it a chance to remove observers
        this_.notifyPropertyChange('plotViewsWillBeDestroyed');
        this_.forEachPlotViewDo(function (iPlotView, iRow, iColumn, iIndex) {
          if (iRow !== 0 || iColumn !== 0) {
            this_.removePlotViewObserver(iPlotView);
            iPlotView.destroy();
            if (iIndex === 0) {
              var tBackgroundView = tBackgroundViews[iRow][iColumn];
              this_.removeChild(tBackgroundView);
              tBackgroundView.destroy();
              tBackgroundViews[iRow][iColumn] = null;
            }
          }
        });
        tBackgroundViews[0].length = 1;
        tBackgroundViews.length = 1;
        this.get('splitPlotViewArray').length = 1;
        this.get('splitPlotViewArray')[0].length = 1;
      }.observes('.model.removedAllSplitPlotsAndAxes'),

      /**
       * Return the array of plot views for the given row, col
       * @param iRow {Number}
       * @param iCol {Number}
       * @return {[{DG.PlotView}]}
       */
      getPlotViewArray: function (iRow, iCol) {
        return this.get('splitPlotViewArray')[iRow][iCol];
      },

      plotWithoutView: function () {
        var tPlots = this.getPath('model.plots'),
            tPlotViews = this._plotViews,
            tPlotWithoutView;
        tPlots.forEach(function (iPlot) {
          if (!tPlotViews.some(function (iPlotView) {
            return iPlot === iPlotView.get('model');
          })) {
            tPlotWithoutView = iPlot;
          }
        });
        return tPlotWithoutView;
      },

      /**
       * An attribute has been added to the vertical axis. There are now multiple plot models.
       * For now, this only works with scatterplots, so we know we have to construct a
       * ScatterPlotView.
       * Note that we're assuming that if an attribute was just added, it must be the last, and
       * we can bind the new scatterplot view to the last plot.
       */
      handleAttributeAdded: function () {
        var tPlotModel = this.plotWithoutView(),
            tPlotView;
        if (!SC.none(tPlotModel)) {
          tPlotView = DG.ScatterPlotView.create({
            model: tPlotModel,
            paperSource: this.get('plotBackgroundView')  // required during initialization
          });
          this.addPlotView(tPlotView);
          this.renderLayout(this.renderContext(this.get('tagName')), false);
          this.setPlotViewProperties(tPlotView, tPlotModel, 'yAxisView');
        }
      }.observes('model.attributeAdded'),

      /**
       * An attribute has been added to the second vertical axis. There are now multiple plot models.
       * For now, this only works with scatterplots, so we know we have to construct a
       * ScatterPlotView.
       * Note that we're assuming that if an attribute was just added, it must be the last, and
       * we can bind the new scatterplot view to the last plot.
       */
      handleY2AttributeAdded: function () {
        var tPlotModel = this.getPath('model.lastPlot'),
            tPlotView;
        if (!SC.none(tPlotModel)) {
          this.handleAxisModelChange();
          tPlotView = this.get('plotViews').find( function( iPlotView) {
            return iPlotView.get('model') === tPlotModel;
          });
          if( !tPlotView) {
            tPlotView = DG.ScatterPlotView.create({
              model: tPlotModel,
              paperSource: this.get('plotBackgroundView')  // required during initialization
            });
            this.addPlotView(tPlotView);
          }
          this.renderLayout(this.renderContext(this.get('tagName')), false);
          this.setPlotViewProperties(tPlotView, tPlotModel, 'y2AxisView');
          // The y2AxisView needs to know how many attribute descriptions there are on the other y-axis so that
          // it can properly set the color of the label.
          this.get('y2AxisView').set('otherYAttributeDescription', this.getPath('model.yAxis.attributeDescription'));
          this.get('y2AxisView').set('xAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
          this.get('yAxisView').set('otherYAttributeDescription', this.getPath('model.y2Axis.attributeDescription'));
          tPlotView.displayDidChange();
        }
      }.observes('model.y2AttributeAdded'),

      /**
       * An attribute has been removed from the vertical axis. But there is at least one attribute
       * left on that axis. We run through the plotViews to find the one whose model is no longer
       * one of our plots. That one, we destroy.
       */
      handleAttributeRemoved: function () {
        var tPlots = this.getPath('model.plots'),
            tPlotViews = this.get('plotViews'),
            tIndexOfPlotViewToRemove;
        tPlotViews.forEach(function (iPlotView, iIndex) {
          if (tPlots.indexOf(iPlotView.get('model')) < 0) {
            tIndexOfPlotViewToRemove = iIndex;
            iPlotView.removePlottedElements(true /*call 'remove'*/, true /* animate */);
            iPlotView.destroy();
          }
        });
        if( !SC.none( tIndexOfPlotViewToRemove)) {
          // Our plot background view needs to move the array of plotted elements to the end
          this.get('plotBackgroundView').shiftPlottedElementsToEndOfMap(tIndexOfPlotViewToRemove);
          tPlotViews.splice(tIndexOfPlotViewToRemove, 1);
          tPlotViews.forEach(function (iPlotView, iIndex) {
            iPlotView.set('isFirstPlot', iIndex === 0);
          });
        }
      }.observes('model.attributeRemoved'),

      /**
       * Handle a click in an axis label by bringing up the appropriate axis menu.
       * @param {SC.Event} the click event (with clientData supplied by sender)
       * @returns {Boolean} YES indicating that the event has been handled
       */
      axisLabelClick: function (iEvent) {
        var controller = this.get('controller');
        if (controller) {
          controller.setupAttributeMenu(iEvent, iEvent.clientData.axisView, iEvent.clientData.labelIndex);
        }
        return YES;
      },

      /**
       * When our model signals that the configuration is about to change, we give our plot view a chance to
       * cache the positions of elements so they can be used in an animation
       *
       * If the configuration change is finished then we check to make sure that the axis views match the type
       * of the attributes because an attribute may have gone from numeric to qualitative or vice versa.
       */
      configurationIsAboutToChange: function () {
        if (this.getPath('model.aboutToChangeConfiguration')) {
          this.get('plotView').prepareForConfigurationChange();
        }
        else {  // model configuration has finished changing. Take care of view layer.
          this.assignPlotViewToEachPlot();
          this.get('plotView').handleConfigurationChange();
          this.synchAxisViewsWithAttributeTypes();
        }
      }.observes('.model.aboutToChangeConfiguration'),

      /**
       * Currently the only things that can get out of synch here is eNumeric with DG.QualCellLinearAxisView
       * and eQualitative with DG.CellLinearAxisView.
       */
      synchAxisViewsWithAttributeTypes: function () {
        var tInitLayout = false;

        var synchOneAxis = function (iPrefix) {
          var tCurrentViewClass = this.get(iPrefix + 'AxisView').constructor,
              tAttrType = this.getPath('model.dataConfiguration.' + iPrefix + 'AttributeDescription.attribute.type'),
              tCurrentAxisModel = this.getPath('model.' + iPrefix + 'Axis'),
              tCurrentAxisModelClass = tCurrentAxisModel.constructor,
              tNewViewClass, tNewView, tOldView;
          if (tCurrentViewClass === DG.CellLinearAxisView && tAttrType === 'qualitative') {
            tNewViewClass = DG.QualCellLinearAxisView;
          }
          else if (tCurrentViewClass === DG.QualCellLinearAxisView && tAttrType === 'numeric') {
            tNewViewClass = DG.CellLinearAxisView;
          }
          else if (tCurrentAxisModelClass === DG.CountAxisModel) {
            tNewViewClass = DG.CountAxisView;
          }
          else if (tCurrentAxisModelClass === DG.FormulaAxisModel) {
            tNewViewClass = DG.FormulaAxisView;
          }
          else if (tCurrentAxisModelClass === DG.BinnedAxisModel) {
            tNewViewClass = DG.BinnedAxisView;
          }
          if (!SC.none(tNewViewClass) && tNewViewClass !== tCurrentViewClass) {
            tOldView = this.get(iPrefix + 'AxisView');
            tNewView = tNewViewClass.create({
              orientation: tOldView.get('orientation'),
              model: tCurrentAxisModel
            });
            this.removeChild(tOldView);
            this.appendChild(tNewView);
            this.set(iPrefix + 'AxisView', tNewView);
            this.setPath('plotBackgroundView.' + iPrefix + 'AxisView', tNewView);
            this.setPath('plotView.' + iPrefix + 'AxisView', tNewView);
            this.setPath('controller.' + iPrefix + 'AxisView', tNewView);
            tOldView.destroy();
            tInitLayout = true;
          }
        }.bind(this);

        synchOneAxis('x');
        synchOneAxis('y');
        // The yAxisMultiTarget can get out of synch if the document has more than one data context
        this.setPath('yAxisMultiTarget.dataConfiguration', this.getPath('model.dataConfiguration'));
        if (tInitLayout) {
          this.renderLayout(this.renderContext(this.get('tagName')), tInitLayout);
          this.invokeLater(function () {
            this.drawPlots();
          });
        }
      },

      /**
       * When the layout needs of an axis change, we need to adjust the layout of the plot and the other axis.
       */
      handleAxisOrLegendLayoutChange: function () {
        this.renderLayout(this.renderContext(this.get('tagName')));
      }.observes('*xAxisView.desiredExtent', '*yAxisView.desiredExtent',
          '.legendView.desiredExtent', '.legendView.labelNode', '*y2AxisView.desiredExtent',
          '.rightAxisView.desiredExtent', '.topAxisView.desiredExtent'),

      /**
       * When the number toggle changes, we need to adjust the layout of the plot and axes.
       */
      handleNumberToggleDidChange: function () {
        this.renderLayout(this.renderContext(this.get('tagName')));
      }.observes('*model.numberToggle.isEnabled', '*model.numberToggle.caseCount'),

      mapPlotModelToPlotView: function (iPlotModel) {
        var tModelClass = iPlotModel && iPlotModel.constructor,
            tNewViewClass = null;
        switch (tModelClass) {
          case DG.PlotModel:
            tNewViewClass = DG.PlotView;
            break;
          case DG.CasePlotModel:
            tNewViewClass = DG.CasePlotView;
            break;
          case DG.DotPlotModel:
            tNewViewClass = DG.DotPlotView;
            break;
          case DG.BinnedPlotModel:
            tNewViewClass = iPlotModel.get('dotsAreFused') ? DG.HistogramView : DG.BinnedPlotView;
            break;
          case DG.LinePlotModel:
            tNewViewClass = DG.LinePlotView;
            break;
          case DG.ScatterPlotModel:
            tNewViewClass = DG.ScatterPlotView;
            break;
          case DG.DotChartModel:
            tNewViewClass = DG.DotChartView;
            break;
          case DG.BarChartModel:
            tNewViewClass = DG.BarChartView;
            break;
          case DG.ComputedBarChartModel:
            tNewViewClass = DG.ComputedBarChartView;
            break;
        }
        return tNewViewClass;
      },

      /**
       * yAxisMultiTarget has to be deepest from a drag point of view or it won't be able to
       * notice that something is being dragged into it.
       */
      createMultiTarget: function () {
        var tMulti = DG.AxisMultiTarget.create(),
            tExtent = tMulti.get('desiredExtent');
        this.appendChild(tMulti);
        tMulti.set('dataConfiguration', this.getPath('model.dataConfiguration'));
        tMulti.set('attributeDescription', this.getPath('model.yAxis.attributeDescription'));
        tMulti.set('otherAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
        //tMulti.set('layout', { left: 0, top: 0, width: tExtent.width, height: tExtent.height });
        tMulti.set('layout', {left: 0, top: 0, right: 0, height: tExtent.height});
        tMulti.set('isVisible', false); // Start out hidden

        this.set('yAxisMultiTarget', tMulti);
      }

    });
