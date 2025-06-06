// ==========================================================================
//                          DG.ComputedBarChartView
//
//  Author:   Kirk Swenson
//
//  Copyright (c) 2020 by The Concord Consortium, Inc. All rights reserved.
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

/** @class  DG.BarChartView, a plot of rectangles, one for each category. Each rectangle is made of
 * thinner rectangles, one for each case.

 @extends DG.ComputedBarChartView
 */
DG.ComputedBarChartView = DG.BarChartBaseView.extend(
  /** @scope DG.ComputedBarChartView.prototype */
  {
    /**
     * Return the class of the count axis with the x or y to put it on.
     * @return {[{}]}
     */
    getAxisViewDescriptions: function () {
      var tDescriptions = sc_super(),
          tNumericKey = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical ? 'y' : 'x';
      tDescriptions.push( {
        axisKey: tNumericKey,
        axisClass: DG.FormulaAxisView
      });
      return tDescriptions;
    },

    /**
     * We have to set things up for animation
     */
    formulaDidChange: function() {
      var tModel = this.get('model');
      // Store the current element coordinates for use in animation
      this.set('transferredElementCoordinates', this.getElementPositionsInParentFrame());
      var tSecondaryAxisModel = tModel.get('secondaryAxisModel'),
          tStashedBounds = {
            lower: tSecondaryAxisModel.get('lowerBound'),
            upper: tSecondaryAxisModel.get('upperBound')
          };
      // Set axis to final position so final positions of rectangles can be computed
      tModel.doRescaleAxesFromData([tModel.get('secondaryAxisPlace')], true, false, false);
      this.animateFromTransferredElements();
      // Put axis back where it was so it can animate
      tSecondaryAxisModel.setDataMinAndMax(tStashedBounds.lower, tStashedBounds.upper, true);
      // Cause plot view to animate
      this.notifyPropertyChange('plotDisplayDidChange');
      // Simultaneously cause axis to animate
      tModel.doRescaleAxesFromData([tModel.get('secondaryAxisPlace')], true, true, false);
    }.observes('model.formula'),

    getBarHeight: function(iPrimaryName, iCount, iTotal) {
      var model = this.get('model'),
          barHeight = model && model.getBarHeight(iPrimaryName);
      return model && barHeight * iCount / iTotal;
    },

    /**
     * The primaryAxisView needs to be told that its tick marks and labels are to be centered in each cell.
     */
    setupAxes: function () {
      var tAxisModel = this.getPath('secondaryAxisView.model');
      tAxisModel.set('drawZeroLine', true);
      tAxisModel.set('expressionSource', this.get('model'));
    },

    drawData: function drawData() {
      var model = this.get('model');
      model._buildCache();
      sc_super();
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
      var tRect = this.get('plottedElements')[iIndex];

      // It can happen that we don't have cell indices yet. Bail for now cause we'll be back later.
      if( !iCellIndices)
        return;

      var tCellHalfWidth = iRC.barWidth,
          // tFullBarWorldHeight = this.get('model').
          tBarSliceHeight = iRC.barSliceHeights[iCellIndices.primaryCell],
          tIndexInCell = iCellIndices.indexInCell,
          tEdge = iRC.primaryAxisView.cellToCoordinate(iCellIndices.primaryCell) -
              tCellHalfWidth / 2,
          tTop, tCoordX, tCoordY, tWidth, tHeight;

      if (iRC.isVerticalOrientation) {
        tTop = tBarSliceHeight < 0 ? iRC.zeroOnSecondaryAxis - tIndexInCell * tBarSliceHeight :
            iRC.zeroOnSecondaryAxis - (tIndexInCell + 1) * tBarSliceHeight;
        tCoordX = tEdge;
        tCoordY = tTop;
        tWidth = tCellHalfWidth;
        tHeight = Math.abs(tBarSliceHeight);
      }
      else {
        if( tBarSliceHeight < 0) {
          tTop = iRC.zeroOnSecondaryAxis + (tIndexInCell + 1) * tBarSliceHeight;
          tCoordX = tTop;
        }
        else {
          tTop = iRC.zeroOnSecondaryAxis + (tIndexInCell + 1) * tBarSliceHeight;
          tCoordX = tTop - tBarSliceHeight;
        }
        tCoordY = tEdge;
        tWidth = Math.abs(tBarSliceHeight);
        tHeight = tCellHalfWidth;
      }
      var tNewAttrs = {
        x: tCoordX, y: tCoordY, r: 0.1, width: tWidth, height: tHeight,
        fill: iRC.calcCaseColorString(iCase),
        'fill-opacity': iRC.transparency,
        'stroke-opacity': 0
      };
      if (iAnimate) {
        tRect.animate(tNewAttrs, DG.PlotUtilities.kDefaultAnimationTime, '<>', iCallback);
      }
      else {
        tRect.attr(tNewAttrs);
      }
      return tRect;
    },

    /**
     * We compute the height of each slice, corresponding to each case in a cell. These differ from cell to
     * cell since the total height of a bar depends on evaluation of the formula for that cell.
     * Slice heights are in display coordinates. Negative heights indicate a bar that descends downward
     * from zero.
     */
    computeCellParams: function () {
      var tPrimaryVarID = this.getPath('model.primaryVarID'),
          tSecondaryAxisView = this.get('secondaryAxisView'),
          tSecondaryIsHorizontal = tSecondaryAxisView.get('orientation') === 'horizontal',
          tZeroCoord = tSecondaryAxisView.dataToCoordinate(0),
          tSliceHeights = [],
          tModel = this.get('model');
      tModel.get('validCachedCells').forEach( function( iPrimary, iPrimaryIndex) {
        var tPrimaryName = iPrimary[0][0].theCase.getValue(tPrimaryVarID),
            tCellValue = tModel.getBarHeight( tPrimaryName),
            tNumInCell = iPrimary.reduce(function( iAccCount, iSecondary) {
              return iAccCount + iSecondary.length;
            }, 0),
            tSliceHeight =  (tZeroCoord - tSecondaryAxisView.dataToCoordinate( tCellValue)) / tNumInCell;
        if(tSecondaryIsHorizontal)
          tSliceHeight = -tSliceHeight;
        tSliceHeights.push( tSliceHeight);
      });
      this.setIfChanged('barSliceHeights', tSliceHeights);
    },

    /**
     * Base class returns empty string. Subclasses override to compute an informative string.
     * @param iPrimaryName {String}
     * @param iCategoryName {String}
     * @param iTotalNumCases {Number}
     * @param iElement  {Element} Has cell specific properties we need: caseIndices and numCasesInContainingCell
     * @return {String} "<primary> has value of <number>"
     */
    getToolTipText: function(iPrimaryName, iCategoryName, iTotalNumCases, iElement) {
      var tPrecision = DG.PlotUtilities.findFractionDigitsForAxis( this.get('secondaryAxisView')),
          tNumFormat = DG.Format.number().fractionDigits( 0, tPrecision).group('');
      return "DG.ComputedBarChartModel.cellTip".loc( iPrimaryName,
          tNumFormat(this.get('model').getBarHeight(iPrimaryName)));
    }

  }
);

DG.ComputedBarChartView.createFormulaEditView = function(iPlotModel, iIsUndoable) {
  var tFormulaEditContext = DG.BarChartFormulaEditContext.getFormulaEditContext(iPlotModel);
  tFormulaEditContext.set('clientOptions', {
    isUndoable: iIsUndoable,
    attrNamePrompt: 'DG.BarChartFunction.namePrompt',
    formulaPrompt: 'DG.BarChartFunction.formulaPrompt',
    formulaHint: 'DG.BarChartFunction.formulaHint',
    commandName: 'graph.editBarChartFunction',
    undoString: 'DG.Undo.graph.changeBarChartFunction',
    redoString: 'DG.Redo.graph.changeBarChartFunction',
    logMessage: 'Change bar chart function: "%@1" to "%@2"'
  });
  tFormulaEditContext.openFormulaEditorDialog();
};

