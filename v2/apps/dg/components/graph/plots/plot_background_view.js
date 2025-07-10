// ==========================================================================
//                            DG.PlotBackgroundView
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

sc_require('components/graph/utilities/graph_drop_target');
sc_require('views/raphael_base');

/** @class  DG.PlotBackgroundView - The base class view for a plot.

  @extends DG.RaphaelBaseView
*/
DG.PlotBackgroundView = DG.RaphaelBaseView.extend(DG.GraphDropTarget,

    /** @scope DG.PlotBackgroundView.prototype */
    (function () {
      var marqueeInfo;

      return {
        autoDestroyProperties: ['_backgroundForClick'],

        displayProperties: [
          'xAxisView.model.lowerBound', 'xAxisView.model.upperBound', 'xAxisView.model.drawZeroLine',
          'yAxisView.model.lowerBound', 'yAxisView.model.upperBound', 'yAxisView.model.drawZeroLine',
          'xAxisView.model.attributeDescription.attributeStats.categoricalStats.numberOfCells',
          'yAxisView.model.attributeDescription.attributeStats.categoricalStats.numberOfCells',
          'graphModel.plotBackgroundColor', 'graphModel.plotBackgroundOpacity',
          'messages'
        ],

        classNames: 'dg-plot-view'.w(),
        classNameBindings: ['graphModel.isTransparent:dg-plot-view-transparent'],

        /**
         * @property {DG.GraphModel}
         */
        graphModel: null,

        /**
         @property { DG.AxisView}
         */
        xAxisView: null,
        /**
         @property { DG.AxisView }
         */
        yAxisView: null,

        /**
         * Which of the split plots do I correspond to?
         * @property (Number}
         */
        rowIndex: 0,

        /**
         * Which of the split plots do I correspond to?
         * @property (Number}
         */
        colIndex: 0,

        /**
         * Dynamically set to true/false during episodes such as marquee select
         * @property {Boolean}
         */
        tempDisallowDataTips: false,

        // Private properties
        _backgroundForClick: null,  // We make this once and keep it sized properly.

        _backgroundImage: null,

        /**
         * If true, darken the background slightly (useful for grid of plots)
         * @property {Boolean}
         */
        darkenBackground: false,

        /**
         * @property {string[]}
         */
        messages: null,
        /**
         * @private {element[]}
         */
        _messageElements: null,

        colorDidChange: function () {
          var tStoredColor = this.getPath('graphModel.plotBackgroundColor') || 'white',
              tStoredOpacity = this.getPath('graphModel.plotBackgroundOpacity'),
              tNewColor = tStoredColor ? SC.Color.from(tStoredColor) : null;
          if (!tNewColor)
            return;
          if (this.get('darkenBackground'))
            tNewColor = tNewColor.sub(SC.Color.from('#101010'));
          if (!SC.none(tStoredOpacity))
            tNewColor.set('a', tStoredOpacity);
          this.set('backgroundColor', tNewColor.get('cssText'));
        }.observes('.graphModel.plotBackgroundColor', '.graphModel.plotBackgroundOpacity'),

        backgroundImageDidChange: function () {
          var tImage = this.getPath('graphModel.plotBackgroundImage');
          if (tImage === null)
            tImage = '';
          if (this._backgroundImage.attr('src') !== tImage) {
            this._backgroundImage.attr('src', tImage);
          }
        }.observes('.graphModel.plotBackgroundImage'),

        /**
         * Additional setup after creating the view
         */
        didCreateLayer: function () {
          var tGraphView = this.get('parentView');
          sc_super();
          tGraphView.getPlotViewArray(this.get('rowIndex'), this.get('colIndex')).forEach(function (iPlotView) {
            iPlotView.didCreateLayer();
          });
          tGraphView.drawPlots();
        },

        init: function () {
          sc_super();
          this.set('backgroundColor', 'white');
          this.colorDidChange();
          this.messages = [];
          this._messageElements = [];
        },

        /**
         * Subclasses can override calling sc_super() and then adding layers at will.
         */
        initLayerManager: function () {
          sc_super();

          // if base class wasn't able to initialize the layer manager, e.g. because we
          // don't have paper yet, then this.get('layerManager') leads to an infinite loop.
          // For now, we avoid the infinite loop by testing the private _layerManager.
          if (!this._layerManager) return;

          var ln = DG.LayerNames;
          this.get('layerManager').addNamedLayer(ln.kBackgroundImage)
              .addNamedLayer(ln.kBackground)
              .addNamedLayer(ln.kGrid)
              .addNamedLayer(ln.kIntervalShading)
              .addNamedLayer(ln.kClick)
              .addNamedLayer(ln.kGhost)
              .addNamedLayer(ln.kConnectingLines)
              .addNamedLayer(ln.kPoints)
              .addNamedLayer(ln.kSelectedPoints)
              .addNamedLayer(ln.kAdornments)
              .addNamedLayer(ln.kDataTip)
              .addNamedLayer(ln.kCoverRects);

          this._backgroundImage = this._paper.image('', 0, 0, this._paper.width, this._paper.height);
          this.getPath('layerManager.' + DG.LayerNames.kBackgroundImage).push(this._backgroundImage);
        },

        prepareMarquee: function() {
          marqueeInfo = {
            this_: this,
            marquee: null,
            lastRect: null,
            startPt: null,
            needToDeselectAll: null,
            baseSelection: []
          };
        },

        startMarquee: function (iWindowX, iWindowY, iEvent, iDontDeselect) {
          if (iEvent.altKey)
            return; // Alt key has a different meaning
          marqueeInfo.needToDeselectAll = true;
          marqueeInfo.this_.set('tempDisallowDataTips', true);

          if (iEvent.shiftKey || iDontDeselect) {
            marqueeInfo.baseSelection = marqueeInfo.this_.getPath('graphModel.selection').toArray();

            marqueeInfo.needToDeselectAll = false;
          }
          // Only deselect everything if we are the currently selected component
          else if (DG.ComponentView.isComponentViewForViewSelected(marqueeInfo.this_)) {
            marqueeInfo.needToDeselectAll = false;
            SC.run(function () {
              marqueeInfo.this_.get('graphModel').selectAll(false);
            });
          }
          marqueeInfo.startPt = DG.ViewUtilities.windowToViewCoordinates(
              {x: iWindowX, y: iWindowY}, marqueeInfo.this_);
          marqueeInfo.marquee = marqueeInfo.this_._paper.rect(marqueeInfo.startPt.x, marqueeInfo.startPt.y, 0, 0)
              .attr({
                fill: DG.PlotUtilities.kMarqueeColor,
                stroke: DG.RenderingUtilities.kTransparent
              });
          marqueeInfo.lastRect = {x: marqueeInfo.startPt.x, y: marqueeInfo.startPt.y, width: 0, height: 0};
          marqueeInfo.this_.getPath('layerManager.' + DG.LayerNames.kAdornments).push(marqueeInfo.marquee);
          marqueeInfo.this_.get('parentView').prepareToSelectPoints();
          return marqueeInfo.startPt; // So it can be adjusted if necessary
        },

        continueMarquee: function (idX, idY) {
          if (SC.none(marqueeInfo.marquee))
            return; // Alt key was down when we started
          var tX = (idX > 0) ? marqueeInfo.startPt.x : marqueeInfo.startPt.x + idX,
              tY = (idY > 0) ? marqueeInfo.startPt.y : marqueeInfo.startPt.y + idY,
              tWidth = Math.abs(idX),
              tHeight = Math.abs(idY),
              tRect = {x: tX, y: tY, width: tWidth, height: tHeight};
          marqueeInfo.marquee.attr(tRect);
          if (marqueeInfo.needToDeselectAll) {
            SC.run(function () {  // Needs to be in a run loop because invokeLast will be called
              marqueeInfo.this_.get('graphModel').selectAll(false);
              marqueeInfo.needToDeselectAll = false;
            });
          }
          SC.run(function () {
            marqueeInfo.this_.get('parentView').selectPointsInRect(tRect, marqueeInfo.baseSelection, marqueeInfo.lastRect,
                marqueeInfo.this_.get('rowIndex'), marqueeInfo.this_.get('colIndex'));
          });
          marqueeInfo.lastRect = tRect;
        },

        endMarquee: function (idX, idY) {
          marqueeInfo.this_.set('tempDisallowDataTips', false);

          if (SC.none(marqueeInfo.marquee))
            return; // Alt key was down when we started

          marqueeInfo.this_.getPath('layerManager').removeElement(marqueeInfo.marquee, true);
          marqueeInfo.marquee = null;
          marqueeInfo.baseSelection = [];

          var tNumCases = marqueeInfo.this_.getPath('graphModel.casesController.selection.length');
          if (tNumCases > 0)  // We must have something > 0
            DG.logUser("marqueeSelection: %@", tNumCases);
          SC.run(function () {
            marqueeInfo.this_.get('parentView').completeSelection();
          });
        },

        /**
         We just have the background to draw. But it has a marquee behavior and a background click
         behavior to install.
         */
        doDraw: function doDraw() {
          var this_ = this,
              tFrame = this.get('frame'),
              tXAxisView = this.get('xAxisView'),
              tYAxisView = this.get('yAxisView'),
              tDrawXZeroLine = tXAxisView.getPath('model.drawZeroLine'),
              tDrawYZeroLine = tYAxisView.getPath('model.drawZeroLine'),
              tBackgroundLayer = this.getPath('layerManager.' + DG.LayerNames.kBackground),
              tGridLayer = this.getPath('layerManager.' + DG.LayerNames.kGrid),
              tBothWaysNumeric = (tXAxisView.get('isNumeric') && tYAxisView.get('isNumeric')),
              tY2AttributeID = this.getPath('graphModel.dataConfiguration.y2AttributeID'),
              tHasY2Attribute = tY2AttributeID && (tY2AttributeID !== DG.Analysis.kNullAttribute);

          function updateBackgroundImage() {
            if (!this_._paper)
              return; // not yet ready
            var tBackgroundImage = this_.getPath('graphModel.plotBackgroundImage'),
                tLockInfo = this_.getPath('graphModel.plotBackgroundImageLockInfo');
            if (tBackgroundImage === null)
              tBackgroundImage = '';
            if (this_._backgroundImage.attr('src') !== tBackgroundImage) {
              this_._backgroundImage.attr('src', tBackgroundImage);
            }
            if (tLockInfo && tLockInfo.locked) {
              var tXAxisView = this_.get('xAxisView'),
                  tYAxisView = this_.get('yAxisView'),
                  tLeft = tXAxisView.dataToCoordinate(tLockInfo.xAxisLowerBound),
                  tRight = tXAxisView.dataToCoordinate(tLockInfo.xAxisUpperBound),
                  tTop = tYAxisView.dataToCoordinate(tLockInfo.yAxisUpperBound),
                  tBottom = tYAxisView.dataToCoordinate(tLockInfo.yAxisLowerBound);
              this_._backgroundImage.attr({
                x: tLeft, y: tTop,
                width: tRight - tLeft, height: tBottom - tTop
              });
            }
            else {
              this_._backgroundImage.attr({width: this_._paper.width, height: this_._paper.height});
            }
          }

          function createRulerLines() {

            function vLine(iX, iColor, iWidth) {
              tGridLayer.push(
                  this_._paper.line(iX, tFrame.height, iX, 0)
                      .attr({stroke: iColor, 'stroke-width': iWidth}));
            }

            function hLine(iY, iColor, iWidth) {
              tGridLayer.push(
                  this_._paper.line(0, iY, tFrame.width, iY)
                      .attr({stroke: iColor, 'stroke-width': iWidth}));
            }

            function drawVRule(iValue, iX) {
              vLine(iX, DG.PlotUtilities.kRuleColor, DG.PlotUtilities.kRuleWidth);
            }

            function drawHRule(iValue, iY) {
              hLine(iY, DG.PlotUtilities.kRuleColor, DG.PlotUtilities.kRuleWidth);
            }

            function drawZeroLines(iDrawXLine, iDrawYLine, iColor) {

              function drawLine(iAxisView, iDrawingFunc) {
                var tZeroCoord = iAxisView.get('zeroPixel'),
                    tColor = iColor || DG.PlotUtilities.kZeroLineColor;
                if ((tZeroCoord != null) && !iAxisView.get('isDateTime'))
                  iDrawingFunc(tZeroCoord, tColor, DG.PlotUtilities.kZeroLineWidth);
              }

              iDrawXLine && drawLine(tXAxisView, vLine);
              iDrawYLine && drawLine(tYAxisView, hLine);
            }

            if (tBothWaysNumeric) {
              tXAxisView.forEachTickDo(drawVRule);
              if (!tHasY2Attribute)
                tYAxisView.forEachTickDo(drawHRule);
              drawZeroLines(true, true);
            } // else suppress numeric grid lines for dot plots (numeric only on one axis), because it interferes with mean/median lines, etc.
            else if (tDrawXZeroLine || tDrawYZeroLine) {
              drawZeroLines(tDrawXZeroLine, tDrawYZeroLine, DG.PlotUtilities.kRuleColor);
            }
          } // createRulerLines

          function showCursor(iEvent) {
            if (iEvent.altKey) {
              var magnifyPlusCursorUrl = static_url('cursors/MagnifyPlus.cur'),
                  magnifyMinusCursorUrl = static_url('cursors/MagnifyMinus.cur'),
                  cursorUrl = iEvent.shiftKey ? magnifyMinusCursorUrl : magnifyPlusCursorUrl;
              this.attr({cursor: DG.Browser.customCursorStr(cursorUrl, 8, 8)});
            }
            else
              this.attr({cursor: 'auto'});
          }

          /*
              function destroyZoomTip() {
                if( tToolTip) {
                  tToolTip.hide();
                  tToolTip.destroy();
                  tToolTip = null;
                }
              }
          */

          /*
              function mouseOver( iEvent) {
                if( !tHaveShowZoomTip) {
                  var tZoomTipText = 'DG.GraphView.zoomTip'.loc();
                  tToolTip = DG.ToolTip.create( { paperSource: this_,
                                                      text: tZoomTipText,
                                                      tipOrigin: {x: iEvent.layerX, y: iEvent.layerY},
                      layerName: 'dataTip' });
                  tToolTip.show();
                  tHaveShowZoomTip = true;
                  this_.invokeLater( destroyZoomTip, 5000);
                }
              }
          */

          var drawCellBands = function () {
            var tPaper = this.get('paper'),
                tXView = this.get('xAxisView'),
                tAllowVertical = tXView.get('allowCellBoundaries'),
                tYView = this.get('yAxisView'),
                tAllowHorizontal = tYView.get('allowCellBoundaries'),
                tNumXCells = tXView.getPath('model.numberOfCells'),
                tNumYCells = tYView.getPath('model.numberOfCells'),
                tXCellWidth = tXView.get('fullCellWidth'),
                tYCellWidth = tYView.get('fullCellWidth'),
                kIgnoreDragging = true,
                tIndex,
                tXCoord, tYCoord, tLeft, tTop;
            if (SC.none(tPaper))
              return;

            var drawVerticalLines = function () {
                  var tHeight = tYCellWidth * tNumYCells;
                  tYCoord = tYView.cellToCoordinate(tNumYCells - 1);
                  tTop = tYCoord - tYCellWidth / 2;
                  for (tIndex = 1; tIndex < tNumXCells; tIndex++) {
                    var tLine;
                    tXCoord = tXView.cellToCoordinate(tIndex, kIgnoreDragging);
                    tLeft = tXCoord - tXCellWidth / 2;
                    tLine = tPaper.line(tLeft, tTop, tLeft, tTop + tHeight);
                    tBackgroundLayer.push(
                        tLine.attr({stroke: DG.PlotUtilities.kRuleColor, 'stroke-width': 1}));
                  }
                }.bind(this),

                drawHorizontalLines = function () {
                  var tWidth = tXCellWidth * tNumXCells;
                  tXCoord = tXView.cellToCoordinate(0);
                  tLeft = tXCoord - tXCellWidth / 2;
                  for (tIndex = 1; tIndex < tNumYCells; tIndex++) {
                    var tLine;
                    tYCoord = tYView.cellToCoordinate(tIndex, kIgnoreDragging);
                    tTop = tYCoord - tYCellWidth / 2;
                    tLine = tPaper.line(tLeft, tTop + tYCellWidth, tLeft + tWidth, tTop + tYCellWidth);
                    tBackgroundLayer.push(
                        tLine.attr({stroke: DG.PlotUtilities.kRuleColor, 'stroke-width': 1}));
                  }
                }.bind(this);
            if (tAllowVertical)
              drawVerticalLines();
            if (tAllowHorizontal)
              drawHorizontalLines();

          }.bind(this); // drawCellBands

          function startMarquee(iWindowX, iWindowY, iEvent) {
            this_.prepareMarquee();
            this_.startMarquee(iWindowX, iWindowY, iEvent);
          }

          tGridLayer.clear();
          tBackgroundLayer.clear();

          updateBackgroundImage();

          createRulerLines();

          drawCellBands();

          this.displayMessages();

          if (SC.none(this._backgroundForClick)) {
            this._backgroundForClick = this.getPath('layerManager.' + DG.LayerNames.kClick).push(
                this._paper.rect(0, 0, 0, 0)
                    .attr({
                      fill: DG.RenderingUtilities.kSeeThrough,
                      stroke: DG.RenderingUtilities.kTransparent
                    })
                    .click(function (iEvent) {
                      this_.get('parentView').handleBackgroundClick(iEvent);
                    })
                    .dblclick(function (iEvent) {
                      this_.get('parentView').handleBackgroundDblClick(iEvent);
                    })
                    .drag(this_.continueMarquee, startMarquee, this_.endMarquee)
                    .mousemove(showCursor)
                // The mouseover hint is annoying, and probably not useful.
                /*.mouseover( mouseOver)*/);
          }

          this._backgroundForClick.attr({
            width: this.get('drawWidth'),
            height: this.get('drawHeight')
          });

        },

        // We override to customize our dropHintString based on whether there are attributes or not
        dragStarted: function (iDrag) {
          // Call our mixin method first because it sets dropHintString
          DG.GraphDropTarget.dragStarted.call(this, iDrag);

          // Override mixin's setting
          var tDataConfig = this.getPath('graphModel.dataConfiguration'),
              tIsNotEmpty = tDataConfig && (tDataConfig.get('xAttributeID') ||
                  tDataConfig.get('yAttributeID') || tDataConfig.get('legendAttributeID')),
              tHintString = (tIsNotEmpty ? 'DG.GraphView.dropInPlot' : 'DG.GraphView.addToEmptyX')
                  .loc(iDrag.data.attribute.get('name'));
          this.set('dropHintString', tHintString);
        },

        /**
         * Display the given strings centered
         * @param iMessages {string[]}
         */
        displayMessages: function() {
          var tMessages = this.get('messages'),
              tNumStrings = tMessages.length,
              tPaper = this.get('paper'),
              tMessageElements = this._messageElements;

          function removeExistingMessageElements() {
            tMessageElements.forEach( function( iElement) {
              tLayer.prepareToMoveOrRemove(iElement);
              iElement.remove();
            });
          }

          if( !tPaper)
            return;
          var tLayer = this.getPath('layerManager.' + DG.LayerNames.kDataTip);
          removeExistingMessageElements();
          if( tNumStrings > 0) {
            var tMsg = tPaper.text(0, 0, tMessages[0]);
            tMsg.attr('font-size', 12);
            var tTextHeight = DG.RenderingUtilities.getExtentForTextElement(tMsg).height,
                tY = (tPaper.height - tNumStrings * tTextHeight) / 2;
            tMsg.remove();
            tMessages.forEach(function (iMsg, iIndex) {
              var tText = tPaper.text(tPaper.width / 2, tY + iIndex * tTextHeight, iMsg);
              tText.attr('font-size', 12);
              tLayer.push(tText);
              tMessageElements.push(tText);
            });
          }
        }

      }; // object returned closure
    }()) // function closure
);
