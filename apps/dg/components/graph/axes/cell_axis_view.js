// ==========================================================================
//                            DG.CellAxisView
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

sc_require('components/graph/axes/axis_view');

/** @class  DG.CellAxisView - The view for a graph axis that displays cells.

 @extends DG.AxisView
 */
DG.CellAxisView = DG.AxisView.extend( (function() {
  var kTickLength = 4,
      kAxisGap = 2;

  return {
    /** @scope DG.CellAxisView.prototype */

    /**
     Number of pixels required from the axis line to the edge of the graph view
     @property { Number }
     */
    desiredExtent: function() {
      var tExtent = sc_super();
      if( !this.get('isNumeric')) { // Not yet handling numeric axis broken up by cells
        tExtent += kTickLength + kAxisGap + this.get('maxLabelExtent');
      }
      return tExtent;
    }.property('maxLabelExtent'),

    /**
     I'm not supposed to work with numbers.
     @return { Boolean }
     */
    isNumeric: false,

    /**
     @property{Number}
     */
    axisLineCoordinate: function() {
      return (this.get('orientation') === 'vertical') ? this.get('drawWidth') : 0;
    }.property('drawWidth'),

    /**
     @property {Number} Each time we draw the axis, we set this property to the maximum width
     of the label strings. Note that this will change depending not only on the length of the
     strings but on the rotation of the labels.
     */
    maxLabelExtent: 0,

    /**
     This is the main backbone of the axis.
     @return {Raphael element}
     */
    renderAxisLine: function() {
      var tCoord = this.get('axisLineCoordinate'),
          tPixelMin = this.get('pixelMin'),
          tPixelMax = this.get('pixelMax'),
          tStart, tStop;
      switch( this.get('orientation')) {
        case 'vertical':
          tStart = { x: tCoord - 1, y: tPixelMin };
          tStop = { x: tCoord - 1, y: tPixelMax };
          break;
        case 'horizontal':
          tStart = { x: tPixelMin, y: tCoord + 1 };
          tStop = { x: tPixelMax, y: tCoord + 1 };
          break;
      }
      return this._paper.line( tStart.x, tStart.y, tStop.x, tStop.y)
        .attr( { stroke: DG.PlotUtilities.kAxisColor,
          strokeWidth: 2 });
    },

    /**
     The convention is that, unlike continuous axes, for a
     vertical axis, the low numbers are at the top.
     @param {Number} in screen coordinates
     @return {Number} the cell number corresponding to the given screen coordinate
     */
    whichCell: function( iCoord) {
      var tNumCells = this.getPath('model.numberOfCells'),
          tCell = 0;
      if( tNumCells > 1) {
        var tPixelMin = this.get('pixelMin'),
            tPixelMax = this.get('pixelMax');
        // In order to do the computation, we have to adjust for the coordinates of the ends
        // of the axes, knowing the thePixel is in plot view coordinates, not axis view coordinates.
        if( this.get('orientation') === 'vertical') {
          iCoord = Math.min( Math.max( tPixelMax + 1, iCoord), tPixelMin - 1);
          tCell = Math.floor( (iCoord - tPixelMax) * tNumCells / ( tPixelMin - tPixelMax));
        }
        else {  // horizontal
          iCoord = Math.max( Math.min( tPixelMax - tPixelMin - 1, iCoord), 1.0);
          tCell = Math.floor( iCoord * tNumCells / ( tPixelMax - tPixelMin));
        }

        //      KCP_ASSERT( (tCell >= 0) && (tCell < tNumCells));
      }
      return tCell;
    },

    /**
     Since I'm a leaf class I implement doDraw.
     */
    doDraw: function doDraw() {
      var this_ = this,
          tModel = this.get('model'),
          tBaseline = this_.get('axisLineCoordinate'),
          tOrientation = this.get('orientation'),
          tRotation = (tOrientation === 'horizontal') ? 0 : -90, // default to parallel to axis
          tMaxHeight = DG.RenderingUtilities.kDefaultFontHeight,  // So there will be a default extent
          tMaxWidth = tMaxHeight,
          tLabelSpecs = [],
          tCollision = false,
          tPrevLabelEnd;

      function measureOneCell( iCellNum, iCellName) {
        var tCoord = this_.cellToCoordinate( iCellNum),
            tTextElement = this_._paper.text( 0, 0, iCellName),
            tTextExtent = DG.RenderingUtilities.getExtentForTextElement(
                                tTextElement, DG.RenderingUtilities.kDefaultFontHeight);

        if( !isFinite( tCoord)) {
          tTextElement.remove();
          return;
        }
        tLabelSpecs.push( { element: tTextElement, coord: tCoord,
                            height: tTextExtent.height, width: tTextExtent.width });

        tMaxHeight = Math.max( tMaxHeight, tTextExtent.height);
        tMaxWidth = Math.max( tMaxWidth, tTextExtent.width);
        this_._elementsToClear.push( tTextElement);
        if(SC.none( tPrevLabelEnd))
          tCollision = tTextExtent.width > this_.get('fullCellWidth');
        else
          tCollision = tCollision || (tCoord - tTextExtent.width / 2 < tPrevLabelEnd);
        tPrevLabelEnd = (tCoord + tTextExtent.width / 2);
      } // measureOneCell

      // iLabelSpec has form { element: {Raphael element}, coord: {Number}, height: {Number}, width: {Number} }
      function drawOneCell( iLabelSpec) {
        var tCoord = iLabelSpec.coord,
            tLabelX, tLabelY;
        switch( this_.get('orientation')) {
          case 'vertical':
            this_._elementsToClear.push(
              this_._paper.line( tBaseline, tCoord, tBaseline - kTickLength, tCoord)
                .attr( { stroke: DG.PlotUtilities.kAxisColor }));
            tLabelX = tBaseline - kTickLength - kAxisGap - iLabelSpec.height / 3;
            tLabelY = tCoord;
            if( tRotation === 0)
              tLabelX -= iLabelSpec.width / 2;
            break;

          case 'horizontal':
            this_._elementsToClear.push(
              this_._paper.line( tCoord, tBaseline, tCoord, tBaseline + kTickLength)
                .attr( { stroke: DG.PlotUtilities.kAxisColor }));
            tLabelX = tCoord + 1;
            tLabelY = tBaseline + kTickLength + kAxisGap + iLabelSpec.height / 3;
            if( tRotation === -90)
              tLabelY += iLabelSpec.width / 2;
            break;
        }
        iLabelSpec.element.attr( { x: tLabelX, y: tLabelY });
        DG.RenderingUtilities.rotateText( iLabelSpec.element, tRotation, tLabelX, tLabelY);
      } // drawOneCell

      //==========Main body of doDraw==================
      // Special case for short labels
      if( this.getPath('model.maxCellNameLength') <= 3)
        tRotation = 0;

      this._elementsToClear.push( this.renderAxisLine());

      tModel.forEachCellDo( measureOneCell);
      if( tCollision) // labels must be perpendicular to axis
        tRotation = (tOrientation === 'horizontal') ? -90 : 0;
      tLabelSpecs.forEach( drawOneCell);

      this.renderLabel();
      // By changing maxLabelExtent we can trigger notification that causes the graph to re-layout
      // axes and plot if needed.
      this.setIfChanged('maxLabelExtent',
            (tOrientation === 'horizontal') ?
              ((tRotation === 0) ? tMaxHeight : tMaxWidth) :  // horizontal
              ((tRotation === 0) ? tMaxWidth : tMaxHeight));  // vertical
    }

  };
}())
);

