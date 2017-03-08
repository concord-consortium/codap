// ==========================================================================
//                            DG.ChoroplethView
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

sc_require('views/raphael_base');

/** @class  DG.ChoroplethView - View of portion of legend that displays a segmented rectangle
 *            of colors for an attribute. Gives user control over segment number and boundaries.

 @extends DG.RaphaelBaseView
 */
DG.ChoroplethView = DG.RaphaelBaseView.extend(
    (function () {
      var kRectHeight = 16,
          kTickLength = 3; // pixels

      /** @scope DG.ChoroplethView.prototype */
      return {
        displayProperties: ['model.attributeDescription.attribute',
          'model.numericRange'],

        /**
         Set by owning LegendView on creation
         @property { DG.LegendModel }
         */
        model: null,

        desiredExtent: function () {
          return kRectHeight + kTickLength + DG.RenderingUtilities.kDefaultFontHeight;
        }.property(),

        doDraw: function doDraw() {
          var kStrokeWidth = 0.5,
              tAttrDesc = this.getPath('model.attributeDescription'),
              tAttrColor = tAttrDesc && tAttrDesc.get('attribute') && DG.ColorUtilities.calcAttributeColor(tAttrDesc),
              tWidth = this._paper.width - 2;

          var drawScale = function () {
                var tMinMax = tAttrDesc.get('minMax'),
                    tMinFormatter = DG.Format.number().fractionDigits(0, 2),
                    tMaxFormatter = DG.Format.number().fractionDigits(0, 2);
                if( tMinMax.min < 2500)
                  tMinFormatter.group('');
                if( tMinMax.max < 2500)
                  tMaxFormatter.group('');
                var tMin = tMinFormatter(tMinMax.min),
                    tMax = tMaxFormatter(tMinMax.max),
                    kMaxTicks = 4,
                    tTick;

                // re-create the tick marks every time
                for (tTick = 0; tTick <= kMaxTicks; tTick++) {
                  var tX = kStrokeWidth + tTick * (tWidth - 2 * kStrokeWidth) / 4,
                      tBaseline = kRectHeight + 1;
                  this._elementsToClear.push(
                      this._paper.line(tX, tBaseline,
                          tX, tBaseline + kTickLength)
                          .attr({stroke: tAttrColor}));
                }
                var tTextY = kRectHeight + kTickLength + DG.RenderingUtilities.kDefaultFontHeight / 2;
                this._elementsToClear.push(this._paper.text(kStrokeWidth, tTextY, tMin)
                    .attr({'text-anchor': 'start'}));
                this._elementsToClear.push(this._paper.text(tWidth - 2 * kStrokeWidth, tTextY, tMax)
                    .attr({'text-anchor': 'end'}));
              }.bind(this),

              drawQuintiles = function () {

                var tQuintileN = 5,
                    tValues = this.getPath('model.dataConfiguration').numericValuesForPlace(DG.GraphTypes.EPlace.eLegend),
                    tQuintileValues = DG.MathUtilities.nQuantileValues(tValues, tQuintileN),
                    tMinValue = tQuintileValues[0],
                    tMaxValue = tQuintileValues[tQuintileN],
                    tMinMax = {min: 0, max: 1},
                    tColorMap = tAttrDesc.getPath('attribute.colormap'),
                    tAttrColor = DG.ColorUtilities.calcAttributeColor( tAttrDesc),
                    tSpectrumEnds = DG.ColorUtilities.getAttributeColorSpectrumEndsFromColorMap(tColorMap, tAttrColor);
                tQuintileValues.forEach(function (iStartValue, iIndex) {
                  if ((typeof iStartValue === 'number') && iIndex < tQuintileN) {
                    var tStopValue = tQuintileValues[iIndex + 1],
                        tLeft = tWidth * (iStartValue - tMinValue) / (tMaxValue - tMinValue),
                        tRight = tLeft + tWidth * ( tStopValue - iStartValue) / (tMaxValue - tMinValue),
                        tColor = DG.ColorUtilities.calcGradientColor(tMinMax, tSpectrumEnds.low, tSpectrumEnds.high,
                            (iIndex + 1)/ tQuintileN),
                        tRect = this._paper.rect(tLeft, 0, 0, 0)
                            .attr({
                              width: tRight - tLeft, height: kRectHeight,
                              fill: tColor.colorString || tColor,
                              'stroke-width': kStrokeWidth,
                              title: '%@ – %@'.fmt( Math.round(iStartValue * 100) / 100,
                                  Math.round(tStopValue * 100) / 100)
                            })
                            .addClass('choro-rect')
                            .click( function( iEvent) {
                              this.selectCasesBetween( iStartValue, tStopValue, iEvent.shiftKey);
                            }.bind( this));
                    this._elementsToClear.push( tRect);
                  }
                }.bind(this));
              }.bind(this);

          if (!tAttrDesc || tAttrDesc.get('attribute') === null)
            return;
          drawScale();
          drawQuintiles();

        },

        selectCasesBetween: function( iLower, iUpper, iExtend) {
          var tAttrID = this.getPath('model.attributeDescription.attribute.id'),
              tCases = this.getPath('model.dataConfiguration.cases'),
              tAttrName = this.getPath('model.attributeDescription.attribute.name'),
              tChange = {
                operation: 'selectCases',
                collection: this.getPath('dataConfiguration.collectionClient'),
                cases: [],
                select: true,
                extend: iExtend
              };
          if( SC.none( tAttrID) || SC.none( tCases))
              return;
          tCases.forEach( function( iCase) {
            var tValue = iCase.getNumValue( tAttrID);
            if( tValue >= iLower && tValue <= iUpper)
                tChange.cases.push( iCase);
          });
          this.getPath('model.dataConfiguration.dataContext').applyChange( tChange);
          DG.logUser("caseSelected with values of: %@ between %@ and %@", tAttrName, iLower, iUpper);

        }

      };
    }()));

