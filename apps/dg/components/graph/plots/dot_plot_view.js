// ==========================================================================
//                          DG.DotPlotView
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

sc_require('components/graph/plots/univariate_adornment_base_view');

/** @class  DG.DotPlotView - A plot of dots piled up along a numeric axis

 @extends DG.UnivariateAdornmentBaseView
 */
DG.DotPlotView = DG.UnivariateAdornmentBaseView.extend(
    /** @scope DG.DotPlotView.prototype */
    {
      displayProperties: ['primaryAxisView.model.lowerBound', 'primaryAxisView.model.upperBound'],

      /**
       The bins stretch from numeric axis' lower to upper bounds and have width 2 * point radius.
       Initially each bin is zero, but we increment its count each time a point is computed to
       display in that bin.
       It's a two-dimensional array where the first index corresponds to the cell number and the second
       index corresponds to the bin number
       @property {Array of Array of {Number}}
       */
      binArrays: null,

      /** @property {Number} */
      overlap: 0, // pixels of overlap between dots so that dots will fit in available space

      /** Used by normal curve adornment as a multipler of normal density function.
       * @property {Number} */
      binWidthInWorldCoordinates: function() {
        var tNumericAxisView = this.get('primaryAxisView'),
            tRadius = this.calcPointRadius();
        return Math.abs(tNumericAxisView.coordinateToData(2 * tRadius) - tNumericAxisView.coordinateToData(0));
      }.property(),

      primaryAxisViewDidChange: function () {
        sc_super();
        var tMultMovableValuesAdorn = this.get('multipleMovableValuesAdorn');
        if (tMultMovableValuesAdorn)
          tMultMovableValuesAdorn.set('valueAxisView', this.get('primaryAxisView'));
      },

      /**
       * Return the classes of the desired axis views and the x or y to put them on.
       * @return {[{}]}
       */
      getAxisViewDescriptions: function () {
        var tDescriptions = sc_super(),
            tAxisKey = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical ? 'x' : 'y';
        tDescriptions.push({
          axisKey: tAxisKey,
          axisClass: DG.CellLinearAxisView
        });
        return tDescriptions;
      },

      /**
       Before we recompute coordinates, we need to zero out the bin array.
       */
      prepareToResetCoordinates: function () {
        this.zeroBinArray();
      },

      /**
       * Called from animateFromTransferredElements to create animatable elements.
       * @param {DG.Case} iCase
       * @param {number} iIndex
       * @param {Object} iOldEltAttrs
       */
      createAnimatingElement: function (iCase, iIndex, iOldEltAttrs) {
        var tNumericAxisIsHorizontal = this.getPath('primaryAxisView.orientation') === 'horizontal',
            tOldElementIsRect = iOldEltAttrs && iOldEltAttrs.type === 'rect',
            tOldElementIsNegativeBar = iOldEltAttrs && iOldEltAttrs.isNegativeBar,
            tElement = this.callCreateElement(iCase, iIndex, false);
        if (iOldEltAttrs) {
          var tCX = tOldElementIsRect ? iOldEltAttrs.x : iOldEltAttrs.cx,
              tCY = tOldElementIsRect ? iOldEltAttrs.y : iOldEltAttrs.cy,
              attrs;
          if (tOldElementIsRect) {
            tCX += tNumericAxisIsHorizontal ?
                (tOldElementIsNegativeBar ? 0 : iOldEltAttrs.width) : iOldEltAttrs.width / 2;
            tCY += tNumericAxisIsHorizontal ? iOldEltAttrs.height / 2 :
                (tOldElementIsNegativeBar ? iOldEltAttrs.height : 0);
          }
          attrs = iOldEltAttrs && {
            r: tOldElementIsRect
                ? Math.min(iOldEltAttrs.width, iOldEltAttrs.height) / 2
                : iOldEltAttrs.r || this._pointRadius,
            cx: tCX,
            cy: tCY,
            fill: iOldEltAttrs.fill,
            stroke: iOldEltAttrs.stroke
          };
          attrs && tElement.attr(attrs);
        }
        return tElement;
      },

      /**
       * Set the coordinates and other attributes of the case circle (a Rafael element in this.get('plottedElements')).
       * @param {{}} iRC case-invariant Render Context
       * @param {DG.Case} iCase the case data
       * @param {number} iIndex index of case in collection
       * @param {Boolean} iAnimate (optional) want changes to be animated into place?
       * @param {function} iCallback
       * @returns {{cx:{Number},cy:{Number}}} final coordinates or null if not defined (hidden plot element)
       */
      setCircleCoordinate: function (iRC, iCase, iIndex, iAnimate, iCallback) {
        var tPlottedElements = this.get('plottedElements');
        DG.assert(iCase, 'There must be a case');
        DG.assert(DG.MathUtilities.isInIntegerRange(iIndex, 0, tPlottedElements.length),
            'index %@ out of bounds for plottedElements of length %@'.loc(iIndex, tPlottedElements.length));
        var tCircle = tPlottedElements[iIndex],
            tWorld = iCase.getForcedNumericValue(iRC.primaryVarID),
            tScreenCoord = iRC.primaryAxisView.dataToCoordinate(tWorld),
            tIsMissingCase = (!DG.isFinite(tScreenCoord) || iRC.primaryAxisPlace === DG.GraphTypes.EPlace.eUndefined);

        // show or hide if needed, then update if shown.
        if (this.showHidePlottedElement(tCircle, tIsMissingCase, iIndex) && iRC.categoryAxisModel) {

          var tCellNumber = iRC.categoryAxisModel.cellNameToCellNumber(iCase.getStrValue(iRC.categoryVarID)),
              tCellCoord = SC.none(tCellNumber) ? 0 : iRC.categoryAxisView.cellToCoordinate(tCellNumber),
              tCellHalfWidth = iRC.categoryAxisView.get('fullCellWidth') / 2,
              tRadius = this._pointRadius,
              tBinArrays = this.get('binArrays'),
              tBinArray = tBinArrays && (tCellNumber < tBinArrays.length) && tBinArrays[tCellNumber],
              tCoordX, tCoordY;

          var tBin = Math.round(tScreenCoord / (2 * tRadius)),
              tBinsInCell = (tBinArray && tBinArray.length) || 0,
              tRow = (tBinArray && tBin >= 0 && tBin < tBinsInCell) ? tBinArray[tBin].counter++ : 0,
              tOverlap = this.get('overlap'),
              tStackCoord = tRadius + (2 * tRadius - tOverlap) * tRow + 1;

          // Express coordinates in terms of x and y
          switch (iRC.primaryAxisPlace) {
            case DG.GraphTypes.EPlace.eX:
              tCoordX = tScreenCoord;
              tCoordY = tCellCoord - tStackCoord + tCellHalfWidth;
              break;
            case DG.GraphTypes.EPlace.eY:
              tCoordX = tCellCoord + tStackCoord - tCellHalfWidth;
              tCoordY = tScreenCoord;
              break;
          }

          var tAttrs = {
            cx: tCoordX,
            cy: tCoordY,
            r: this.radiusForCircleElement(tCircle),
            fill: iRC.calcCaseColorString(iCase),
            stroke: iRC.calcStrokeColorString(iCase),
            'fill-opacity': iRC.transparency,
            'stroke-opacity': iRC.strokeTransparency
          };
          this.updatePlottedElement(tCircle, tAttrs, iAnimate, iCallback);
          return {cx: tCoordX, cy: tCoordY, r: tRadius};
        }
        return null;
      },

      assignElementAttributes: function (iElement, iIndex, iAnimate) {
        sc_super();

        var this_ = this,
            tNumericPlace = this.getPath('model.primaryAxisPlace'),
            tIsDragging = false,
            kOpaque = 1,
            tInitialTransform = null,
            tSelectedCases;

        function changeCaseValues(iDelta) {
          var tPrimaryVarID = this_.getPath('model.primaryVarID'),
              tChange = {
                operation: 'updateCases',
                cases: [],
                attributeIDs: [tPrimaryVarID],
                values: [[]],
                dirtyDocument: false
              },
              tDataContext = this_.get('dataContext');
          if (!tDataContext) return;
          // Note that we have to get the cases dynamically rather than have a variable
          // declared in the closure. The array pointed to by such a closure is not updated!
          this_.getPath('model.casesController.selection').forEach(function (iCase) {
            var tValue = iCase.getForcedNumericValue(tPrimaryVarID) + iDelta;
            if (this_.getPath('primaryAxisView.isDateTime')) {
              tValue = DG.createDate(tValue);
            }
            tChange.cases.push(iCase);
            tChange.values[0].push(tValue);
          });
          tDataContext.applyChange(tChange);
        }

        function returnCaseValuesToStart(iCaseIndex, iStartWorldCoord, iSelectedCases) {
          if (!SC.none(iStartWorldCoord)) {
            var tCase = this_.getPath('model.cases').unorderedAt(iCaseIndex),
                tPrimaryVarID = this_.getPath('model.primaryVarID'),
                tDelta = tCase.getForcedNumericValue(tPrimaryVarID) - iStartWorldCoord;
            this_.get('model').animateSelectionBackToStart([tPrimaryVarID], [tDelta], iSelectedCases);
          }
        }

        iElement.hover(function (event) {  // over
              // Note that Firefox can come through here repeatedly so we have to check for existence
              if (!tIsDragging && SC.none(tInitialTransform)) {
                tInitialTransform = '';
                this.animate({
                  opacity: kOpaque,
                  transform: DG.PlotUtilities.kDataHoverTransform
                }, DG.PlotUtilities.kDataTipShowTime);
                this_.showDataTip(this, iIndex);
              }
            },
            function (event) { // out
              if (!tIsDragging) {
                this.stop();
                this.animate({
                  opacity: DG.PlotUtilities.kDefaultPointOpacity,
                  transform: tInitialTransform
                }, DG.PlotUtilities.kHighlightHideTime);
                tInitialTransform = null;
                this_.hideDataTip();
              }
            })
            .drag(function (dx, dy) { // continue
                  if (dx !== 0 || dy !== 0) {
                    var tNewCoord = (tNumericPlace === DG.GraphTypes.EPlace.eX) ?
                            this.ox + dx : this.oy + dy,
                        tNewWorld = this_.get('primaryAxisView').coordinateToData(tNewCoord),
                        tOldWorld = this_.getPath('model.cases').unorderedAt(this.index).getForcedNumericValue(this_.getPath('model.primaryVarID')),
                        tCurrTransform = this.transform();
                    if (isFinite(tNewWorld)) {
                      // Put the element into the initial transformed state so that changing case values
                      // will not be affected by the scaling in the current transform.
                      SC.run(function () {
                        this.transform(tInitialTransform);
                        changeCaseValues(tNewWorld - tOldWorld);
                        this.transform(tCurrTransform);
                      }.bind(this));
                    }
                  }
                },
                function (x, y) { // begin
                  if (!tIsDragging) {
                    // Save the initial screen coordinates
                    this.ox = this.attr("cx");
                    this.oy = this.attr("cy");
                    // Save the initial world coordinate
                    this.w = this_.getPath('model.cases').unorderedAt(this.index).getForcedNumericValue(this_.getPath('model.primaryVarID'));
                    this.attr({opacity: kOpaque});
                    tSelectedCases = DG.copy(this_.getPath('model.selection'));
                    tIsDragging = true;
                  }
                },
                function () {  // end
                  if (tIsDragging) {
                    this.animate({transform: tInitialTransform}, DG.PlotUtilities.kHighlightHideTime);
                    returnCaseValuesToStart(this.index, this.w, tSelectedCases);
                    tIsDragging = false;
                  }
                  this.ox = this.oy = this.w = undefined;
                });
        return iElement;
      },

      zeroBinArray: function () {
        var tBinWidth = this._pointRadius === 0 ? 10 : 2 * this._pointRadius;
        this._zeroBinArray(tBinWidth);
      },

      /**
       Initialize binArray so it is ready to be used in drawing a complete set of points.
       */
      _zeroBinArray: function (iBinWidth) {
        var this_ = this,
            tNumericAxisView = this.get('primaryAxisView'),
            tCategoricalAxisView = this.get('secondaryAxisView');

        // We can get here because of a cleanupFunc call during destroy
        if (!tNumericAxisView || !tCategoricalAxisView)
          return;

        var tCategoricalAxisModel = tCategoricalAxisView.get('model'),
            tNumCells = tCategoricalAxisModel.get('numberOfCells'),
            tNumBins = Math.round(Math.abs(tNumericAxisView.get('pixelMax') -
                tNumericAxisView.get('pixelMin')) / iBinWidth) + 1;

        function computeOverlap() {
          var tCases = this_.getPath('model.cases'),
              tNumericVarID = this_.getPath('model.primaryVarID'),
              tCategoricalVarID = this_.getPath('model.secondaryVarID'),
              tRadius = iBinWidth / 2,
              tBinArrays = this_.get('binArrays'),
              tMaxStackHeight = tCategoricalAxisView.get('fullCellWidth'),
              // The '-1' in the following is to ensure at least one point's worth of space between cells
              tMaxThatFit = Math.round(tMaxStackHeight / (2 * tRadius)) - 1,
              tOverlap = 0,
              tMaxInBin, tPixelsOutside;
          tCases = tCases.filter(function (iCase) {
            return DG.isFinite(iCase.getForcedNumericValue(tNumericVarID));
          });

          if (tMaxThatFit <= 0) // If things are really tight, overlap points directly on top of each other
            return iBinWidth;

          tCases.forEach(function (iCase) {
            var tNumericCoord = tNumericAxisView.dataToCoordinate(iCase.getForcedNumericValue(tNumericVarID)),
                tBin = Math.round(tNumericCoord / (2 * tRadius)),
                tCellNumber = tCategoricalAxisModel.cellNameToCellNumber(iCase.getStrValue(tCategoricalVarID));
            // Note that we can get a valid cell number for which we have not yet allocated a
            // bin array. We choose to ignore that cell for the purposes of computing overlap. The
            // desired bin array will be created the next time we draw.
            if ((tBin >= 0) && !SC.none(tCellNumber) &&
                (tCellNumber >= 0) && (tCellNumber < tBinArrays.length) &&
                (tBin < tBinArrays[tCellNumber].length))
              tBinArrays[tCellNumber][tBin].total++;
          });
          tMaxInBin = DG.MathUtilities.max(tBinArrays.map(function (iBinArray) {
            return DG.MathUtilities.max(iBinArray.map(function (iBin) {
              return iBin.total;
            }));
          }));
          if (tMaxInBin > tMaxThatFit) {
            tPixelsOutside = (tMaxInBin - tMaxThatFit) * 2 * tRadius;
            tOverlap = tPixelsOutside / (tMaxInBin - 1);
          }
          return tOverlap;
        } // computeOverlap()

        // Fill arrays with zeroes
        this.set('binArrays', DG.MathUtilities.range(tNumCells).map(function () {
          return DG.MathUtilities.range(tNumBins).map(function () {
            return {total: 0, counter: 0};
          });
        }));
        this.set('overlap', computeOverlap());
      },

      /**
       Used by both handleBackgroundClick and handleBackgroundDblClick
       @param {SC.Event}
       */
      zoom: function (iEvent) {
        var tAxisKey = (this.getPath('model.primaryAxisPlace') === DG.GraphTypes.EPlace.eX) ? 'x' : 'y',
            tNumericAxisView = this.get('primaryAxisView'),
            tWorldPoint = {},
            tFactor = iEvent.shiftKey ? 2 : 0.5,
            tViewPoint = DG.ViewUtilities.windowToViewCoordinates({x: iEvent.clientX, y: iEvent.clientY}, this);
        tWorldPoint[tAxisKey] = tNumericAxisView.coordinateToData(tViewPoint[tAxisKey]);
        this.get('model').dilate(tWorldPoint, tFactor);
      },

      /**
       Alt key triggers zoom.
       @param {SC.Event}
       */
      handleBackgroundClick: function (iEvent) {
        if (iEvent.altKey) {
          this.zoom(iEvent);
        }
      },

      /**
       Zoom at the mouse point
       @param {SC.Event}
       */
      handleBackgroundDblClick: function (iEvent) {
        this.zoom(iEvent);
      }

    });
