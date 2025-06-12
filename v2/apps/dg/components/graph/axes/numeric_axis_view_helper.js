// ==========================================================================
//                              DG.NumericAxisViewHelper
//
//  Author:   William Finzer
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/axes/axis_view_helper');

/** @class  DG.NumericAxisViewHelper - This class is instantiated by instances of
 * DG.CellLinearAxisView in order to draw a numeric axis.
 *
 * @extends DG.AxisViewHelper
 */
DG.NumericAxisViewHelper = DG.AxisViewHelper.extend(
    /** @scope DG.NumericAxisViewHelper.prototype */ (function () {

      return {

        drawTicks: function ()       {

          function formatter( iNum) {
            return DG.MathUtilities.notAYear(iNum) ?
                Intl.NumberFormat(tLanguage, {maximumFractionDigits: tFracDigits}).format(iNum) :
                tFormat( iNum);
          }

          var tPaper = this.get('paper'),
              tElementsToClear = this.get('elementsToClear'),
              tLower = this.get('lowerBound'),
              tUpper = this.get('upperBound'),
              tBaseline = this.get('axisLineCoordinate'),
              tOrientation = this.get('orientation'),
              tTickGap = this.get( 'tickGap'),
              tStart = Math.ceil( tLower / tTickGap) * tTickGap,
              tTickCount = Math.floor( Math.abs(( tUpper - tStart) / tTickGap)),
              tLabelString,
              tMaxNumberExtent = DG.RenderingUtilities.kDefaultFontHeight,
              tFracDigits = (tTickGap < 1) ? Math.ceil( Math.abs( Math.log( tTickGap) / Math.LN10)) : 0,
              tFormat = DG.Format.number().group("").fractionDigits( 0, tFracDigits),
              tLanguage = DG.get('currentLanguage')
              ;
          /* Return the frequency of drawing value labels that will not cause collisions.
            A returned value of 1 means draw every value label, 2 means draw every other,
            etc. */
          var findWorkableGap = function( iStart, iOffset) {
            var mScaleIsReversed = false,
                tModulus = 1,
                tWorkableGapFound = false,  // guarantee first time through loop
                tHalfWidth, tHalfHeight
                ;

            while (!tWorkableGapFound) {
              var lastPixelUsed = 0,
                  firstTime = true,
                  tModifiedTickGap = tModulus * tTickGap,
                  tTickIndex;

              tTickCount = Math.floor( Math.abs( (tUpper - iStart) / tModifiedTickGap));
              tWorkableGapFound = true; // assume success

              for( tTickIndex = 0;
                   (tTickIndex <= tTickCount) && tWorkableGapFound  ;
                   tTickIndex++) {
                var spot = iStart + tTickIndex * tModifiedTickGap,
                    tickPixel = this.dataToCoordinate( spot + iOffset),
                    tTextExtent;

                tLabelString = formatter( spot);

                tTextExtent = DG.RenderingUtilities.textExtentOnCanvas( tPaper, tLabelString);

                switch( tOrientation) {
                  case DG.GraphTypes.EOrientation.kVertical:
                  case DG.GraphTypes.EOrientation.kVertical2:
                    tHalfHeight = tTextExtent.y / 2;

                    if (firstTime || (Math.abs( lastPixelUsed - tickPixel) > tHalfHeight)) {
                      firstTime = false;
                      lastPixelUsed = tickPixel + (mScaleIsReversed ?
                              tHalfHeight : -tHalfHeight);
                    }
                    else {  // Nope, text is on top of itself
                      tWorkableGapFound = false;
                      tModulus++;
                    }
                    break;
                  case DG.GraphTypes.EOrientation.kHorizontal:
                    // By pretending half the width is a bit greater than it is, we leave
                    // room between
                    tHalfWidth = 5.5 * tTextExtent.x / 8;

                    // Only draw label if we aren't going to collide with the previous number
                    if (firstTime || (Math.abs( tickPixel - lastPixelUsed)  > tHalfWidth)) {
                      firstTime = false;
                      lastPixelUsed = tickPixel + (mScaleIsReversed ?
                              -tHalfWidth : tHalfWidth);
                    }
                    else {  // Nope, text is on top of itself
                      tWorkableGapFound = false;
                      tModulus++;
                    }
                    break;
                }
              }
            }
            return tModulus;
          }.bind( this);

          var //tOffset = mIntegerBinOffsetting ? 0.5 : 0.0;
              tOffset = 0,
          // Compute the frequency for drawing text so it doesn't bump itself
              tDrawValueModulus = findWorkableGap( tStart, tOffset),
          // If we're not drawing every label for lack of space, then compute a start
          // value for the draw value counter so that we choose to draw sensible labels;
          // e.g. include 0, include integers, ...
          //tInitialDrawValueCounter = FindInitialDrawValueCounter( tStart, tDrawValueModulus);
              tInitialDrawValueCounter = 0,
          // If there's enough screen space, we'll add some intermediate ticks.
          //tNumSubIntervals = FindNumSubIntervals( tStart, tOffset, iCellNumber, tDrawValueModulus * mTickGap);
          //tNumSubIntervals = 0,
              tCounter = tInitialDrawValueCounter,
//            tSubTickPixelGap = (this_.cellDataToCoordinate( tCellNumber, tStart + 2 * tTickGap + tOffset) -
//                      this_.cellDataToCoordinate( tCellNumber, tStart + tTickGap + tOffset)) /
//                          tNumSubIntervals,
              tPixelMax = this.get('pixelMax'),
              tTickIndex = 0,
              tTickLength = (tOrientation === DG.GraphTypes.EOrientation.kVertical2) ? -this.kTickLength : this.kTickLength,
              tAxisGap = (tOrientation === DG.GraphTypes.EOrientation.kVertical2) ? -this.kAxisGap : this.kAxisGap,
              tAnchor = (tOrientation === DG.GraphTypes.EOrientation.kVertical2) ? 'start' : 'end';

          this.forEachTickDo( function( iSpot, iTickPixel) {
            var tNum, tLabelExtent, tWidth, tHeight;
            tLabelString = formatter(iSpot);
            tNum = tPaper.text( 0, 0, tLabelString)
                .addClass('dg-axis-tick-label');
            tElementsToClear.push( tNum);
            tLabelExtent = DG.RenderingUtilities.getExtentForTextElement(
                tNum, DG.RenderingUtilities.kDefaultFontHeight);
            tWidth = tLabelExtent.width;
            tHeight = tLabelExtent.height;

            switch( tOrientation) {
              case DG.GraphTypes.EOrientation.kVertical:
              case DG.GraphTypes.EOrientation.kVertical2:
                iTickPixel += tPixelMax;  // offset by top of axis
                if( (iTickPixel < this.get('pixelMin')) && (tTickIndex >= 0))
                  tElementsToClear.push(
                      tPaper.line( tBaseline, iTickPixel, tBaseline - tTickLength, iTickPixel)
                          .attr( { stroke: DG.PlotUtilities.kAxisColor }));
                //DrawSubTicks( iTickPixel, tSubTickPixelGap, tNumSubIntervals);

                if (tCounter === 0) {
                  if( (iTickPixel < this.get('pixelMin')) && (tTickIndex >= 0)) {
                    tNum.attr( { x: tBaseline - tTickLength - tAxisGap,
                      y: iTickPixel,
                      'text-anchor': tAnchor });
//                  tNum.node.setAttribute( 'style', tNum.node.getAttribute('style') +
//                            'dominant-baseline:middle');
//                  tNum.node.setAttribute( 'dominant-baseline', 'middle');
                    tMaxNumberExtent = Math.max( tMaxNumberExtent, tWidth);
                  }
                }
                else
                  tNum.hide();
                break;

              case DG.GraphTypes.EOrientation.kHorizontal:
                iTickPixel += this.get('pixelMin');  // offset by left start of axis
                if( (iTickPixel >= this.get('pixelMin')) && (tTickIndex >= 0))
                  tElementsToClear.push(
                      tPaper.line( iTickPixel, tBaseline, iTickPixel, tBaseline + tTickLength)
                          .attr( { stroke: DG.PlotUtilities.kAxisColor }));
                //DrawSubTicks( iTickPixel, tSubTickPixelGap, tNumSubIntervals);
                if (tCounter === 0) {
                  if ((iTickPixel >= this.get('pixelMin')) && (tTickIndex >= 0)) {
                    tNum.attr({ x: iTickPixel + 1,
                      y: tBaseline + tTickLength + tAxisGap + tHeight / 3 });
                    tMaxNumberExtent = Math.max( tMaxNumberExtent, tHeight);
                  }
                }
                else
                  tNum.hide();
                break;
            }
            if( tTickIndex >= 0)
              tCounter = (tCounter + 1) % tDrawValueModulus;
            tTickIndex++;
          }.bind( this));
          this.setIfChanged( 'maxNumberExtent', tMaxNumberExtent);
        },

        /**
         Call the given function once for each tick with arguments
         iWorldCoordinateOfTick, iScreenCoordinateOfTick
         @param {Function} to be called for each tick
         */
        forEachTickDo: function( iDoF) {
          var tTickIndex,
              tLower = this.get('lowerBound'),
              tUpper = this.get('upperBound'),
              tTickGap = this.get('tickGap'),
              tStart = Math.ceil( tLower / tTickGap) * tTickGap,
              tTickCount = Math.abs( (tUpper - tStart) / tTickGap),
              tSpot;
          for( tTickIndex = 0; tTickIndex <= tTickCount; tTickIndex++)  {
            tSpot = tStart + tTickIndex * tTickGap;
            iDoF( tSpot, this.dataToCoordinate( tSpot));
          }
          }
      };
    }()));

