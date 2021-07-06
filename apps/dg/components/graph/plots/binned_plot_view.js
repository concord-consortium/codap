// ==========================================================================
//                          DG.BinnedPlotView
//
//  Author:   William Finzer
//
//  Copyright (c) 2019 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/plots/univariate_plot_view');

/** @class  DG.BinnedPlotView, a plot of dots each placed according to numeric value bins

 @extends DG.UnivariatePlotView
 */
DG.BinnedPlotView = DG.UnivariatePlotView.extend(
    /** @scope DG.BinnedPlotView.prototype */
    {
      kLineSlideHCur: DG.Browser.customCursorStr(static_url('cursors/LineSlideH.cur'), 8, 8),
      kLineSlideVCur: DG.Browser.customCursorStr(static_url('cursors/LineSlide.cur'), 8, 8),

      /**
       * @property { Boolean }
       */
      dragInProgress: false,

      /**
       * @property {Element}
       */
      elementBeingDragged: null,

      numPointsInRow: 0,
      /**
       * @property {[{boundary: Element, cover: Element, worldValue: Number, lowerEdgeScreenCoord: Number }]}
       */
      binBoundaries: null,

      init: function () {
        sc_super();
        this.binBoundaries = [];
      },

      destroy: function () {
        var tLayerManager = this.getPath('paperSource.layerManager');
        this.binBoundaries.forEach(function (iSpec) {
          tLayerManager.removeElement(iSpec.boundary);
          iSpec.boundary.remove();
          tLayerManager.removeElement(iSpec.cover);
          iSpec.cover.remove();
        });
        this.binBoundaries = null;
        sc_super();
      },

      /**
       * Return the class of the count axis with the x or y to put it on.
       * @return {[{}]}
       */
      getAxisViewDescriptions: function () {
        var tDescriptions = sc_super(),
            tBinnedAxisKey = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical ? 'x' : 'y';
        tDescriptions.push( {
          axisKey: tBinnedAxisKey,
          axisClass: DG.BinnedAxisView,
          axisModelProperties: {binnedPlotModel: this.get('model')}
        });
        return tDescriptions;
      },

      /**
       * Construct and return a new render context
       * used for setCircleCoordinate()
       * @return {*}
       */
      createRenderContext: function () {
        var tRC = sc_super();

        if (tRC) {
          tRC.model = this.get('model');
          tRC.cellHalfWidth = tRC.categoryAxisView.get('fullCellWidth') / 2;
        }

        return tRC;
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
        iAnimate = iAnimate || this.dragInProgress;
        var tPlottedElements = this.get('plottedElements'),
            tInfo = iRC.model.infoForCase(iIndex);
        if(!tInfo)
          return; // Happens during transition from one plot to another
        DG.assert(iCase, 'There must be a case');
        DG.assert(DG.MathUtilities.isInIntegerRange(iIndex, 0, tPlottedElements.length),
            'index %@ out of bounds for plottedElements of length %@'.loc(iIndex, tPlottedElements.length));
        var tCircle = tPlottedElements[iIndex],
            tBinCoord = iRC.primaryAxisView.binToCoordinate(tInfo.bin),
            tIsMissingCase = (!tInfo || !DG.isFinite(tBinCoord) ||
                iRC.primaryAxisPlace === DG.GraphTypes.EPlace.eUndefined);

        // show or hide if needed, then update if shown.
        if (this.showHidePlottedElement(tCircle, tIsMissingCase, iIndex) && iRC.categoryAxisModel) {

          var tCellNumber = tInfo.cell,
              tCellCoord = SC.none(tCellNumber) ? 0 : iRC.categoryAxisView.cellToCoordinate(tCellNumber),
              tCellHalfWidth = iRC.cellHalfWidth,
              tRadius = this._pointRadius,
              tNumInRow = this.get('numPointsInRow'),
              tRow = Math.floor(tInfo.indexInBin / tNumInRow),
              tCol = tInfo.indexInBin - tRow * tNumInRow,
              tPrimaryCoord = tBinCoord - (tNumInRow - 1) * tRadius + tCol * 2 * tRadius,
              tOverlap = this.get('overlap'),
              tStackCoord = tRadius + (2 * tRadius - tOverlap) * tRow + 1,
              tCoordX, tCoordY;

          // Express coordinates in terms of x and y
          switch (iRC.primaryAxisPlace) {
            case DG.GraphTypes.EPlace.eX:
              tCoordX = tPrimaryCoord;
              tCoordY = tCellCoord - tStackCoord + tCellHalfWidth;
              break;
            case DG.GraphTypes.EPlace.eY:
              tCoordX = tCellCoord + tStackCoord - tCellHalfWidth;
              tCoordY = tPrimaryCoord;
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
            kOpaque = 1,
            tInitialTransform = null;

        iElement.hover(function (event) {  // over
              if (!this_.dragInProgress) {
                // Note that Firefox can come through here repeatedly so we have to check for existence
                if (SC.none(tInitialTransform)) {
                  tInitialTransform = '';
                  this.animate({
                    opacity: kOpaque,
                    transform: DG.PlotUtilities.kDataHoverTransform
                  }, DG.PlotUtilities.kDataTipShowTime);
                  this_.showDataTip(this, iIndex);
                }
              }
            },
            function (event) { // out
              if( !this_.dragInProgress) {
                this.stop();
                this.animate({
                  opacity: DG.PlotUtilities.kDefaultPointOpacity,
                  transform: tInitialTransform
                }, DG.PlotUtilities.kHighlightHideTime);
                tInitialTransform = null;
                this_.hideDataTip();
              }
            });
        return iElement;
      },

      modelWidthOrAlignmentDidChange: function() {
        this.displayDidChange();
      }.observes('model.changed'),

      markBinParamsChange: function( iInitialAlignment, iInitialBinWidth) {
        var this_ = this,
            tNewAlignment = this.getPath('model.alignment'),
            tNewBinWidth = this.getPath('model.width');
        DG.UndoHistory.execute(DG.Command.create({
          name: 'graph.drag.binBoundary',
          undoString: 'DG.Undo.graph.dragBinBoundary',
          redoString: 'DG.Redo.graph.dragBinBoundary',
          log: "dragBinBoundary from { alignment: %@, width: %@ } to { alignment: %@, width: %@ }".
                  fmt(iInitialAlignment, iInitialBinWidth, tNewAlignment, tNewBinWidth),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'drag bin boundary',
              type: 'DG.GraphView'
            }
          },
          execute: function() { },
          undo: function() {
            this_.setPath('model.alignment', iInitialAlignment);
            this_.setPath('model.width', iInitialBinWidth);
          },
          redo: function() {
            this_.setPath('model.alignment', tNewAlignment);
            this_.setPath('model.width', tNewBinWidth);
          }
        }));
      },

      /**
       Generate the svg needed to display the plot
       */
      doDraw: function doDraw() {
        var this_ = this;

        function drawBinBoundaries() {
          var kMinBinWidth = 20,
              tInitialAlignment, tInitialWorldWidth, tNewBinAlignment, tBinWidthAtStartOfDrag,
              tModel = this_.get('model'),
              tLeastBinEdgeWorld = tModel.get('leastBinEdge'),
              tWorldWidth = tModel.get('width'),
              tWidthIncrement,
              tPaper = this_.get('paper'),
              tOrientation = this_.getPath('primaryAxisView.orientation'),
              tAdornmentLayer = this_.getPath('layerManager.' + DG.LayerNames.kAdornments),
              tPlace = this_.getPath('primaryAxisView.pixelMin'),
              tLineStart = this_.getPath('secondaryAxisView.pixelMin'),
              tBinWidthPixels = this_.getPath('primaryAxisView.binWidth'),
              tWorldPerPixel,
              tBinHeight = Math.abs(this_.getPath('secondaryAxisView.pixelMax') -
                  this_.getPath('secondaryAxisView.pixelMin')) - 5,
              tNumBins = this_.getPath('model.totalNumberOfBins'),
              tBoundaries = this_.get('binBoundaries'),
              tCursor = (tOrientation === DG.GraphTypes.EOrientation.kVertical) ?
                  this_.kLineSlideVCur : this_.kLineSlideHCur,
              tTitle = 'DG.BinnedPlotModel.dragBinTip'.loc();

          function colorBoundaries() {
            var kDefaultColor = DG.PlotUtilities.kBinBorderLineColor,
                kDragColor = 'steelblue';

            function decorateLine( iLine, iColor, iWidth) {
              iLine.attr( { stroke: iColor, 'stroke-width': iWidth });
            }

            if( this_.dragInProgress) {
              this_.binBoundaries.forEach( function( iSpec, iIndex) {
                if( iSpec.worldValue === tNewBinAlignment) {
                  decorateLine( iSpec.boundary, kDragColor, 2);
                  if( iIndex > 0)
                    decorateLine( this_.binBoundaries[iIndex - 1].boundary, kDefaultColor, 2);
                }
                else
                  decorateLine( iSpec.boundary, kDefaultColor, 1);
              });
            }
            else {
              this_.binBoundaries.forEach( function( iSpec) {
                decorateLine( iSpec.boundary, kDefaultColor, 1);
              });
            }
          }

          function beginTranslate(iWindowX, iWindowY) {
            this_.dragInProgress = true;
            this_.elementBeingDragged = this;
            tBinWidthPixels = this_.getPath('primaryAxisView.binWidth');
            tInitialAlignment = tModel.get('alignment');
            tWorldWidth = tModel.get('width');
            tInitialWorldWidth = tModel.get('width');
            tWidthIncrement = tModel.get('widthIncrement');
            tWorldPerPixel = tWorldWidth / tBinWidthPixels;
            tBinWidthAtStartOfDrag = this_.getPath('primaryAxisView.binWidth');
            this_.set('binNumBeingDragged', this.binNum);
            tNewBinAlignment = tBoundaries[this.binNum].worldValue;
            colorBoundaries();
          }

          function continueTranslate(idX, idY) {
            var tOrientation = this_.getPath('primaryAxisView.orientation'),
                tDelta = (tOrientation === DG.GraphTypes.EOrientation.kVertical) ? -idY : idX,
                tNewBinWidthPixels = Math.max(kMinBinWidth, tBinWidthAtStartOfDrag + tDelta),
                tNewWorldWidth = tNewBinWidthPixels * tWorldPerPixel;
            tNewWorldWidth = Math.round(tNewWorldWidth / tWidthIncrement) * tWidthIncrement;
            SC.run(function () {
              tModel.beginPropertyChanges();
              tModel.set('alignment', tNewBinAlignment);
              tModel.set('width', tNewWorldWidth);
              tModel.endPropertyChanges();
            });
            colorBoundaries();
          }

          function endTranslate(idX, idY) {
            var tNewWidth = tModel.get('width');
            if( tNewBinAlignment !== tInitialAlignment || tInitialWorldWidth !== tNewWidth) {
              this_.markBinParamsChange( tInitialAlignment, tInitialWorldWidth);
            }
            this_.set('binNumBeingDragged', null);
            this_.dragInProgress = false;
            if( this_.elementBeingDragged.shouldGoAway) {
              tAdornmentLayer.prepareToMoveOrRemove(this_.elementBeingDragged);
              this_.elementBeingDragged.remove();
              this_.elementBeingDragged = null;
            }
            colorBoundaries();
            this_.displayDidChange();
          }

          if(!tPaper)
            return; // Not ready to draw

          for (var tBinNum = 0; tBinNum < tNumBins; tBinNum++) {
            var tWorldValue = tLeastBinEdgeWorld + tBinNum * tWorldWidth,
                tLeft, tTop, tRight, tBottom, tLowerEdgeScreenCoord,
                tLine, tCover;
            if (tOrientation === DG.GraphTypes.EOrientation.kVertical) {
              tLeft = tLineStart;
              tTop = tPlace - (tBinNum + 1) * tBinWidthPixels;
              tRight = tLeft + tBinHeight;
              tBottom = tTop;
              tLowerEdgeScreenCoord = tTop + tBinWidthPixels;
            }
            else {
              tLeft = tPlace + (tBinNum + 1) * tBinWidthPixels;
              tTop = tLineStart - tBinHeight;
              tRight = tLeft;
              tBottom = tLineStart;
              tLowerEdgeScreenCoord = tLeft - tBinWidthPixels;
            }
            if (!tBoundaries[tBinNum]) {
              tLine = tPaper.line(tLeft, tTop, tRight, tBottom);
              tCover = tPaper.line(tLeft, tTop, tRight, tBottom)
                  .drag(continueTranslate, beginTranslate, endTranslate);
              tCover.binNum = tBinNum;
              tAdornmentLayer.push(
                  tLine.attr({
                    stroke: DG.PlotUtilities.kBinBorderLineColor,
                    'stroke-width': DG.PlotUtilities.kBinBorderWidth
                  }));
              tAdornmentLayer.push(
                  tCover.attr({
                    'stroke-width': 6, stroke: DG.RenderingUtilities.kSeeThrough,
                    cursor: tCursor, title: tTitle
                  }));
              tBoundaries[tBinNum] = {boundary: tLine, cover: tCover };
            }
            else {
              tLine = tBoundaries[tBinNum].boundary;
              tCover = tBoundaries[tBinNum].cover;
              tCover.attr({cursor: tCursor});
              DG.RenderingUtilities.updateLine(tLine, {x: tLeft, y: tTop}, {x: tRight, y: tBottom});
              DG.RenderingUtilities.updateLine(tCover, {x: tLeft, y: tTop}, {x: tRight, y: tBottom});
            }
            tBoundaries[tBinNum].worldValue = tWorldValue;
            tBoundaries[tBinNum].lowerEdgeScreenCoord = tLowerEdgeScreenCoord;
          }
          while (tBoundaries.length > tNumBins) {
            var tSpec = tBoundaries.pop();
            tAdornmentLayer.prepareToMoveOrRemove(tSpec.boundary);
            tSpec.boundary.remove();
            if( tSpec.cover !== this_.elementBeingDragged) {
              tAdornmentLayer.prepareToMoveOrRemove(tSpec.cover);
              tSpec.cover.remove();
            }
            else
              this_.elementBeingDragged.shouldGoAway = true;  // So that it can be removed later in drag code

          }
        }

        sc_super();

        this.computeBinParams();

        drawBinBoundaries();

        this.drawData();

        this.updateSelection();
      },

      /**
       We need to decide on the number of points in a row. To do so, we find the
       maximum number of points in a bin and choose so that this max number will
       fit within the length of a bin rect. If there are so many points that they don't fit
       even by using the full length of a bin rect, then we compute an overlap.
       */
      computeBinParams: function () {
        var tBinWidth = this.getPath('primaryAxisView.binWidth'),
            tBinHeight = this.getPath('secondaryAxisView.fullCellWidth') - 5,
            tMaxBinCount = this.getPath('model.maxBinCount'),
            tPointSize = 2 * this._pointRadius,
            tAllowedPointsPerColumn = Math.max(1, Math.floor(tBinHeight / tPointSize)),
            tAllowedPointsPerRow = Math.max(1, Math.floor(tBinWidth / tPointSize)),
            tNumPointsInRow = Math.max(1,
                Math.min(tAllowedPointsPerRow,
                    Math.ceil(tMaxBinCount / tAllowedPointsPerColumn))),
            tActualPointsPerColumn = Math.ceil(tMaxBinCount / tNumPointsInRow),
            tOverlap = Math.max(0, ((tActualPointsPerColumn + 1) * tPointSize - tBinHeight) /
                tActualPointsPerColumn);
        tOverlap = Math.min(tOverlap, tPointSize); // Otherwise points can stack downward

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

