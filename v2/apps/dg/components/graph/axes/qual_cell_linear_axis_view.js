// ==========================================================================
//                          DG.QualCellLinearAxisView
// 
//  A view of a linear axis possibly broken into cells.
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

sc_require('components/graph/axes/cell_linear_axis_view');

/** @class

    An axis with a numeric scale, possible broken into cells.

 @extends DG.CellLinearAxisView
 */
DG.QualCellLinearAxisView = DG.CellLinearAxisView.extend(
    /** @scope DG.QualCellLinearAxisView.prototype */ (function () {
      var kDefaultLow = 0,
          kDefaultHigh = 100,
          kRange = kDefaultHigh - kDefaultLow,
          kPadFraction = 0.1,
          kActualDefaultLow = kDefaultLow - kRange * kPadFraction,
          kActualDefaultHigh = kDefaultHigh + kRange * kPadFraction;

      return {

/*
        modelDidChange: function () {
          var tModel = this.get('model');
          if (tModel) {
            // tModel.setLowerAndUpperBounds(kActualDefaultLow, kActualDefaultHigh);
          }
        }.observes('model'),
*/

        /**
         Called each time we have to regenerate or modify the visualization
         */
        doDraw: function doDraw() {
          var kAxisGap = 4,
              tBaseline = this.get('axisLineCoordinate'),
              tOrientation = this.get('orientation'),
              tMaxNumberExtent = DG.RenderingUtilities.kDefaultFontHeight
              ;

          var ensureLowAndHighAreVisible = function () {
                var tCurrLow = this.getPath('model.lowerBound'),
                    tCurrHigh = this.getPath('model.upperBound');
                if (!SC.none( tCurrLow) && tCurrLow > kActualDefaultLow)
                  this.setPath('model.lowerBound', kActualDefaultLow);
                if (!SC.none( tCurrHigh) && tCurrHigh < kActualDefaultHigh)
                  this.setPath('model.upperBound', kActualDefaultHigh);
              }.bind(this),

              drawLowHigh = function () {
                [{value: kDefaultLow, string: ''}, {value: kDefaultHigh, string: ''}].forEach(
                    function (iLabel) {
                      var tLabelElement = this.get('paper').text(0, 0, iLabel.string)
                          .addClass('dg-axis-tick-label');
                      this._elementsToClear.push(tLabelElement);
                      var tLabelExtent = DG.RenderingUtilities.getExtentForTextElement(
                          tLabelElement, DG.RenderingUtilities.kDefaultFontHeight),
                          tCoord = this.dataToCoordinate(iLabel.value),
                          tHeight = tLabelExtent.height;
                      switch (tOrientation) {
                        case DG.GraphTypes.EOrientation.kHorizontal:
                          tLabelElement.attr({
                            x: tCoord + 1,
                            y: tBaseline + kAxisGap + tHeight / 3
                          });
                          tMaxNumberExtent = Math.max(tMaxNumberExtent, tHeight);
                          break;
                        case DG.GraphTypes.EOrientation.kVertical:
                          tLabelElement.attr({
                            x: tBaseline - kAxisGap,
                            y: tCoord,
                            'text-anchor': 'end'
                          });
                          tMaxNumberExtent = Math.max(tMaxNumberExtent, tLabelExtent.width);
                          break;
                      }
                    }.bind(this)
                );
              }.bind(this);

          ensureLowAndHighAreVisible();
          this._elementsToClear.push(this.renderAxisLine());
          drawLowHigh();
          this.renderLabel();
          this.setIfChanged('maxNumberExtent', tMaxNumberExtent);
        },

        forEachTickDo: function() {
          // Do nothing because, unlike our base class, we have no ticks
        }

      };

    }())
);

