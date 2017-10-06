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

sc_require('components/graph/plots/chart_view');

/** @class  DG.BarChartView, a plot of rectangles, one for each category. Each rectangle is made of
 * thinner rectangles, one for each case.

 @extends DG.ChartView
 */
DG.BarChartView = DG.ChartView.extend(
    /** @scope DG.BarChartView.prototype */
    {
      displayProperties: ['barSliceHeight' ],

      /**
       * If we're displaying as a barchart, this is how high the slices of a bar are
       * @property {Number}
       */
      barSliceHeight: 0,

      dataRangeDidChange: function (iSource, iQuestion, iKey, iChanges) {
        var /*this_ = this,
            tCases = this.getPath('model.cases'),
            tRC = this.createRenderContext(),*/
            tChanges = (SC.typeOf(iChanges) === SC.T_NUMBER ? [iChanges] : iChanges);
        tChanges = tChanges || [];

        this.model.invalidateCaches();
        this.computeCellParams();

        tChanges.forEach(function (iIndex) {
          // We can get in here after a delete, in which case, iChanges can be referring to
          // a plot element that no longer exists.
/*
          if (!this_._plottedElements[iIndex])
            this_.callCreateCircle(tCases[iIndex], iIndex, this_._createAnimationOn);
          var tCellIndices = this_.get('model').lookupCellForCaseIndex(iIndex);
          this_.privSetCircleCoords(tRC, tCases[iIndex], iIndex, tCellIndices);
*/
        });
        sc_super();
      },

      /**
       Only recreate elements if necessary. Otherwise, just set svg element coordinates.
       */
      drawData: function drawData() {
        if (SC.none(this.get('paper')))
          return; // not ready to draw
        if (this.getPath('model.isAnimating'))
          return; // Points are animating to new position

        if (!SC.none(this.get('transferredPointCoordinates'))) {
          this.animateFromTransferredPoints();
          return;
        }

        var /*this_ = this,*/
            tModel = this.get('model'),
            tCases = tModel.get('cases')/*,
            tRC = this.createRenderContext(),
            tPlotElementLength = this._plottedElements.length,
            tLayerManager = this.get('layerManager'),
            tIndex*/;

        if (!tCases)
          return; // We can get here before things are linked up during restore

        this.updateSelection();
      },

      /**
       Generate the svg needed to display the plot
       */
      doDraw: function doDraw() {
        sc_super();

        if (!this.getPath('model._cacheIsValid'))
          this.updatePoints();

        this.drawData();
      },

      /**
       We override the base class implementation
       */
      animateFromTransferredPoints: function () {
        var this_ = this,
            tModel = this.get('model'),
            tCases = tModel.get('cases'),
            tRC = this.createRenderContext(),
            tFrame = this.get('frame'), // to convert from parent frame to this frame
            tOldPointAttrs = this.get('transferredPointCoordinates'),
            tNewPointAttrs = [], // used if many-to-one animation (parent to child collection)
            tNewToOldCaseMap = [],
            tOldToNewCaseMap = [];
        if (!tCases)
          return;

        function turnOffAnimation() {
          tModel.set('isAnimating', false);
          this_.displayDidChange(); // Force redisplay in correct position
        }

        function caseLocationSimple(iIndex) {
          // assume a 1 to 1 correspondence of the current case indices to the new cases
          return tOldPointAttrs[iIndex];
        }

        function caseLocationViaMap(iIndex) {
          // use our case index map to go from current case index to previous case index
          return tOldPointAttrs[tNewToOldCaseMap[iIndex]];
        }

        DG.sounds.playMixup();
        this._getTransferredPointsToCasesMap(tNewToOldCaseMap, tOldToNewCaseMap);
        var hasElementMap = tNewToOldCaseMap.length > 0,
            hasVanishingElements = tOldToNewCaseMap.length > 0,
            getCaseCurrentLocation = ( hasElementMap ? caseLocationViaMap : caseLocationSimple );

        this.prepareToResetCoordinates();
        this.removePlottedElements();
        this.computeCellParams();
        tOldPointAttrs.forEach(function (iPoint, iIndex) {
          // adjust old coordinates from parent frame to this view
          iPoint.cx -= tFrame.x;
          iPoint.cy -= tFrame.y;
        });
        tCases.forEach(function (iCase, iIndex) {
          var tPt = getCaseCurrentLocation(iIndex),
              tCellIndices = tModel.lookupCellForCaseIndex(iIndex);
          this_.callCreateCircle(iCase, iIndex, false);
          if (!SC.none(tPt)) {
            this_._plottedElements[iIndex].attr(tPt);
          }
          tPt = this_.privSetCircleCoords(tRC, iCase, iIndex, tCellIndices, true /* animate */);
          if (hasVanishingElements) {
            tNewPointAttrs.push(tPt);
          }
        });
        if (hasVanishingElements) {
          // create a vanishing element for each old point that needs one (used if many-to-one animation)
          tOldPointAttrs.forEach(function (iOldAttrs, iIndex) {
            var tNewIndex = tOldToNewCaseMap[iIndex],
                tNewAttrs = tNewPointAttrs[tNewIndex];
            if (SC.none(tNewIndex) || SC.none(tNewAttrs) || (iOldAttrs.r === 0))
              return; // no vanishing element, if (1) element persists or (2) new circle hidden or (3) old circle hidden
            this_.vanishPlottedElement(iOldAttrs, tNewAttrs);
          });
        }
        this._mustCreatePlottedElements = false;  // because we just created them
        this.set('transferredPointCoordinates', null);

        tModel.set('isAnimating', true);
        SC.Timer.schedule({action: turnOffAnimation, interval: DG.PlotUtilities.kDefaultAnimationTime});
      },

      /**
       We need to decide on the number of points in a row. To do so, we find the
       maximum number of points in a cell and choose so that this max number will
       fit within the length of a cell rect. If there are so many points that they don't fit
       even by using the full length of a cell rect, then we compute an overlap.
       */
      computeCellParams: function () {
        var tCellWidth = this.getPath('primaryAxisView.cellWidth'),
            tCellHeight = this.getPath('secondaryAxisView.fullCellWidth') - 5,
            tMaxInCell = this.getPath('model.maxInCell'),
            tPointSize = 2 * this._pointRadius,
            tAllowedPointsPerColumn = Math.max(1, Math.floor(tCellHeight / tPointSize)),
            tAllowedPointsPerRow = Math.max(1, Math.floor(tCellWidth / tPointSize)),
            tNumPointsInRow = Math.max(1,
                Math.min(tAllowedPointsPerRow,
                    Math.ceil(tMaxInCell / tAllowedPointsPerColumn))),
            tActualPointsPerColumn = Math.ceil(tMaxInCell / tNumPointsInRow),
            tOverlap = Math.max(0, ((tActualPointsPerColumn + 1) * tPointSize - tCellHeight) /
                tActualPointsPerColumn),
            tBarSliceHeight = tCellHeight / tMaxInCell;
        tOverlap = Math.min(tOverlap, tPointSize); // Otherwise points can stack downward

        // Note: Bill points out that 1 is a better default here, but using 1 doesn't fix the bug
        // I'm working on. This may have to do with making sure a notification goes out when
        // 'numPointsInRow' later changes to 1 when the chart becomes valid.
        if (!isFinite(tNumPointsInRow))
          tNumPointsInRow = 0;
        if (!isFinite(tOverlap))
          tOverlap = 0;

        this.beginPropertyChanges();
        this.setIfChanged('numPointsInRow', tNumPointsInRow);
        this.setIfChanged('overlap', tOverlap);
        this.setIfChanged('barSliceHeight', tBarSliceHeight);
        this.endPropertyChanges();
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
      privSetRectCoords: function (iRC, iCase, iIndex, iCellIndices, iAnimate, iCallback) {
        DG.assert(iRC && iRC.xAxisView);
        DG.assert(iCase);
        DG.assert(DG.MathUtilities.isInIntegerRange(iIndex, 0, this._plottedElements.length));
        var tRect = this._plottedElements[iIndex]/*,
        tIsMissingCase = SC.none( iCellIndices )*/;

        // show or hide if needed, then update if shown.
        // if( this.showHidePlottedElement(tRect, tIsMissingCase)) {

        var tCellHalfWidth = iRC.primaryAxisView.get('fullCellWidth') / 2,
            tCellHeight = iRC.secondaryAxisView.get('fullCellWidth'),
            tBarSliceHeight = this.get('barSliceHeight'),
            tTop = (iCellIndices.indexInCell + 1) * tBarSliceHeight,
            tEdge = iRC.primaryAxisView.cellToCoordinate(iCellIndices.primaryCell) -
                tCellHalfWidth / 2,
            tCoordX, tCoordY, tWidth, tHeight;

        if (iRC.isVerticalOrientation) {
          tCoordX = tEdge;
          tCoordY = tCellHeight - tTop;
          tWidth = tCellHalfWidth;
          tHeight = tBarSliceHeight;
        }
        else {
          tCoordX = tTop - tBarSliceHeight;
          tCoordY = tEdge;
          tWidth = tBarSliceHeight;
          tHeight = tCellHalfWidth;
        }
        var tAttrs = {
          x: tCoordX, y: tCoordY, r: 0.1, width: tWidth, height: tHeight,
          fill: iRC.calcCaseColorString(iCase),
          'fill-opacity': iRC.transparency
        };
        tRect.animate(tAttrs, DG.PlotUtilities.kDefaultAnimationTime);
        // this.updatePlottedElement( tRect, tAttrs, iAnimate, iCallback);
        // }
      },

      displayAsBarChartDidChange: function () {
        var tPaper = this.get('paper'),
            tR = this._pointRadius,
            tPlottedElements = this._plottedElements,
            tLayerManager = this.get('layerManager'),
            tLayer = tLayerManager[DG.LayerNames.kPoints],
            tRenderContext = this.createRenderContext(),
            tModel = this.get('model'),
            tCases = tModel.get('cases');
        if (this.getPath('model.displayAsBarChart')) {
          tPlottedElements.forEach(function (iElement, iIndex) {
            var cx = iElement.attr('cx'),
                cy = iElement.attr('cy'),
                fill = iElement.attr('fill'),
                opacity = iElement.attr('fill-opacity'),
                strokeOpacity = 0, //iElement.attr('stroke-opacity'),
                tRect = tPaper.rect(cx - tR, cy - tR, 2 * tR, 2 * tR)
                    .attr({
                      fill: fill, 'fill-opacity': opacity, stroke: fill, 'stroke-opacity': strokeOpacity,
                      r: tR
                    });
            tLayerManager.removeElement(iElement);
            tPlottedElements[iIndex] = tRect;
            tLayer.push(tRect);
            this.privSetRectCoords(tRenderContext, tCases[iIndex], iIndex,
                tModel.lookupCellForCaseIndex(iIndex), true /*animate*/, null /* no callback */);
          }.bind(this));
        }
      }.observes('model.displayAsBarChart')

    });

