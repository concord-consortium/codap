// ==========================================================================
//                          DG.CasePlotView
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

sc_require('components/graph/plots/plot_view');

/** @class DG.CasePlotView - A plot of dots placed according to numeric values

 @extends DG.PlotView
 */
DG.CasePlotView = DG.PlotView.extend(
    /** @scope DG.CasePlotView.prototype */
    (function () {

      function dataToCoordinate(iValue, iMin, iMax, iMargin) {
        return iMin + iMargin + iValue * (iMax - iMin - 2 * iMargin);
      }

      function addHandlers(iView, iElOrPointSet) {
        function changeCaseValues(iIndex, iWorldValues) {
          iView.get('model').setWorldCoords(iIndex, iWorldValues);
        }

        var tIsDragging = false,
            kOpaque = 1,
            tInitialTransform = null;
        if (iElOrPointSet.events) {
          iElOrPointSet.events.forEach(function (iHandler) {
            iHandler.unbind();
          });
          iElOrPointSet.events.length = 0;
        }

        iElOrPointSet
            .hover(function (event) {  // over
                  // Note that Firefox can come through here repeatedly so we have to check for existence
                  if (!tIsDragging && SC.none(tInitialTransform)) {
                    tInitialTransform = this.transform();
                    this.animate({
                      opacity: kOpaque,
                      transform: DG.PlotUtilities.kDataHoverTransform
                    }, DG.PlotUtilities.kDataTipShowTime);
                    iView.showDataTip(this, this.index);
                  }
                },
                function (event) { // out
                  iView.hideDataTip();
                  if (!tIsDragging) {
                    this.stop();
                    this.animate({transform: tInitialTransform}, DG.PlotUtilities.kHighlightHideTime);
                    tInitialTransform = null;
                  }
                })
            .mousedown(function (iEvent) {
              iView.get('model').selectCaseByIndex(this.index, iEvent.shiftKey);
            })
            .drag(function (dx, dy) { // continue
                  // TODO: drag all selected cases, not just this case.
                  var tWorldX = iView.get('xAxisView').coordinateToData(this.ox + dx),
                      tWorldY = iView.get('yAxisView').coordinateToData(this.oy + dy),
                      tPoint = {x: tWorldX, y: tWorldY},
                      tRC = iView.createRenderContext(),
                      tCurrTransform = this.transform();
                  if (isFinite(tPoint.x) && isFinite(tPoint.y)) {
                    // Put the element into the initial transformed state so that changing case values
                    // will not be affected by the scaling in the current transform.
                    this.transform(tInitialTransform);
                    changeCaseValues(this.index, tPoint);
                    this.transform(tCurrTransform);
                  }
                  iView.setCircleCoordinate(tRC, iView.getPath('model.cases').at(this.index), this.index);
                },
                function (x, y) { // begin
                  tIsDragging = true;
                  this.ox = this.attr("cx");
                  this.oy = this.attr("cy");
                  this.animate({opacity: kOpaque}, DG.PlotUtilities.kDataTipShowTime, "bounce");
                  this.toFront();
                },
                function () {  // end
                  this.animate({transform: tInitialTransform}, DG.PlotUtilities.kHighlightHideTime);
                  tIsDragging = false;
                });
      }

      return {

        handlersMustBeInstalledToExistingElements: true,

        init: function () {
          sc_super();
        },

        dataRangeDidChange: function (iSource, iQuestion, iKey, iChanges) {
          var this_ = this,
              tPlotElementLength = this.get('plottedElements').length,
              tCases = this.getPath('model.cases'),
              tRC = this.createRenderContext();

          // iChanges can be a single index or an array of indices
          var tChanges = (SC.typeOf(iChanges) === SC.T_NUMBER ? [iChanges] : iChanges);
          tChanges = tChanges || [];
          tChanges.forEach(function (iIndex) {
            var tCase = tCases.at(iIndex);
            if (iIndex >= tPlotElementLength)
              this_.callCreateElement(tCase, iIndex, this_._createAnimationOn);
            this_.setCircleCoordinate(tRC, tCase, iIndex);
          });
          sc_super();
        },

        /**
         * Override because we do things a little differently
         * @param iElement
         * @param iIndex
         * @param iAnimate
         * @return {{events}|*}
         */
        assignElementAttributes: function (iElement, iIndex, iAnimate) {
          addHandlers( this, iElement);
          iElement.index = iIndex;
          if (iAnimate)
            DG.PlotUtilities.doCreateCircleAnimation(iElement);
          return iElement;
        },

        /**
         * Set the coordinates and other attributes of the case circle (a Rafael element in this.get('plottedElements')).
         * @param iRC {} case-invariant Render Context
         * @param iCase {DG.Case} the case data
         * @param iIndex {number} index of case in collection
         * @param iAnimate {Boolean} (optional) want changes to be animated into place?
         * @param iCallback {Function} Will be called when animation finished
         * @returns {cx {Number},cy {Number}} final coordinates or null if not defined (hidden plot element)
         */
        setCircleCoordinate: function (iRC, iCase, iIndex, iAnimate, iCallback) {
          DG.assert(iRC && iRC.xAxisView, 'incomplete render context');
          DG.assert(iCase, 'no case');
          DG.assert(DG.MathUtilities.isInIntegerRange(iIndex, 0, this.get('plottedElements').length),
              'out of bounds', 'Index for circle element');

          var tCircle = this.get('plottedElements')[iIndex],
              tRadius = this.radiusForCircleElement(tCircle),
              tWorldCoords = this.get('model').getWorldCoords(iIndex),
              tCoordX = dataToCoordinate(tWorldCoords.x,
                  iRC.xAxisView.get('pixelMin'), iRC.xAxisView.get('pixelMax'), tRadius),
              tCoordY = dataToCoordinate(tWorldCoords.y,
                  iRC.yAxisView.get('pixelMin'), iRC.yAxisView.get('pixelMax'), tRadius),
              tIsMissingCase = SC.none(tCoordX) || SC.none(tCoordY);

          // show or hide if needed, then update if shown.
          if (this.showHidePlottedElement(tCircle, tIsMissingCase, iIndex)) {
            var tAttrs = {
              cx: tCoordX,
              cy: tCoordY,
              r: tRadius,
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

        createElement: function (iDatum, iIndex, iAnimate) {

          var tPaper = this.get('paper'),
              tCircle = tPaper.circle(tPaper.width / 2, tPaper.height / 2, this._pointRadius)
                  .attr({cursor: "pointer"})
                  .addClass(DG.PlotUtilities.kDotClassName);
          tCircle.index = iIndex;
          tCircle.node.setAttribute('shape-rendering', 'geometric-precision');
          addHandlers(this, tCircle);
          return tCircle;
        },

        /**
         We may clear and draw everything from scratch if required.
         */
        drawData: function () {
          var this_ = this;
          if (!this.get('paper') || !this.get('model') || !this.getPath('model.cases') || this.getPath('model.isAnimating'))
            return;

          if (this.handlersMustBeInstalledToExistingElements) {
            this.get('plottedElements').forEach(function (iElement) {
              addHandlers(this_, iElement);
            });
            this.handlersMustBeInstalledToExistingElements = false;
          }

          if (this.getPath('model.isAnimating'))
            return; // Points are animating to new position

          function createCircleDescription(iIndex) {
            var tWorldCoords = tModel.getWorldCoords(iIndex);
            return {
              type: 'circle',
              cx: dataToCoordinate(tWorldCoords.x, tXPixelMin, tXPixelMax, kMargin),
              cy: dataToCoordinate(tWorldCoords.y, tYPixelMin, tYPixelMax, kMargin),
              r: tR / 2,
              fill: 'yellow',
              stroke: tStrokeParams.strokeColor,
              'stroke-opacity': tStrokeParams.strokeTransparency,
              cursor: 'pointer'
            };
          }

          function doCreatePlotElements() {
            var tInc = 200,
                i,
                loop = function () {
                  if (tPlottedElements.length >= tNumCases)
                    return;
                  var tStart = tPlottedElements.length,
                      tDescriptions = [];
                  tXPixelMax = this_.getPath('xAxisView.pixelMax');
                  tYPixelMax = this_.getPath('yAxisView.pixelMin');
                  if (tXPixelMax < 30 || tYPixelMax < 30) {
                    this_.invokeLater(loop, 100);
                    return;
                  }
                  for (i = tStart; i < tStart + tInc && i < tNumCases; i++) {
                    tDescriptions.push(createCircleDescription(i));
                  }
                  tPointSet = this_.get('paper').add(tDescriptions).forEach(function (iElement, iIndex) {
                    tPlottedElements.push(iElement);
                    tLayer.push(iElement);
                    iElement.addClass(DG.PlotUtilities.kDotClassName);
                    iElement.index = tStart + iIndex;
                    iElement.node.setAttribute('shape-rendering', 'geometric-precision');
                    return true;
                  });
                  addHandlers(this_, tPointSet);
                  this_.setPath('model.isAnimating', true);
                  tPointSet.animate({
                        r: tR,
                        fill: tColor
                      },
                      DG.PlotUtilities.kDefaultAnimationTime, '<>');
                  tStart += tInc;
                  tInc *= 2;
                  if (tStart < tNumCases) {
                    this_.invokeLater(loop, 10);
                  } else {
                    this_.setPath('model.isAnimating', false);
                    this_.updateSelection();
                  }
                  tPointSet.clear();
                }.bind(this_);
            loop();
            this_._elementOrderIsValid = false;
          }

          var tRC = this.createRenderContext(),
              tXPixelMin = this.getPath('xAxisView.pixelMin'),
              tXPixelMax = this.getPath('xAxisView.pixelMax'),
              tYPixelMax = this.getPath('yAxisView.pixelMin'),
              tYPixelMin = this.getPath('yAxisView.pixelMax'),

              tPointSet,
              tPlottedElements = this.get('plottedElements'),
              tModel = this.get('model'),
              tNumCases = tModel.get('cases').length(),
              tR = this.calcPointRadius(),
              kMargin = tR,
              tColor = tModel.getPointColor ? tModel.getPointColor() : DG.PlotUtilities.kDefaultPointColor,
              tStrokeParams = this.getStrokeParams(),
              tLayer = this.getPath('layerManager.' + DG.LayerNames.kPoints);
          if (!tPlottedElements || tPlottedElements.length < tNumCases) {
            doCreatePlotElements();
          } else if (tPlottedElements.length > 0 && !this.getPath('model.isAnimating')) {
            if (tPlottedElements.length > tNumCases) {
              var tLayerManager = this.get('layerManager');
              for (var index = tNumCases; index < tPlottedElements.length; index++) {
                if (!SC.none(tPlottedElements[index])) {
                  tPlottedElements[index].stop();
                  tLayerManager.removeElement(tPlottedElements[index]);
                  DG.PlotUtilities.doHideRemoveAnimation(tPlottedElements[index], tLayerManager);
                }
              }
              tPlottedElements.length = tNumCases;
            }
            tPlottedElements.forEach(function (iCircle, iIndex) {
              var tCoords = tModel.getWorldCoords(iIndex);
              iCircle.attr({
                fill: tColor,
                'fill-opacity': tRC.transparency,
                'opacity': tRC.transparency,
                r: tR
              });
              iCircle.show();
              iCircle.animate({
                cx: dataToCoordinate(tCoords.x, tXPixelMin, tXPixelMax, kMargin),
                cy: dataToCoordinate(tCoords.y, tYPixelMin, tYPixelMax, kMargin)
              }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            });
          }
        },

        /**
         Generate the svg needed to display the plot
         */
        doDraw: function doDraw() {
          sc_super();

          this.drawData();

          this.updateSelection();

        },

        /**
         * The array object my model uses to store world coords has been swapped out. We want to animate to new positions.
         */
        worldValuesChanged: function () {
          var tPlottedElements = this.get('plottedElements'),
              tLastIndex = tPlottedElements.length - 1,
              kMargin = this.calcPointRadius(),
              tXPixelMin = this.getPath('xAxisView.pixelMin'),
              tXPixelMax = this.getPath('xAxisView.pixelMax'),
              tYPixelMax = this.getPath('yAxisView.pixelMin'),
              tYPixelMin = this.getPath('yAxisView.pixelMax'),
              tModel = this.get('model');
          tModel.set('isAnimating', true);
          tPlottedElements.forEach(function (iElement, iIndex) {
                var tCoords = tModel.getWorldCoords(iIndex);
                iElement.animate({
                      cx: dataToCoordinate(tCoords.x, tXPixelMin, tXPixelMax, kMargin),
                      cy: dataToCoordinate(tCoords.y, tYPixelMin, tYPixelMax, kMargin)
                    },
                    DG.PlotUtilities.kDefaultAnimationTime, '<>',
                    iIndex === tLastIndex ? function () {
                      tModel.set('isAnimating', false);
                    } : null);
              }
          );
          this._isRenderingValid = false;

          // this.displayDidChange();
        }.observes('.model.worldValues')
      };
    }()));