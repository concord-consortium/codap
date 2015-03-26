 // ==========================================================================
 //                   DG.MapConnectingLineAdornment
 //
 //  Connecting lines between points, intended for use between points on
 //  a scatterplot.  Can easily be extended or repurposed for other
 //  plot types.
 //
 //  Author:   Craig D. Miller
 //
 //  Copyright ©2012-13 Scientific Reasoning Research Institute,
 //                  University of Massachusetts Amherst
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

sc_require('components/graph/adornments/connecting_line_adornment');

/**
 * @class  Extension of ConnectingLineAdornment that can draw on maps
 * @extends DG.ConnectingLineAdornment
 */
DG.MapConnectingLineAdornment = DG.ConnectingLineAdornment.extend(
/** @scope DG.MapConnectingLineAdornment.prototype */
{

  /**
   * @property {DG.MapView}
   */
  mapSource: null,
  mapBinding: '.mapSource.mapLayer.map',

  /**
   * Create or update our lines, one for each parent present.
   * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
   */
  updateLine: function( iAnimate ) {
    var this_ = this,
        tMap = this.get('map'),
        tArrayOfValuesArrays = this.getPath('model.values'),
        kCount = 10,  // This is fixed so we get same colors no matter how many lines there are
        tPaper = this.get('paper' ),
        tLayer = this.get('layer');

    if( !tPaper) {
      this.invokeOnceLater( function() {
        this.updateLine( iAnimate);
      }.bind( this));
      return;
    }
    DG.assert( tMap);
    if( !tArrayOfValuesArrays)
      return; // No lines to draw

    tArrayOfValuesArrays.forEach( function( iValues, iLineNum) {
      var tNumValues = iValues ? iValues.length : 0,
          tPath = 'M0,0', // use empty path if no points to connect
          tLineColor = DG.ColorUtilities.calcAttributeColorFromIndex( iLineNum % kCount, kCount).colorString,
          i, x, y,
          tLine;
      // create a new path, connecting each sorted data point
      for( i=0; i<tNumValues; ++i ) {
        var tCoords = tMap.latLngToContainerPoint([iValues[i].y, iValues[i].x] );
        if( i===0 ) {
          tPath = 'M%@,%@'.fmt( tCoords.x, tCoords.y ); // move to first line
        } else {
          tPath += ' L%@,%@'.fmt( tCoords.x, tCoords.y ); // draw to subsequent lines
        }
      }
      DG.assert( tPath );

      tLine = this_.myElements[ iLineNum];
      if( !tLine ) {
        // create the line
        tLine = tPaper.path( '');
        this_.myElements.push( tLine );
        tLayer.push( tLine);
        }
      tLine.attr({ path: tPath, 'stroke-opacity': 0, stroke: tLineColor, cursor: 'pointer' })
        .mousedown( function( iEvent) {
          this_.get('model' ).selectParent( iLineNum, iEvent.shiftKey);
        })
        .hover(
          // over
          function( iEvent) {
            this_.showDataTip( iEvent, iLineNum);
          },
          // out
          function(){
            this_.hideDataTip();
          });
      if( iAnimate)
        tLine.animate( { 'stroke-opacity': 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
      else
        tLine.attr( { 'stroke-opacity': 1 });
    });

    while( this.myElements.length > tArrayOfValuesArrays.length) {
      var tLast = this.myElements.pop();
      tLayer.prepareToMoveOrRemove( tLast);
      tLast.remove();
    }
    this.updateSelection();
  }

});


