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

      xAxisView: null,
      yAxisView: null,
      y2AxisView: null,
      yAxisMultiTarget: null,
      legendView: null,
      plotBackgroundView: null,
      numberToggleView: null,

      _functionEditorView: null,
      functionEditorView: function( iKey, iValue) {
        if( iValue !== undefined) {
          if( this._functionEditorView)
          {
            this.removeChild( this._functionEditorView);
          }
          if( iValue)
          {
            this.appendChild( iValue);
            iValue.addObserver('isVisible', this, this.handleAxisOrLegendLayoutChange);
          }
          this._functionEditorView = iValue;
        }
        return this._functionEditorView;
      }.property(),

      _plottedValueEditorView: null,
      plottedValueEditorView: function( iKey, iValue) {
        if( iValue !== undefined) {
          if( this._plottedValueEditorView)
          {
            this.removeChild( this._plottedValueEditorView);
          }
          if( iValue)
          {
            this.appendChild( iValue);
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
          this._plotViews = [iValue];
        }
        return (this._plotViews.length < 1) ? null : this._plotViews[0];
      }.property(),

      _plotViews: null,
      _drawPlotsInvocations: 0, // Used to limit redrawing of plots to what is necessary
      _displayDidChangeInvocationsOfDrawPlots: 0, // Another attempt to limit redrawing

      plotViews: function () {
        return this._plotViews;
      }.property(),

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
          iPlotView.setIfChanged('plotIndex', tIndexOfNewPlot);
          iPlotView.set('isFirstPlot', tIndexOfNewPlot === 0);
        }
      },

      /**
       * Bottleneck for configuring a plotView
       * @param iPlotView
       * @param iPlotModel
       * @param iCurrentPoints
       */

      setPlotViewProperties: function (iPlotView, iPlotModel, iYAxisKey, iCurrentPoints) {

        var installAxisView = function( iAxisViewDescription) {
          var tNewViewClass = iAxisViewDescription.axisClass,
              tPrefix = iAxisViewDescription.axisKey;
          if (!SC.none(tNewViewClass)) {
            var tOldView = this.get(tPrefix + 'AxisView');
            if( tOldView.constructor === tNewViewClass)
              return; // Already done

            var tNewModelClass = DG.PlotUtilities.mapAxisViewClassToAxisModelClass( tNewViewClass),
                tNewModel = tNewModelClass.create(),
                tNewView = tNewViewClass.create({
                  orientation: tOldView.get('orientation'),
                  model: tNewModel
                }),
                tOtherView;
            this.removeChild(tOldView);
            this.appendChild(tNewView);
            this.set(tPrefix + 'AxisView', tNewView);
            this.setPath('plotBackgroundView.' + tPrefix + 'AxisView', tNewView);
            this.setPath('plotView.' + tPrefix + 'AxisView', tNewView);
            this.setPath('controller.' + tPrefix + 'AxisView', tNewView);
            tOtherView = this.get(((tPrefix === 'x') ? 'y' : 'x') + 'AxisView');
            tNewView.set('otherAxisView', tOtherView);
            tOldView.destroy();
            this.setPath('model.' + tPrefix + 'Axis', tNewModel);
          }
        }.bind( this);

        var tAxisViewDescription; // { x|y: AxisView }
        iYAxisKey = iYAxisKey || 'yAxisView';
        iPlotView.beginPropertyChanges();
        iPlotView.setIfChanged('paperSource', this.get('plotBackgroundView'));
        iPlotView.setIfChanged('model', iPlotModel);
        iPlotView.setIfChanged('parentView', this);
        iPlotView.setIfChanged('xAxisView', this.get('xAxisView'));
        iPlotView.setIfChanged('yAxisView', this.get(iYAxisKey));
        // special requirements set up here, with possible return of description of an axis to be added
        tAxisViewDescription = iPlotView.configureAxes();
        if( !SC.none( tAxisViewDescription)) {
          installAxisView( tAxisViewDescription);
        }
        iPlotView.setupAxes();
        if (!SC.none(iCurrentPoints))
          iPlotView.set('transferredElementCoordinates', iCurrentPoints);
        iPlotView.endPropertyChanges();

        iPlotView.addObserver('plotDisplayDidChange', this, function () {
          this._displayDidChangeInvocationsOfDrawPlots++;
          this.invokeOnceLater(function () {
            this._displayDidChangeInvocationsOfDrawPlots--;
            if( this._displayDidChangeInvocationsOfDrawPlots === 0)
            {
              this.drawPlots();
            }
          });
        });
      },

      init: function () {
        this.currTime = 0; // For measuring time spent

        function getAxisViewClass(iAxis, iAttributeType) {
          switch (iAxis.constructor) {
            case DG.AxisModel:
              return DG.AxisView;
            case DG.CellLinearAxisModel:
              return (iAttributeType === 'qualitative') ? DG.QualCellLinearAxisView : DG.CellLinearAxisView;
            case DG.CellAxisModel:
              return DG.CellAxisView;
            case DG.CountAxisModel:
              return DG.CountAxisView;
          }
          return null;
        }

        var tXAxis = this.getPath('model.xAxis'),
            tXAxisAttributeType = this.getPath('model.dataConfiguration.xAttributeDescription.attribute.type'),
            tYAxis = this.getPath('model.yAxis'),
            tYAxisAttributeType = this.getPath('model.dataConfiguration.yAttributeDescription.attribute.type'),
            tY2Axis = this.getPath('model.y2Axis'),
            tXAxisView = getAxisViewClass(tXAxis, tXAxisAttributeType).create({orientation: 'horizontal'}),
            tYAxisView = getAxisViewClass(tYAxis, tYAxisAttributeType).create({orientation: 'vertical'}),
            tY2AxisView = getAxisViewClass(tY2Axis).create({orientation: 'vertical2'}),
            tBackgroundView = DG.PlotBackgroundView.create({
              xAxisView: tXAxisView, yAxisView: tYAxisView,
              graphModel: this.get('model')
            }),
            tPlots = this.getPath('model.plots');

        sc_super();

        this._plotViews = [];

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

        this.set('plotBackgroundView', tBackgroundView);
        this.appendChild(tBackgroundView);
        tXAxisView.set('otherAxisView', tYAxisView);
        tYAxisView.set('otherAxisView', tXAxisView);
        tY2AxisView.set('otherAxisView', tXAxisView);

        this.legendView = DG.LegendView.create({model: this.getPath('model.legend')});
        this.appendChild(this.legendView);

        this.createMultiTarget();

        if (this.getPath('model.numberToggle')) {
          var isNumberToggleEnabled = this.getPath('model.numberToggle.isEnabled'),
              tNumberToggleView = DG.NumberToggleView.create({model: this.getPath('model.numberToggle'),
                                                              isVisible: isNumberToggleEnabled });
          this.set('numberToggleView', tNumberToggleView);
          this.appendChild(tNumberToggleView);
        }

        tXAxisView.set('model', tXAxis);
        tYAxisView.set('model', tYAxis);

        tY2AxisView.set('model', tY2Axis);

        tPlots.forEach(function (iPlotModel) {
          var tPlotView = this.mapPlotModelToPlotView(iPlotModel).create();
          this.addPlotView(tPlotView);
          this.setPlotViewProperties(tPlotView, iPlotModel,
              iPlotModel.get('verticalAxisIsY2') ? 'y2AxisView' : 'yAxisView');
        }.bind(this));
        this.appendChild(tY2AxisView); // So it will be on top and drag-hilite will show over plot
        tY2AxisView.set('isVisible', tY2Axis.constructor !== DG.AxisModel);
      },

      destroy: function () {
        // Plotviews are not actually subviews so sc_super doesn't destroy them
        this.get('plotViews').forEach( function( iPlotView) {
          iPlotView.destroy();
        });
        this.model.destroy(); // so that it can unlink observers
        sc_super();
      },

      /**
       * Override to deal with removing functionEditorView & plottedValueEditorView
       * @param iChildView {SC.View}
       */
      removeChild: function( iChildView) {
        if( iChildView && iChildView === this._functionEditorView)
        {
          this._functionEditorView.removeObserver('isVisible', this, this.handleAxisOrLegendLayoutChange);
          this._functionEditorView = null;
        }
        if( iChildView && iChildView === this._plottedValueEditorView)
        {
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
       * Draw my plot views
       */
      drawPlots: function ( iChangedProperty) {
        //console.profile('drawPlots');
        var tPlotViews = this.get('plotViews'),
            tNumPlots = tPlotViews.length;/*,
            tTime = Date.now(),
            tTimeAdded;*/
        this.get('plotViews').forEach(function (iPlotView, iIndex) {
          if (iPlotView.readyToDraw())
            iPlotView.doDraw(iIndex, tNumPlots, iChangedProperty);
        });
        //tTimeAdded = Date.now() - tTime;
        //this.currTime += tTimeAdded;
        //console.log('drawPlots: added ' + tTimeAdded + 'ms for a total of ' + this.currTime + 'ms');
        //console.profileEnd();
      },

      pointsDidChange: function ( iModel, iProperty) {
        this.drawPlots( iProperty);
        this.get('legendView').displayDidChange();
      }.observes('model.pointColor', 'model.strokeColor', 'model.pointSizeMultiplier',
          'model.transparency', 'model.strokeTransparency'),

      categoriesDidChange: function (iObject, iProperty) {
        if (this.getPath('model.aboutToChangeConfiguration'))
          return; // So we don't attempt to draw in the midst of a configuration change

        this.get('plotViews').forEach(function (iPlotView, iIndex) {
          iPlotView.categoriesDidChange();
        });

        var tLegendView = this.get('legendView');
        this.drawPlots();
        if (tLegendView)
          tLegendView.displayDidChange();
        // Note: Asterisks below are necessary in case axis view gets swapped out
      }.observes('*xAxisView.categoriesDragged', '*yAxisView.categoriesDragged'),

      prepareToSelectPoints: function () {
        this.get('plotViews').forEach(function (iPlotView) {
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
       * @param iRect
       * @param iBaseSelection
       */
      selectPointsInRect: function (iRect, iBaseSelection, iLast) {
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

        this.get('plotViews').forEach(function (iPlotView) {
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

        var tXAxisView = this.get('xAxisView'),
            tYAxisView = this.get('yAxisView'),
            tY2AxisView = this.get('y2AxisView'),
            tY2AttributeID = this.getPath('model.dataConfiguration.y2AttributeID'),
            tHasY2Attribute = tY2AttributeID && (tY2AttributeID !== DG.Analysis.kNullAttribute),
            tPlotBackground = this.get('plotBackgroundView'),
            tPlotViews = this.get('plotViews'),
            tLegendView = this.get('legendView'),
            tNumberToggleView = this.get('numberToggleView'),
            tFunctionView = this.get('functionEditorView'),
            tPlottedValueView = this.get('plottedValueEditorView'),
            tShowNumberToggle = tNumberToggleView && tNumberToggleView.shouldShow(),
            tXHeight = !tXAxisView ? 0 : tXAxisView.get('desiredExtent'),
            tYWidth = !tYAxisView ? 0 : tYAxisView.get('desiredExtent'),
            tSpaceForY2 = (!tY2AxisView || !tHasY2Attribute) ? 0 : tY2AxisView.get('desiredExtent'),
            tY2DesiredWidth = !tY2AxisView ? 0 : tY2AxisView.get('desiredExtent'),
            tLegendHeight = !tLegendView ? 0 : tLegendView.get('desiredExtent'),
            tNumberToggleHeight = tShowNumberToggle ? tNumberToggleView.get('desiredExtent') : 0,
            tFunctionViewHeight = (tFunctionView && tFunctionView.get('isVisible')) ?
                tFunctionView.get('desiredExtent') : 0,
            tPlottedValueViewHeight = (tPlottedValueView && tPlottedValueView.get('isVisible')) ?
                tPlottedValueView.get('desiredExtent') : 0;

        if (!SC.none(tXAxisView) && !SC.none(tYAxisView) && ( tPlotViews.length > 0)) {
          if (firstTime) {
            // set or reset all layout parameters (initializes all parameters)
            tXAxisView.set('layout', {left: tYWidth, right: tSpaceForY2, bottom: tLegendHeight, height: tXHeight});
            tYAxisView.set('layout', {left: 0, top: tNumberToggleHeight + tFunctionViewHeight +
                                              tPlottedValueViewHeight,
              bottom: tLegendHeight, width: tYWidth});
            tY2AxisView.set('layout', {
              right: 0,
              top: tNumberToggleHeight + tFunctionViewHeight + tPlottedValueViewHeight,
              bottom: tLegendHeight,
              width: tY2DesiredWidth
            });
            tPlotBackground.set('layout', {
              left: tYWidth,
              right: tSpaceForY2,
              top: tNumberToggleHeight + tFunctionViewHeight + tPlottedValueViewHeight,
              bottom: tXHeight + tLegendHeight
            });
            if( tFunctionView)
              tFunctionView.adjust( 'top', tNumberToggleHeight);
            if( tPlottedValueView)
              tPlottedValueView.adjust( 'top', tNumberToggleHeight + tFunctionViewHeight);
            tLegendView.set('layout', {bottom: 0, height: tLegendHeight});
            this.makeSubviewFrontmost(tY2AxisView);
          }
          else {
            // adjust() method avoids triggering observers if layout parameter is already at correct value.
            var tCurrXHeight = tXAxisView.get('layout').height;
            tXAxisView.adjust({left: tYWidth, right: tSpaceForY2, bottom: tLegendHeight, height: tXHeight});
            if (tCurrXHeight !== tXHeight)
              tXAxisView.notifyPropertyChange('drawHeight');

            var tCurrYWidth = tYAxisView.get('layout').width;
            tYAxisView.adjust({bottom: tLegendHeight, width: tYWidth,
              top: tNumberToggleHeight + tFunctionViewHeight + tPlottedValueViewHeight});
            if (tCurrYWidth !== tYWidth)
              tYAxisView.notifyPropertyChange('drawWidth');

            tY2AxisView.adjust({bottom: tLegendHeight, width: tY2DesiredWidth,
              top: tNumberToggleHeight + tFunctionViewHeight + tPlottedValueViewHeight});
            if (!tHasY2Attribute) {
              tY2AxisView.set('isVisible', false);
            }
            tPlotBackground.adjust({
              left: tYWidth,
              right: tSpaceForY2,
              top: tNumberToggleHeight + tFunctionViewHeight + tPlottedValueViewHeight,
              bottom: tXHeight + tLegendHeight
            });
            if( tFunctionView)
              tFunctionView.adjust( 'top', tNumberToggleHeight);
            if( tPlottedValueView)
              tPlottedValueView.adjust( 'top', tNumberToggleHeight + tFunctionViewHeight);
            tLegendView.adjust('height', tLegendHeight);
            if (tNumberToggleView)
              tNumberToggleView.adjust('height', tNumberToggleHeight);
            // NumberToggleView visibility is handled by binding
          }
        }
        this._isRenderLayoutInProgress = false;
        this._drawPlotsInvocations++;
        this.invokeOnceLater(function () {
          this._drawPlotsInvocations--;
          if( this._drawPlotsInvocations === 0)
          {
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
        if( iChildView && this.get('childViews').indexOf( iChildView) >= 0)
        {
          this.removeChild(iChildView);
          this.appendChild(iChildView);
        }
      },

      /**
       * Private property to prevent recursive execution of renderLayout. Seems most important in Firefox.
       */
      _isRenderLayoutInProgress: false,

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
              tPlace, tAttr, tAttrType = '',
              tSetup;
          switch (iAxisViewKey) {
            case 'xAxisView':
              tSetup = {orientation: 'horizontal'};
              tPlace = DG.GraphTypes.EPlace.eX;
              break;
            case 'yAxisView':
              tSetup = {orientation: 'vertical'};
              tPlace = DG.GraphTypes.EPlace.eY;
              break;
            case 'y2AxisView':
              tSetup = {orientation: 'vertical2'};
              tPlace = DG.GraphTypes.EPlace.eY2;
              break;
          }
          tSetup.layout = { left: 0, top: 0, width: 0, height: 0 };
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
            if (!SC.none(tPlotView))
              tPlotView.set(iAxisViewKey, tNewView);
            tView.destroy();
            this_.controller.set(iAxisViewKey, tNewView);
            tInitLayout = true; // new view requires a new layout
          }
        }

        handleOneAxis('model.xAxis', 'xAxisView');
        handleOneAxis('model.yAxis', 'yAxisView');
        handleOneAxis('model.y2Axis', 'y2AxisView');
        this.setPath('xAxisView.otherAxisView', this.get('yAxisView'));
        this.setPath('yAxisView.otherAxisView', this.get('xAxisView'));
        this.setPath('y2AxisView.otherAxisView', this.get('xAxisView'));
        this.setPath('y2AxisView.otherYAttributeDescription', this.getPath('model.yAxis.attributeDescription'));
        this.setPath('y2AxisView.xAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
        this.setPath('yAxisMultiTarget.attributeDescription', this.getPath('model.yAxis.attributeDescription'));
        this.setPath('yAxisMultiTarget.otherAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
        this.renderLayout(this.renderContext(this.get('tagName')), tInitLayout);
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
            tViewClass = tCurrentView.constructor,
            tCurrentPoints, tNewViewClass, tNewView,
            tInitLayout = false;

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
          // If we don't call doDraw immediately, we don't get the between-plot animation.
          if (tNewView.readyToDraw())
            tNewView.doDraw();
          if (tInitLayout) {
            this.renderLayout(this.renderContext(this.get('tagName')), tInitLayout);
          }
        }
      }.observes('.model.plot'),

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
          tPlotView = DG.ScatterPlotView.create({model: tPlotModel});
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
          tPlotView = DG.ScatterPlotView.create({model: tPlotModel});
          this.addPlotView(tPlotView);
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
        tPlotViews.splice(tIndexOfPlotViewToRemove, 1);
        tPlotViews.forEach( function( iPlotView, iIndex) {
          iPlotView.set('isFirstPlot', iIndex === 0);
        });
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
        var tPlotView = this.get('plotView');
        if (this.getPath('model.aboutToChangeConfiguration')) {
          tPlotView.prepareForConfigurationChange();
        }
        else {
          tPlotView.handleConfigurationChange();
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
              tNewViewClass, tNewView, tOldView, tOtherView;
          if (tCurrentViewClass === DG.CellLinearAxisView && tAttrType === 'qualitative') {
            tNewViewClass = DG.QualCellLinearAxisView;
          }
          else if (tCurrentViewClass === DG.QualCellLinearAxisView && tAttrType === 'numeric') {
            tNewViewClass = DG.CellLinearAxisView;
          }
          else if( tCurrentAxisModelClass === DG.CountAxisModel) {
            tNewViewClass = DG.CountAxisView;
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
            tOtherView = this.get(((iPrefix === 'x') ? 'y' : 'x') + 'AxisView');
            tNewView.set('otherAxisView', tOtherView);
            tOldView.destroy();
            tInitLayout = true;
          }
        }.bind(this);

        synchOneAxis('x');
        synchOneAxis('y');
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
          '.legendView.desiredExtent', '.legendView.labelNode', '*y2AxisView.desiredExtent'),

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
            //tNewViewClass = DG.StripPlotView;
            tNewViewClass = DG.DotPlotView;
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
        tMulti.set('attributeDescription', this.getPath('model.yAxis.attributeDescription'));
        tMulti.set('otherAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
        //tMulti.set('layout', { left: 0, top: 0, width: tExtent.width, height: tExtent.height });
        tMulti.set('layout', {left: 0, top: 0, right: 0, height: tExtent.height});
        tMulti.set('isVisible', false); // Start out hidden

        this.set('yAxisMultiTarget', tMulti);
      }

    });

