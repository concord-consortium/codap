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

  classNames: 'graph-view'.w(),

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
  rescaleButton: null,
  
  /**
   * Returns the first plotView in _plotViews, if any. When used to set,
   * wipes out the current array and replaces it with a new array
   * containing just iValue
   *
   * @param iKey
   * @param iValue
   * @return {DG.PlotView}
   */
  plotView: function( iKey, iValue) {
    if( !SC.none( iValue)) {
      this._plotViews.forEach( function( iPlotView) {
        iPlotView.destroy();
      });
      this._plotViews = [ iValue];
    }
    return (this._plotViews.length < 1) ? null : this._plotViews[0];
  }.property(),

  _plotViews: null,

  plotViews: function() {
    return this._plotViews;
  }.property(),

  /**
   * If not already present, adds the given plotView to my array.
   * We have to put the new plotView in the same position in the array that the
   * new plot is in the array of plots my model holds onto.
   * @param iPlotView
   */
  addPlotView: function( iPlotView) {
    if( !this._plotViews.contains( iPlotView)) {
      var tNewPlot = iPlotView.get('model'),
          tPlots = this.getPath('model.plots'),
          //tPlotViews = this._plotViews,
          tIndexOfNewPlot = -1;
      tPlots.forEach( function( iPlot, iPlotIndex) {
        if( iPlot === tNewPlot)
          tIndexOfNewPlot = iPlotIndex;
      });
      this._plotViews.splice( tIndexOfNewPlot, 0, iPlotView);
    }
  },

  /**
   * Bottleneck for configuring a plotView
   * @param iPlotView
   * @param iPlotModel
   * @param iCurrentPoints
   */

  setPlotViewProperties: function( iPlotView, iPlotModel, iYAxisKey, iCurrentPoints) {
    iYAxisKey = iYAxisKey || 'yAxisView';
    iPlotView.beginPropertyChanges();
      iPlotView.setIfChanged('paperSource', this.get('plotBackgroundView'));
      iPlotView.setIfChanged('model', iPlotModel);
      iPlotView.setIfChanged( 'xAxisView', this.get('xAxisView'));
      iPlotView.setIfChanged( 'yAxisView', this.get(iYAxisKey));
      iPlotView.setIfChanged('parentView', this);
      iPlotView.setupAxes();  // special requirements set up here
      if( !SC.none( iCurrentPoints))
        iPlotView.set('cachedPointCoordinates', iCurrentPoints);
    iPlotView.endPropertyChanges();

    iPlotView.addObserver( 'plotDisplayDidChange', this, function() {
    this.invokeLast( this.drawPlots);
    });
  },

  init: function() {

    function getAxisViewClass( iAxis) {
      switch( iAxis.constructor) {
        case DG.AxisModel:
          return DG.AxisView;
        case DG.CellLinearAxisModel:
          return DG.CellLinearAxisView;
        case DG.CellAxisModel:
          return DG.CellAxisView;
      }
      return null;
    }

    var rescalePlot = function() {
      this.get('model' ).rescaleAxesFromData( true, true);
    }.bind( this);

    var tXAxis = this.getPath( 'model.xAxis'),
        tYAxis = this.getPath( 'model.yAxis'),
        tY2Axis = this.getPath( 'model.y2Axis'),
        tXAxisView = getAxisViewClass( tXAxis).create( { orientation: 'horizontal' }),
        tYAxisView = getAxisViewClass( tYAxis).create( { orientation: 'vertical' }),
        tY2AxisView = getAxisViewClass( tY2Axis).create( { orientation: 'vertical2' }),
        tBackgroundView = DG.PlotBackgroundView.create( { xAxisView: tXAxisView, yAxisView: tYAxisView,
                                                          graphModel: this.get('model') } ),
        tPlots = this.getPath('model.plots' ),
        tLegendView = DG.LegendView.create();

    sc_super();

    this._plotViews = [];

    this.set('xAxisView', tXAxisView);
    this.appendChild( tXAxisView);
    this.set('yAxisView', tYAxisView);
    this.appendChild( tYAxisView);

    // y2AxisView must be 'under' plotBackgroundView for dragging to work properly when there is no
    // attribute on y2 axis.
    this.set('y2AxisView', tY2AxisView);
    this.appendChild( tY2AxisView);
    tY2AxisView.set('xAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
    tY2AxisView.set('otherYAttributeDescription', this.getPath('model.yAxis.attributeDescription'));
    tYAxisView.set('otherYAttributeDescription', this.getPath('model.y2Axis.attributeDescription'));

    this.set('plotBackgroundView', tBackgroundView);
    this.appendChild( tBackgroundView);
    tXAxisView.set('otherAxisView', tYAxisView);
    tYAxisView.set('otherAxisView', tXAxisView);
    tY2AxisView.set('otherAxisView', tXAxisView);

    this.set('legendView', tLegendView);
    this.appendChild( tLegendView);

    this.createMultiTarget();

    if(DG.IS_INQUIRY_SPACE_BUILD) {
      var tNumberToggleView = DG.NumberToggleView.create( { model: this.getPath('model.numberToggle')});
      this.set('numberToggleView', tNumberToggleView);
      this.appendChild( tNumberToggleView);

      var tRescaleButton = SC.ImageButtonView.create({
                                      classNames: ['rescale-button'],
                                      layout: { width: 16, height: 16, right: 2, top: 1 },
                                      toolTip: 'DG.GraphView.rescale'.loc(),
                                      action: rescalePlot });
      this.set('rescaleButton', tRescaleButton);
      this.appendChild( tRescaleButton);
    }

    tXAxisView.set('model', tXAxis);
    tYAxisView.set('model', tYAxis);

    tY2AxisView.set('model', tY2Axis);

    tPlots.forEach( function( iPlotModel) {
      var tPlotView = this.mapPlotModelToPlotView( iPlotModel).create();
      this.addPlotView( tPlotView);
      this.setPlotViewProperties( tPlotView, iPlotModel,
          iPlotModel.get('verticalAxisIsY2') ? 'y2AxisView' : 'yAxisView');
    }.bind(this));
    tLegendView.set('model', this.getPath('model.legend'));

    DG.globalsController.addObserver('globalValueChanges', this, 'globalValueDidChange');
  },
  
  destroy: function() {
    DG.globalsController.removeObserver('globalValueChanges', this, 'globalValueDidChange');
    this.model.destroy(); // so that it can unlink observers
    sc_super();
  },

  /**
   * Draw my plot views
   */
  drawPlots: function() {
    var tPlotViews = this.get('plotViews' ),
        tNumPlots = tPlotViews.length;
    this.get('plotViews').forEach( function( iPlotView, iIndex) {
      if( iPlotView.readyToDraw())
        iPlotView.doDraw( iIndex, tNumPlots);
    });
  },

  prepareToSelectPoints: function () {
    this.get('plotViews').forEach( function( iPlotView) {
      iPlotView.preparePointSelection();
    });
  },
  completeSelection: function () {
    this.get('plotViews').forEach( function( iPlotView) {
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
  selectPointsInRect: function( iRect, iBaseSelection, iLast) {
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

    if( SC.none( tDataContext))
      return;

    this.get('plotViews').forEach( function( iPlotView) {
      var tPlotSelection = iPlotView.getCasesForDelta( iRect, iLast);
      tSelectChange.cases = tSelectChange.cases.concat( tPlotSelection);
      var tPlotDeselection = iPlotView.getCasesForDelta(iLast, iRect);
      tDeselectChange.cases = tDeselectChange.cases.concat( tPlotDeselection);
    });

    if (tSelectChange.cases.length !== 0) {
      tDataContext.applyChange( tSelectChange);
    }
    if (tDeselectChange.cases.length !== 0) {
      tDataContext.applyChange( tDeselectChange);
    }
   },
  
  /**
   * Pass to first plotview
   * @param iEvent
   */
  handleBackgroundClick: function( iEvent) {
    this.get('plotView').handleBackgroundClick( iEvent);
  },

/**
   * Pass to first plotview
   * @param iEvent
   */
  handleBackgroundDblClick: function( iEvent) {
    this.get('plotView').handleBackgroundDblClick( iEvent);
  },

/**
    Set the layout (view position) for our three subviews.
    @param {SC.RenderContext} the render context
    @param {Boolean} Is this the first time the rendering is happening?  Set to true if any of the 3 view are new.
    @returns {void}
  */
  renderLayout: function( context, firstTime) {
    // Prevent recursive calls
    if( this._isRenderLayoutInProgress)
      return;
    this._isRenderLayoutInProgress = true;

    sc_super();

    var tXAxisView = this.get('xAxisView'),
        tYAxisView = this.get('yAxisView'),
        tY2AxisView = this.get('y2AxisView'),
        tY2AttributeID = this.getPath('model.dataConfiguration.y2AttributeID'),
        tHasY2Attribute = tY2AttributeID && (tY2AttributeID !== DG.Analysis.kNullAttribute),
        tPlotBackground = this.get('plotBackgroundView' ),
        tPlotViews = this.get('plotViews'),
        tLegendView = this.get('legendView'),
        tNumberToggleView = this.get('numberToggleView'),
        tRescaleButton = this.get('rescaleButton'),
        tShowNumberToggle = tNumberToggleView && tNumberToggleView.shouldShow(),
        tXHeight = !tXAxisView ? 0 : tXAxisView.get('desiredExtent'),
        tYWidth = !tYAxisView ? 0 : tYAxisView.get('desiredExtent'),
        tSpaceForY2 = (!tY2AxisView || !tHasY2Attribute) ? 0 : tY2AxisView.get('desiredExtent'),
        tY2DesiredWidth = !tY2AxisView ? 0 : tY2AxisView.get('desiredExtent'),
        tLegendHeight = !tLegendView ? 0 : tLegendView.get('desiredExtent' ),
        tNumberToggleHeight = tShowNumberToggle ? tNumberToggleView.get('desiredExtent' ) : 0;

    if( !SC.none( tXAxisView) && !SC.none( tYAxisView) && ( tPlotViews.length > 0)) {
      if( firstTime) {
        // set or reset all layout parameters (initializes all parameters)
        tXAxisView.set( 'layout', { left: tYWidth, right: tSpaceForY2, bottom: tLegendHeight, height: tXHeight });
        tYAxisView.set( 'layout', { left: 0, top: tNumberToggleHeight, bottom: tXHeight + tLegendHeight, width: tYWidth });
        tY2AxisView.set( 'layout', { right: 0, top: tNumberToggleHeight, bottom: tXHeight + tLegendHeight, width: tY2DesiredWidth });
        tPlotBackground.set( 'layout', { left: tYWidth, right: tSpaceForY2, top: tNumberToggleHeight, bottom: tXHeight + tLegendHeight });
        tLegendView.set( 'layout', { bottom: 0, height: tLegendHeight });
        if(tNumberToggleView)
          tNumberToggleView.set( 'layout', { left: tYWidth, height: tNumberToggleHeight });
      }
      else {
        // adjust() method avoids triggering observers if layout parameter is already at correct value.
        tXAxisView.adjust('left', tYWidth);
        tXAxisView.adjust('right', tSpaceForY2);
        tXAxisView.adjust('bottom', tLegendHeight);
        tXAxisView.adjust('height', tXHeight);
        tYAxisView.adjust('bottom', tLegendHeight);
        tYAxisView.adjust('width', tYWidth);
        tYAxisView.adjust('top', tNumberToggleHeight);
        tY2AxisView.adjust('bottom', tLegendHeight);
        tY2AxisView.adjust('width', tY2DesiredWidth);
        tY2AxisView.adjust('top', tNumberToggleHeight);
        tPlotBackground.adjust('left', tYWidth);
        tPlotBackground.adjust('right', tSpaceForY2);
        tPlotBackground.adjust('top', tNumberToggleHeight);
        tPlotBackground.adjust('bottom', tXHeight + tLegendHeight);
        tLegendView.adjust('height', tLegendHeight);
        if(tNumberToggleView)
          tNumberToggleView.adjust('height', tNumberToggleHeight);
      }
      if( tNumberToggleView) {
        tNumberToggleView.set('isVisible', tShowNumberToggle);
      }
      if( tRescaleButton) {
        tRescaleButton.set('isVisible', this.getPath('model.hasNumericAxis'));
      }

    }
    this._isRenderLayoutInProgress = false;
  },

  viewDidResize: function() {
    sc_super();
    this.renderLayout( this.renderContext( this.get('tagName')));
    this.invokeOnce( this.drawPlots);
  },

  /**
   * Private property to prevent recursive execution of renderLayout. Seems most important in Firefox.
   */
  _isRenderLayoutInProgress: false,

  /**
    When a model axis changes, we need to respond by changing its corresponding view.
  */
  handleAxisModelChange: function() {
    var this_ = this,
        tInitLayout=false,
        tPlotBackgroundView = this.get('plotBackgroundView');

    function handleOneAxis( iAxisKey, iAxisViewKey) {
      var tModel = this_.getPath( iAxisKey),
          tModelClass = tModel && tModel.constructor,
          tView = this_.get( iAxisViewKey),
          tViewClass = tView && tView.constructor,
          tNewViewClass, tNewView,
          tPlotView = this_.get('plotView'),
          tSetup;
      switch( iAxisViewKey) {
        case 'xAxisView':
          tSetup = { orientation: 'horizontal' };
          break;
        case 'yAxisView':
          tSetup = { orientation: 'vertical' };
          break;
        case 'y2AxisView':
          tSetup = { orientation: 'vertical2' };
          break;
      }
      switch( tModelClass) {
        case DG.AxisModel:
          tNewViewClass = DG.AxisView;
          break;
        case DG.CellAxisModel:
          tNewViewClass = DG.CellAxisView;
          break;
        case DG.CellLinearAxisModel:
          tNewViewClass = DG.CellLinearAxisView;
          break;
        default:
          tNewViewClass = null;
      }
      if( tNewViewClass && (tViewClass !== tNewViewClass)) {
        tNewView = tNewViewClass.create( tSetup);
        tNewView.set('model', tModel);
        this_.removeChild( tView);
        this_.appendChild( tNewView);
        this_.set( iAxisViewKey, tNewView);
        tPlotBackgroundView.set( iAxisViewKey, tNewView);
        if( !SC.none( tPlotView))
          tPlotView.set( iAxisViewKey, tNewView);
        tView.destroy();
        this_.controller.set( iAxisViewKey, tNewView);
        tInitLayout = true; // new view requires a new layout
      }
    }
    
    handleOneAxis( 'model.xAxis', 'xAxisView');
    handleOneAxis( 'model.yAxis', 'yAxisView');
    handleOneAxis( 'model.y2Axis', 'y2AxisView');
    this.get('xAxisView').set('otherAxisView', this.get('yAxisView'));
    this.get('yAxisView').set('otherAxisView', this.get('xAxisView'));
    this.get('y2AxisView').set('otherAxisView', this.get('xAxisView'));
    this.get('y2AxisView').set('otherYAttributeDescription', this.getPath('model.yAxis.attributeDescription'));
    this.get('y2AxisView').set('xAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
    this.renderLayout( this.renderContext(this.get('tagName')), tInitLayout );
  }.observes('.model.xAxis', '.model.yAxis', '.model.y2Axis'),

  handleLegendModelChange: function() {
    var tLegendModel = this.getPath('model.legend');
    this.setPath('legendView.model', tLegendModel);
  }.observes('.model.legend'),
  
  /**
    When my plot model changes, we need to respond by changing its corresponding view.
  */
  handlePlotModelChange: function() {
    var tPlot = this.getPath('model.plot'),
        tCurrentView = this.get('plotView'),
        tViewClass = tCurrentView.constructor,
        tCurrentPoints, tNewViewClass, tNewView,
        tInitLayout = false;
    
    tNewViewClass = this.mapPlotModelToPlotView( tPlot);
    if( tNewViewClass && (tViewClass !== tNewViewClass)) {
      tNewView = tNewViewClass.create();
      tInitLayout = true;
    }

    if( !SC.none(tNewView)) {
      if( !SC.none( tCurrentView))
        tCurrentPoints = tCurrentView.get('cachedPointCoordinates');
      this.setPlotViewProperties( tNewView, tPlot, 'yAxisView', tCurrentPoints);
      // If we don't call doDraw immediately, we don't get the between-plot animation.
      if( tNewView.readyToDraw())
        tNewView.doDraw();
      this.set('plotView', tNewView); // Destroys tCurrentView
      if( tInitLayout ) {
        this.renderLayout( this.renderContext(this.get('tagName')), tInitLayout );
      }
    }
  }.observes('.model.plot'),

  plotWithoutView: function() {
    var tPlots = this.getPath('model.plots'),
        tPlotViews = this._plotViews,
        tPlotWithoutView;
    tPlots.forEach( function( iPlot) {
      if( !tPlotViews.some( function( iPlotView) {
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
  handleAttributeAdded: function() {
    var tPlotModel = this.plotWithoutView(),
        tPlotView;
    if( !SC.none( tPlotModel)) {
      tPlotView = DG.ScatterPlotView.create( { model: tPlotModel });
      this.addPlotView( tPlotView);
      this.renderLayout( this.renderContext(this.get('tagName')), false );
      this.setPlotViewProperties( tPlotView, tPlotModel, 'yAxisView');
    }
  }.observes('model.attributeAdded'),

  /**
   * An attribute has been added to the second vertical axis. There are now multiple plot models.
   * For now, this only works with scatterplots, so we know we have to construct a
   * ScatterPlotView.
   * Note that we're assuming that if an attribute was just added, it must be the last, and
   * we can bind the new scatterplot view to the last plot.
   */
  handleY2AttributeAdded: function() {
    var tPlotModel = this.getPath('model.lastPlot' ),
        tPlotView;
    if( !SC.none( tPlotModel)) {
      this.handleAxisModelChange();
      tPlotView = DG.ScatterPlotView.create( { model: tPlotModel });
      this.addPlotView( tPlotView);
      this.renderLayout( this.renderContext(this.get('tagName')), false );
      this.setPlotViewProperties( tPlotView, tPlotModel, 'y2AxisView');
      // The y2AxisView needs to know how many attribute descriptions there are on the other y-axis so that
      // it can properly set the color of the label.
      this.get('y2AxisView').set('otherYAttributeDescription', this.getPath('model.yAxis.attributeDescription'));
      this.get('y2AxisView').set('xAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
      this.get('yAxisView').set('otherYAttributeDescription', this.getPath('model.y2Axis.attributeDescription'));
    }
  }.observes('model.y2AttributeAdded'),

  /**
   * An attribute has been removed from the vertical axis. But there is at least one attribute
   * left on that axis. We run through the plotViews to find the one whose model is no longer
   * one of our plots. That one, we destroy.
   */
  handleAttributeRemoved: function() {
    var tPlots = this.getPath('model.plots' ),
        tPlotViews = this.get('plotViews' ),
        tIndexOfPlotViewToRemove;
    tPlotViews.forEach( function( iPlotView, iIndex) {
      if( tPlots.indexOf( iPlotView.get('model')) < 0) {
        tIndexOfPlotViewToRemove = iIndex;
        iPlotView.removePlottedElements( true /* animate */);
        iPlotView.destroy();
      }
    });
    tPlotViews.splice( tIndexOfPlotViewToRemove, 1);
  }.observes('model.attributeRemoved'),

  /**
   * When our model signals that the configuration is about to change, we give our plot view a chance to
   * cache the positions of elements so they can be used in an animation
   */
  configurationIsAboutToChange: function() {
    var tPlotView = this.get('plotView');
    if( this.getPath( 'model.aboutToChangeConfiguration')) {
      tPlotView.prepareForConfigurationChange();
    }
    else {
      tPlotView.handleConfigurationChange();
    }
  }.observes('.model.aboutToChangeConfiguration'),

  /**
   * When the layout needs of an axis change, we need to adjust the layout of the plot and the other axis.
   */
  handleAxisOrLegendLayoutChange: function() {
    this.renderLayout( this.renderContext( this.get('tagName')));
  }.observes('*xAxisView.desiredExtent', '*yAxisView.desiredExtent', '*legendView.desiredExtent', '*y2AxisView.desiredExtent'),

  /**
   * When the layout needs of an axis change, we need to adjust the layout of the plot and the other axis.
   */
  handleNumberToggleCaseCountChange: function() {
    this.renderLayout( this.renderContext( this.get('tagName')));
  }.observes('model.numberToggle.caseCount'),

  /**
    Called when the value of a global value changes (e.g. when a slider is dragged).
   */
  globalValueDidChange: function() {
    var tPlotView = this.get('plotView');
    if( tPlotView)
      tPlotView.refreshCoordinates();
  },
  
  mapPlotModelToPlotView: function( iPlotModel) {
    var tModelClass = iPlotModel && iPlotModel.constructor,
        tNewViewClass = null;
    switch( tModelClass) {
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
    }
    return tNewViewClass;
  },

  /**
   * yAxisMultiTarget has to be deepest from a drag point of view or it won't be able to
   * notice that something is being dragged into it.
   */
  createMultiTarget: function() {
    var tMulti = DG.AxisMultiTarget.create(),
        tExtent = tMulti.get('desiredExtent');
    this.appendChild( tMulti);
    tMulti.set('attributeDescription', this.getPath('model.yAxis.attributeDescription'));
    tMulti.set('otherAttributeDescription', this.getPath('model.xAxis.attributeDescription'));
    tMulti.set('layout', { left: 0, top: 0, width: tExtent.width, height: tExtent.height });
    tMulti.set('isVisible', false); // Start out hidden

    this.set('yAxisMultiTarget', tMulti);
  }

});

