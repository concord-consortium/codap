// ==========================================================================
//                          DG.CasePlotView
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

/** @class DG.CasePlotView - A plot of dots placed according to numeric values

 @extends DG.PlotView
 */
DG.CasePlotView = DG.PlotView.extend(
  /** @scope DG.CasePlotView.prototype */
  {
    dataRangeDidChange: function( iSource, iQuestion, iKey, iChanges ) {
      var this_ = this,
          tPlotElementLength = this._plottedElements.length,
          tCases = this.getPath( 'model.cases'),
          tRC = this.createRenderContext();

      // iChanges can be a single index or an array of indices
      var tChanges = (SC.typeOf( iChanges ) === SC.T_NUMBER ? [ iChanges ] : iChanges);
      tChanges.forEach( function( iIndex ) {
        if( iIndex >= tPlotElementLength )
          this_.callCreateCircle( tCases[ iIndex], iIndex, this_._createAnimationOn );
        this_.setCircleCoordinate( tRC, tCases[ iIndex], iIndex );
      } );
      sc_super();
    },

    /**
     * Set the coordinates and other attributes of the case circle (a Rafael element in this._plottedElements).
     * @param iRC {} case-invariant Render Context
     * @param iCase {DG.Case} the case data
     * @param iIndex {number} index of case in collection
     * @param iAnimate {Boolean} (optional) want changes to be animated into place?
     * @param iCallback {Function} Will be called when animation finished
     * @returns {cx {Number},cy {Number}} final coordinates or null if not defined (hidden plot element)
     */
    setCircleCoordinate: function setCircleCoordinate( iRC, iCase, iIndex, iAnimate, iCallback ) {
      DG.assert( iRC && iRC.xAxisView );
      DG.assert( iCase );
      DG.assert( DG.MathUtilities.isInIntegerRange( iIndex, 0, this._plottedElements.length ));

      function dataToCoordinateWithMargin( iAxisView, iData, iMargin ) {
        // position icons in view, with margin to prevent circle edge from being clipped.
        // compare to DG.AxisView.dataToCoordinate().
        var tPixelMin = iAxisView.get('pixelMin'),
            tPixelMax = iAxisView.get('pixelMax');
        if( tPixelMin < tPixelMax )
          return tPixelMin + iMargin + iData * (tPixelMax - tPixelMin - 2*iMargin);
        else
          return tPixelMin - iMargin + iData * (tPixelMax - tPixelMin + 2*iMargin);
      }

      var tCircle = this._plottedElements[ iIndex],
          tRadius = this._pointRadius,
          tWorldCoords = this.get( 'model' ).getWorldCoords( iIndex ),
          tCoordX = dataToCoordinateWithMargin( iRC.xAxisView, tWorldCoords.x, tRadius ),
          tCoordY = dataToCoordinateWithMargin( iRC.yAxisView, tWorldCoords.y, tRadius ),
          tIsMissingCase = SC.none(tCoordX) || SC.none(tCoordY);

      // show or hide if needed, then update if shown.
      if( this.showHidePlottedElement( tCircle, tIsMissingCase)) {
        this.updatePlottedElement( tCircle, tCoordX, tCoordY, tRadius, iRC.calcCaseColorString( iCase ),
          iAnimate, iCallback);
        return { cx: tCoordX, cy: tCoordY, r: tRadius };
      }
      return null;
    },

    createCircle: function ( iDatum, iIndex, iAnimate ) {
      var this_ = this;

      function changeCaseValues( iIndex, iWorldValues) {
        this_.get('model').setWorldCoords( iIndex, iWorldValues);
      }

      var tIsDragging = false,
          kOpaque = 1,
          tInitialTransform = null,
          tCircle = this.get('paper').circle( -100, -100, this._pointRadius )
            .attr( { cursor: "pointer" } )
            .addClass( DG.PlotUtilities.kColoredDotClassName )
            .hover( function ( event ) {  // over
              // Note that Firefox can come through here repeatedly so we have to check for existence
              if( !tIsDragging && SC.none( tInitialTransform)) {
                tInitialTransform = this.transform();
                this.animate( { opacity: kOpaque, transform: DG.PlotUtilities.kDataHoverTransform }, DG.PlotUtilities.kDataTipShowTime );
              }
            },
            function( event ) { // out
              if( !tIsDragging ) {
                this.stop();
                this.animate( {transform: tInitialTransform }, DG.PlotUtilities.kHighlightHideTime );
                tInitialTransform = null;
              }
            } )
            .mousedown( function( iEvent) {
              this_.get( 'model' ).selectCaseByIndex( iIndex, iEvent.shiftKey);
            } )
          .drag(function (dx, dy) { // continue
                // TODO: drag all selected cases, not just this case.
                var tWorldX = this_.get('xAxisView').coordinateToData( this.ox + dx),
                    tWorldY = this_.get('yAxisView').coordinateToData( this.oy + dy),
                    tPoint = { x: tWorldX, y: tWorldY },
                    tRC = this_.createRenderContext(),
                    tCurrTransform = this.transform();
                if( isFinite( tPoint.x) && isFinite( tPoint.y)) {
                  // Put the element into the initial transformed state so that changing case values
                  // will not be affected by the scaling in the current transform.
                  this.transform( tInitialTransform);
                  changeCaseValues( this.index, tPoint);
                  this.transform( tCurrTransform);
                }
                this_.setCircleCoordinate( tRC, this_.getPath('model.cases')[ this.index], this.index);
              },
              function (x, y) { // begin
                tIsDragging = true;
                this.ox = this.attr("cx");
                this.oy = this.attr("cy");
                this.animate({opacity: kOpaque }, DG.PlotUtilities.kDataTipShowTime, "bounce");
                this.toFront();
              },
              function() {  // end
                this.animate( {transform: tInitialTransform }, DG.PlotUtilities.kHighlightHideTime);
                tIsDragging = false;
              })
          ;
      //if( iIndex % 100 === 0 ) DG.logTimer( iIndex===0, "CreateCircle index="+iIndex );
      tCircle.index = iIndex;
      tCircle.node.setAttribute( 'shape-rendering', 'geometric-precision' );
      if( iAnimate)
        DG.PlotUtilities.doCreateCircleAnimation( tCircle);
      return tCircle;
    },

    /**
     We may clear and draw everything from scratch if required.
     */
    drawData: function() {
      if( this.getPath( 'model.isAnimating' ) )
        return; // Points are animating to new position

      if( !SC.none( this.get( 'transferredPointCoordinates' ) ) ) {
        this.animateFromTransferredPoints();
        return;
      }

      var this_ = this,
          tCases = this.getPath( 'model.cases' ),
          tRC = this.createRenderContext(),
          tIndex;

      if( this._mustCreatePlottedElements ) {
        this._plottedElements.forEach( function( iElement ) {
          iElement.remove();
        } );
        this._plottedElements.length = 0;

        this._pointRadius = this.calcPointRadius(); // make sure created circles are of right size
        tCases.forEach( this.callCreateCircle, this );
        this._mustCreatePlottedElements = false;
      }

      tCases.forEach( function( iCase, iIndex ) {
        this_.setCircleCoordinate( tRC, iCase, iIndex );
      } );

      // Get rid of any extra circles
      for( tIndex = tCases.length; tIndex < this._plottedElements.length; tIndex++ ) {
        this._plottedElements[ tIndex].remove();
      }
      this._plottedElements.length = tCases.length;
    },

    /**
     Generate the svg needed to display the plot
     */
    doDraw: function doDraw() {
      sc_super();

      this.drawData();

      this.updateSelection();

    },

    /**
     * The array object my model uses to store world coords has been swapped out. We want to animate to new positions.
     */
    worldValuesChanged: function() {
      this.prepareForConfigurationChange();
      this.set('transferredPointCoordinates', this.get('cachedPointCoordinates'));
      this._isRenderingValid = false;
      this.displayDidChange();
    }.observes( '.model.worldValues')

  } );

