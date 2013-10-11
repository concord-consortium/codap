// ==========================================================================
//                        DG.ScatterPlotModel
//
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

sc_require('components/graph/plots/plot_model');
sc_require('components/graph/plots/numeric_plot_model_mixin');

/** @class  DG.ScatterPlotModel

  @extends DG.PlotModel
*/
DG.ScatterPlotModel = DG.PlotModel.extend( DG.NumericPlotModelMixin,
/** @scope DG.ScatterPlotModel.prototype */ 
{
  /**
    @property { DG.MovableLineModel }
  */
  movableLine: null,

  /**
    @property { Boolean, read only }
  */
  isMovableLineVisible: function() {
    return !SC.none( this.movableLine) && this.movableLine.get('isVisible');
  }.property('movableLine.isVisible'),

  /**
    @property { Boolean, read only }
  */
  isInterceptLocked: function() {
    return !SC.none( this.movableLine) && this.movableLine.get('isInterceptLocked');
  }.property('movableLine.isInterceptLocked'),

  /**
    @property { Boolean }
  */
  areSquaresVisible: false,

  /**
   * Used for notification
   * @property{}
   */
  squares: null,

  /**
   * Used for notification
   */
  lineDidChange: function() {
    this.notifyPropertyChange('squares');
  }.observes('.movableLine.slope', '.movableLine.intercept'),

  /**
   * Utility function to create a movable line when needed
   */
  createMovableLine: function() {
    if( SC.none( this.movableLine)) {
      this.beginPropertyChanges();
        this.set('movableLine', DG.MovableLineModel.create());
        this.movableLine.recomputeSlopeAndIntercept( this.get('xAxis'), this.get('yAxis'));
      this.endPropertyChanges();
    }
  },

  /**
    If we need to make a movable line, do so. In any event toggle its visibility.
  */
  toggleMovableLine: function() {
    if( SC.none( this.movableLine)) {
      this.createMovableLine(); // Default is to be visible
    }
    else {
      this.movableLine.recomputeSlopeAndInterceptIfNeeded( this.get('xAxis'), this.get('yAxis'));
      this.movableLine.set('isVisible', !this.movableLine.get('isVisible'));
    }
    DG.logUser("toggleMovableLine: %@", this.movableLine.get('isVisible') ? "show" : "hide");
  },

  /**
    If we need to make a movable line, do so. In any event toggle whether its intercept is locked.
  */
  toggleInterceptLocked: function() {
    if( SC.none( this.movableLine)) {
      this.createMovableLine(); // Default is to be unlocked
    }
    else {
      this.movableLine.toggleInterceptLocked();
      this.movableLine.recomputeSlopeAndInterceptIfNeeded( this.get('xAxis'), this.get('yAxis'));
    }
    DG.logUser("lockIntercept: %@", this.movableLine.get('isInterceptLocked'));
  },

  /**
    If we need to make a plotted function, do so. In any event toggle its visibility.
  */
  togglePlotFunction: function() {
    this.toggleAdornmentVisibility('plottedFunction', 'togglePlotFunction');
    if( this.isAdornmentVisible('plottedFunction')) {
      var plottedFunction = this.getAdornmentModel('plottedFunction');
      if( plottedFunction)
        plottedFunction.set('dataConfiguration', this.get('dataConfiguration'));
    }
  },

  /**
    If we need to make a connecting line, do so. In any event toggle its visibility.
  */
  toggleConnectingLine: function() {
    var tAdornModel = this.toggleAdornmentVisibility('connectingLine', 'toggleConnectingLine');
    if( tAdornModel && tAdornModel.get('isVisible'))
      tAdornModel.recomputeValue(); // initialize
  },

  /**
    Convenience method for toggling Boolean property
  */
  toggleShowSquares: function() {
    this.set('areSquaresVisible', !this.get('areSquaresVisible'));
  },

  handleDataConfigurationChange: function() {
    sc_super();
    this.rescaleAxesFromData( true, /* allow scale shrinkage */
                              true /* do animation */);

    var adornmentModel = this.getAdornmentModel('connectingLine');
    if( adornmentModel) {
      adornmentModel.setComputingNeeded();  // invalidate if axis model/attribute change
    }
  },

  /**
    Each axis should rescale based on the values to be plotted with it.
    @param{Boolean} Default is false
    @param{Boolean} Default is true
    @param{Boolean} Default is false
  */
  rescaleAxesFromData: function( iAllowScaleShrinkage, iAnimatePoints, iLogIt) {
    if( iAnimatePoints === undefined)
      iAnimatePoints = true;
    this.doRescaleAxesFromData( [DG.GraphTypes.EPlace.eX, DG.GraphTypes.EPlace.eY],
                                iAllowScaleShrinkage, iAnimatePoints);
    if( iLogIt)
      DG.logUser("rescaleScatterplot");
  },

  /**
    @param{ {x: {Number}, y: {Number} } }
    @param{Number}
  */
  dilate: function( iFixedPoint, iFactor) {
    this.doDilation( [DG.GraphTypes.EPlace.eX, DG.GraphTypes.EPlace.eY], iFixedPoint, iFactor);
  },

  /**
    Note that this is not a property because caller needs to assign "this".
    @return {Array of menu items}
  */
  getGearMenuItems: function() {
    var this_ = this,
        tLineIsVisible = this.get( 'isMovableLineVisible'),
        tFunctionIsVisible = this.isAdornmentVisible('plottedFunction'),
        tMovableLineItem = tLineIsVisible ? "Hide Movable Line" : "Show Movable Line",
        tConnectingLineItem = (this.isAdornmentVisible('connectingLine') ?
            'DG.ScatterPlotModel.HideConnectingLine' :
            'DG.ScatterPlotModel.ShowConnectingLine').loc(),
        tInterceptLockedItem = ( this.get( 'isInterceptLocked') ?
            'DG.ScatterPlotModel.UnlockIntercept' :
            'DG.ScatterPlotModel.LockIntercept').loc(),
        tPlotFunctionItem = tFunctionIsVisible ? "Hide Plotted Function" : "Plot Function",
        tShowSquaresItem = this.get( 'areSquaresVisible') ? "Hide Squares" : "Show Squares"
      ;
    return [
      { title: "Rescale to Data", target: this_, itemAction: this_.rescaleAxesFromData,
          args: [ true /* allowAxisRescale */, false /* No need to animate points independently */,
                  true /* log it */]},
      { title: tMovableLineItem, target: this_, itemAction: this.toggleMovableLine },
      { title: tConnectingLineItem, target: this_, itemAction: this.toggleConnectingLine },
      { title: tInterceptLockedItem, target: this_, itemAction: this.toggleInterceptLocked,
          isEnabled: tLineIsVisible },
      { title: tPlotFunctionItem, target: this_, itemAction: this.togglePlotFunction },
      { title: tShowSquaresItem, target: this_, itemAction: this.toggleShowSquares,
          isEnabled: tLineIsVisible || tFunctionIsVisible }
    ].concat( sc_super());
  },

  /**
   * @return { Object } with properties specific to a given subclass
   */
  createStorage: function() {
    var tStorage = sc_super(),
        tMovableLine = this.get('movableLine');
    if( !SC.none( tMovableLine))
      tStorage.movableLineStorage = tMovableLine.createStorage();
    if( this.get( 'areSquaresVisible'))
      tStorage.areSquaresVisible = true;

    return tStorage;
  },

  /**
   * @param { Object } with properties specific to a given subclass
   */
  restoreStorage: function( iStorage) {

    /*  Older documents stored adornments individually in the plot model
     *  that used them, e.g. movable lines and function plots were stored
     *  here with the scatter plot model. In newer documents, there is an
     *  'adornments' property in the base class (plot model) which stores
     *  all or most of the adornments. To preserve file format compatibility
     *  we move the locally stored storage objects into the base class
     *  'adornments' property where the base class will process them when
     *  we call sc_super().
     */
    this.moveAdornmentStorage( iStorage, 'movableLine', iStorage.movableLineStorage);
    this.moveAdornmentStorage( iStorage, 'plottedFunction', iStorage.plottedFunctionStorage);

    sc_super();
    
    if( iStorage.movableLineStorage) {
      if( SC.none( this.movableLine))
        this.createMovableLine();
      this.get('movableLine').restoreStorage( iStorage.movableLineStorage);
    }
    if( iStorage.areSquaresVisible)
      this.toggleShowSquares();

    // Legacy document support
    if( iStorage.plottedFunctionStorage) {
      if( SC.none( this.plottedFunction))
        this.set('plottedFunction', DG.PlottedFunctionModel.create());
      this.get('plottedFunction').restoreStorage( iStorage.plottedFunctionStorage);
    }
  },

  onRescaleIsComplete: function() {
    if( !SC.none( this.movableLine))
      this.movableLine.recomputeSlopeAndInterceptIfNeeded( this.get('xAxis'), this.get('yAxis'));
  },

  /**
   * Get an array of non-missing case counts in each axis cell.
   * Also cell index on primary and secondary axis, with primary axis as major axis.
   * @return {Array} [{count, primaryCell, secondaryCell},...] (all values are integers 0+).
   */
  getCellCaseCounts: function() {
    var tCases = this.get('cases'),
        tXVarID = this.get('xVarID'),
        tYVarID = this.get('yVarID'),
        tCount = 0,
        tValueArray = [];

    if( !( tXVarID && tYVarID )) {
      return tValueArray; // too early to recompute, caller must try again later.
    }

    // compute count and percent cases in each cell, excluding missing values
    tCases.forEach( function( iCase, iIndex ) {
      var tXVal = iCase.getNumValue( tXVarID),
          tYVal = iCase.getNumValue( tYVarID);
      if( isFinite( tXVal) && isFinite( tYVal)) ++tCount;
    });

    // initialize the values for the single 'cell' of the scatterplot
    tValueArray.push({
        count: tCount,
        primaryCell: 0,
        secondaryCell: 0
      });
    return tValueArray;
  }

});

