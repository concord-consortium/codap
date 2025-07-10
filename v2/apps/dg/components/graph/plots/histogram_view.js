// ==========================================================================
//                          DG.HistogramView
//
//  Author:   William Finzer
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

sc_require('components/graph/plots/univariate_plot_view');

/** @class  DG.HistogramView, a plot of dots each placed according to numeric value bins

 @extends DG.UnivariatePlotView
 */
DG.HistogramView = DG.UnivariatePlotView.extend(
    /** @scope DG.HistogramView.prototype */
    {
      kLineSlideHCur: DG.Browser.customCursorStr(static_url('cursors/LineSlideH.cur'), 8, 8),
      kLineSlideVCur: DG.Browser.customCursorStr(static_url('cursors/LineSlide.cur'), 8, 8),

      /**
       * Expected type of plotted elements
       */
      plottedElementType: 'rect',

      /**
       * @property {[{coverRect: Element, draggableEdge: Element,
       *            lowerEdgeWorldValue: Number, lowerEdgeScreenCoord: Number }]}
       */
      barElements: null,

      _barToolTip: null,
      barToolTip: function() {
        if( !this._barToolTip) {
          this._barToolTip = DG.ToolTip.create( { paperSource: this,
            layerName: 'dataTip' });
        }
        return this._barToolTip;
      }.property(),
      /**
       * @property { Boolean }
       */
      dragInProgress: false,

      /**
       * @property {Element}
       */
      elementBeingDragged: null,

      init: function () {
        sc_super();
        this.barElements = [];
      },

      destroy: function () {
        var tLayerManager = this.get('layerManager'),
            tPlottedElements = this.get('plottedElements');
        tPlottedElements.forEach( function( iElement) {
          tLayerManager.removeElement( iElement, true /* callRemove */);
        });
        tPlottedElements.length = 0;

        this.barElements.forEach(function (iElement) {
          ['coverRect', 'draggableEdge'].forEach( function( iProp) {
            tLayerManager.removeElement(iElement[iProp]);
            iElement[iProp].remove();
          });
        });

        sc_super();
      },

      /**
       * We don't show counts or percents.
       */
      modelDidChange: function() {
        var tCountModel = this.getPath('model.plottedCount');
        if( tCountModel) {
          tCountModel.beginPropertyChanges();
          tCountModel.set('isVisible', false);
          tCountModel.set('isShowingCount', false);
          tCountModel.set('isShowingPercent', false);
          tCountModel.endPropertyChanges();
        }
      }.observes('model'),

      /**
       * Return the class of the count axis with the x or y to put it on.
       * @return {[{}]}
       */
      getAxisViewDescriptions: function () {
        var tDescriptions = [], // Don't call base class because it wants to add categorical axis view
            tCountKey = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical ? 'y' : 'x',
            tNumericKey = tCountKey === 'x' ? 'y' : 'x';
        tDescriptions.push( {
          axisKey: tCountKey,
          axisClass: DG.CountAxisView
        });
        tDescriptions.push( {
          axisKey: tNumericKey,
          axisClass: DG.CellLinearAxisView
        });
        return tDescriptions;
      },

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

      /**
       * Make sure the count axis has the correct upper bounds
       */
      setupAxes: function () {
        sc_super();
        var tCountAxisView = this.get('secondaryAxisView'),
            tAttributeAxisView = this.get('primaryAxisView'),
            tWidth = this.getPath('model.width');
        // If the axes already have bounds, don't change them
        if (tCountAxisView && SC.none(tCountAxisView.getPath('model.lowerBound'))) {
          tCountAxisView.get('model').setLowerAndUpperBounds(0, 1.05 * this.getPath('model.maxBinCount'));
        }
        if (tAttributeAxisView && SC.none( tAttributeAxisView.getPath('model.lowerBound'))) {
          tAttributeAxisView.get('model').setLowerAndUpperBounds(this.getPath('model.leastBinEdge') - tWidth,
              this.getPath('model.maxBinEdge') + tWidth);
        }
      },

      /**
       * Construct and return a new render context
       * used for setCircleCoordinate()
       * @return {*}
       */
      createRenderContext: function () {
        var tRC = sc_super(),
            tModel = this.get('model');
        if(!tRC)
          return null;
        tRC.isVerticalOrientation = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical;
        tRC.countAxisView = this.get('secondaryAxisView');
        tRC.leastBinEdgeWorld = tModel.get('leastBinEdge');
        tRC.leastBinEdgePixels = tRC.primaryAxisView.dataToCoordinate( tRC.leastBinEdgeWorld);
        tRC.barWidthWorld = tModel.get('width');
        tRC.barWidthPixels = Math.abs(tRC.primaryAxisView.dataToCoordinate( tRC.barWidthWorld) -
            tRC.primaryAxisView.dataToCoordinate( 0));
        tRC.sliceHeightPixels =  Math.abs(tRC.countAxisView.dataToCoordinate( 1) -
            tRC.countAxisView.dataToCoordinate( 0));

        return tRC;
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
              tCaseInfo = tModel.infoForCase(iIndex);
          this.privSetElementCoords(tRC, iCase, iIndex, tCaseInfo, iAnimate, tCallback);
        }.bind(this));
      },

      /**
       @param iAnimate { Boolean }
       @param iCallback { Function }
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
       Override base class because we're dealing with rectangles, not points.
       @return {Array of {x:{Number}, y:{Number}, width:{Number}, height:{Number}, cx:{Number}, cy:{Number}, r:{Number}, fill:{String}}}
       */
      getElementPositionsInParentFrame: function() {
        var tFrame = this.get('frame');
        return this.get('plottedElements').map( function( iElement) {
          var tX = iElement.attr('x') + tFrame.x,
              tY = iElement.attr('y') + tFrame.y,
              tWidth = iElement.attr('width'),
              tHeight = iElement.attr('height'),
              tR = 0, //Math.min( tWidth, tHeight) / 2,
              tCx = tX + tWidth / 2,
              tCy = tY + tHeight / 2,
              tResult = { x: tX, y: tY, width: tWidth, height: tHeight, cx: tCx, cy: tCy, r: tR,
                fill: iElement.attr('fill'), type: 'rect', stroke: iElement.attr('stroke'),
                'stroke-opacity': iElement.attr('stroke-opacity')
              };
          return tResult;
        });
      },

      /**
       We override the base class implementation to animate the circles that we're given from a binned
       plot view into rectangles.
       */
      animateFromTransferredElements: function () {
        var this_ = this,
            tModel = this.get('model'),
            tCases = tModel.get('cases'),
            tRC = this.createRenderContext(),
            tFrame = this.get('frame'), // to convert from parent frame to this frame
            tOldElementAttrs = this.get('transferredElementCoordinates'),
            tOldElementsAreCircles = tOldElementAttrs[0] && tOldElementAttrs[0].type === 'circle';
        if (!tCases)
          return;

        function turnOffAnimation() {
          tModel.set('isAnimating', false);
          this_.get('plottedElements').forEach( function( iElement) {
            iElement.stop();
          });
          this_.displayDidChange(); // Force redisplay in correct position
        }

        DG.sounds.playMixup();
        var tPlottedElements = this.get('plottedElements'),
            tTransAttrs;

        this.prepareToResetCoordinates();
        this.removePlottedElements();
        // Normally we leave the elements (circles) for re-use. But since we want rects, we have let go of the circles.
        tPlottedElements.forEach( function( iElement) {
          iElement.remove();
        });
        tPlottedElements.length = 0;
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
          var tOldElement = tOldElementAttrs[iIndex],
              tCaseInfo = tModel.infoForCase(iIndex),
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
          tElement = this_.privSetElementCoords(tRC, iCase, iIndex, tCaseInfo, true /* animate */);
        });
        this.set('transferredElementCoordinates', null);

        tModel.set('isAnimating', true);
        SC.Timer.schedule({action: turnOffAnimation, interval: DG.PlotUtilities.kDefaultAnimationTime});
      },

      resetCoordinates: function (iCases, iRC) {
        var tPlotElementLength = this.get('plottedElements').length,
            tModel = this.get('model');
        this.prepareToResetCoordinates();
        iCases.forEach(function (iCase, iIndex) {
          if (iIndex >= tPlotElementLength)
            this.callCreateElement(iCase, iIndex, true, iRC.isVisible);
          this.privSetElementCoords(iRC, iCase, iIndex, tModel.infoForCase( iIndex));
        }.bind(this));
        this._mustMoveElementsToNewCoordinates = false;
      },

      /**
       * This is a shim so we can handle assumption that elements are circles
       * @param iRC
       * @param iCase
       * @param iIndex
       */
      setCircleCoordinate: function( iRC, iCase, iIndex) {
        this.privSetElementCoords( iRC, iCase, iIndex, this.get('model').infoForCase( iIndex));
      },

      /**
       *
       * @param iRC {*}
       * @param iCase {DG.Case}
       * @param iIndex {Number}
       * @param iCaseInfo { {value: {Number}, cell: {Number}, bin: { Number}, indexInBin: {Number}} }
       * @param iAnimate {Boolean}
       * @param iCallback {Function}
       */
      privSetElementCoords: function (iRC, iCase, iIndex, iCaseInfo, iAnimate, iCallback) {
        DG.assert(iRC && iRC.xAxisView);
        DG.assert(iCase);
        DG.assert(DG.MathUtilities.isInIntegerRange(iIndex, 0, this.get('plottedElements').length));
        var tRect = this.get('plottedElements')[iIndex];

        // It can happen that we don't have case info yet. Bail for now cause we'll be back later.
        if( !iCaseInfo)
          return;

        var tTop = iRC.countAxisView.dataToCoordinate(iCaseInfo.indexInBin + 1),
            tEdge = iRC.primaryAxisView.dataToCoordinate(iRC.leastBinEdgeWorld + (iCaseInfo.bin) * iRC.barWidthWorld),
            tCoordX, tCoordY, tWidth, tHeight;

        if (iRC.isVerticalOrientation) {
          tCoordX = tEdge;
          tCoordY = tTop;
          tWidth = iRC.barWidthPixels;
          tHeight = iRC.sliceHeightPixels;
        }
        else {
          tCoordX = tTop - iRC.sliceHeightPixels;
          tCoordY = tEdge - iRC.barWidthPixels;
          // todo: How to disable lint for these two lines?
          tWidth = iRC.sliceHeightPixels;
          tHeight = iRC.barWidthPixels;
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
       * Each bar of the histogram gets covered by a rectangle so that hovering produces a data tip
       * with information about the cases represented by that bar.
       */
      drawCoverRectsAndBoundaries: function() {

        function makeARect( iBar, iIndex) {
          var tDigits = DG.PlotUtilities.findFractionDigitsForAxis( tPrimaryAxisView),
              tNumFormat = DG.Format.number().fractionDigits( 0, tDigits),
              tRect = tPaper.rect( 0, 0, 0, 0)
                  .attr({stroke: DG.PlotUtilities.kBinBorderLineColor,
                    fill: 'white', 'fill-opacity': 0.001, cursor: 'pointer'})
                  .hover(function (iEvent) {
                        var tTotalCount = this_.getPath('model.totalCount');
                        if( this_.dragInProgress)
                          return;
                        this.animate({
                          'fill-opacity': 0.4
                        }, DG.PlotUtilities.kDataTipShowTime);
                        tWidth = this_.getPath('model.width');
                        tLeastEdge = this_.getPath('model.leastBinEdge');
                        tToolTip = this_.get('barToolTip');
                        tTemplate = iBar.count > 1 ? "DG.HistogramView.barTipNoLegendPlural" :
                            "DG.HistogramView.barTipNoLegendSingular";
                        tToolTipText = tTemplate.loc(
                            this.indices.length,
                            tTotalCount,
                            Math.round(1000 * (this.indices.length) / tTotalCount) / 10,
                            tNumFormat( tLeastEdge + iIndex * tWidth),
                            tNumFormat( tLeastEdge + (iIndex + 1) * tWidth)
                        );
                        tToolTip.set('text', tToolTipText);
                        tToolTip.set('tipOrigin', {x: iEvent.layerX, y: iEvent.layerY});
                        tToolTip.show();
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
                      this_.get('model').selectCasesWithIndices(this.indices, iEvent.shiftKey);
                    }.bind( this));
                  });
          tRect.indices = iBar.indices;
          return tRect;
        }

        function updateCoverRect( iCoverRect, iBar, iIndex) {
          var tX = tIsVertical ? tPrimaryAxisView.dataToCoordinate( tLeastEdge + iIndex * tWidth) : 0,
              tY = tIsVertical ? tCountAxisView.dataToCoordinate( iBar.count) :
                  tPrimaryAxisView.dataToCoordinate( tLeastEdge + (iIndex + 1) * tWidth),
              tRectWidth = tIsVertical ? tWidthPixels : tCountAxisView.dataToCoordinate( iBar.count),
              tRectHeight = tIsVertical ? tCountAxisView.get('pixelMin') - tCountAxisView.dataToCoordinate( iBar.count) :
                  tWidthPixels;
          iCoverRect.indices = iBar.indices;
          iCoverRect.attr( { x: tX, y: tY, width: tRectWidth, height: tRectHeight});
        }

        function makeADraggableEdge( iBar, iIndex) {
          var tModel = this_.get('model'),
              kMinBinWidth = 10,
              tInitialAlignment, tWorldWidth, tInitialWorldWidth,
              tWidthIncrement, tWorldPerPixel, tBinWidthAtStartOfDrag, tNewBinAlignment;

          function beginTranslate(iWindowX, iWindowY) {
            this_.dragInProgress = true;
            this_.elementBeingDragged = this;
            tInitialAlignment = tModel.get('alignment');
            tWorldWidth = tModel.get('width');
            tInitialWorldWidth = tModel.get('width');
            tWidthIncrement = tModel.get('widthIncrement');
            tWidthPixels = Math.abs(tPrimaryAxisView.dataToCoordinate( tWidth) - tPrimaryAxisView.dataToCoordinate( 0));
            tWorldPerPixel = tWorldWidth / tWidthPixels;
            tBinWidthAtStartOfDrag = Math.abs( tPrimaryAxisView.dataToCoordinate(tWorldWidth) -
                tPrimaryAxisView.dataToCoordinate(0));
            this_.set('binNumBeingDragged', iIndex);
            tNewBinAlignment = this.lowerEdgeWorld;
            tModel.set('alignment', tNewBinAlignment);
          }

          function continueTranslate(idX, idY) {
            var tDelta = tIsVertical ? idX : -idY,
                tNewWorldWidth = (tBinWidthAtStartOfDrag + tDelta) * tWorldPerPixel;
            tNewWorldWidth = Math.round(tNewWorldWidth / tWidthIncrement) * tWidthIncrement;
            if( tBinWidthAtStartOfDrag + tDelta >= kMinBinWidth) {
              SC.run( function() {
                tModel.set('width', tNewWorldWidth);
              });
            }
          }

          function endTranslate(idX, idY) {
            var tNewWidth = tModel.get('width');
            if( tNewBinAlignment !== tInitialAlignment || tInitialWorldWidth !== tNewWidth) {
              this_.markBinParamsChange( tInitialAlignment, tInitialWorldWidth);
            }
            this_.set('binNumBeingDragged', null);
            this_.dragInProgress = false;
            if( this_.elementBeingDragged.shouldGoAway) {
              tCoverLayer.prepareToMoveOrRemove(this_.elementBeingDragged);
              this_.elementBeingDragged.remove();
              this_.elementBeingDragged = null;
            }
            this_.displayDidChange();
          }

          var tLineCover = tPaper.line(0, 0, 0, 0)
                  .drag(continueTranslate, beginTranslate, endTranslate);
          tLineCover.binNum = iIndex;
          return tLineCover.attr({
            'stroke-width': 6, stroke: DG.RenderingUtilities.kSeeThrough,
            cursor: tCursor, title: tTitle
          });
        }

        function updateDraggableEdge( iLine, iBar, iIndex) {
          var tX1 = tIsVertical ? tPrimaryAxisView.dataToCoordinate( tLeastEdge + (iIndex + 1) * tWidth) : 0,
              tY1 = tIsVertical ? tCountAxisView.dataToCoordinate( iBar.count) :
                  tPrimaryAxisView.dataToCoordinate( tLeastEdge + (iIndex + 1) * tWidth),
              tX2 = tIsVertical ? tX1 : tCountAxisView.dataToCoordinate( iBar.count),
              tY2 = tIsVertical ? tCountAxisView.get('pixelMin') : tY1;
          iLine.count = iBar.count;
          iLine.binNum = iIndex;
          iLine.lowerEdgeWorld = iBar.lowerEdgeWorld;
          DG.RenderingUtilities.updateLine( iLine, { x: tX1, y: tY1 }, { x: tX2, y: tY2});
        }

        var this_ = this,
            tPaper = this.get('paper'),
            tPrimaryAxisView = this.get('primaryAxisView'),
            tCountAxisView = this.get('secondaryAxisView'),
            tIsVertical = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical,
            tCoverLayer = this.get('coverRectsLayer'),
            tLeastEdge = this.getPath('model.leastBinEdge'),
            tWidth = this.getPath('model.width'),
            tWidthPixels = Math.abs(tPrimaryAxisView.dataToCoordinate( tWidth) - tPrimaryAxisView.dataToCoordinate( 0)),
            tBarElements = this.get('barElements'),
            tBars = this.getPath('model.bars'),
            tNumBars = tBars.length,
            tCursor = tIsVertical ? this_.kLineSlideHCur : this_.kLineSlideVCur,
            tTitle = 'DG.BinnedPlotModel.dragBinTip'.loc(),
            tTemplate, tToolTipText, tToolTip;
        tBars.forEach( function( iBar, iIndex) {
          if( !tBarElements[ iIndex]) {
            tBarElements[ iIndex] = {
              coverRect: makeARect( iBar, iIndex),
              draggableEdge: makeADraggableEdge( iBar, iIndex)
            };
            tCoverLayer.push( tBarElements[ iIndex].coverRect);
            tCoverLayer.push( tBarElements[ iIndex].draggableEdge);
          }
          else {
            updateCoverRect( tBarElements[ iIndex].coverRect, iBar, iIndex);
            updateDraggableEdge( tBarElements[ iIndex].draggableEdge, iBar, iIndex);
          }
        });

        while (tBarElements.length > tNumBars) {
          var tElement = tBarElements.pop();
          // eslint-disable-next-line no-loop-func
          ['coverRect', 'draggableEdge'].forEach( function( iProp) {
            if( tElement[iProp] !== this_.elementBeingDragged) {
              tCoverLayer.prepareToMoveOrRemove(tElement[iProp]);
              tElement[iProp].remove();
            }
            else
              this_.elementBeingDragged.shouldGoAway = true;  // So that it can be removed later in drag code
          });
        }

        tBarElements.forEach( function( iElement) {
          tCoverLayer.bringToFront( iElement.draggableEdge);
        });
      },

      /**
       Generate the svg needed to display the plot
       */
      doDraw: function doDraw() {

        sc_super();

        this.drawData();

        this.drawCoverRectsAndBoundaries();

        // this.updateSelection();
      }

    });
