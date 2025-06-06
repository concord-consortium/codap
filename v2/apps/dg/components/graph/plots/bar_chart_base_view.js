// ==========================================================================
//                          DG.BarChartBaseView
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

/** @class  DG.BarChartBaseView, a plot of rectangles, one for each category. Each rectangle is made of
 * thinner rectangles, one for each case.

 @extends DG.ChartView
 */
DG.BarChartBaseView = DG.ChartView.extend(
  /** @scope DG.BarChartBaseView.prototype */
    {
      /**
       * Expected type of plotted elements
       */
      plottedElementType: 'rect',

      /**
       * If we're displaying as a barchart, this is how high the slices are in a given bar in display coordinates
       * @property {[Number]}
       */
      barSliceHeights: null,

      _categoryCellToolTip: null,
      categoryCellToolTip: function () {
        if (!this._categoryCellToolTip) {
          this._categoryCellToolTip = DG.ToolTip.create({
            paperSource: this,
            layerName: 'dataTip'
          });
        }
        return this._categoryCellToolTip;
      }.property(),

      /**
       * @property {DG.Layer}
       */
      _coverRectsLayer: null,
      coverRectsLayer: function () {
        if (!this._coverRectsLayer && this.getPath('paperSource.layerManager')) {
          this._coverRectsLayer = this.getPath('paperSource.layerManager.' + DG.LayerNames.kCoverRects);
        }
        return this._coverRectsLayer;
      }.property(),

      upperBoundDidChange: function () {
        this.computeCellParams();
        this.displayDidChange();
      }.observes('*secondaryAxisView.model.upperBound'),

      init: function () {
        sc_super();

        this.barSliceHeights = [];
      },

      destroy: function () {
        var tLayerManager = this.get('layerManager'),
            tPlottedElements = this.get('plottedElements');
        tPlottedElements.forEach(function (iElement) {
          tLayerManager.removeElement(iElement, true /* callRemove */);
        });
        tPlottedElements.length = 0;
        this.get('coverRectsLayer').clear();

        sc_super();
      },

      dataRangeDidChange: function (iSource, iQuestion, iKey, iChanges) {
        var this_ = this,
            tCases = this.getPath('model.cases'),
            tRC = this.createRenderContext(),
            tChanges = (SC.typeOf(iChanges) === SC.T_NUMBER ? [iChanges] : iChanges);
        tChanges = tChanges || [];

        this.model.invalidateCaches();
        this.computeCellParams();

        tChanges.forEach(function (iIndex) {
          // We can get in here after a delete, in which case, iChanges can be referring to
          // a plot element that no longer exists.
          if (!this_.get('plottedElements')[iIndex])
            this_.callCreateElement(tCases.at(iIndex), iIndex, this_._createAnimationOn);
          var tCellIndices = this_.get('model').lookupCellForCaseIndex(iIndex);
          this_.privSetElementCoords(tRC, tCases.at(iIndex), iIndex, tCellIndices);
        });
        sc_super();
      },

      /**
       * Construct and return a new render context
       * used for setCircleCoordinate()
       * @return {*}
       */
      createRenderContext: function () {
        var tRC = sc_super();

        // cache some more render parameters common to all cases, but unique to BarChartBaseView.
        tRC.barSliceHeights = this.get('barSliceHeights');
        tRC.barWidth = tRC.primaryAxisView.get('fullCellWidth') / 2;
        tRC.zeroOnSecondaryAxis = tRC.secondaryAxisView.dataToCoordinate(0);

        return tRC;
      },

      /**
       * If defined, this function gets called after cases have been added or values changed, but only once,
       * and only after a sufficient time has elapsed.
       * @property { Function }
       */
      cleanupFunc: function () {
        this.get('model').rescaleAxesFromData(true /* allow shrinkage */, true /* allow animation */);
        sc_super();
      },

      /**
       * Base class returns empty string. Subclasses override to compute an informative string.
       * @param iPrimaryName {String}
       * @param iCategoryName {String}
       * @param iTotalNumCases {Number}
       * @param iElement  {Element} Has cell specific properties we need
       * @return {String}
       */
      getToolTipText: function(iPrimaryName, iCategoryName, iTotalNumCases, iElement) {
        return '';
      },

      /**
       * @param iCase
       * @param iIndex
       * @param iAnimate
       */
      createElement: function (iCase, iIndex, iAnimate) {
        // Can't create rects if we don't have paper for them
        if (!this.get('paper')) return;

        var tRect = this.get('paper').rect(-1000, -1000, 0, 0)
            .attr({
              fill: DG.PlotUtilities.kDefaultPointColor,
              stroke: 'none'
            });
        tRect.node.setAttribute('shape-rendering', 'geometric-precision');
        /*
                if (iAnimate)
                  DG.PlotUtilities.doCreateRectAnimation(tRect);
        */
        return tRect;
      },

      updateAllCoordinates: function (iAnimate, iCallback) {
        var tModel = this.get('model'),
            tRC = this.createRenderContext(),
            tCases = this.getPath('model.cases'),
            tDataLength = tCases && tCases.get('length');
        tCases.forEach(function (iCase, iIndex) {
          var tCallback = iIndex === tDataLength - 1 ? iCallback : null,
              tCellIndices = tModel.lookupCellForCaseIndex(iIndex);
          this.privSetElementCoords(tRC, iCase, iIndex, tCellIndices, iAnimate, tCallback);
        }.bind(this));
      },

      /**
       @param { Boolean }
       @param { Function }
       */
      updateElements: function (iAnimate, iCallback) {
        // It's possible to get here before didCreateLayer() creates the get('paper').
        if (!this.get('paper'))
          return;
        sc_super();
        this.computeCellParams();
        var tModel = this.get('model'),
            tCases = this.getPath('model.cases'),
            tRC = this.createRenderContext(),
            tDataLength = tCases && tCases.get('length'),
            tPlottedElements = this.get('plottedElements'),
            tPlotElementLength = tPlottedElements.length,
            tLayerManager = this.get('layerManager'),
            tIndex, tCellIndices;

        // for any new cases
        if (tDataLength > tPlotElementLength) {
          // add plot elements for added cases
          for (tIndex = tPlotElementLength; tIndex < tDataLength; tIndex++) {
            this.callCreateElement(tCases.at(tIndex), tIndex, this.animationIsAllowable());
            tCellIndices = tModel.lookupCellForCaseIndex(tIndex);
            this.privSetElementCoords(tRC, tCases.at(tIndex), tIndex, tCellIndices, iAnimate, iCallback);
          }
        }
        // Get rid of plot elements for removed cases and update all coordinates
        if (tDataLength < tPlotElementLength) {
          for (tIndex = tDataLength; tIndex < tPlotElementLength; tIndex++) {
            // It can happen during closing of a document that the elements no longer exist, so we have to test
            if (!SC.none(tPlottedElements[tIndex])) {
              tPlottedElements[tIndex].stop();
              DG.PlotUtilities.doHideRemoveAnimation(tPlottedElements[tIndex], tLayerManager);
            }
          }
          // update all coordinates because we don't know which cases were deleted
          this.updateAllCoordinates(iAnimate, iCallback);
        }
        this._isRenderingValid = false;
      },

      /**
       Only recreate elements if necessary. Otherwise, just set svg element coordinates.
       */
      drawData: function drawData() {
        sc_super();

        // this.updateSelection();

        this.drawSubBars();
      },

      /**
       * Cases are stacked as rectangles, grouped first by a primary attribute and then by a legend attribute.
       */
      drawSubBars: function () {

        /**
         * iPrimaryCoord - left/bottom edge of cell on primary/categorical axis
         * iStartCoord - bottom/left edge of bar [segment] on secondary/numeric axis
         *                (top/right edge of previous bar [segment])
         * iCount - count of cases represented by this bar [segment]
         * iCaseIndices - the indices of the cases represented by this bar [segment]
         * iNumCasesInContainingCell - the number of cases in the current cell
         *                (used for tooltip and percentage calculations)
         * iCategoryName - the legend category for the current cell, if any (used for tooltip)
         * iPrimaryName - the primary axis category for the current cell (used for tooltip)
         * iTotalNumCases - the total number of cases in all cells (used for tooltip only when no legend is present)
         */
        var makeRect = function (iPrimaryCoord, iStartCoord, iCount, iCaseIndices,
                                 iNumCasesInContainingCell, iCategoryName, iPrimaryName, iTotalNumCases) {
          var this_ = this,
              tToolTipText, tToolTip,
              tTotalCount = tHasLegend ? iNumCasesInContainingCell : iTotalNumCases,
              tBarTop = this.getBarHeight(iPrimaryName, iCount, tTotalCount),
              tCurrCoord = tRC.secondaryAxisView.dataToCoordinate(tBarTop),
              tX, tY, tWidth, tHeight;
          if (tRC.isVerticalOrientation) {
            tX = iPrimaryCoord - tRC.barWidth / 2 - 1;
            tY = tBarTop < 0 ? iStartCoord : tCurrCoord - 1;
            tWidth = tRC.barWidth + 2;
            tHeight = Math.abs(iStartCoord - tCurrCoord + 2);
          } else {
            tX = tBarTop < 0 ? tCurrCoord - 1 : iStartCoord;
            tY = iPrimaryCoord - tRC.barWidth / 2 - 1;
            tWidth = Math.abs(tCurrCoord + 2 - iStartCoord);
            tHeight = tRC.barWidth + 2;
          }
          var tRect = tPaper.rect(tX, tY, tWidth, tHeight)
              .attr({stroke: 'none', fill: 'white', 'fill-opacity': 0.001, cursor: 'pointer'})
              .hover(function (iEvent) {
                    // Note that Firefox can come through here repeatedly so we have to check for existence
                    this.animate({
                      'fill-opacity': 0.4
                    }, DG.PlotUtilities.kDataTipShowTime);
                    tToolTip = this_.get('categoryCellToolTip');
                    tToolTipText = this_.getToolTipText(iPrimaryName, iCategoryName, iTotalNumCases, this);
                    tToolTip.set('text', tToolTipText);
                    tToolTip.set('tipOrigin', {x: iEvent.layerX, y: iEvent.layerY});
                    tToolTip.show();
                  },
                  function (event) { // out
                    this.stop();
                    this.animate({
                      'fill-opacity': 0.001
                    }, DG.PlotUtilities.kHighlightHideTime);
                    if (tToolTip)
                      tToolTip.hide();
                  }
              )
              .mousedown(function (iEvent) {
                SC.run(function () {
                  this_.get('model').selectCasesWithIndices(this.caseIndices, iEvent.shiftKey);
                }.bind(this));
              });
          tRect.caseIndices = iCaseIndices;
          tRect.numCasesInContainingCell = iNumCasesInContainingCell;
          tCoverRectsLayer.push(tRect);
          return tCurrCoord;
        }.bind(this);

        var tPaper = this.get('paper'),
            tCoverRectsLayer = this.get('coverRectsLayer'),
            tCellArray = this.getPath('model.validCachedCells'),
            tRC = this.createRenderContext(),
            tPrimaryVarID = this.getPath('model.primaryVarID'),
            tLegendVarID = this.getPath('model.legendVarID'),
            tHasLegend = !SC.none(tLegendVarID),
            tTotalNumCases = this.getPath('model.cases').length();
        tCoverRectsLayer.clear();
        tCellArray.forEach(function (iPrimary, iPrimaryIndex) {
          // This is the primary division. It has an array for each category on the secondary axis
          var tPrimaryCoord = tRC.primaryAxisView.cellToCoordinate(iPrimaryIndex),
              tPrimaryName = iPrimary[0][0].theCase.getValue(tPrimaryVarID);
          iPrimary.forEach(function (iSecondary, iSecondaryIndex) {
            var tCount = 0,
                tTotalNumCasesInPrimary = iSecondary.length,
                tTotalNumCasesForBar = tHasLegend ? tTotalNumCasesInPrimary : tTotalNumCases,
                tBarTop = this.getBarHeight(tPrimaryName, tCount, tTotalNumCasesForBar),
                tPreviousCoord = tRC.secondaryAxisView.dataToCoordinate(tBarTop),
                tPreviousValue = null,
                tCaseIndices = [],
                tValue;
            // The given array contains an element for each case belonging to this stack
            iSecondary.forEach(function (iCaseContainer, iIndex) {
              tValue = iCaseContainer.theCase.getValue(tLegendVarID);
              // don't render the first bar segment since it's rendered below
              if (tPreviousValue && tValue !== tPreviousValue) {
                tPreviousCoord = makeRect(tPrimaryCoord, tPreviousCoord, tCount,
                    tCaseIndices, tTotalNumCasesInPrimary, tPreviousValue, tPrimaryName, tTotalNumCasesForBar);
                tCaseIndices = [];
              }
              tCaseIndices.push(iCaseContainer.caseIndex);
              tCount++;
              tPreviousValue = tValue;
            }.bind(this));
            // renders the bar for simple bar charts and the first bar segment for split bars
            makeRect(tPrimaryCoord, tPreviousCoord, tCount,
                tCaseIndices, tTotalNumCasesInPrimary, tValue, tPrimaryName, tTotalNumCases);
          }.bind(this));
        }.bind(this));
      },

      /**
       Override base class because we're dealing with rectangles, not points.
       @return {Array of {x:{Number}, y:{Number}, width:{Number}, height:{Number}, cx:{Number}, cy:{Number}, r:{Number}, fill:{String}}}
       */
      getElementPositionsInParentFrame: function () {

        var tFrame = this.get('frame');
        return this.get('plottedElements').map(function (iElement) {
          var tX = iElement.attr('x') + tFrame.x,
              tY = iElement.attr('y') + tFrame.y,
              tWidth = iElement.attr('width'),
              tHeight = iElement.attr('height'),
              tR = 0, //Math.min( tWidth, tHeight) / 2,
              tCx = tX + tWidth / 2,
              tCy = tY + tHeight / 2,
              tResult = {
                x: tX, y: tY, width: tWidth, height: tHeight, cx: tCx, cy: tCy, r: tR,
                fill: iElement.attr('fill'), type: 'rect', stroke: iElement.attr('stroke'),
                'stroke-opacity': iElement.attr('stroke-opacity')
              };
          return tResult;
        });
      },

      /**
       We override the base class implementation
       */
      animateFromTransferredElements: function () {
        var this_ = this,
            tModel = this.get('model'),
            tCases = tModel.get('cases'),
            tRC = this.createRenderContext(),
            tFrame = this.get('frame'), // to convert from parent frame to this frame
            tOldElementAttrs = this.get('transferredElementCoordinates'),
            tNewElementAttrs = [], // used if many-to-one animation (parent to child collection)
            tNewToOldCaseMap = [],
            tOldToNewCaseMap = [],
            tOldElementsAreCircles = tOldElementAttrs[0] && tOldElementAttrs[0].type === 'circle';
        if (!tCases)
          return;

        function turnOffAnimation() {
          tModel.set('isAnimating', false);
          this_.get('plottedElements').forEach(function (iElement) {
            iElement.stop();
          });
          this_.displayDidChange(); // Force redisplay in correct position
        }

        function caseLocationSimple(iIndex) {
          // assume a 1 to 1 correspondence of the current case indices to the new cases
          return tOldElementAttrs[iIndex];
        }

        function caseLocationViaMap(iIndex) {
          // use our case index map to go from current case index to previous case index
          return tOldElementAttrs[tNewToOldCaseMap[iIndex]];
        }

        DG.sounds.playMixup();
        this._getTransferredElementsToCasesMap(tNewToOldCaseMap, tOldToNewCaseMap);
        var hasElementMap = tNewToOldCaseMap.length > 0,
            hasVanishingElements = tOldToNewCaseMap.length > 0,
            getCaseCurrentLocation = (hasElementMap ? caseLocationViaMap : caseLocationSimple),
            tPlottedElements = this.get('plottedElements'),
            tTransAttrs;

        this.prepareToResetCoordinates();
        this.removePlottedElements();
        // Normally we leave the elements (circles) for re-use. But since we want rects, we have let go of the circles.
        tPlottedElements.forEach(function (iElement) {
          iElement.remove();
        });
        tPlottedElements.length = 0;
        this.computeCellParams();
        tOldElementAttrs.forEach(function (iElement, iIndex) {
          // adjust old coordinates from parent frame to this view
          // In case it's a point
          iElement.cx -= tFrame.x;
          iElement.cy -= tFrame.y;
          // in case it's a rect
          iElement.x -= tFrame.x;
          iElement.y -= tFrame.y;
        });
        tCases.forEach(function (iCase, iIndex) {
          var tOldElement = getCaseCurrentLocation(iIndex),
              tCellIndices = tModel.lookupCellForCaseIndex(iIndex),
              tElement = this_.callCreateElement(iCase, iIndex, false);
          if (!SC.none(tOldElement)) {
            tTransAttrs = {
              r: tOldElementsAreCircles ? tOldElement.r : 0,
              x: tOldElementsAreCircles ? tOldElement.cx - tOldElement.r : tOldElement.x,
              y: tOldElementsAreCircles ? tOldElement.cy - tOldElement.r : tOldElement.y,
              width: tOldElementsAreCircles ? 2 * tOldElement.r : tOldElement.width,
              height: tOldElementsAreCircles ? 2 * tOldElement.r : tOldElement.height,
              fill: tOldElement.fill,
              stroke: tOldElement.fill
            };
            tElement.attr(tTransAttrs);
          }
          tElement = this_.privSetElementCoords(tRC, iCase, iIndex, tCellIndices, true /* animate */);
          if (hasVanishingElements) {
            tNewElementAttrs.push(tElement);
          }
        });
        if (hasVanishingElements) {
          // create a vanishing element for each old element that needs one (used if many-to-one animation)
          tOldElementAttrs.forEach(function (iOldAttrs, iIndex) {
            var tNewIndex = tOldToNewCaseMap[iIndex],
                tNewAttrs = tNewElementAttrs[tNewIndex];
            if (SC.none(tNewIndex) || SC.none(tNewAttrs) || (iOldAttrs.r === 0))
              return; // no vanishing element, if (1) element persists or (2) new element hidden or (3) old element hidden
            this_.vanishPlottedElement(iOldAttrs, tNewAttrs);
          });
        }
        this.set('transferredElementCoordinates', null);

        tModel.set('isAnimating', true);
        SC.Timer.schedule({action: turnOffAnimation, interval: DG.PlotUtilities.kDefaultAnimationTime});
      }
    }
);
