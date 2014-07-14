// ==========================================================================
//                        DG.MapPointLayer
//
//  Author:   William Finzer
//
//  Copyright ©2014 Concord Consortium
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

sc_require('components/graph_map_common/plot_layer');

/** @class DG.MapPointLayer - A plot of dots placed according to numeric values

  @extends DG.PlotLayer
*/
DG.MapPointLayer = DG.PlotLayer.extend(
/** @scope DG.MapPointLayer.prototype */ 
{
  displayProperties: [],
  
  autoDestroyProperties: [],

  mapSource: null,

  map: function() {
    return this.getPath('mapSource.mapLayer.map');
  }.property(),

  /**
   * Augment my base class by checking to make sure we have the attributes we need.
   * @returns {boolean}
   */
  readyToDraw: function() {
    var tModel = this.get('model');
    return tModel && !SC.none(tModel.getPath('dataConfiguration.yAttributeDescription.attributeID')) &&
        !SC.none(tModel.getPath('dataConfiguration.xAttributeDescription.attributeID'));
  },

  /**
   * Computing this context once at beginning of display loop speeds things up
   * @return {*}
   */
  createRenderContext: function() {
    var tModel = this.get('model');
    if( !tModel)
      return; // not ready yet
    var tLegendDesc = tModel.getPath('dataConfiguration.legendAttributeDescription' );
    return {
      map: this.get('map' ),
      latVarID: tModel.getPath('dataConfiguration.yAttributeDescription.attributeID'),
      lngVarID: tModel.getPath('dataConfiguration.xAttributeDescription.attributeID'),
      legendDesc: tLegendDesc,
      legendVarID: tLegendDesc && tLegendDesc.get('attributeID'),
      updatedPositions: true,
      calcCaseColorString: function( iCase ) {
        if( !this.legendVarID)
          return '#' + DG.ColorUtilities.simpleColorNames.yellow; // DG.ColorUtilities.kNoAttribCaseColor.colorString;

        DG.assert( iCase );
        var tColorValue = iCase.getValue( this.legendVarID),
            tCaseColor = DG.ColorUtilities.calcCaseColor( tColorValue, this.legendDesc, this.attrColor );
        return tCaseColor.colorString;
      }
    };
  },

  /**
    Observation function called when data values change.
    Method name is legacy artifact of SproutCore range observer implementation.
   */
  dataRangeDidChange: function( iSource, iQuestion, iKey, iChanges) {
    if( !this.readyToDraw())
      return;

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

    sc_super();
  },

   /**
   * Set the coordinates and other attributes of the case circle (a Raphael element in this._plottedElements).
   * @param iRC {} case-invariant Render Context
   * @param iCase {DG.Case} the case data
   * @param iIndex {number} index of case in collection
   * @param iAnimate {Boolean} (optional) want changes to be animated into place?
   * @returns {cx {Number},cy {Number}} final coordinates or null if not defined (hidden plot element)
   */
  setCircleCoordinate: function( iRC, iCase, iIndex, iAnimate, iCallback ) {
    DG.assert( iRC && iRC.map && iRC.latVarID && iRC.lngVarID );
    DG.assert( iCase );
    DG.assert( DG.MathUtilities.isInIntegerRange( iIndex, 0, this._plottedElements.length ));
    var tCircle = this._plottedElements[ iIndex],
        tCoords = iRC.map.latLngToContainerPoint([iCase.getNumValue( iRC.latVarID ), iCase.getNumValue( iRC.lngVarID)] ),
        tCoordX = tCoords.x,
        tCoordY = tCoords.y,
        tIsMissingCase = !DG.isFinite(tCoordX) || !DG.isFinite(tCoordY);

    // show or hide if needed, then update if shown.
    if( this.showHidePlottedElement( tCircle, tIsMissingCase)) {
      this.updatePlottedElement( tCircle, tCoordX, tCoordY, this._pointRadius, iRC.calcCaseColorString( iCase ),
        iAnimate, iCallback);
      //tCircle.attr( {stroke: 'black'}); // updatePlottedElement tries to make a dark yellow border
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
//        .drag(function (dx, dy) { // continue
//                SC.run( function() {
//                  var tNewX = this_.get('xAxisView').coordinateToData( this.ox + dx),
//                      tNewY = this_.get('yAxisView').coordinateToData( this.oy + dy),
//                      tCase = this_.getPath('model.cases')[ this.index],
//                      tOldX = tCase.getNumValue( this_.getPath('model.xVarID')),
//                      tOldY = tCase.getNumValue( this_.getPath('model.yVarID')),
//                      tCurrTransform = this.transform();
//                  // Note that we ignore invalid values. Matt managed to convert some dragged values
//                  // to NaNs during testing, which then couldn't animate back to their original
//                  // positions. This should have the effect of leaving points that would otherwise
//                  // have become NaNs in their last-known-good positions.
//                  if( isFinite( tNewX) && isFinite( tNewY)) {
//                    // Put the element into the initial transformed state so that changing case values
//                    // will not be affected by the scaling in the current transform.
//                    this.transform( tInitialTransform);
//                    changeCaseValues( { x: tNewX - tOldX, y: tNewY - tOldY });
//                    this.transform( tCurrTransform);
//                  }
//                }, this);
//            },
//            function (x, y) { // begin
//              var tCase = this_.getPath('model.cases')[ this.index];
//              tIsDragging = true;
//              // Save the initial screen coordinates
//              this.ox = this.attr("cx");
//              this.oy = this.attr("cy");
//              // Save the initial world coordinates
//              this.wx = tCase.getNumValue( this_.getPath('model.xVarID'));
//              this.wy = tCase.getNumValue( this_.getPath('model.yVarID'));
//              this.animate({opacity: kOpaque }, DG.PlotUtilities.kDataTipShowTime, "bounce");
//            },
//            function() {  // end
//              this.animate( {transform: tInitialTransform }, DG.PlotUtilities.kHighlightHideTime);
//              tInitialTransform = null;
//              returnCaseValuesToStart( this.index, { x: this.wx, y: this.wy });
//              tIsDragging = false;
//              this.ox = this.oy = this.wx = this.wy = undefined;
//              this_.hideDataTip();
//            })
        ;
    tCircle.index = iIndex;
    tCircle.node.setAttribute('shape-rendering', 'geometric-precision');
//    if( iAnimate)
//      DG.PlotUtilities.doCreateCircleAnimation( tCircle);
    return tCircle;
  },
  
  /**
    Generate the svg needed to display the plot
  */
  doDraw: function doDraw() {
    if( this.readyToDraw()) {
      this.drawData();
      this.updateSelection();
    }
  },

  updateSelection: function() {
    if( SC.none( this.get('map')))
      return;
    sc_super();
  }

});

