// ==========================================================================
//                          DG.BarChartView
//
//  Author:   William Finzer
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/plots/bar_chart_base_view');

/* global pluralize */

/** @class  DG.BarChartView, a plot of rectangles, one for each category. Each rectangle is made of
 * thinner rectangles, one for each case.

 @extends DG.BarChartBaseView
 */
DG.BarChartView = DG.BarChartBaseView.extend(
    /** @scope DG.BarChartView.prototype */
    {
      /**
       * Make sure the count axis has the correct upper bounds
       */
      setupAxes: function () {
        sc_super();
        var tCountAxisView = this.get('secondaryAxisView');
        // Only set the bounds if they aren't already present
        if (tCountAxisView && SC.none(tCountAxisView.getPath('model.lowerBound'))) {
          tCountAxisView.get('model').setLowerAndUpperBounds(0, this.getPath('model.naturalUpperBound'));
        }
      },

      /**
       * Return the class of the count axis with the x or y to put it on.
       * @return {[{}]}
       */
      getAxisViewDescriptions: function () {
        var tDescriptions = sc_super(),
            tCountKey = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical ? 'y' : 'x';
        tDescriptions.push({
          axisKey: tCountKey,
          axisClass: DG.CountAxisView
        });
        return tDescriptions;
      },

      getBarHeight: function (iPrimaryName, iCount, iTotal) {
        return this.getPath('model.breakdownType') === DG.Analysis.EBreakdownType.eCount
            ? iCount : 100 * iCount / iTotal;
      },

      /**
       *
       * @param iRC {*}
       * @param iCase {DG.Case}
       * @param iIndex {Integer}
       * @param iCellIndices {{primaryCell, secondaryCell, indexInCell}}
       * @param iAnimate {Boolean}
       * @param iCallback {Function}
       */
      privSetElementCoords: function (iRC, iCase, iIndex, iCellIndices, iAnimate, iCallback) {
        DG.assert(iRC && iRC.xAxisView);
        DG.assert(iCase);
        DG.assert(DG.MathUtilities.isInIntegerRange(iIndex, 0, this.get('plottedElements').length));
        var tRect = this.get('plottedElements')[iIndex]/*,
      tIsMissingCase = SC.none( iCellIndices )*/;

        // It can happen that we don't have cell indices yet. Bail for now cause we'll be back later.
        if (!iCellIndices)
          return;

        // show or hide if needed, then update if shown.
        // if( this.showHidePlottedElement(tRect, tIsMissingCase)) {

        var tCellHalfWidth = iRC.barWidth,
            tCellHeight = iRC.secondaryAxisView.get('fullCellWidth'),
            tBarSliceHeight = iRC.barSliceHeights[iCellIndices.primaryCell],
            tTop = (iCellIndices.indexInCell + 1) * tBarSliceHeight,
            tEdge = iRC.primaryAxisView.cellToCoordinate(iCellIndices.primaryCell) -
                tCellHalfWidth / 2,
            tCoordX, tCoordY, tWidth, tHeight;

        if (iRC.isVerticalOrientation) {
          tCoordX = tEdge;
          tCoordY = tCellHeight - tTop;
          tWidth = tCellHalfWidth;
          tHeight = tBarSliceHeight;
        } else {
          tCoordX = tTop - tBarSliceHeight;
          tCoordY = tEdge;
          tWidth = tBarSliceHeight;
          tHeight = tCellHalfWidth;
        }
        var tNewAttrs = {
          x: tCoordX, y: tCoordY, r: 0.1, width: tWidth, height: tHeight,
          fill: iRC.calcCaseColorString(iCase),
          opacity: iRC.transparency,
          'fill-opacity': iRC.transparency,
          'stroke-opacity': 0
        };
        tRect.show();
        if (iAnimate) {
          tRect.animate(tNewAttrs, DG.PlotUtilities.kDefaultAnimationTime, '<>', iCallback);
        } else {
          tRect.attr(tNewAttrs);
        }
        return tRect;
      },

      /**
       We need to decide on the number of points in a row. To do so, we find the
       maximum number of points in a cell and choose so that this max number will
       fit within the length of a cell rect. If there are so many points that they don't fit
       even by using the full length of a cell rect, then we compute an overlap.
       */
      computeCellParams: function () {
        var tMaxInCell = this.getPath('model.maxInCell'),
            tTotalNumCases = this.getPath('model.cases').length(),
            tHasLegend = !SC.none(this.getPath('model.legendVarID')),
            tMaxPercentInCell = 100 * tMaxInCell / tTotalNumCases,
            tSecondaryAxisView = this.get('secondaryAxisView'),
            tCoordOfMaxInCell = tSecondaryAxisView.dataToCoordinate(tMaxInCell),
            tCoordOf100Percent = tSecondaryAxisView.dataToCoordinate(100),
            tCoordOfMaxPercentInCell = tSecondaryAxisView.dataToCoordinate(tMaxPercentInCell),
            tCoordOfZero = tSecondaryAxisView.dataToCoordinate(0),
            tBreakdownType = this.getPath('model.breakdownType'),
            tMinBarSliceHeight = Math.abs(tCoordOfMaxInCell - tCoordOfZero) / tMaxInCell,
            tMinPercentSliceHeight = Math.abs(tCoordOfMaxPercentInCell - tCoordOfZero) / tMaxInCell,
            tSliceHeights = this.getPath('model.primaryCellCounts').map(function (iCount) {
              var tSliceHeight = 0;
              switch (tBreakdownType) {
                case DG.Analysis.EBreakdownType.eCount:
                  tSliceHeight = tMinBarSliceHeight;
                  break;
                case DG.Analysis.EBreakdownType.ePercent:
                  tSliceHeight = tHasLegend ? Math.abs(tCoordOf100Percent - tCoordOfZero) / iCount :
                      tMinPercentSliceHeight;
              }
              return tSliceHeight;
            });

        this.setIfChanged('barSliceHeights', tSliceHeights);
      },

      /**
       * Base class returns empty string. Subclasses override to compute an informative string.
       * @param iPrimaryName {String}
       * @param iCategoryName {String}
       * @param iTotalNumCases {Number}
       * @param iElement  {Element} Has cell specific properties we need: caseIndices and numCasesInContainingCell
       * @return {String}
       */
      getToolTipText: function(iPrimaryName, iCategoryName, iTotalNumCases, iElement) {
        var tLegendVarID= this.getPath('model.legendVarID'),
            tTemplate, tToolTipText;
        if (!SC.none(tLegendVarID)) {
          tTemplate = iElement.caseIndices.length > 1 ? "DG.BarChartModel.cellTipPlural" :
              "DG.BarChartModel.cellTipSingular";
          if (this.numCasesInContainingCell > 1) {
            iPrimaryName = pluralize(iPrimaryName);
            if (iPrimaryName.endsWith("S")) {
              iPrimaryName = iPrimaryName.replace(/S$/, 's');
            }
          }
          tToolTipText = tTemplate.loc(
              iElement.caseIndices.length,
              iElement.numCasesInContainingCell,
              iPrimaryName,
              Math.round(1000 * iElement.caseIndices.length / iElement.numCasesInContainingCell) / 10,
              iCategoryName
          );
        } else {
          tTemplate = iElement.caseIndices.length > 1 ? "DG.BarChartModel.cellTipNoLegendPlural" :
              "DG.BarChartModel.cellTipNoLegendSingular";
          tToolTipText = tTemplate.loc(
              iElement.caseIndices.length,
              iTotalNumCases,
              Math.round(1000 * iElement.caseIndices.length / iTotalNumCases) / 10,
              iPrimaryName
          );
        }
        return tToolTipText;
      }

    }
);
