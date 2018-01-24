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

/*global pluralize:true*/

/** @class  DG.BarChartView, a plot of rectangles, one for each category. Each rectangle is made of
 * thinner rectangles, one for each case.

 @extends DG.ChartView
 */
DG.BarChartView = DG.ChartView.extend(
    /** @scope DG.BarChartView.prototype */
    {
      // displayProperties: ['barSliceHeights', '*yAxisView.model.upperBound' ],

      /**
       * If we're displaying as a barchart, this is how high the slices are in a given bar
       * @property {[Number]}
       */
      barSliceHeights: null,

      _categoryCellToolTip: null,
      categoryCellToolTip: function() {
        if( !this._categoryCellToolTip) {
          this._categoryCellToolTip = DG.ToolTip.create( { paperSource: this,
            layerName: 'dataTip' });
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

      /**
       * We want to animate from the current element positions to new ones. The trick is to
       * compute the new positions with the correct secondary axis bounds.
       */
      breakdownTypeDidChange: function () {
        var tCurrBound = this.getPath('secondaryAxisView.model.upperBound'),
            tNewBound = this.getPath('model.naturalUpperBound');
        this.getPath('secondaryAxisView.model').setLowerAndUpperBounds(0, tNewBound);
        this.getPath('secondaryAxisView.model').notifyPropertyChange('upperBound');  // So updating coordinates will work
        this.setPath('model.isAnimating', true);
        this.updateAllCoordinates(true /* animate */, function () {
          this.setPath('model.isAnimating', false);
        }.bind(this));
        this.getPath('secondaryAxisView.model').setLowerAndUpperBounds(0, tCurrBound);
      }.observes('model.breakdownType'),

      init: function () {
        sc_super();

        this.barSliceHeights = [];
      },

      destroy: function() {
        this.get('coverRectsLayer').clear();
        sc_super();
      },

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
                      this_.callCreateElement(tCases[iIndex], iIndex, this_._createAnimationOn);
                    var tCellIndices = this_.get('model').lookupCellForCaseIndex(iIndex);
                    this_.privSetRectCoords(tRC, tCases[iIndex], iIndex, tCellIndices);
          */
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

        // cache some more render parameters common to all cases, but unique to BarChartView.
        tRC.barSliceHeights = this.get('barSliceHeights');
        tRC.barWidth = tRC.primaryAxisView.get('fullCellWidth') / 2;

        return tRC;
      },

      /**
       * Make sure the count axis has the correct upper bounds
       */
      setupAxes: function () {
        sc_super();
        var tCountAxisView = this.get('secondaryAxisView');
        if (tCountAxisView) {
          tCountAxisView.get('model').setLowerAndUpperBounds(0, this.getPath('model.naturalUpperBound'));
        }
      },

      /**
       * Return the class of the count axis with the x or y to put it on.
       */
      configureAxes: function () {
        var tRet = sc_super(),
            tCountKey = this.getPath('model.orientation') === 'vertical' ? 'y' : 'x';
        tRet = tRet || {};
        tRet.axisKey = tCountKey;
        tRet.axisClass = DG.CountAxisView;
        return tRet;
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
            tDataLength = tCases && tCases.length;
        tCases.forEach(function (iCase, iIndex) {
          var tCallback = iIndex === tDataLength - 1 ? iCallback : null,
              tCellIndices = tModel.lookupCellForCaseIndex(iIndex);
          this.privSetRectCoords(tRC, iCase, iIndex, tCellIndices, iAnimate, tCallback);
        }.bind(this));
      },

      /**
       "Points" is a misnomer since we're really updating the rectangles that make up the bar.
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
            tDataLength = tCases && tCases.length,
            tPlotElementLength = this._plottedElements.length,
            tLayerManager = this.get('layerManager'),
            tIndex, tCellIndices;

        // for any new cases
        if (tDataLength > tPlotElementLength) {
          // add plot elements for added cases
          for (tIndex = tPlotElementLength; tIndex < tDataLength; tIndex++) {
            this.callCreateElement(tCases[tIndex], tIndex, this.animationIsAllowable());
            tCellIndices = tModel.lookupCellForCaseIndex(tIndex);
            this.privSetRectCoords(tRC, tCases[tIndex], tIndex, tCellIndices, iAnimate, iCallback);
          }
        }
        // Get rid of plot elements for removed cases and update all coordinates
        if (tDataLength < tPlotElementLength) {
          for (tIndex = tDataLength; tIndex < tPlotElementLength; tIndex++) {
            // It can happen during closing of a document that the elements no longer exist, so we have to test
            if (!SC.none(this._plottedElements[tIndex])) {
              this._plottedElements[tIndex].stop();
              tLayerManager.removeElement(this._plottedElements[tIndex]);
              DG.PlotUtilities.doHideRemoveAnimation(this._plottedElements[tIndex]);
            }
          }
          this._plottedElements.length = tDataLength;
          // update all coordinates because we don't know which cases were deleted
          this.updateAllCoordinates(iAnimate, iCallback);
        }
        this._isRenderingValid = false;
      },

      /**
       Only recreate elements if necessary. Otherwise, just set svg element coordinates.
       */
      drawData: function drawData() {
        if (SC.none(this.get('paper')))
          return; // not ready to draw
        if (this.getPath('model.isAnimating'))
          return; // Bars are animating to new position

        if (!SC.none(this.get('transferredElementCoordinates'))) {
          this.animateFromTransferredElements();
          return;
        }

        var this_ = this,
            tModel = this.get('model'),
            tCases = tModel.get('cases'),
            tPlotElementLength = this._plottedElements.length,
            tLayerManager = this.get('layerManager'),
            tIndex, tRC;

        if (!tCases)
          return; // We can get here before things are linked up during restore

        if (this._mustCreatePlottedElements) {
          this.removePlottedElements();
          tCases.forEach(this.callCreateElement, this);
          this._mustCreatePlottedElements = false;
        }

        this.computeCellParams();

        for (tIndex = tCases.length; tIndex < tPlotElementLength; tIndex++) {
          DG.PlotUtilities.doHideRemoveAnimation(this._plottedElements[tIndex], tLayerManager);
        }
        if (tCases.length < tPlotElementLength) { // remove from array
          tPlotElementLength = this._plottedElements.length = tCases.length;
        }
        tRC = this.createRenderContext();
        tCases.forEach(function (iCase, iIndex) {
          var tCellIndices = tModel.lookupCellForCaseIndex(iIndex);
          if (iIndex >= tPlotElementLength)
            this_.callCreateElement(iCase, iIndex);
          this_.privSetRectCoords(tRC, iCase, iIndex, tCellIndices);
        });

        this.drawSubBars();

        this.updateSelection();
      },

      /**
       * Cases are stacked as rectangles, grouped first by a primary attribute and then by a legend attribute.
       */
      drawSubBars: function () {

        var makeRect = function (iPrimaryCoord, iStartCoord, iCount, iCaseIndices,
                                 iNumCasesInContainingCell, iCategoryName, iPrimaryName) {
          var this_ = this,
              tTemplate, tToolTip,
              tCurrCoord = tRC.secondaryAxisView.dataToCoordinate(getSecondaryValue( iCount, iNumCasesInContainingCell)),
              tX, tY, tWidth, tHeight;
          if( tRC.isVerticalOrientation) {
            tX = iPrimaryCoord - tRC.barWidth / 2 - 1;
            tY = tCurrCoord - 1;
            tWidth = tRC.barWidth + 2;
            tHeight = tCurrCoord + 2 - iStartCoord;
          }
          else {
            tX = iStartCoord;
            tY = iPrimaryCoord - tRC.barWidth / 2 - 1;
            tWidth = tCurrCoord + 2 - iStartCoord;
            tHeight = tRC.barWidth + 2;
          }
          var tRect = tPaper.rect(iPrimaryCoord - tRC.barWidth / 2 - 1,
                  tCurrCoord - 1, tRC.barWidth + 2, iStartCoord - tCurrCoord + 2)
                  .attr({stroke: 'none', fill: 'white', 'fill-opacity': 0.001, cursor: 'pointer'})
                  .hover(function (iEvent) {
                        // Note that Firefox can come through here repeatedly so we have to check for existence
                        this.animate({
                          'fill-opacity': 0.4
                        }, DG.PlotUtilities.kDataTipShowTime);
                        if( !SC.none( tLegendVarID)) {
                          tTemplate = this.caseIndices.length > 1 ? "DG.BarChartModel.cellTipPlural" :
                              "DG.BarChartModel.cellTipSingular";
                          tToolTip = this_.get('categoryCellToolTip');
                          if (this.numCasesInContainingCell > 1) {
                            iPrimaryName = pluralize(iPrimaryName);
                            if (iPrimaryName.endsWith("S")) {
                              iPrimaryName = iPrimaryName.replace(/S$/, 's');
                            }
                          }
                          tToolTip.set('text', tTemplate.loc(
                              this.caseIndices.length,
                              this.numCasesInContainingCell,
                              iPrimaryName,
                              Math.round(1000 * this.caseIndices.length / this.numCasesInContainingCell) / 10,
                              iCategoryName
                          ));
                          tToolTip.set('tipOrigin', {x: iEvent.layerX, y: iEvent.layerY});
                          tToolTip.show();
                        }
                      },
                      function (event) { // out
                        this.stop();
                        this.animate({
                          'fill-opacity': 0.001
                        }, DG.PlotUtilities.kHighlightHideTime);
                        if(tToolTip)
                          tToolTip.hide();
                      }
                  )
                  .mousedown(function (iEvent) {
                    SC.run(function () {
                      this_.get('model').selectCasesWithIndices(this.caseIndices, iEvent.shiftKey);
                    }.bind( this));
                  });
          tRect.caseIndices = iCaseIndices;
          tRect.numCasesInContainingCell = iNumCasesInContainingCell;
          tCoverRectsLayer.push(tRect);
          return tCurrCoord;
        }.bind(this);

        function getSecondaryValue( iCount, iTotal) {
          return tBreakdownType === DG.Analysis.EBreakdownType.eCount ?
              iCount : 100 * iCount / iTotal;
        }

        var tPaper = this.get('paper'),
            tCoverRectsLayer = this.get('coverRectsLayer'),
            tCellArray = this.getPath('model.cachedCells'),
            tBreakdownType = this.getPath('model.breakdownType'),
            tRC = this.createRenderContext(),
            tPrimaryVarID = this.getPath('model.primaryVarID'),
            tLegendVarID = this.getPath('model.legendVarID');
        tCoverRectsLayer.clear();
        tCellArray.forEach(function (iPrimary, iPrimaryIndex) {
          // This is the primary division. It has an array for each category on the secondary axis
          var tPrimaryCoord = tRC.primaryAxisView.cellToCoordinate(iPrimaryIndex),
              tPrimaryName = iPrimary[0][0].theCase.getValue(tPrimaryVarID);
          iPrimary.forEach(function (iSecondary, iSecondaryIndex) {
            var tCount = 0,
                tTotalNumCasesInPrimary = iSecondary.length,
                tPreviousCoord = tRC.secondaryAxisView.dataToCoordinate(getSecondaryValue( tCount, tTotalNumCasesInPrimary)),
                tPreviousValue = null,
                tCaseIndices = [],
                tValue;
            // The given array contains an element for each case belonging to this stack
            iSecondary.forEach(function (iCaseContainer, iIndex) {
              tValue = iCaseContainer.theCase.getValue(tLegendVarID);
              if (tPreviousValue && tValue !== tPreviousValue) {
                tPreviousCoord = makeRect(tPrimaryCoord, tPreviousCoord, tCount,
                    tCaseIndices, tTotalNumCasesInPrimary, tPreviousValue, tPrimaryName);
                tCaseIndices = [];
              }
              tCaseIndices.push( iCaseContainer.caseIndex);
              tCount++;
              tPreviousValue = tValue;
            });
            makeRect(tPrimaryCoord, tPreviousCoord, tCount,
                tCaseIndices, tTotalNumCasesInPrimary, tValue, tPrimaryName);
          });
        });
      },

      /**
       Override base class because we're dealing with rectangles, not points.
       @return {Array of {x:{Number}, y:{Number}, width:{Number}, height:{Number}, fill:{String}}}
       */
      getElementPositionsInParentFrame: function() {

        var tFrame = this.get('frame');
        return this._plottedElements.map( function( iElement) {
          var tX = iElement.attr('x') + tFrame.x,
              tY = iElement.attr('y') + tFrame.y,
              tWidth = iElement.attr('width'),
              tHeight = iElement.attr('height'),
              tResult = { x: tX, y: tY, width: tWidth, height: tHeight, fill: iElement.attr('fill') };
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
            tOldToNewCaseMap = [];
        if (!tCases)
          return;

        function turnOffAnimation() {
          tModel.set('isAnimating', false);
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
            tTransAttrs;

        this.prepareToResetCoordinates();
        this.removePlottedElements();
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
              r: DG.isFinite( tOldElement.r) ? tOldElement.r : 0,
              x: DG.isFinite(tOldElement.cx) ? tOldElement.cx - tOldElement.r : tOldElement.x,
              y: DG.isFinite(tOldElement.cy) ? tOldElement.cy - tOldElement.r : tOldElement.y,
              width: DG.isFinite( tOldElement.width) ? tOldElement.width : 2 * tOldElement.r,
              height: DG.isFinite( tOldElement.height) ? tOldElement.height : 2 * tOldElement.r,
              fill: tOldElement.fill,
              stroke: tOldElement.fill
            };
            tElement.attr(tTransAttrs);
          }
          tElement = this_.privSetRectCoords(tRC, iCase, iIndex, tCellIndices, true /* animate */);
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
        this._mustCreatePlottedElements = false;  // because we just created them
        this.set('transferredElementCoordinates', null);

        tModel.set('isAnimating', true);
        SC.Timer.schedule({action: turnOffAnimation, interval: DG.PlotUtilities.kDefaultAnimationTime});
      }
      ,

      /**
       We need to decide on the number of points in a row. To do so, we find the
       maximum number of points in a cell and choose so that this max number will
       fit within the length of a cell rect. If there are so many points that they don't fit
       even by using the full length of a cell rect, then we compute an overlap.
       */
      computeCellParams: function () {
        var tMaxInCell = this.getPath('model.maxInCell'),
            tSecondaryAxisView = this.get('secondaryAxisView'),
            tCoordOfMaxInCell = tSecondaryAxisView.dataToCoordinate(tMaxInCell),
            tCoordOf100Percent = tSecondaryAxisView.dataToCoordinate(100),
            tCoordOfZero = tSecondaryAxisView.dataToCoordinate(0),
            tBreakdownType = this.getPath('model.breakdownType'),
            tMinBarSliceHeight = Math.abs(tCoordOfMaxInCell - tCoordOfZero) / tMaxInCell,
            tSliceHeights = this.getPath('model.primaryCellCounts').map(function (iCount) {
              var tSliceHeight = 0;
              switch (tBreakdownType) {
                case DG.Analysis.EBreakdownType.eCount:
                  tSliceHeight = tMinBarSliceHeight;
                  break;
                case DG.Analysis.EBreakdownType.ePercent:
                  tSliceHeight = Math.abs(tCoordOf100Percent - tCoordOfZero) / iCount;
              }
              return tSliceHeight;
            });

        this.setIfChanged('barSliceHeights', tSliceHeights);
      }
      ,

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
        }
        else {
          tCoordX = tTop - tBarSliceHeight;
          tCoordY = tEdge;
          tWidth = tBarSliceHeight;
          tHeight = tCellHalfWidth;
        }
        // Move the rect to a starting position
        /*
                tRect.attr( {
                  x: iRC.isVerticalOrientation ? tCoordX + tCellHeight / 2 : 0,
                  y: iRC.isVerticalOrientation ? tCellHeight : tCoordY + tCellDrawingWidth / 2
                });
        */
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
        // this.updatePlottedElement( tRect, tAttrs, iAnimate, iCallback);
        // }
      }
      /*,

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
                      tModel.lookupCellForCaseIndex(iIndex), true /!*animate*!/, null /!* no callback *!/);
                }.bind(this));
              }
            }.observes('model.displayAsBarChart')
      */
    })
;

