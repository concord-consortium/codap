// ==========================================================================
//                            DG.PlotView
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

sc_require('alpha/destroyable');
sc_require('components/graph/utilities/plot_utilities');

/** @class  DG.PlotView - The base class view for a plot.

  @extends DG.RaphaelBaseView
*/
DG.PlotView = SC.Object.extend( DG.Destroyable,
/** @scope DG.PlotView.prototype */ 
{
  autoDestroyProperties: ['_dataTip', 'plottedCountAdorn'],

  /**
   * The paper we draw on is shared, not owned.
   * @property {DG.RaphaelBase}
   */
  paperSource: null,

  /**
   * @property {Raphael paper}
   */
  paper: function() {
    return this.getPath('paperSource.paper');
  }.property('paperSource.paper'),

  /**
   * Get from paperSource
   * @property {}
   */
  frame: function() {
    return this.getPath('paperSource.frame');
  }.property('paperSource.frame'),

  /**
   * Get from paperSource
   * @property {}
   */
  elementsToClear: function() {
    return this.getPath('paperSource._elementsToClear');
  }.property('paperSource._elementsToClear'),

  /**
   * Get from paperSource
   * @property {}
   */
  elementsInFront: function() {
    return this.getPath('paperSource._elementsInFront');
  }.property('paperSource._elementsInFront'),

  /**
   * These two properties are used to determine point color when there are multiple plots in a graph
   */
  plotIndex: 0,
  numPlots: 1,

  /**
   * Since we are not a view, we notify so that the graphView that owns us can take
   * appropriate action.
   */
  displayDidChange: function() {
    this.notifyPropertyChange('plotDisplayDidChange');
  },

  /**
    The model on which this view is based.
    @property { DG.PlotModel }
  */
  model: null,

  /**
    @property { DG.DataContext }  The data context
  */
  dataContext: function() {
    return this.getPath('model.dataContext');
  }.property('model.dataContext'),
   
  /**
    @property { DG.AxisView}
  */
  xAxisView: null,
  /**
    @property { DG.AxisView }
  */
  yAxisView: null,

  selection: null,
  selectionBinding: '*model.casesController.selection',

  /**
    Used to store point coordinates at the beginning of a configuration change.
    @property { Array of {cx:{Number}, cy:{Number}} }
  */
  cachedPointCoordinates: null,

  /**
   * These are point coordinates that were gathered up from the plot before a configuration change
    @property { Array of {cx:{Number}, cy:{Number}} }
  */
  transferredPointCoordinates: null,

  /**
   * Set to false if you have your own way of animating to a new state
    @property {Boolean}
  */
  allowTransferAnimation: true,

  /**
    @property { String }
  */
  changeKey: 'dataDidChange',

  /**
   * If defined, this function gets called after cases have been added or values changed, but only once,
   * and only after a sufficient time has elapsed.
   * @property { Function }
   */
    cleanupFunc: null,

  /**
   * Wait at least this long before calling cleanupFunc
   * @property {Number} in milliseconds
   */
    cleanupDelay: 300,

  /**
   * While waiting to do a cleanup, call installCleanup at this interval to check to see if now is the time.
   * @property {Number} in milliseconds
   */
    cleanupInterval: 300,

  /**
   * Are we already awaiting an opportunity to cleanup?
   * @property {Boolean}
   */
    waitingForCleanup: false,

  /**
   * Time at which the last call for a cleanup occurred.
   * @property {Number}
   */
    timeOfLastCleanupCall: null,

  /**
   * Used to schedule cleanup. We hold onto it so we can invalidate it during destroy.
   * @property {SC.Timer}
   */
    cleanupTimer: null,

  installCleanup: function() {
    if( !this.cleanupFunc)
      return;

    var checkTime = function() {
      var tNow = Date.now();
      if( tNow - this.timeOfLastCleanupCall > this.cleanupDelay) {
        this.cleanupFunc();
        this.waitingForCleanup = false;
        this.cleanupTimer = null;
      }
      else {
        this.cleanupTimer = SC.Timer.schedule( { target: this, action: checkTime, interval: this.cleanupInterval });
      }
    };

    this.timeOfLastCleanupCall = Date.now();
    if( !this.waitingForCleanup) {
      this.waitingForCleanup = true;
      this.cleanupTimer = SC.Timer.schedule( { target: this, action: checkTime, interval: this.cleanupInterval });
    }
  },
  
  _areAdornmentsInitialized: false,

  /** @property {DG.PlottedCountAdornment} */
  plottedCountAdorn: null,

  /**
   * @property { DG.DataTip } for displaying attributes of whatever is underneath the mouse
   */
  _dataTip: null,

  /**
   * @property { Number } current point radius of cases being displayed.
   */
  _pointRadius: DG.PlotUtilities.kPointRadiusMax,
  
  /**
    True if rendered content is up-to-date, false if redraw is required.
    @property { Boolean }
   */
  _isRenderingValid: false,

  blankDropHint: 'DG.GraphView.dropInPlot',

  /**
   * Refers specifically to a legend attribute
   * @property {DG.Attribute}
   */
  plottedAttribute: function() {
    return this.getPath('model.dataConfiguration.legendAttributeDescription.attribute');
  }.property(),

  /**
    Prepare dependencies.
  */
  init: function() {
    sc_super();
    this._plottedElements = [];
    this._dataTip = DG.DataTip.create( { plotView: this });
  },

  /**
    Prepare dependencies.
  */
  modelDidChange: function( iSource, iKey) {
    this.dataConfigurationDidChange( iSource, iKey);

    // We want dataDidChange to be called when cases change
    this.addObserver('model.dataConfiguration.cases', this, 'dataDidChange');
    this.addObserver('model.dataConfiguration.hiddenCases', this, 'dataDidChange');
    this.addObserver('model.dataConfiguration.dataContext.selectionChangeCount', this, 'selectionChangeCount');

    this._isRenderingValid = false;
  }.observes('model'),

  /**
    Here we set up observers so that if the length of a data array is changed, dataDidChange
    is called, and if a case value changes (which changes its 'revision' property), dataRangeDidChange
    gets called.
  */
  dataConfigurationDidChange: function( iSource, iKey ) {
    // initialize point radius when attaching new set of cases, since dataDidChange() is not called then.
    this._pointRadius = this.calcPointRadius();

    this._isRenderingValid = false;
  },

  destroy: function() {
    this.removePlottedElements();
    this.removeObserver('model.dataConfiguration.cases', this, 'dataDidChange');
    this.removeObserver('model.dataConfiguration.hiddenCases', this, 'dataDidChange');
    this.removeObserver('model.dataConfiguration.dataContext.selectionChangeCount', this, 'selectionChangeCount');
    this._dataTip = null;
    if( this.cleanupTimer)
      this.cleanupTimer.invalidate();
    this.model = null;

    sc_super();
  },

  /**
    Respond to DataContext notifications from the PlotModel.
   */
  handleDataContextNotification: function( iSource, iKey) {
    var plotModel = this.get('model'),
        lastChange = plotModel && plotModel.get('lastChange'),
        operation = lastChange && lastChange.operation;
    
    // No response necessary if plot isn't affected.
    if( !plotModel || !plotModel.isAffectedByChange( lastChange))
      return;

    switch( operation) {
      case 'createCase':
      case 'createCases':
      case 'deleteCases':
        // usually dataDidChange, but derived classes can override
        var changeKey = this.get('changeKey');
        if( !SC.empty( changeKey)) {
          var handler = this[ changeKey];
          if( handler)
            handler.call( this, iKey);
        }
        break;
      case 'updateCases':
      case 'createAttributes':
      case 'updateAttributes':
        this.dataRangeDidChange( this, 'revision', this, lastChange.indices);
        break;
      case 'selectCases':
        this.selectionDidChange();
        break;
    }
  }.observes('.model.lastChange'),
  
  /**
    Observer function triggered when the plot configuration changes.
   */
  plotConfigurationDidChange: function() {
    this._isRenderingValid = false;
    this.displayDidChange();
  }.observes('.model.plotConfiguration'),
  
  /**
    Observer function called when the axis bounds change.
   */
  axisBoundsDidChange: function() {
    this._isRenderingValid = false;
    this.displayDidChange();
  }.observes('.model.axisBounds'),
  
  /**
    Observer function called when the view/paper is resized.
   */
  paperSizeDidChange: function() {
    this._isRenderingValid = false;
    this.displayDidChange();
  }.observes('paperSize'),

  selectionChangeCount: function() {
    this._elementOrderIsValid = false;
  },

  /**
    Give subclasses a chance to do whatever they need to do before we recompute all the
    point coordinates.
  */
  prepareToResetCoordinates: function() {
  },
  
  /**
    Utility function to be called when the coordinates of all circles must be updated.
    New circle elements will be created if necessary, but this method never removes
    elements so it cannot be used to handle deletion of cases.
   */
  refreshCoordinates: function() {
    if( this.get('paper'))
      this.drawData();
  },

  /**
    Plots that show data as points should be able to use this as is. Others will probably
    override.
  */
  dataDidChange: function() {
    if( SC.none( this.get('paper')))
      return;   // not ready to create elements yet
    var this_ = this,
        tCases = this.getPath('model.cases'),
        tRC = this.createRenderContext(),
        tDataLength = tCases && tCases.length,
        tPlotElementLength = this._plottedElements.length,
        tWantNewPointRadius = (this._pointRadius !== this.calcPointRadius()),
        tIndex;
    this._elementOrderIsValid = false;
    // update the point radius before creating or updating plotted elements
    if( tWantNewPointRadius ) {
      this._pointRadius = this.calcPointRadius();
      this._isRenderingValid = false;
      this.displayDidChange();
    }
    // update adornments when cases added or removed
    // note: don't rely on tDataLength != tPlotElementLength test for this
    this.updateAdornments();

    // for any new cases
    if( tDataLength > tPlotElementLength) {
      if( tWantNewPointRadius ) {
        // update the point radius for existing plotted elements
        this.prepareToResetCoordinates();
        for( tIndex = 0; tIndex < tPlotElementLength; tIndex++) {
          this.setCircleCoordinate( tRC, tCases[ tIndex], tIndex);
        }
      }
      // create plot elements for added cases
      for( tIndex = tPlotElementLength; tIndex < tDataLength; tIndex++) {
        this.createCircle( tCases[ tIndex], tIndex, this.animationIsAllowable());
        this.setCircleCoordinate( tRC, tCases[ tIndex], tIndex);
      }
      this._isRenderingValid = false;
    }
    // Get rid of plot elements for removed cases and update all coordinates
    if( tDataLength < tPlotElementLength) {
      for( tIndex = tDataLength; tIndex < tPlotElementLength; tIndex++) {
        // It can happen during closing of a document that the elements no longer exist, so we have to test
        if( !SC.none( this._plottedElements[ tIndex])) {
          this._plottedElements[ tIndex].stop();
          this._plottedElements[ tIndex].remove();
        }
      }
      this._plottedElements.length = tDataLength;

      this.prepareToResetCoordinates();
      tCases.forEach( function( iCase, iIndex) {
          this_.setCircleCoordinate( tRC, tCases[ iIndex], iIndex);
        });
      this._isRenderingValid = false;
      this.displayDidChange();
    }

    // There might be some cleanup that has to be done after a suitable waiting time
    this.installCleanup();
  },

  /**
    Subclasses should call sc_super()
  */
  dataRangeDidChange: function( iSource, iQuestion, iKey, iChanges) {
    this.updateAdornments();
    this._dataTip.handleChanges( iChanges);
  },

  /** Invalidate and update adornments shared by all plot types */
  updateAdornments: function() {
    if( this.plottedCountAdorn ) {  // update counts if present
      this.plottedCountAdorn.get('model').setComputingNeeded();
      this.plottedCountAdorn.updateToModel();
    }
  },
  
  rescaleOnParentCaseCompletion: function( iCases) {
    var caseCount = iCases && iCases.length,
        lastCase = caseCount && iCases[ caseCount - 1],
        lastCaseID = lastCase && lastCase.get('id'),
        openParentCaseID = this.getPath('model.openParentCaseID');
    if( !SC.none( lastCaseID) && (lastCaseID === openParentCaseID)) {
      var plot = this.get('model');
      if( plot && plot.rescaleAxesFromData) {
        plot.rescaleAxesFromData( false /* don't allow scale shrinkage */,
                                  false /* don't animate points */ );
      }
      this.setPath('model.openParentCaseID', null);
    }
  },

  /**
   * We determine if sufficient time has passed since the last call to allow (expensive) animation
   * to occur in createCircle.
   * Note that this side effects _createAnimationOn and _timeLastCreate.
   * @return {Boolean}
   */
 animationIsAllowable: function() {
    var tNow = Date.now(),
        tDelta = tNow - this._timeLastCreate;
    if( tDelta < DG.PlotUtilities.kDefaultAnimationTime) {
      this._createAnimationOn = false;
    }
    else if(tNow - this._timeLastCreate > this._kAllowableInterval)
      this._createAnimationOn = true;
    this._timeLastCreate = tNow;
    return this._createAnimationOn;
  },

  /**
   * If we have paper, we're ready to draw.
   * @return {Boolean}
   */
  readyToDraw: function() {
    return !SC.none( this.get('paper'));
  },
  
  /**
    Initialize the adornments from the set of adornment models.
   */
  initializeAdornments: function() {
    if( this.plottedCountAdorn && this.plottedCountAdorn.wantVisible())
      this.plottedCountAdorn.updateToModel();

    var model = this.get('model'),
        adornmentModels = model && model._adornmentModels;
    DG.ObjectMap.forEach( adornmentModels,
                          function( iAdornmentKey, iAdornmentModel) {
                            model.notifyPropertyChange( iAdornmentKey);
                          });

    this._areAdornmentsInitialized = true;
  },

  /**
   * Properties having to do with determining whether createCircle animation should be turned on
   */

  /**
   * The last time we called createCircle. If sufficient time has elapsed, we can turn on animation
   */
  _timeLastCreate: null,

  /**
   * Controls whether we allow createCircle to do an animation. Turned off when animations are overlapping.
   * Turned back on when sufficient time has elapsed.
   */
  _createAnimationOn: true,

  _kAllowableInterval: 1000, // milliseconds

  /**
  */
  animationStateDidChange: function() {
    if( this.getPath('model.isAnimating'))
      this.enterAnimationState();
    else
      this.leaveAnimationState();
  }.observes('.model.isAnimating'),

  /**
    Subclasses should override in order to animate plotted elements to new coordinates.
    These can be computed now, but should not be computed again until we leave animation state.
  */
  enterAnimationState: function() {
  },

  /**
    Subclasses should override in order do any cleanup necessary when an animation ends.
  */
  leaveAnimationState: function() {
  },

  // Private properties
  _plottedElements: null, // Kept in the same order as the data
  _mustCreatePlottedElements: true,
  _elementOrderIsValid: false,  // Set to false when selection changes
  
  /**
    If we're still valid, skip the whole render process.
   */
  shouldDraw: function() {
    return !this._isRenderingValid;
  },

  /**
   *
   * @param iIndex  Index of this plot view in array of plotviews owned by graph
   * @param iNumPlots Number of plotviews owned by graph
   */
  doDraw: function doDraw( iIndex, iNumPlots) {
    this.set('plotIndex', iIndex);
    this.set('numPlots', iNumPlots);
    if( !this._areAdornmentsInitialized)
      this.initializeAdornments();
  },

  /**
    Subclasses will override
  */
  drawData: function drawData() {
    if( !this.get('paper')) return; // abort if not yet ready to draw

    var this_ = this,
        tCases = this.getPath('model.cases'),
        tRC = this.createRenderContext(),
        tPlotElementLength = this._plottedElements.length,
        tIndex;

    if( SC.none( tCases))
      return; // No cases, nothing to draw

    // remove invalid case elements
    if( this._mustCreatePlottedElements) {
      this._plottedElements.forEach( function( iElement) {
          iElement.remove(); // remove from plot
        });
      tPlotElementLength = this._plottedElements.length = 0; // remove from array
      this._mustCreatePlottedElements = false;
      tRC.casesAdded = true; // ensure that cases are re-created below
    }

    // remove extra case elements
    if( tRC.casesRemoved ) {
      for( tIndex = tCases.length; tIndex < tPlotElementLength; tIndex++) {
        this._plottedElements[ tIndex].remove(); // remove from plot
      }
      if( tCases.length < tPlotElementLength ) { // remove from array
        tPlotElementLength = this._plottedElements.length = tCases.length;
      }
    }

    // update the cached circle size (dependent on the number of cases)
    if( tRC.casesAdded ) {
      this._pointRadius = this.calcPointRadius();
    }

    // If we're going to be adding cases, then we'll want to call updateSelection because
    // these new cases may be selected. Setting _elementOrderIsValid to false accomplishes this.
    if( tPlotElementLength < tCases.length)
      this_._elementOrderIsValid = false;

    // update case elements, adding them if necessary
    if( tRC.updatedPositions || tRC.updatedColors || tRC.casesAdded ) {
      this.prepareToResetCoordinates();
      tCases.forEach( function( iCase, iIndex) {
                        if( iIndex >= tPlotElementLength )
                          this_.createCircle( tCases[ iIndex], iIndex, true);
                        this_.setCircleCoordinate( tRC, tCases[ iIndex], iIndex);
                      });
    }
    DG.assert( this._plottedElements.length === tCases.length );
  },

  /**
    Set our _isRenderingValid flag when rendering is complete.
   */
  didDraw: function() {
    sc_super();
    this._isRenderingValid = true;
  },

  /**

  */
  selectionDidChange: function() {
    this.updateSelection();
    this._isRenderingValid = false;
  }.observes('selection'),

  /**
    Get case icon CSS class; extended objects can override for different look to elements.
    @param {boolean} iIsSelected Is the case selected?
    @param {boolean} iIsColored Is the case one whose color is given by a legend attribute (defaults to false)
    @returns {string}
  */
  getPlottedElementClass: function( iIsSelected, iIsColored ) {
    return( iIsColored ?
                (iIsSelected ? DG.PlotUtilities.kSelectedColoredDotClassName : DG.PlotUtilities.kColoredDotClassName ) :
                (iIsSelected ? DG.PlotUtilities.kSelectedDotClassName : DG.PlotUtilities.kDotClassName ));
  },

  /**
    For each case, set the fill of its corresponding point to show its selection state
  */
  updateSelection: function() {
    if( !this.get('model'))
      return;   // because this can get called by pending changes after I have been destroyed
    if( this._elementOrderIsValid)
      return;

    var this_ = this,
      tPlottedElements = this._plottedElements,
      tSelectedElements = [],
      tElementsInFront = this.get('elementsInFront' ),
      // Use long path for selection because we can call this before bindings have happened
      // There must be a better way?
      tSelection = this.getPath('model.dataConfiguration.collectionClient.casesController.selection'),
      // Points are 'colored' if there is a legend or if there is more than one plot
      tIsColored = (this.getPath('model.dataConfiguration.legendAttributeDescription.attribute') !==
                                          DG.Analysis.kNullAttribute) ||
                      (this.get('numPlots') > 1),
      tDataTip = this.get('_dataTip');

    this.get('model').forEachCaseDo( function( iCase, iIndex) {
        var tIsSelected, tElement;
        // We sometimes get here with fewer plotted elements than cases,
        // perhaps when newly added cases don't have plottable values.
            if( (iIndex < tPlottedElements.length) && tPlottedElements[ iIndex]) {
          tElement = tPlottedElements[ iIndex];
          tIsSelected = tSelection.containsObject( iCase);
          tElement.removeClass( DG.PlotUtilities.kDotClassPattern );
          tElement.addClass(    this_.getPlottedElementClass( tIsSelected, tIsColored ));
          if( tIsSelected) {
            tSelectedElements.push (tElement);
          }
        // Let's _not_ restore the order of non-selected elements. This solves the problem in multi-attribute
        // plots of getting points of non-first plots to the front and it may be that it helps users
        // massage the order of points in ways they want.
//          else
//            // Here we restore order of non-selected elements
//            tElement.toFront();
        }
      });
    // The selected elements need to be in front so we can see them.
    tSelectedElements.forEach( function( iElement) {
        iElement.toFront();
      });

    // The plot may have some elements that need to be kept in front of points
    if( SC.isArray(tElementsInFront)) {
      this.get('elementsInFront' ).forEach( function( iElement) {
        iElement.toFront();
      });
    }

    // If there is a data tip, it goes in front of everything else
    if( !SC.none( tDataTip))
      tDataTip.toFront();
    this._elementOrderIsValid = true;
  },

  /**
    @param {{ x: {Number}, y: {Number}, width: {Number}, height: {Number} }}
    @return {Array} of DG.Case
  */
  getCasesForPointsInRect: function( iRect) {
    var tCases = this.getPath('model.cases' ),
        tSelected = [];

    this._plottedElements.forEach( function( iElement, iIndex) {
            if( DG.ViewUtilities.ptInRect( { x: iElement.attrs.cx, y: iElement.attrs.cy }, iRect))
              tSelected.push( tCases[ iIndex]);
          });
    return tSelected;
  },

  /**
    For use in transferring current point positions of this plot to a new plot about
    to take its place.
    @return {Array of {cx:{Number}, cy:{Number}}}
  */
  getPointPositionsInParentFrame: function() {
    var tFrame = this.get('frame');
    return this._plottedElements.map( function( iElement) {
        var radius =( iElement.isHidden() ? 0 : iElement.attr('r')); // use r:0 as proxy for hidden plot element
        return { cx: iElement.attr('cx') + tFrame.x, cy: iElement.attr('cy') + tFrame.y, r: radius, fill: iElement.attr('fill') };
      });
  },

  /**
    Called when this view is taking over from another one in order to animate points from their
    previous position to their new position. Handles 3 types of animations:
      (a) one-to-many animation for moving from parent to corresponding child case(s)
      (b) many-to-one animation for moving from child case(s) to corresponding parent case
      (c) one-to-one animation for moving within a collection (this is default).
  */
  animateFromTransferredPoints: function() {
    var this_ = this,
        tElements = this._plottedElements,
        tCases = this.getPath('model.cases'),
        tRC = this.createRenderContext(),
        tFrame = this.get('frame'),
        tOldPointAttrs = this.get('transferredPointCoordinates'),
        tNewPointAttrs = [], // used if many-to-one animation
        tNewToOldCaseMap = [],
        tOldToNewCaseMap = [];

    function caseLocationSimple( iIndex ) {
      // assume a 1 to 1 correspondence of the current case indices to the new cases
      return tOldPointAttrs[ iIndex];
    }
    function caseLocationViaMap( iIndex ) {
      // use our case index map to go from current case index to previous case index
      return tOldPointAttrs[ tNewToOldCaseMap [iIndex]];
    }

    this._getTransferredPointsToCasesMap( tNewToOldCaseMap, tOldToNewCaseMap );
    var hasElementMap = tNewToOldCaseMap.length > 0,
        hasVanishingElements = tOldToNewCaseMap.length > 0,
        getCaseCurrentLocation = ( hasElementMap ? caseLocationViaMap : caseLocationSimple ),
        tNumPointsToAnimate = ( hasElementMap ? tNewToOldCaseMap.length : tOldPointAttrs.length );

    this._elementOrderIsValid = false;
    DG.sounds.playMixup();
    this.setPath('model.isAnimating', true); // So plot's standard draw won't wipe out animation
    this.prepareToResetCoordinates();
    this.removePlottedElements();  // remove old circles
    tOldPointAttrs.forEach( function( iPoint, iIndex ) {
        // adjust old coordinates from parent frame to this view
        iPoint.cx -= tFrame.x;
        iPoint.cy -= tFrame.y;
      });
    tCases.forEach( function( iCase, iIndex) {
        // create new circles, animating from old coordinates where possible
        var tPt = getCaseCurrentLocation( iIndex ),
            tAnimate = false,
            tCallBack;
        this_.createCircle( iCase, iIndex, false);
        if( !SC.none( tPt)) {
          tElements[ iIndex].attr( tPt);
          tAnimate = true;
          // TODO: Bill, There's likely a bug relating to knowing whether
          // we are looking at the last animating point or not.
          if( iIndex === tNumPointsToAnimate - 1) {
            tCallBack = function() {
              this_.setPath('model.isAnimating', false);  // Allow standard draw
            };
          }
        }
        tPt = this_.setCircleCoordinate( tRC, iCase, iIndex, tAnimate, tCallBack);
        if( hasVanishingElements ) {
          tNewPointAttrs.push( tPt );
        }
      });
    if( hasVanishingElements ){
      // create a vanishing element for each old point that needs one (used if many-to-one animation)
      tOldPointAttrs.forEach( function( iOldAttrs, iIndex ) {
        var tNewIndex = tOldToNewCaseMap [ iIndex ],
            tNewAttrs = tNewPointAttrs[ tNewIndex ];
        if( SC.none(tNewIndex) || SC.none( tNewAttrs ) || (iOldAttrs.r===0))
          return; // no vanishing element, if (1) element persists or (2) new circle hidden or (3) old circle hidden
        this_.vanishPlottedElement( iOldAttrs, tNewAttrs );
      });
    }
    this._mustCreatePlottedElements = false;
    this.set('transferredPointCoordinates', null);
  },

  /**
   * Get a map from the current (new) case index to the index of the transferred point coordinates (old case),
   * and vise versa, if and only if we are animating from many cases to fewer cases, or vise versa.
   * Used to handle special case animations, when switching from parent to child collection or back,
   * where cases appear to get split or joined.  If neither array is populated, the caller can assume
   * a 1 to 1 case index mapping.
   * @param iNewToOldCaseMap {[]} empty Array, or array of index values, one for each (new) case.
   * @param iOldToNewCaseMap {[]} empty Array, or array of index values, one for each (old) transferred point coordinate.
   */
  _getTransferredPointsToCasesMap: function( iNewToOldCaseMap, iOldToNewCaseMap ) {
    var tTransferredPoints = this.get('transferredPointCoordinates'),
        tCases = this.getPath('model.cases'),
        tCollectionClient = this.getPath('model.collectionClient'),
        tChildCollectionClient = this.getPath('model.dataContext.childCollection'),
        tParentCollectionClient = this.getPath('model.dataContext.parentCollection'),
        tParentNumCases = tParentCollectionClient ? tParentCollectionClient.getCaseCount() : 0,
        tChildNumCases = tChildCollectionClient ? tChildCollectionClient.getCaseCount() : 0,
        tNewNumCases = tCases.length,
        tOldNumCases = tTransferredPoints.length;

    function isParentToChildTransformation() {
      // TODO this function needs improvement.  Returns true even if not changing collections, if number of cases happens to match parent-to-child transform.
      return( tParentCollectionClient &&
          (tParentNumCases===tOldNumCases) && // TODO: fix this bad assumption, better to check collection id saved with old cases instead
          ( tCollectionClient && tCollectionClient.isDescendantOf( tParentCollectionClient )));
    }
    function isChildToParentTransformation() {
      // TODO this function needs improvement.  Returns true even if not changing collections, if number of cases happens to match child-to-parent transform.
      return( tChildCollectionClient &&
          (tChildNumCases===tOldNumCases) && // TODO: fix this bad assumption, better to check collection id saved with old cases instead
          ( tCollectionClient && tCollectionClient.isAncestorOf( tChildCollectionClient )));
    }
    function getParentCaseNumChildren( iCaseIndex ) {
      // return the number of children of the given case in the parent collection
      var tParentCase = tParentCollectionClient.getCaseAt( iCaseIndex),
          tParentCaseChildren = tParentCase && tParentCase.get('children');
      return( tParentCaseChildren ? tParentCaseChildren.length() : 0 );
    }
    function getParentToChildTransformation( iNewToOld, iOldToNew ) {
      // fill iNewToOld[] with child case index to parent case index mapping
      // because typically many child cases will want location of the same shared parent case for animation
      var tOldIndex, tNewIndex, tNumChildren;

      for( tOldIndex = 0; tOldIndex<tOldNumCases; ++tOldIndex ) {
        tNumChildren = getParentCaseNumChildren( tOldIndex );
        for( tNewIndex=0; tNewIndex<tNumChildren; ++tNewIndex ) {
          iNewToOld.push( tOldIndex );
        }
      }
      if( ! DG.assert( iNewToOld.length === tNewNumCases, "Parent/Child case mismatch")) {
        iNewToOld.length = 0; // don't use this map if length error
      }
      DG.assert( iOldToNew.length === 0, "another parent/child case mismatch" );
    }
    function getChildToParentTransformation( iNewToOld, iOldToNew ) {
      // fill iNewToOld[] with parent case index to child case index mapping, using 'undefined' if no child case index
      // fill iOldToNew[] with child case index to parent case index mapping, for extra old cases that are vanishing
      // because typically each newly created parent case will start at location of 0th child case,
      // and typically all but 0th child case must animate to position of newly created parent case.
      var tOldIndex, tNewIndex, tNumChildren, tChild, tChildCaseIndex;

      tOldIndex = 0;
      for( tNewIndex = 0; tNewIndex<tNewNumCases; ++tNewIndex ) {
        tNumChildren = getParentCaseNumChildren( tNewIndex );
        iNewToOld.push( (tNumChildren > 0) ? tOldIndex : undefined ); // map each parent case to 1st child case if any, otherwise undefined
        for( tChild = 0; tChild<tNumChildren; ++tChild ) {
          // ignore the 0th child case (undefined mapping), give index of 1st+ child case which is to be vanished
          tChildCaseIndex =(( tChild===0 ) ? undefined : iNewToOld.length - 1 );
          iOldToNew.push( tChildCaseIndex );
          ++tOldIndex;
        }
      }
    }

    if( isParentToChildTransformation()) {
      getParentToChildTransformation( iNewToOldCaseMap, iOldToNewCaseMap );

    } else if( isChildToParentTransformation()) {
      getChildToParentTransformation( iNewToOldCaseMap, iOldToNewCaseMap );
    }
    //DG.log("DG.PlotView._getTransferredPointsToCasesMap() collection id=%@, NewToOldCaseMap %@", tCollectionClient.get('id'), iNewToOldCaseMap.toString());
    //DG.log("DG.PlotView._getTransferredPointsToCasesMap() collection id=%@, OldToNewCaseMap %@", tCollectionClient.get('id'), iOldToNewCaseMap.toString());
  },

  /**
   * Our model is signalling that it is about to change (DG.GraphModel.aboutToChangeConfiguration.set(true))
   * We use this opportunity to prepare for an animation.
   * See also handleConfigurationChange.
   */
  prepareForConfigurationChange: function() {
    this.set( 'cachedPointCoordinates', this.getPointPositionsInParentFrame());
  },

  /**
   * Our model is signalling that it has changed (DG.GraphModel.aboutToChangeConfiguration.set(false))
   * We use this opportunity to update views.
   * See also prepareForConfigurationChange.
   */
  handleConfigurationChange: function() {
    if( this.get('allowTransferAnimation')) {  // the configuration has changed
      this.set('transferredPointCoordinates', this.get('cachedPointCoordinates'));
    }
  },

  /**
   * Remove all plotted elements
   */
  removePlottedElements: function( iAnimate) {
    this._plottedElements.forEach( function(iElement) {
      iElement.stop();
      if( iAnimate) {
        iElement.animate( { 'fill-opacity': 0, 'stroke-opacity': 0}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
          function( e) {
            e.remove();
          });
      }
      else
        iElement.remove();
    });
    this._plottedElements.length = 0;
  },

  /**
    @property { Number }  Takes into account any borders the parent views may have
    Kludge alert! We're dealing with a SproutCore bug with computing frames in the presence
    of borders. [SCBUG]
  */
  drawWidth: function() {
    return this.get('frame').width - 2 * DG.ViewUtilities.kBorderWidth;
  }.property('frame'),

  /**
    @property { Number }  Takes into account any borders the parent views may have
    Kludge alert! We're dealing with a SproutCore bug with computing frames in the presence
    of borders. [SCBUG]
  */
  drawHeight: function() {
    return this.get('frame').height - 2 * DG.ViewUtilities.kBorderWidth;
  }.property('frame'),

  /**
    Graph controller observes this property to detect that a drag has taken place.
    @property{{collection:{DG.CollectionRecord}, attribute:{DG.Attribute}, text:{String},
              axisOrientation:{String} }}
  */
  dragData: null,

  /**
    Attempt to assign the given attribute to this axis.
    @param {SC.Drag} 'data' property contains 'collection', 'attribute', 'text' properties
    @param {SC.DRAG_LINK}
  */
  performDragOperation: function( iDragObject, iDragOp) {
    this.set('dragData', iDragObject.data);
    return SC.DRAG_LINK;
  },

  showDataTip: function( iElement, iIndex) {
    if( this._dataTip)
      this._dataTip.show( iElement, iIndex);
  },

  hideDataTip: function() {
    if( this._dataTip) {
      this._dataTip.hide();
    }
  },

  /**
    Subclasses may override. Note that deselection happens in startMarquee.
    @param {SC.Event}
  */
  handleBackgroundClick: function( iEvent) {
  },

  /**
   * Compute the desired point radius, which depends on the number of cases to be plotted.
   * Caller should compare to this._pointRadius (actual size of case circles already created)
   * @return {Number} radius of circle for each case, as a positive integer.
   */
  calcPointRadius: function() {
    // Search for a point size in [min-max] range, where the point size is a power of logbase that is close to the data length.
    // This step function avoids excessive plot resizing with every change in number of cases.
    var tDataConfiguration = this.getPath('model.dataConfiguration' ),
        tDataLength = tDataConfiguration ? tDataConfiguration.getCaseCount() : 0,
        tRadius = DG.PlotUtilities.kPointRadiusMax,
        tMinSize = DG.PlotUtilities.kPointRadiusMin,
        tPower = DG.PlotUtilities.kPointRadiusLogBase;
    // for loop is fast equivalent to radius = max( minSize, maxSize - floor( log( logBase, max( dataLength, 1 )))
    for( var i=tPower; i<=tDataLength; i=i*tPower ) {
      --tRadius;
      if( tRadius <= tMinSize ) break;
    }
    DG.assert( tRadius > 0 && Math.round(tRadius)===tRadius ); // must be positive integer
    //if( tRadius !== this._pointRadius ) DG.log("CalcPointRadius() r=" + tRadius + " for "+tDataLength +" cases.");
    return tRadius;
  },

  /**
   * Construct and return a new render context
   * used for setCircleCoordinate()
   * @return {*}
   */
  createRenderContext: function() {
    var tModel = this.get('model'),
        tLegendDesc = tModel.getPath('dataConfiguration.legendAttributeDescription' ),
        tPlotIndex = this.get('plotIndex');
    return {
      // render needs (set all to true for now, maybe later we can optimize by not doing all of them?)
      casesAdded: true,
      casesRemoved: true,
      updatedColors: true,
      updatedPositions: true,

      // cached render parameters common to all cases
      xAxisView: this.get('xAxisView'),
      yAxisView: this.get('yAxisView'),
      xVarID: tModel.get('xVarID'),
      yVarID: tModel.get('yVarID'),
      legendDesc: tLegendDesc,
      legendVarID: tLegendDesc && tLegendDesc.get('attributeID'),
      attrColor: SC.none( tPlotIndex) || (tPlotIndex === 0) ? null :
                 DG.ColorUtilities.calcAttributeColorFromIndex( this.get('plotIndex'), this.get('numPlots')),

      /**
       * Calculate the case color string
       * @param iCase {DG.Case}
       * @return {String}
       */
      calcCaseColorString: function( iCase ) {
        DG.assert( iCase );
        var tColorValue = iCase.getValue( this.legendVarID),
            tCaseColor = DG.ColorUtilities.calcCaseColor( tColorValue, this.legendDesc, this.attrColor );
        return tCaseColor.colorString;
      }
    };
  },

  /**
   * Show or hide the given plot element to match it's desired status.
   * @param {} iPlottedElement, a Rafael element
   * @param {Boolean} iWantHidden, true if we want the element to be hidden
   * @param {Boolean} optional parameter, true if we want to animate hiding
   * @return {Boolean} true if element is now shown.
   */
  showHidePlottedElement: function( iPlottedElement, iWantHidden /*, iAnimate*/ ) {
    var tIsHidden = iPlottedElement.isHidden();
    if( iWantHidden ) {
      if( !tIsHidden ) {
        // if want hidden but element is shown:
        // hide immediately (TODO: find a way to animate the hiding/showing),
        // and set the position/radius/color to a consistent state in case we animate after being shown.
        iPlottedElement.stop();
        iPlottedElement.hide();
        iPlottedElement.attr({cx: 0, cy: 0, r: 1, fill: DG.ColorUtilities.kMissingValueCaseColor.colorString });
      }
    } else if( tIsHidden ) {
      // if want shown but it is hidden: show (then let caller animate or jump to the new position).
      iPlottedElement.show();
      // Note that there is a possible problem in that if someone stops this animation, the element will
      // likely be invisible or only partially visible
      iPlottedElement.animate({ 'fill-opacity': DG.PlotUtilities.kDefaultPointOpacity, 'stroke-opacity': 1},
                                DG.PlotUtilities.kDefaultAnimationTime, '<>');
    }
    return !iWantHidden;
  },

  /**
   * Update the position of the plotted element.
   * Assumes but does not require that the element is visible (see showHidePlottedElement())
   * @param iPlottedElement {}
   * @param iAnimate {Boolean}
   * @param iViewX {Number}
   * @param iViewY {Number}
   * @param iRadius {Number}
   * @param iColorString {String}
   */
  updatePlottedElement: function( iPlottedElement, iViewX, iViewY, iRadius, iColorString, iAnimate, iCallback ) {
    var tAttrs = {cx: iViewX, cy: iViewY, r: iRadius},
        tColor = pv.color( iColorString ),
        tStrokeColor;
    if( tColor.rgb) {
      tStrokeColor = tColor.darker(DG.PlotUtilities.kStrokeDarkerFactor ).color;
    }
    else {  // tColor would not have been able to 'darker'
      // Kludge!
      // Assume iColorString is missing leading '#'. This was encountered through an improper color map
      // created by Analytics. Still could fail of course.
      tStrokeColor = pv.color('#' + iColorString).darker(DG.PlotUtilities.kStrokeDarkerFactor ).color;
    }

    // Any prior positional animation is no longer valid
    if( iPlottedElement.posAnimation) {
      iPlottedElement.stop( iPlottedElement.posAnimation);
      iPlottedElement.posAnimation = null;
    }

    // Raphael animation completion function, called when animation is complete
    // with "this" set to the Raphael object.
    function completeAnimation() {
      this.posAnimation = null;
      if(iCallback)
        iCallback();
    }
    
    if( iAnimate) {
      // note: animating color does not look good (interaction with other plot changes), so update immediately
      iPlottedElement.attr( {fill: iColorString, stroke: tStrokeColor });
      
      // Hover animation changes the transform which affects positioning.
      // If we're trying to animate position, we simply complete the hover animation.
      if( iPlottedElement.hoverAnimation) {
        iPlottedElement.stop( iPlottedElement.hoverAnimation);
        iPlottedElement.hoverAnimation = null;
        iPlottedElement.transform('');
      }
      
      // Set up the position animation and start the animation
      iPlottedElement.posAnimation = Raphael.animation( tAttrs, DG.PlotUtilities.kDefaultAnimationTime,
                                                        '<>', completeAnimation);
      iPlottedElement.animate( iPlottedElement.posAnimation);
    } else {
      // Counteract any transform effect, e.g. from a hover animation
      var currTransform = iPlottedElement.transform(),
          currTransformIsIdentity = SC.empty( currTransform) || (currTransform.toString() === 's1');
      if( !currTransformIsIdentity)
        iPlottedElement.transform( '');

      // Make the attribute changes we came here to make
      tAttrs.fill = iColorString;
      tAttrs.stroke = tStrokeColor;
      iPlottedElement.attr( tAttrs);
      // Some points got made but never had a chance to finish their creation animation
//      if( iPlottedElement.attr('stroke-opacity') < 1 ) {
//        iPlottedElement.animate( {'fill-opacity': DG.PlotUtilities.kDefaultPointOpacity, 'stroke-opacity': 1 },
//                                DG.PlotUtilities.kDefaultAnimationTime, '<>');
//      }

      // Restore the transform to its original value
      if( !currTransformIsIdentity)
        iPlottedElement.transform( currTransform);
    }
  },

  /**
   * Add an element to our list of temporary, about-to-vanish plot elements,
   * so that we can animate it before it disappears.  Note that this animated
   * element looks like a normal plotted element but is underneath the plotted element (in the z-axis),
   * and will be deleted at the next rendering.
   * Note: Here we assume the vanishing element is visible throughout the animation period,
   * so caller should not vanish a case if missing and therefore hidden in the new or old plot.
   * @param iOldAttrs {cx,cy,r,fill} position and other attributes of old (deleted) plotted element
   * @param iNewAttrs {cx,cy} pposition and optionally other attributes of new plotted element we apparently are merging with
   */
  vanishPlottedElement: function( iOldAttrs, iNewAttrs ) {

    function completeVanishAnimation() {
      this.hide(); // hide this element until it is deleted from elementsToClear list (at next rendering).
    }

    // create circle animation
    var tCircle = this.get('paper').circle( -100, -100, this._pointRadius ) // match createCircle()
            .toBack() // behind existing elements
            .addClass( DG.PlotUtilities.kColoredDotClassName) // match createCircle
            .attr( iOldAttrs) // starting position to match updatePlottedElement()
            .animate( iNewAttrs, DG.PlotUtilities.kDefaultAnimationTime, '<>', completeVanishAnimation );

    // add it to list of elements be erased at next rendering (ideally after animation is done)
    this.get('elementsToClear').push( tCircle );
  },

  /**
   * This gets called when the point size changes but nothing else, as for example, when we connect points
   * in a scatterplot with lines and want the point size to decrease.
   */
  updatePointSize: function() {
    this._pointRadius = this.calcPointRadius();
    var tAttr = { r: this._pointRadius };
    this._plottedElements.forEach( function( iElement) {
      iElement.animate( tAttr, DG.PlotUtilities.kDefaultAnimationTime, '<>');
    });
  },

  /**
    Create or destroy the matching adornment when our model creates/destroys the DG.PlottedCountModel.
  */
  plottedCountChanged: function() {
    var tCountModel = this.getPath('model.plottedCount');
    // Rather than attempt to reconnect an existing adornment, we throw out the old and rebuild.
    if( this.plottedCountAdorn) {
      this.plottedCountAdorn.destroy();
      this.plottedCountAdorn = null;
    }
    if( tCountModel && this.get('paper') ) {
      this.plottedCountAdorn = DG.PlottedCountAdornment.create( {
             parentView: this, valueAxisView: this.get('primaryAxisView'),
             model: tCountModel, paper: this.get('paper') });
      this.plottedCountAdorn.updateToModel();
    }
  }.observes('.model.plottedCount'),

  didCreateLayer: function() {
    this.plottedCountChanged(); // create count adornment to match model, now that we have paper
  }

});

