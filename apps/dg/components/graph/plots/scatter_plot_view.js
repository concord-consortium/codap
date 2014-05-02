// ==========================================================================
//                        DG.ScatterPlotView
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

sc_require('components/graph/plots/plot_view');

/** @class DG.ScatterPlotView - A plot of dots placed according to numeric values

  @extends DG.PlotView
*/
DG.ScatterPlotView = DG.PlotView.extend(
/** @scope DG.ScatterPlotView.prototype */ 
{
  displayProperties: ['xAxisView.model.lowerBound', 'xAxisView.model.upperBound',
                      'yAxisView.model.lowerBound', 'yAxisView.model.upperBound',
                      'xAxisView.pixelMin', 'xAxisView.pixelMax',
                      'yAxisView.pixelMin', 'yAxisView.pixelMax',
                      'model.areSquaresVisible', 'model.squares'],
  
  autoDestroyProperties: ['movableLineAdorn','functionAdorn','connectingLineAdorn'],


  /** @property {DG.ConnectingLineAdornment} */
  connectingLineAdorn: null,

  /**
    Required for some adornments like DG.PlottedCountAdornment.
    @property{DG.CellLinearAxisView}
   */
  primaryAxisView: function() {
    return this.get('xAxisView');
  }.property('xAxisView'),

  /**
    Required for some adornments like DG.PlottedCountAdornment.
    @property{DG.CellLinearAxisView}
   */
  secondaryAxisView: function() {
    return this.get('yAxisView');
  }.property('yAxisView'),

  /**
  @property {DG.MovableLineAdornment}
  */
  movableLineAdorn: null,
  
  /**
  @property {DG.FormulaTextEditView}
  */
  functionEditView: null,
  
  /**
  @property {DG.PlottedFunctionAdornment}
  */
  functionAdorn: null,

  /**
   * @property {Array of Element}
   */
  _squares: null,
  
  /**
   * If defined, this function gets called after cases have been added or values changed, but only once,
   * and only after a sufficient time has elapsed.
   * @property { Function }
   */
  cleanupFunc: function() {
    var tAdorn = this.get('connectingLineAdorn');
    if( tAdorn)
      tAdorn.updateToModel();
  },

  /**
    Destruction method
  */
  destroy: function() {
    var model = this.get('model');
    if( model) model.removeObserver('squares', this, 'squaresDidChange');
    if( model) model.removeObserver('areSquaresVisible', this, 'squaresDidChange');

    sc_super();
  },
  
  /**
    Observation method called when the model changes.
    Hooks up necessary observers.
   */
  modelDidChange: function() {
    sc_super();
    
    var model = this.get('model');
    if( model) {
      model.addObserver('squares', this, 'squaresDidChange');
      model.addObserver('areSquaresVisible', this, 'squaresDidChange');
      this.connectingLineChanged(); // Synch up the connecting line
    }
  },

  /**
   Observation function called when data values added/removed.
   */
  dataDidChange: function() {
    sc_super();

    // update connecting lines
    if( this.connectingLineAdorn ) {
      this.connectingLineAdorn.invalidateModel();
    }
  },
  
  /**
    Observation function called when data values change.
    Method name is legacy artifact of SproutCore range observer implementation.
   */
  dataRangeDidChange: function( iSource, iQuestion, iKey, iChanges) {
    var this_ = this,
        tPlotElementLength = this._plottedElements.length,
        tCases = this.getPath('model.cases'),
        tRC = this.createRenderContext(),
        // iChanges can be a single index or an array of indices
        tChanges = (SC.typeOf( iChanges) === SC.T_NUMBER ? [ iChanges ] : iChanges);
    DG.assert( tChanges);
    tChanges.forEach( function( iIndex) {
      if( iIndex >= tPlotElementLength)
        this_.callCreateCircle( tCases[ iIndex], iIndex, this_._createAnimationOn);
      this_.setCircleCoordinate( tRC, tCases[ iIndex], iIndex );
    });

    // If we are displaying squares then we invalidate the display so squares will be updated
    if( this.getPath('model.areSquaresVisible'))
      this.squaresDidChange();

    // update connecting lines
    if( this.connectingLineAdorn ) {
      this.connectingLineAdorn.invalidateModel();
      this.connectingLineAdorn.updateToModel();
    }
    
    this.rescaleOnParentCaseCompletion( tCases);

    sc_super();
  },

  /**
   * If we're connecting points with lines, we override to make the points much less important than the lines
   */
  calcPointRadius: function() {
    var kMinRadius = 2,
        tRadius = sc_super();
    if( this.connectingLineAdorn && this.connectingLineAdorn.wantVisible())
      tRadius = Math.max( kMinRadius, tRadius - 4);
    return tRadius;
  },

   /**
   * Set the coordinates and other attributes of the case circle (a Rafael element in this._plottedElements).
   * @param iRC {} case-invariant Render Context
   * @param iCase {DG.Case} the case data
   * @param iIndex {number} index of case in collection
   * @param iAnimate {Boolean} (optional) want changes to be animated into place?
   * @returns {cx {Number},cy {Number}} final coordinates or null if not defined (hidden plot element)
   */
  setCircleCoordinate: function setCircleCoordinate( iRC, iCase, iIndex, iAnimate, iCallback ) {
    DG.assert( iRC && iRC.xAxisView );
    DG.assert( iCase );
    DG.assert( DG.MathUtilities.isInIntegerRange( iIndex, 0, this._plottedElements.length ));
    var tCircle = this._plottedElements[ iIndex],
        tCoordX = iRC.xAxisView.dataToCoordinate( iCase.getNumValue( iRC.xVarID )),
        tCoordY = iRC.yAxisView.dataToCoordinate( iCase.getNumValue( iRC.yVarID )),
        tIsMissingCase = !DG.isFinite(tCoordX) || !DG.isFinite(tCoordY);

    // show or hide if needed, then update if shown.
    if( this.showHidePlottedElement( tCircle, tIsMissingCase)) {
      this.updatePlottedElement( tCircle, tCoordX, tCoordY, this._pointRadius, iRC.calcCaseColorString( iCase ),
        iAnimate, iCallback);
      return { cx: tCoordX, cy: tCoordY, r: this._pointRadius };
    }
    return null;
  },
  
  createCircle: function( iDatum, iIndex, iAnimate) {
    var this_ = this;

    function changeCaseValues( iDeltaValues) {
      var tXVarID = this_.getPath('model.xVarID'),
          tYVarID = this_.getPath('model.yVarID'),
          tChange = {
            operation: 'updateCases',
            cases: [],
            attributeIDs: [ tXVarID, tYVarID],
            values: [ [], [] ]
          },
          tDataContext = this_.get('dataContext');
      if( !tDataContext) return;
      // Note that we have to get the cases dynamically rather than have a variable
      // declared in the closure. The array pointed to by such a closure is not updated!
      this_.getPath('model.casesController.selection').forEach( function( iCase) {
        tChange.cases.push( iCase);
        tChange.values[0].push( iCase.getNumValue( tXVarID) + iDeltaValues.x);
        tChange.values[1].push( iCase.getNumValue( tYVarID) + iDeltaValues.y);
      });
      tDataContext.applyChange( tChange);
    }
    
    function returnCaseValuesToStart( iCaseIndex, iStartWorldCoords) {
      var tCase = this_.getPath('model.cases')[ iCaseIndex],
          tXVarID = this_.getPath('model.xVarID'),
          tYVarID = this_.getPath('model.yVarID'),
          tDeltaX = tCase.getNumValue( tXVarID) - iStartWorldCoords.x,
          tDeltaY = tCase.getNumValue( tYVarID) - iStartWorldCoords.y;
      this_.get('model').animateSelectionBackToStart([ tXVarID, tYVarID], [ tDeltaX, tDeltaY]);
    }
    
    function completeHoverAnimation() {
      this.hoverAnimation = null;
    }

    var tIsDragging = false,
      kOpaque = 1,
      tInitialTransform = null,
      tCircle = this.get('paper').circle( -100, -100, this._pointRadius)
        .attr( { cursor: 'pointer' })
        .addClass( DG.PlotUtilities.kColoredDotClassName)
        .hover( function (event) {  // over
          if( !tIsDragging && SC.none( tInitialTransform)) {
                tInitialTransform = '';
                if( this.hoverAnimation)
                  this.stop( this.hoverAnimation);
                this.hoverAnimation = Raphael.animation( { opacity: kOpaque, transform: DG.PlotUtilities.kDataHoverTransform },
                                                            DG.PlotUtilities.kDataTipShowTime,
                                                            '<>', completeHoverAnimation);
                this.animate( this.hoverAnimation);
                this_.showDataTip( this, iIndex);
              }
            },
            function(event) { // out
              if( !tIsDragging) {
                if( this.hoverAnimation)
                  this.stop( this.hoverAnimation);
                this.hoverAnimation = Raphael.animation( { transform: tInitialTransform },
                                                            DG.PlotUtilities.kHighlightHideTime,
                                                            '<>', completeHoverAnimation);
                this.animate( this.hoverAnimation);
                tInitialTransform = null;
                this_.hideDataTip();
              }
            })
        .mousedown( function( iEvent) {
              this_.get('model').selectCaseByIndex( iIndex, iEvent.shiftKey || iEvent.metaKey);
            })
        .drag(function (dx, dy) { // continue
                SC.run( function() {
                  var tNewX = this_.get('xAxisView').coordinateToData( this.ox + dx),
                      tNewY = this_.get('yAxisView').coordinateToData( this.oy + dy),
                      tCase = this_.getPath('model.cases')[ this.index],
                      tOldX = tCase.getNumValue( this_.getPath('model.xVarID')),
                      tOldY = tCase.getNumValue( this_.getPath('model.yVarID')),
                      tCurrTransform = this.transform();
                  // Note that we ignore invalid values. Matt managed to convert some dragged values
                  // to NaNs during testing, which then couldn't animate back to their original
                  // positions. This should have the effect of leaving points that would otherwise
                  // have become NaNs in their last-known-good positions.
                  if( isFinite( tNewX) && isFinite( tNewY)) {
                    // Put the element into the initial transformed state so that changing case values
                    // will not be affected by the scaling in the current transform.
                    this.transform( tInitialTransform);
                    changeCaseValues( { x: tNewX - tOldX, y: tNewY - tOldY });
                    this.transform( tCurrTransform);
                  }
                }, this);
            },
            function (x, y) { // begin
              var tCase = this_.getPath('model.cases')[ this.index];
              tIsDragging = true;
              // Save the initial screen coordinates
              this.ox = this.attr("cx");
              this.oy = this.attr("cy");
              // Save the initial world coordinates
              this.wx = tCase.getNumValue( this_.getPath('model.xVarID'));
              this.wy = tCase.getNumValue( this_.getPath('model.yVarID'));
              this.animate({opacity: kOpaque }, DG.PlotUtilities.kDataTipShowTime, "bounce");
            },
            function() {  // end
              this.animate( {transform: tInitialTransform }, DG.PlotUtilities.kHighlightHideTime);
              tInitialTransform = null;
              returnCaseValuesToStart( this.index, { x: this.wx, y: this.wy });
              tIsDragging = false;
              this.ox = this.oy = this.wx = this.wy = undefined;
              this_.hideDataTip();
            });
    //if( iIndex % 100 === 0 ) DG.logTimer( iIndex===0, "CreateCircle index="+iIndex );
    tCircle.index = iIndex;
    tCircle.node.setAttribute('shape-rendering', 'geometric-precision');
    if( iAnimate)
      DG.PlotUtilities.doCreateCircleAnimation( tCircle);
    return tCircle;
  },
  
  /**
    We may clear and draw everything from scratch if required.
  */
  drawData: function drawData() {
    if( this.getPath('model.isAnimating'))
      return; // Points are animating to new position

    if( !SC.none( this.get('transferredPointCoordinates'))) {
      this.animateFromTransferredPoints();
      return;
    }

    // base drawData() creates and updates points,
    // removes any extra points, to sync case circles with cases.
    sc_super();
  },
  
  /**
    Generate the svg needed to display the plot
  */
  doDraw: function doDraw() {
    var this_ = this;
    
    function drawSquares() {
      var tVisible = this_.getPath('model.areSquaresVisible' ),
          tAnimateRemove = !tVisible && this_._squares && (this_._squares.length > 0),
          tAnimateShow = tVisible && (!this_._squares || (this_._squares.length === 0));
      if( !this_._squares)
        this_._squares = [];
      this_._squares.forEach( function( iElement) {
        if( tAnimateRemove) {
          iElement.animate( { 'stroke-opacity': 0 }, DG.PlotUtilities.kDefaultAnimationTime, '<>',
                            function() {
                              iElement.remove();
                            });
        }
        else
          iElement.remove();
      });
      this_._squares = [];
      if( !tVisible)
        return;
      var tCases = this_.getPath('model.cases'),
          tXVarID = this_.getPath('model.xVarID'),
          tYVarID = this_.getPath('model.yVarID'),
          tXAxisView = this_.get('xAxisView'),
          tYAxisView = this_.get('yAxisView' ),
          tPaper = this_.get('paper');
      if( this_.getPath('model.isMovableLineVisible')) {
        var tSlope = this_.getPath('model.movableLine.slope'),
            tIntercept = this_.getPath('model.movableLine.intercept');
        tCases.forEach( function( iCase) {
          var tWorldX = iCase.getNumValue( tXVarID),
              tWorldY = iCase.getNumValue( tYVarID),
              tPtX = tXAxisView.dataToCoordinate( tWorldX),
              tPtY = tYAxisView.dataToCoordinate( tWorldY),
              tLineY = tYAxisView.dataToCoordinate( tSlope * tWorldX + tIntercept),
              tLineX = tPtX + tPtY - tLineY,
              tX = Math.min( tPtX, tLineX),
              tY = Math.min( tPtY, tLineY),
              tSide = Math.abs( tLineY - tPtY),
              tRectString = DG.RenderingUtilities.pathForFrame({ x: tX, y: tY,
                                                          width: tSide, height: tSide }),
              tRect = tPaper.path( tRectString)
                      .attr( { stroke: 'red'});
          if( tAnimateShow) {
            tRect.attr( {'stroke-opacity': 0})
              .animate({'stroke-opacity': 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
          }
          this_._squares.push( tRect);
        });
      }
    }
    
    sc_super();

    this.drawData();
    
    this.updateSelection();

    if( !SC.none( this.connectingLineAdorn) && this.connectingLineAdorn.wantVisible())
       this.connectingLineAdorn.updateToModel();
    
    if( !SC.none( this.movableLineAdorn))
      this.movableLineAdorn.updateToModel();

    if( !SC.none( this.functionAdorn))
      this.functionAdorn.updateToModel();

    drawSquares();
  },

  /**
   * If we have a connecting line adornment, give it a chance to update selection.
   */
  updateSelection: function() {
    sc_super();
    if( this.connectingLineAdorn && this.connectingLineAdorn.wantVisible()) {
      this.connectingLineAdorn.updateSelection();
    }
  },
  
  /**
    Our axes are in a 'final' state for an animation, giving us a chance to compute point
    coordinates.
  */
  enterAnimationState: function() {
    var this_ = this,
        tPlotElementLength = this._plottedElements.length,
        tCases = this.getPath('model.cases'),
        tRC = this.createRenderContext(),
        tIndex;
    tCases.forEach( function( iCase, iIndex) {
      var tUseAnimation = true;
      if( iIndex >= tPlotElementLength) {
        this_.callCreateCircle( iCase, iIndex, false);
        tUseAnimation = false;
      }
      this_.setCircleCoordinate( tRC, tCases[ iIndex], iIndex, tUseAnimation);
    });
    // If we have more plotted elements than cases, have the extras vanish
    for( tIndex = tCases.length; tIndex < tPlotElementLength; tIndex++) {
      this._plottedElements[ tIndex].animate( { transform: "s0 0" }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
    }

    // We don't want to use the transferred points animation.
    this.set('allowTransferAnimation', false );
  },
  
  /**
    Presumably our model has created a movable line. We need to create our adornment.
  */
  movableLineChanged: function() {
    if( !this.readyToDraw())
      return;
    var tMovableLine = this.getPath('model.movableLine');
    // Rather than attempt to reconnect an existing adornment, we throw out the old and rebuild.
    if( tMovableLine) {
      if( !this.movableLineAdorn) {
        var tAdorn = DG.MovableLineAdornment.create( {
                          parentView: this, model: tMovableLine, paperSource: this.get('paperSource'),
                          xAxisView: this.get('xAxisView'), yAxisView: this.get('yAxisView'),
                          layerName: DG.LayerNames.kAdornments } );
        tAdorn.createElements();
        this.movableLineAdorn = tAdorn;
      }
      this.movableLineAdorn.updateVisibility();
    }
  }.observes('*model.movableLine.isVisible'),

  /**
    Our model has created a connecting line. We need to create our adornment. We don't call adornmentDidChange
   because we don't want to destroy the adornment.
  */
  connectingLineChanged: function() {

    var updateConnectingLine = function() {
      if( tAdorn) {
        tAdorn.updateToModel( true /*animate*/);
      }
  //    this.adornmentDidChange('connectingLine', 'connectingLineAdorn', DG.ConnectingLineAdornment);
      this.updatePointSize();
      this._elementOrderIsValid = false;
      this.updateSelection();
    }.bind( this);

    var tPlotModel = this.get('model' ),
        tAdornModel = tPlotModel && tPlotModel.getAdornmentModel( 'connectingLine' ),
        tAdorn = this.get('connectingLineAdorn');
    if( tAdornModel && tAdornModel.get('isVisible') && !tAdorn) {
      tAdorn = DG.ConnectingLineAdornment.create({ parentView: this, model: tAdornModel,
                                                      paperSource: this.get('paperSource'),
                                                      layerName: DG.LayerNames.kConnectingLines });
      this.set('connectingLineAdorn', tAdorn);
    }

    this.invokeLast( updateConnectingLine); // So that we're ready
  }.observes('.model.connectingLine'),

  /**
    Observation method called when the squares need to be redrawn.
   */
  squaresDidChange: function() {
    // This will force a complete redraw.
    // We may be able to get away with less at some point.
    this._isRenderingValid = false;
    this.displayDidChange();
  },
  
  /**
    The visibility of the model's plotted function has changed. We respond accordingly.
  */
  plottedFunctionChanged: function() {
    var model = this.get('model'),
        tPlottedFunction = model && model.getAdornmentModel('plottedFunction');
    if( !tPlottedFunction) return;
    
    if( !this.functionEditView) {
      this.functionEditView = DG.PlottedFunctionAdornment.createFormulaEditView( tPlottedFunction);
      this.get('parentView').appendChild( this.functionEditView);
    }
    this.functionEditView.set('isVisible', tPlottedFunction.get('isVisible'));
    this.functionEditView.set('formulaExpression', tPlottedFunction.get('expression'));

    if( SC.none( this.functionAdorn)) {
      this.functionAdorn = DG.PlottedFunctionAdornment.create({
                parentView: this, model: tPlottedFunction, paperSource: this.get('paperSource'),
                layerName: DG.LayerNames.kAdornments,
                xAxisView: this.get('xAxisView'), yAxisView: this.get('yAxisView')
              });
    }
    this.functionAdorn.updateVisibility();

  }.observes('.model.plottedFunction'),
  
  /**
    Give us a chance to update adornments on creation.
  */
  didCreateLayer: function() {
    sc_super();
    this.movableLineChanged();
    this.plottedFunctionChanged();
  },
  
  /**
   * Used by both handleBackgroundClick and handleBackgroundDblClick
   * @param iEvent
   */
  zoom: function( iEvent) {
    var tFactor = iEvent.shiftKey ? 2 : 0.5,
        tViewPoint = DG.ViewUtilities.windowToViewCoordinates({ x: iEvent.clientX, y: iEvent.clientY }, this ),
        tWorldPoint = { x: this.get('xAxisView').coordinateToData( tViewPoint.x),
                        y: this.get('yAxisView').coordinateToData( tViewPoint.y) };
    this.get('model').dilate(tWorldPoint, tFactor);
  },
  
  /**
    Alt key triggers zoom.
    @param {SC.Event}
  */
  handleBackgroundClick: function( iEvent) {
    if( iEvent.altKey) {
      this.zoom( iEvent);
    }
  },

  /**
    Double-click triggers zoom.
    @param {SC.Event}
  */
  handleBackgroundDblClick: function( iEvent) {
    this.zoom( iEvent);
  }
  
});

