// ==========================================================================
//                          DG.DotChartView
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

sc_require('components/graph/plots/chart_view');

/** @class  DG.DotChartView, a plot of dots each placed according to categorical values

 @extends DG.ChartView
 */
DG.DotChartView = DG.ChartView.extend(
    /** @scope DG.DotChartView.prototype */
    {
      displayProperties: ['numPointsInRow', 'overlap'],

      /**
       @property{Number}
       */
      numPointsInRow: 1,

      /**
       @property{Number}
       */
      overlap: 0,

      /**
       Note: There's a lot of redundancy here with plotLayer::dataDidChange. But it's difficult to
       refactor further because of the need to deal with positioning points via
       privSetElementCoords.
       */
      updateElements: function () {
        // It's possible to get here before didCreateLayer() creates the get('paper').
        if (!this.get('paper'))
          return;
        sc_super();
        var this_ = this,
            tModel = this.get('model'),
            tCases = this.getPath('model.cases'),
            tRC = this.createRenderContext(),
            tDataLength = tCases && tCases.get('length'),
            tPlottedElements = this.get('plottedElements'),
            tPlotElementLength = tPlottedElements.length,
            tCandidateRadius = this.calcPointRadius(),
            tWantNewPointRadius = (this._pointRadius !== tCandidateRadius),
            tLayerManager = this.get('layerManager'),
            tIndex, tCellIndices;
        // update the point radius before creating or updating plotted elements
        if (tWantNewPointRadius)
          this._pointRadius = tCandidateRadius;

        // for any new cases
        if (tDataLength > tPlotElementLength) {
          if (tWantNewPointRadius) {
            // update the point radius for existing plotted elements
            for (tIndex = 0; tIndex < tPlotElementLength; tIndex++) {
              tCellIndices = tModel.lookupCellForCaseIndex(tIndex);
              // tCellIndices may come out null if the case has empty values
              // Note that we don't animate here because things can happen during the
              // animation that change the destination.
              this.privSetElementCoords(tRC, tCases.at(tIndex), tIndex, tCellIndices);
            }
          }
          // add plot elements for added cases
          for (tIndex = tPlotElementLength; tIndex < tDataLength; tIndex++) {
            this.callCreateElement(tCases.at(tIndex), tIndex, this.animationIsAllowable());
            tCellIndices = tModel.lookupCellForCaseIndex(tIndex);
            this.privSetElementCoords(tRC, tCases.at(tIndex), tIndex, tCellIndices);
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
          tCases.forEach(function (iCase, iIndex) {
            tCellIndices = tModel.lookupCellForCaseIndex(iIndex);
            this_.privSetElementCoords(tRC, iCase, iIndex, tCellIndices);
          });
        }
        this._isRenderingValid = false;
      },

      dataRangeDidChange: function (iSource, iQuestion, iKey, iChanges) {
        var this_ = this,
            tCases = this.getPath('model.cases'),
            tPlottedElements = this.get('plottedElements'),
            tRC = this.createRenderContext(),
            tChanges = (SC.typeOf(iChanges) === SC.T_NUMBER ? [iChanges] : iChanges);
        tChanges = tChanges || [];

        this.model.invalidateCaches();
        this.computeCellParams();

        tChanges.forEach(function (iIndex) {
          // We can get in here after a delete, in which case, iChanges can be referring to
          // a plot element that no longer exists.
          //DG.assert( this.get('plottedElements')[ iIndex], "dataRangeDidChange: missing plotted element!");
          if (!tPlottedElements[iIndex])
            this_.callCreateElement(tCases.at(iIndex), iIndex, this_._createAnimationOn);
          var tCellIndices = this_.get('model').lookupCellForCaseIndex(iIndex);
          this_.privSetElementCoords(tRC, tCases.at(iIndex), iIndex, tCellIndices);
        });
        sc_super();
      },

      /**
       * Set the coordinates and other attributes of the case circle (a Rafael element in this.get('plottedElements')).
       * @param iRC {} case-invariant Render Context
       * @param iCase {DG.Case} the case data
       * @param iIndex {number} index of case in collection
       * @param iAnimate {Boolean} (optional) want changes to be animated into place?
       * @returns {cx {Number},cy {Number}} final coordinates or null if not defined (hidden plot element)
       */
      setCircleCoordinate: function setCircleCoordinate(iRC, iCase, iIndex, iAnimate, iCallback) {
        var tCellIndices = this.get('model').lookupCellForCaseIndex(iIndex);
        this.privSetElementCoords(iRC, iCase, iIndex, tCellIndices, iAnimate, iCallback);
      },

      privGetElementCoordAttrs: function (iElement, iRC, iCase, iIndex, iCellIndices) {
        var tCellHalfWidth = iRC.cellHalfWidth,
            tNumInRow = this.get('numPointsInRow'),
            tOverlap = this.get('overlap'),
            tRow = Math.floor(iCellIndices.indexInCell / tNumInRow),
            tCol = iCellIndices.indexInCell - tRow * tNumInRow,
            tRadius = this._pointRadius,
            tPointSize = 2 * tRadius,
            tPrimaryCoord = iRC.primaryAxisView.cellToCoordinate(iCellIndices.primaryCell) -
                (tNumInRow - 1) * tPointSize / 2 + tCol * tPointSize,
            tSecondaryCoord = iRC.secondaryAxisView.cellToCoordinate(iCellIndices.secondaryCell),
            tOffset = ((tRow + 0.5) * (tPointSize - tOverlap) + 1 + tOverlap / 2),
            tCoordX, tCoordY;

        DG.assert(DG.isFinite(tPrimaryCoord) && DG.isFinite(tSecondaryCoord), 'tPrimaryCoord & tSecondaryCoord');

        if (iRC.isVerticalOrientation) {
          tCoordX = tPrimaryCoord;
          tCoordY = tSecondaryCoord + tCellHalfWidth - tOffset;
        }
        else {
          tCoordX = tSecondaryCoord - tCellHalfWidth + tOffset;
          tCoordY = tPrimaryCoord;
        }
        DG.assert(isFinite(tCoordX) && isFinite(tCoordY));

        var tAttrs = {
          cx: tCoordX, cy: tCoordY, r: this.radiusForCircleElement(iElement),
          fill: iRC.calcCaseColorString(iCase), stroke: iRC.calcStrokeColorString( iCase),
          'fill-opacity': iRC.transparency, 'stroke-opacity': iRC.strokeTransparency
        };

        return tAttrs;
      },

      /**
       We set the coordinates of the points.
       Note the tricky computation for secondary coordinate: the 0.5 is to left the center up half a point size.
       the "1" is to lift the center far enough that the circle border doesn't get cut off.
       */
      privSetElementCoords: function (iRC, iCase, iIndex, iCellIndices, iAnimate, iCallback) {

        DG.assert(iRC && iRC.xAxisView);
        DG.assert(iCase);
        DG.assert(DG.MathUtilities.isInIntegerRange(iIndex, 0, this.get('plottedElements').length));
        var tElement = this.get('plottedElements')[iIndex],
            tIsMissingCase = SC.none(iCellIndices);

        // show or hide if needed, then update if shown.
        if (this.showHidePlottedElement(tElement, tIsMissingCase, iIndex)) {
          var tAttrs = this.privGetElementCoordAttrs({_selected: false}, iRC, iCase, iIndex, iCellIndices);
          this.updatePlottedElement(tElement, tAttrs, iAnimate, iCallback);
        }
      },

      /**
       * Return the class of the count axis with the x or y to put it on.
       * @return {[{}]}
       */
      getAxisViewDescriptions: function () {
        var tDescriptions = sc_super(),
            tAxisKey = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical ? 'y' : 'x';
        tDescriptions.push({
          axisKey: tAxisKey,
          axisClass: (this.getPath('model.dataConfiguration.' + tAxisKey + 'AttributeDescription.isNull')) ?
              DG.AxisView : DG.CellAxisView
        });
        return tDescriptions;
      },

      assignElementAttributes: function (iElement, iIndex, iAnimate) {
        sc_super();

        var this_ = this,
            tInitialTransform = null,
            kOpaque = 1,
            tBackground = this.get('paperSource');

        function startMarquee(iWindowX, iWindowY, iEvent) {
          tBackground.prepareMarquee();
          var tStartPt = tBackground.startMarquee(iWindowX, iWindowY, iEvent, true /* don't deselect */),
              tPtRadius = this.attr('r');
          // Adjust start point so we're more likely to encompass the case represented by this element
          tStartPt.x -= tPtRadius;
          tStartPt.y -= tPtRadius;
        }

        iElement.hover(function (event) {
              // Note that Firefox can come through here repeatedly so we have to check for existence
              if (SC.none(tInitialTransform)) {
                tInitialTransform = '';
                this.animate({
                  opacity: kOpaque,
                  transform: DG.PlotUtilities.kDataHoverTransform
                }, DG.PlotUtilities.kDataTipShowTime);
                this_.showDataTip(this, iIndex);
              }
            },
            function (event) { // out
              this.stop();
              this.animate({
                opacity: DG.PlotUtilities.kDefaultPointOpacity,
                transform: tInitialTransform
              }, DG.PlotUtilities.kHighlightHideTime);
              tInitialTransform = null;
              this_.hideDataTip();
            })
            .drag(tBackground.continueMarquee, startMarquee, tBackground.endMarquee);

        return iElement;
      },

      /**
       * @param iCase
       * @param iIndex
       * @param iAnimate
       */
      createElement: function (iCase, iIndex, iAnimate) {
        // Can't create circles if we don't have paper for them
        if (!this.get('paper')) return;
        var tCircle = this.get('paper').circle(0, 0, this._pointRadius)
        // Note: we have to set cx and cy offscreen here rather than in creation because for some unknown
        // reason, when we do it in creation, they end up zero rather than offscreen.
            .attr({
              cursor: "pointer", cx: -1000, cy: -1000
            });
        tCircle.node.setAttribute('shape-rendering', 'geometric-precision');
        return this.assignElementAttributes(tCircle, iIndex, iAnimate);
      },

      /**
       We override the base class implementation
       */
      animateFromTransferredElements: function () {
        var this_ = this,
            tModel = this.get('model'),
            tCases = tModel.get('cases'),
            tPaper = this.get('paper'),
            tRC = this.createRenderContext(),
            tDefaultR = this.calcPointRadius(),
            tFrame = this.get('frame'), // to convert from parent frame to this frame
            tOldElementAttrs = this.get('transferredElementCoordinates'),
            tNewElementAttrs = [], // used if many-to-one animation (parent to child collection)
            tNewToOldCaseMap = [],
            tOldToNewCaseMap = [];
        if (!tCases)
          return;

        function caseLocationSimple(iIndex) {
          // assume a 1 to 1 correspondence of the current case indices to the new cases
          return tOldElementAttrs[iIndex];
        }

        function caseLocationViaMap(iIndex) {
          // use our case index map to go from current case index to previous case index
          return tOldElementAttrs[tNewToOldCaseMap[iIndex]];
        }

        DG.sounds.playMixup();
        tModel.set('isAnimating', false);
        this._getTransferredElementsToCasesMap(tNewToOldCaseMap, tOldToNewCaseMap);
        var hasElementMap = tNewToOldCaseMap.length > 0,
            hasVanishingElements = tOldToNewCaseMap.length > 0,
            getCaseCurrentLocation = (hasElementMap ? caseLocationViaMap : caseLocationSimple),
            tElementsWereRects = tOldElementAttrs.length > 0 && tOldElementAttrs[0].type === 'rect',
            tRects = [],
            tTransAttrs;

        this.prepareToResetCoordinates();
        this.computeCellParams();
        tOldElementAttrs.forEach(function (iElement, iIndex) {
          // adjust old coordinates from parent frame to this view
          // In case they are circles
          iElement.cx -= tFrame.x;
          iElement.cy -= tFrame.y;
          // In case they are rects
          iElement.x -= tFrame.x;
          iElement.y -= tFrame.y;
        });
        if (tElementsWereRects) {
          this.removePlottedElements(true);
        }

        var eachCaseFunc = function (iCase, iIndex) {
              var tCurrAttrs = getCaseCurrentLocation(iIndex),
                  tCellIndices = tModel.lookupCellForCaseIndex(iIndex),
                  tNewElement;
              if (tElementsWereRects) {
                var tRectAttrs = tOldElementAttrs[iIndex];
                tNewElement = tPaper.rect(0, 0, 0, 0);
                tNewElement.attr( tRectAttrs);
                var tCircleAttrs = this.privGetElementCoordAttrs(tNewElement, tRC, iCase, iIndex, tCellIndices);
                tTransAttrs = {
                  x: tCircleAttrs.cx - tCircleAttrs.r,
                  y: tCircleAttrs.cy - tCircleAttrs.r,
                  width: 2 * tCircleAttrs.r,
                  height: 2 * tCircleAttrs.r,
                  r: tCircleAttrs.r,
                  fill: (tCurrAttrs && tCurrAttrs.fill) || DG.PlotUtilities.kDefaultPointColor,
                  stroke: (tCurrAttrs && tCurrAttrs.stroke) || DG.PlotUtilities.kDefaultStrokeColor
                };
                tNewElement.animate(tTransAttrs, DG.PlotUtilities.kDefaultAnimationTime);
                tRects.push(tNewElement);
              }
              else {
                tNewElement = this_.callCreateElement(iCase, iIndex);
                if (!SC.none(tCurrAttrs)) {
                  tTransAttrs = {
                    r: DG.isFinite(tCurrAttrs.r) && tCurrAttrs.r > 0 ? tCurrAttrs.r : tDefaultR,
                    cx: DG.isFinite(tCurrAttrs.cx) ? tCurrAttrs.cx : tCurrAttrs.x + tCurrAttrs.width / 2,
                    cy: DG.isFinite(tCurrAttrs.cy) ? tCurrAttrs.cy : tCurrAttrs.y + tCurrAttrs.height / 2,
                    fill: tCurrAttrs.fill,
                    stroke: tCurrAttrs.stroke
                  };
                  tNewElement.attr(tTransAttrs);
                }
                this_.privSetElementCoords(tRC, iCase, iIndex, tCellIndices, true /* animate */);
                if (hasVanishingElements) {
                  tNewElementAttrs.push(tCurrAttrs);
                }
              }
              return tModel.get('isAnimating');
            }.bind(this),

            finallyFunc = function () {
              if (hasVanishingElements) {
                // create a vanishing element for each old point that needs one (used if many-to-one animation)
                tOldElementAttrs.forEach(function (iOldAttrs, iIndex) {
                  var tNewIndex = tOldToNewCaseMap[iIndex],
                      tNewAttrs = tNewElementAttrs[tNewIndex];
                  if (SC.none(tNewIndex) || SC.none(tNewAttrs) || (iOldAttrs.r === 0))
                    return; // no vanishing element, if (1) element persists or (2) new circle hidden or (3) old circle hidden
                  this_.vanishPlottedElement(iOldAttrs, tNewAttrs);
                });
              }
              this.set('transferredElementCoordinates', null);
            }.bind(this);

        tModel.set('isAnimating', true);
        tCases.forEachWithInvokeLater(eachCaseFunc, finallyFunc);
        SC.Timer.schedule({
          action: function () {
            if (tElementsWereRects) {
              tRects.forEach(function (iRect) {
                iRect.remove();
              });
              tCases.forEach(function (iCase, iIndex) {
                var tElement = this_.callCreateElement(iCase, iIndex),
                    tCellIndices = tModel.lookupCellForCaseIndex(iIndex);
                tElement.attr(this_.privGetElementCoordAttrs(tElement, tRC, iCase, iIndex, tCellIndices));
              }.bind(this));
            }
            tModel.set('isAnimating', false);
            this_.displayDidChange(); // Force redisplay in correct position
          }, interval: DG.PlotUtilities.kDefaultAnimationTime
        });
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
                tActualPointsPerColumn);
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
        this.endPropertyChanges();
      }

    });

