// ==========================================================================
//                        DG.ScatterPlotView
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

/** @class DG.ScatterPlotView - A plot of dots placed according to numeric values

 @extends DG.PlotView
 */
DG.ScatterPlotView = DG.PlotView.extend(
    /** @scope DG.ScatterPlotView.prototype */
    {
      displayProperties: ['xAxisView.model.lowerBound', 'xAxisView.model.upperBound',
        'yAxisView.model.lowerBound', 'yAxisView.model.upperBound',
        'xAxisView.pixelMin', 'xAxisView.pixelMax',
        'yAxisView.pixelMin', 'yAxisView.pixelMax',
        'model.areSquaresVisible', 'model.squares'],

      autoDestroyProperties: ['movablePointAdorn', 'movableLineAdorn', 'functionAdorn', 'connectingLineAdorn', 'multipleLSRLsAdorn'],


      /** @property {DG.ConnectingLineAdornment} */
      connectingLineAdorn: null,

      numPlotsOrIndexChanged: function () {
        // update connecting lines
        if (this.connectingLineAdorn) {
          this.connectingLineChanged();
        }
      }.observes('numPlots', 'plotIndex'),

      /**
       Required for some adornments like DG.PlottedCountAdornment.
       @property{DG.CellLinearAxisView}
       */
      primaryAxisView: function () {
        return this.get('xAxisView');
      }.property('xAxisView'),

      /**
       Required for some adornments like DG.PlottedCountAdornment.
       @property{DG.CellLinearAxisView}
       */
      secondaryAxisView: function () {
        return this.get('yAxisView');
      }.property('yAxisView'),

      /**
       @property {DG.MovablePointAdornment}
       */
      movablePointAdorn: null,

      /**
       @property {DG.MovableLineAdornment}
       */
      movableLineAdorn: null,

      /**
       @property {DG.MultipleLSRLsAdornment}
       */
      multipleLSRLsAdorn: null,

      /**
       @property {DG.PlottedFunctionAdornment}
       */
      functionAdorn: null,

      /**
       * More than one scatterplot can be displayed in a graph. We need to know if we're not the
       * first one so that we can allocate our own plotted points if not.
       * @property {Boolean}
       */
      isFirstPlot: true,

      isFirstPlotChanged: function () {
        if (this.isFirstPlot) {
          if (SC.isArray(this._myPlottedElements)) {
            var tLayerManager = this.get('layerManager');
            this._myPlottedElements.forEach(function (iElement) {
              tLayerManager.removeElement(iElement);
              iElement.remove();
            });
            this._myPlottedElements = [];
          }
        }
        this.get('plottedElements').forEach(function (iElement, iIndex) {
          this.assignElementAttributes(iElement, iIndex);
        }.bind(this));
      }.observes('isFirstPlot'),

      /**
       * @property {Array of Element}
       */
      _squares: null,

      /**
       * If defined, this function gets called after cases have been added or values changed, but only once,
       * and only after a sufficient time has elapsed.
       * @property { Function }
       */
      cleanupFunc: function () {
        var tAdorn = this.get('connectingLineAdorn');
        if (tAdorn)
          tAdorn.updateToModel();
      },

      init: function () {
        sc_super();
        var tModel = this.get('model');
        if (tModel && tModel.getAdornmentModel('connectingLine'))
          this.connectingLineChanged();
      },

      /**
       Destruction method
       */
      destroy: function () {
        var model = this.get('model');
        if (model) model.removeObserver('squares', this, 'squaresDidChange');
        if (model) model.removeObserver('areSquaresVisible', this, 'squaresDidChange');
        var tLayerManager = this.get('layerManager');
        if (this._squares) {
          this._squares.forEach(function (iElement) {
            tLayerManager.removeElement(iElement, true /* callRemove */);
          });
        }
        var tFunctionEditView = this.get('functionEditView');
        if (tFunctionEditView) {
          this.get('parentView').removeChild(tFunctionEditView);
        }
        if (SC.isArray(this._myPlottedElements)) {
          this._myPlottedElements.forEach(function (iElement) {
            tLayerManager.removeElement(iElement);
            iElement.remove();
          });
          this._myPlottedElements = [];
        }

        sc_super();
      },

      /**
       Observation method called when the model changes.
       Hooks up necessary observers.
       */
      modelDidChange: function () {
        sc_super();

        var model = this.get('model');
        if (model) {
          model.addObserver('squares', this, 'squaresDidChange');
          model.addObserver('areSquaresVisible', this, 'squaresDidChange');
          this.connectingLineChanged(); // Synch up the connecting line
        }
      },

      /**
       Observation function called when data values added/removed.
       */
      dataDidChange: function () {
        if (!this.getPath('model.dataConfiguration'))
          return; // happens during destroy of plot
        sc_super();

        // update connecting lines
        if (this.connectingLineAdorn) {
          this.connectingLineAdorn.invalidateModel();
          this.connectingLineAdorn.updateToModel();
        }
        this.updateAdornments();
      },

      /**
       Observation function called when data values change.
       Method name is legacy artifact of SproutCore range observer implementation.
       */
      dataRangeDidChange: function (iSource, iQuestion, iKey, iChanges) {
        var tCases = this.getPath('model.cases');

        this.notifyPropertyChange('plotDisplayDidChange');

        // If we are displaying squares then we invalidate the display so squares will be updated
        if (this.getPath('model.areSquaresVisible'))
          this.squaresDidChange();

        // update connecting lines
        if (this.connectingLineAdorn) {
          this.connectingLineAdorn.invalidateModel();
          this.connectingLineAdorn.updateToModel();
        }

        this.updateAdornments();

        this.rescaleOnParentCaseCompletion(tCases);

        sc_super();
      },

      /**
       * Connecting line adornment, if any, will need updating
       */
      handleUpdateConnectingLine: function () {
        if (this.connectingLineAdorn && this.connectingLineAdorn.wantVisible()) {
          this.connectingLineAdorn.invalidateModel();
          this.connectingLineAdorn.updateToModel(true /* animate */);
        }
      },

      /**
       * Connecting line adornment, if any, will need updating
       */
      handleMoveAttribute: function () {
        this.handleUpdateConnectingLine();
      },

      /**
       * Connecting line adornment, if any, will need updating
       */
      handleMoveCases: function () {
        sc_super();
        this.handleUpdateConnectingLine();
      },

      updateAdornments: function () {
        sc_super();

        var tLsrlsAdorn = this.get('multipleLSRLsAdorn'),
            tMovableLineAdorn = this.get('movableLineAdorn'),
            tSquaresAreShowing = this.getPath('model.areSquaresVisible');
        if (tLsrlsAdorn) {
          tLsrlsAdorn.get('model').setComputingNeeded();
          tLsrlsAdorn.updateToModel();
        }
        if (tMovableLineAdorn && tSquaresAreShowing) {
          tMovableLineAdorn.get('model').slopeOrInterceptChanged();  // Forces recomputation of sum of squares of residuals
        }
        // update plotted function
        if (this.functionAdorn)
          this.functionAdorn.updateToModel();
      },

      /**
       * If we're connecting points with lines, we override to make the points much less important than the lines
       */
      calcPointRadius: function () {
        var tRadius = sc_super();
        if (this.connectingLineAdorn && this.connectingLineAdorn.wantVisible())
          tRadius = tRadius / 2;
        return tRadius;
      },

      /**
       * Set the coordinates and other attributes of the case circle (a Rafael element in this.get('plottedElements')).
       * @param iRC {} case-invariant Render Context
       * @param iCase {DG.Case} the case data
       * @param iIndex {number} index of case in collection
       * @param iAnimate {Boolean} (optional) want changes to be animated into place?
       * @returns {cx {Number},cy {Number}} final coordinates or null if not defined (hidden plot element)
       */
      setCircleCoordinate: function (iRC, iCase, iIndex, iAnimate, iCallback) {
        DG.assert(iRC && iRC.xAxisView);
        DG.assert(iCase);
        DG.assert(DG.MathUtilities.isInIntegerRange(iIndex, 0, this.get('plottedElements').length));
        var tCircle = this.get('plottedElements')[iIndex],
            tCoordX = iRC.xAxisView.dataToCoordinate(iCase.getForcedNumericValue(iRC.xVarID)),
            tCoordY = iRC.yAxisView.dataToCoordinate(iCase.getForcedNumericValue(iRC.yVarID)),
            tIsMissingCase = !DG.isFinite(tCoordX) || !DG.isFinite(tCoordY);

        // show or hide if needed, then update if shown.
        if (this.showHidePlottedElement(tCircle, tIsMissingCase, iIndex)) {
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
          return {cx: tCoordX, cy: tCoordY, r: this._pointRadius};
        }
        return null;
      },

      assignElementAttributes: function (iElement, iIndex, iAnimate) {
        sc_super();
        var this_ = this;

        function getVarIDs() {
          var tXVarID = this_.getPath('model.xVarID'),
              tYPath = 'model.' + (this_.getPath('model.verticalAxisIsY2') ? 'y2VarID' : 'yVarID'),
              tYVarID = this_.getPath(tYPath);
          return {x: tXVarID, y: tYVarID};
        }

        function changeCaseValues(iDeltaValues) {

          function getProperValue(iCase, iDelta, iAxisKey) {
            var tValue = iCase.getForcedNumericValue(this_.getPath('model.' + iAxisKey + 'VarID')) + iDelta;
            if (this_.getPath(iAxisKey + 'AxisView.isDateTime')) {
              tValue = DG.createDate(tValue);
            }
            return tValue;
          }

          var tVarIDs = getVarIDs(),
              tChange = {
                operation: 'updateCases',
                cases: [],
                attributeIDs: [tVarIDs.x, tVarIDs.y],
                values: [[], []],
                dirtyDocument: false
              },
              tDataContext = this_.get('dataContext');
          if (!tDataContext) return;
          // Note that we have to get the cases dynamically rather than have a variable
          // declared in the closure. The array pointed to by such a closure is not updated!
          this_.getPath('model.casesController.selection').forEach(function (iCase) {
            tChange.cases.push(iCase);
            tChange.values[0].push(getProperValue(iCase, iDeltaValues.x, 'x'));
            tChange.values[1].push(getProperValue(iCase, iDeltaValues.y, 'y'));
          });
          tDataContext.applyChange(tChange);
        }

        function returnCaseValuesToStart(iCaseIndex, iStartWorldCoords) {
          if (!SC.none(iStartWorldCoords.x) && !SC.none(iStartWorldCoords.y)) {
            var tCase = this_.getPath('model.cases').unorderedAt(iCaseIndex),
                tVarIDs = getVarIDs(),
                tDeltaX = tCase.getForcedNumericValue(tVarIDs.x) - iStartWorldCoords.x,
                tDeltaY = tCase.getForcedNumericValue(tVarIDs.y) - iStartWorldCoords.y;
            if ((tDeltaX !== 0) || (tDeltaY !== 0))
              this_.get('model').animateSelectionBackToStart([tVarIDs.x, tVarIDs.y], [tDeltaX, tDeltaY]);
          }
        }

        function completeHoverAnimation() {
          this.hoverAnimation = null;
        }

        var tIsDragging = false,
            kOpaque = 1,
            tInitialTransform = null;
        iElement.hover(function (event) {  // over
              if (!tIsDragging && SC.none(tInitialTransform)) {
                tInitialTransform = '';
                if (this.hoverAnimation)
                  this.stop(this.hoverAnimation);
                this.hoverAnimation = Raphael.animation({
                      opacity: kOpaque,
                      transform: DG.PlotUtilities.kDataHoverTransform
                    },
                    DG.PlotUtilities.kDataTipShowTime,
                    '<>', completeHoverAnimation);
                this.animate(this.hoverAnimation);
                this_.showDataTip(this, iIndex);
              }
            },
            function (event) { // out
              if (!tIsDragging) {
                if (this.hoverAnimation)
                  this.stop(this.hoverAnimation);
                this.hoverAnimation = Raphael.animation({transform: tInitialTransform},
                    DG.PlotUtilities.kHighlightHideTime,
                    '<>', completeHoverAnimation);
                this.animate(this.hoverAnimation);
                tInitialTransform = null;
                this_.hideDataTip();
              }
            })
            .drag(function (dx, dy) { // continue
                  SC.run(function () {
                    var tNewX = this_.get('xAxisView').coordinateToData(this.ox + dx),
                        tNewY = this_.get('yAxisView').coordinateToData(this.oy + dy),
                        tVarIDs = getVarIDs(),
                        tCase = this_.getPath('model.cases').unorderedAt(this.index),
                        tOldX = tCase.getForcedNumericValue(tVarIDs.x),
                        tOldY = tCase.getForcedNumericValue(tVarIDs.y),
                        tCurrTransform = this.transform();
                    // Note that we ignore invalid values. Matt managed to convert some dragged values
                    // to NaNs during testing, which then couldn't animate back to their original
                    // positions. This should have the effect of leaving points that would otherwise
                    // have become NaNs in their last-known-good positions.
                    if (isFinite(tNewX) && isFinite(tNewY)) {
                      // Put the element into the initial transformed state so that changing case values
                      // will not be affected by the scaling in the current transform.
                      this.transform(tInitialTransform);
                      changeCaseValues({x: tNewX - tOldX, y: tNewY - tOldY});
                      this.transform(tCurrTransform);
                    }
                  }, this);
                },
                function (x, y) { // begin
                  if (tIsDragging)
                    return;
                  var tCase = this_.getPath('model.cases').unorderedAt(this.index),
                      tVarIDs = getVarIDs();
                  tIsDragging = true;
                  // Save the initial screen coordinates
                  this.ox = this.attr("cx");
                  this.oy = this.attr("cy");
                  // Save the initial world coordinates
                  this.wx = tCase.getForcedNumericValue(tVarIDs.x);
                  this.wy = tCase.getForcedNumericValue(tVarIDs.y);
                  this.attr({opacity: kOpaque});
                },
                function () {  // end
                  this.animate({transform: tInitialTransform}, DG.PlotUtilities.kHighlightHideTime);
                  tInitialTransform = null;
                  returnCaseValuesToStart(this.index, {x: this.wx, y: this.wy});
                  tIsDragging = false;
                  delete this.ox;
                  delete this.oy;
                  delete this.wx;
                  delete this.wy;
                  this_.hideDataTip();
                });
        return iElement;
      },

      createElement: function (iCase, iIndex, iAnimate) {
        var tCircle = this.get('paper').circle(-100, -100, this._pointRadius);
        tCircle.node.setAttribute('shape-rendering', 'geometric-precision');

        //return this.assignElementAttributes( tCircle, iIndex);  // Redundant I hope
        return tCircle;
      },

      /**
       We may clear and draw everything from scratch if required.
       */
      drawData: function drawData() {
        // Note that only the 'first plot' view animates but it shares its model with other plots
        if (this.getPath('model.isAnimating') && this.get('isFirstPlot'))
          return; // Points are animating to new position

        if (!SC.none(this.get('transferredElementCoordinates'))) {
          this.animateFromTransferredElements();
          return;
        }

        // base drawData() creates and updates points,
        // removes any extra points, to sync case circles with cases.
        sc_super();
      },

      /**
       Generate the svg needed to display the plot
       */
      doDraw: function doDraw(iIndex, iNumPlots, iChangedProperty) {
        var this_ = this;

        function drawSquares() {

          function showSquaresForLine(iLine, iColor) {
            var tSlope = iLine.get('slope'),
                tIntercept = iLine.get('intercept'),
                tCasesForLine = tCases,
                tCategory = iLine.get('categoryName'),
                tLegendAttrDesc = this_.getPath('model.dataConfiguration.legendAttributeDescription'),
                tLegendAttrID = tLegendAttrDesc.getPath('attribute.id');
            if (!SC.none(tLegendAttrID) && !SC.none(tCategory)) {
              tCasesForLine = tCases.filter(function (iCase) {
                return tCategory === iCase.getValue(tLegendAttrID);
              });
            }
            tCasesForLine.forEach(function (iCase) {
              if(iCase.hasValue(tXVarID) && iCase.hasValue(tYVarID)) {
                var tWorldX = iCase.getForcedNumericValue(tXVarID),
                    tWorldY = iCase.getForcedNumericValue(tYVarID),
                    tPtX = tXAxisView.dataToCoordinate(tWorldX),
                    tPtY = tYAxisView.dataToCoordinate(tWorldY),
                    tLineY = tYAxisView.dataToCoordinate(tSlope * tWorldX + tIntercept),
                    tLineX = tPtX + tPtY - tLineY,
                    tX = Math.min(tPtX, tLineX),
                    tY = Math.min(tPtY, tLineY),
                    tSide = Math.abs(tLineY - tPtY),
                    tRectString = DG.RenderingUtilities.pathForFrame({
                      x: tX, y: tY,
                      width: tSide, height: tSide
                    }),
                    tRect = tPaper.path(tRectString)
                        .attr({stroke: iColor});
                if (tAnimateShow) {
                  tRect.attr({'stroke-opacity': 0})
                      .animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
                }
                this_._squares.push(tRect);
                tAdornmentLayer.push(tRect);
              }
            });
          }

          var kRemoveFromPaper = true,
              tVisible = this_.getPath('model.areSquaresVisible'),
              tAnimateRemove = !tVisible && this_._squares && (this_._squares.length > 0),
              tAnimateShow = tVisible && (!this_._squares || (this_._squares.length === 0)),
              tLayerManager = this_.get('layerManager'),
              tAdornmentLayer = tLayerManager[DG.LayerNames.kAdornments];
          if (!this_._squares)
            this_._squares = [];
          this_._squares.forEach(function (iElement) {
            if (tAnimateRemove) {
              iElement.animate({'stroke-opacity': 0}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
                  function () {
                    tLayerManager.removeElement(iElement, kRemoveFromPaper);
                  });
            } else
              tLayerManager.removeElement(iElement, kRemoveFromPaper);
          });
          this_._squares = [];
          if (!tVisible)
            return;
          var tCases = this_.getPath('model.cases'),
              tXVarID = this_.getPath('model.xVarID'),
              tYVarID = this_.getPath('model.yVarID'),
              tXAxisView = this_.get('xAxisView'),
              tYAxisView = this_.get('yAxisView'),
              tPaper = this_.get('paper');
          if (this_.getPath('model.isMovableLineVisible')) {
            showSquaresForLine(this_.getPath('model.movableLine'), DG.PlotUtilities.kDefaultMovableLineColor);
          }
          if (this_.getPath('model.isLSRLVisible')) {
            this_.getPath('multipleLSRLsAdorn.lsrlAdornments').forEach(function (iLineAdorn) {
              showSquaresForLine(iLineAdorn.get('model'), iLineAdorn.get('lineColor'));
            });
          }
        }

        sc_super();

        this.drawData();

        this.updateSelection();

        if (!SC.none(this.connectingLineAdorn) && this.connectingLineAdorn.wantVisible()) {
          if (iChangedProperty === 'pointColor')
            this.connectingLineAdorn.invalidateModel();
          this.connectingLineAdorn.updateToModel();
        }

        if (!SC.none(this.movablePointAdorn))
          this.movablePointAdorn.updateToModel();

        if (!SC.none(this.movableLineAdorn))
          this.movableLineAdorn.updateToModel();

        if (!SC.none(this.multipleLSRLsAdorn))
          this.multipleLSRLsAdorn.updateToModel();

        if (!SC.none(this.functionAdorn))
          this.functionAdorn.updateToModel();

        drawSquares();
      },

      /**
       * If we have a connecting line adornment, give it a chance to update selection.
       */
      updateSelection: function () {
        sc_super();
        var tConnectingLineAdorn = this.get('connectingLineAdorn');
        if (tConnectingLineAdorn && tConnectingLineAdorn.wantVisible()) {
          if (this.getPath('model.dataConfiguration.displayOnlySelected')) {
            tConnectingLineAdorn.get('model').setComputingNeeded();
          }
          this.connectingLineAdorn.updateSelection();
        }
      },

      /**
       Presumably our model has created a movable point. We need to create our adornment.
       */
      movablePointChanged: function () {
        if (!this.readyToDraw())
          return;
        var tMovablePoint = this.getPath('model.movablePoint'),
            tMovablePtAdorn = this.get('movablePointAdorn');
        if (tMovablePoint) {
          if (tMovablePtAdorn) {
            tMovablePtAdorn.set('parentView', this);
            tMovablePtAdorn.set('model', tMovablePoint);
            tMovablePtAdorn.set('paperSource', this.get('paperSource'));
          } else {
            tMovablePtAdorn = DG.MovablePointAdornment.create({
              parentView: this, model: tMovablePoint, paperSource: this.get('paperSource')
            });
            tMovablePtAdorn.createElements();
            this.set('movablePointAdorn', tMovablePtAdorn);
          }
          this.movablePointAdorn.updateVisibility();
        } else if (tMovablePtAdorn) {
          // No model, so get rid of it
          tMovablePtAdorn.destroy();
          this.set('movablePointAdorn', null);
        }
      }.observes('*model.movablePoint.isVisible'),

      /**
       Presumably our model has created a movable line. We need to create our adornment.
       */
      movableLineChanged: function () {
        if (!this.readyToDraw())
          return;
        var tMovableLine = this.getPath('model.movableLine'),
            tMovableLineAdorn = this.get('movableLineAdorn');
        if (tMovableLine) {
          if (tMovableLineAdorn) {
            tMovableLineAdorn.set('parentView', this);
            tMovableLineAdorn.set('model', tMovableLine);
            tMovableLineAdorn.set('paperSource', this.get('paperSource'));
          } else {
            tMovableLineAdorn = DG.MovableLineAdornment.create({
              parentView: this, model: tMovableLine, paperSource: this.get('paperSource'),
              layerName: DG.LayerNames.kAdornments
            });
            tMovableLineAdorn.createElements();
            this.set('movableLineAdorn', tMovableLineAdorn);
          }
          tMovableLineAdorn.updateVisibility();
        } else if (tMovableLineAdorn) {
          // No model, so get rid of it
          tMovableLineAdorn.destroy();
          this.set('movableLineAdorn', null);
        }
        this.updateSquaresVisibility();
        this.displayDidChange();
      }.observes('*model.movableLine.isVisible'),

      /**
       Presumably our model has created an lsr line. We need to create our adornment.
       */
      lsrlChanged: function () {
        if (!this.readyToDraw())
          return;
        var tMultipleLSRLs = this.getPath('model.multipleLSRLs'),
            tMultipleLSRLsAdorn = this.get('multipleLSRLsAdorn');
        // Rather than attempt to reconnect an existing adornment, we throw out the old and rebuild.
        if (tMultipleLSRLs) {
          if (tMultipleLSRLsAdorn) {
            tMultipleLSRLsAdorn.set('parentView', this);
            tMultipleLSRLsAdorn.set('model', tMultipleLSRLs);
            tMultipleLSRLsAdorn.set('paperSource', this.get('paperSource'));
          } else {
            tMultipleLSRLsAdorn = DG.MultipleLSRLsAdornment.create({
              parentView: this, model: tMultipleLSRLs, paperSource: this.get('paperSource'),
              layerName: DG.LayerNames.kAdornments
            });
            this.set('multipleLSRLsAdorn', tMultipleLSRLsAdorn);
          }
          tMultipleLSRLsAdorn.updateVisibility();
        } else if (tMultipleLSRLsAdorn) {
          // No model, so get rid of it
          tMultipleLSRLsAdorn.destroy();
          this.set('multipleLSRLsAdorn', null);
        }
        this.updateSquaresVisibility();
        this.displayDidChange();
      }.observes('*model.multipleLSRLs.isVisible'),

      /**
       Our model has created a connecting line. We need to create our adornment. We don't call adornmentDidChange
       because we don't want to destroy the adornment.
       */
      connectingLineChanged: function () {

        var updateConnectingLine = function () {
              if (tAdorn) {
                tAdorn.updateToModel(true /*animate*/);
                //    this.adornmentDidChange('connectingLine', 'connectingLineAdorn', DG.ConnectingLineAdornment);
                this.updatePointSize();
                this._elementOrderIsValid = false;
                this.updateSelection();
              }
            }.bind(this),

            hasGrouping = function () {
              var tLegendCollection = this.getPath('model.dataConfiguration.legendAttributeDescription.attribute.collection'),
                  tXCollection = this.getPath('model.dataConfiguration.xAttributeDescription.attribute.collection'),
                  tYCollection = this.getPath('model.dataConfiguration.yAttributeDescription.attribute.collection');
              return !SC.none(tLegendCollection) && tLegendCollection.get('id') !== tXCollection.get('id') &&
                  tLegendCollection.get('id') !== tYCollection.get('id');
            }.bind(this),

            isOneOfMany = function () {
              return this.get('numPlots') > 1;
            }.bind(this);

        var tPlotModel = this.get('model'),
            tAdornModel = tPlotModel && tPlotModel.getAdornmentModel('connectingLine'),
            tAdorn = this.get('connectingLineAdorn'),
            tLineColorFunc = hasGrouping() || !isOneOfMany() ? this.getPointColor : this.getAttributeColor;
        if (tAdornModel) {
          if (tAdorn) {
            tAdorn.set('parentView', this);
            tAdorn.set('model', tAdornModel);
            tAdorn.set('paperSource', this.get('paperSource'));
          } else {
            tAdorn = DG.ConnectingLineAdornment.create({
              parentView: this, model: tAdornModel,
              paperSource: this.get('paperSource'),
              layerName: DG.LayerNames.kConnectingLines
            });
            this.set('connectingLineAdorn', tAdorn);
          }
          tAdornModel.set('getLineColorFunc', tLineColorFunc.bind(this));
          tAdornModel.setComputingNeeded();
        } else if (tAdorn) {
          // No model, so get rid of it
          tAdorn.destroy();
          this.set('connectingLineAdorn', null);
        }

        this.invokeLast(updateConnectingLine); // So that we're ready
      }.observes('*model.connectingLine'),

      /**
       Observation method called when the squares need to be redrawn.
       */
      squaresDidChange: function () {
        // This will force a complete redraw.
        // We may be able to get away with less at some point.
        this._isRenderingValid = false;
        this.displayDidChange();
      },

      /**
       * If squares are visible, but neither line is visible, we have to hide the squares.
       */
      updateSquaresVisibility: function () {
        if (this.getPath('model.areSquaresVisible') && !this.getPath('model.multipleLSRLs.isVisible') &&
            !this.getPath('model.movableLine.isVisible')) {
          this.setPath('model.areSquaresVisible', false);
        }
      },

      /**
       The visibility of the model's plotted function has changed. We respond accordingly.
       */
      plottedFunctionChanged: function () {
        var model = this.get('model'),
            tPlottedFunction = model && model.getAdornmentModel('plottedFunction'),
            tPlottedFunctionAdorn = this.get('functionAdorn'),
            tFunctionEditView = this.get('functionEditView');

        if (tPlottedFunction) {
          if (!tFunctionEditView) {
            tFunctionEditView = DG.PlottedFunctionAdornment.createFormulaEditView(tPlottedFunction);
            this.set('functionEditView', tFunctionEditView);
            this.get('parentView').set('functionEditorView', tFunctionEditView);
          }
          tFunctionEditView.set('isVisible', tPlottedFunction.get('isVisible'));
          tFunctionEditView.set('formulaExpression', tPlottedFunction.get('expression'));

          if (tPlottedFunctionAdorn) {
            tPlottedFunctionAdorn.set('parentView', this);
            tPlottedFunctionAdorn.set('model', tPlottedFunction);
            tPlottedFunctionAdorn.set('parentView', this.get('paperSource'));
          } else {
            tPlottedFunctionAdorn = DG.PlottedFunctionAdornment.create({
              parentView: this, model: tPlottedFunction, paperSource: this.get('paperSource'),
              layerName: DG.LayerNames.kAdornments
            });
            this.set('functionAdorn', tPlottedFunctionAdorn);
          }
          tPlottedFunctionAdorn.updateVisibility();
        } else if (tPlottedFunctionAdorn) {
          // No model, so get rid of it
          tPlottedFunctionAdorn.destroy();
          this.set('functionAdorn', null);
          if (tFunctionEditView)
            tFunctionEditView.set('isVisible', false);
        }

      }.observes('*model.plottedFunction'),

      /**
       Give us a chance to update adornments on creation.
       */
      didCreateLayer: function () {
        sc_super();
        this.movablePointChanged();
        this.movableLineChanged();
        this.lsrlChanged();
        this.plottedFunctionChanged();
      },

      /**
       * Used by both handleBackgroundClick and handleBackgroundDblClick
       * @param iEvent
       */
      zoom: function (iEvent) {
        var tFactor = iEvent.shiftKey ? 2 : 0.5,
            tViewPoint = DG.ViewUtilities.windowToViewCoordinates({x: iEvent.clientX, y: iEvent.clientY}, this),
            tWorldPoint = {
              x: this.get('xAxisView').coordinateToData(tViewPoint.x),
              y: this.get('yAxisView').coordinateToData(tViewPoint.y)
            };
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
       Double-click triggers zoom.
       @param {SC.Event}
       */
      handleBackgroundDblClick: function (iEvent) {
        this.zoom(iEvent);
      }

    });

