// ==========================================================================
//                          DG.UnivariatePlotView
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

sc_require('components/graph/plots/plot_view');

/** @class  DG.UnivariatePlotView - A plot of dots piled up along a numeric axis

 @extends DG.PlotView
 */
DG.UnivariatePlotView = DG.PlotView.extend(
    /** @scope DG.UnivariatePlotView.prototype */
    {
      displayProperties: ['secondaryAxisView.model.numberOfCells', 'overlap'],

      /**
       * Return the class of the count axis with the x or y to put it on.
       * @return {[{}]}
       */
      getAxisViewDescriptions: function () {
        var tDescriptions = sc_super(),
            tCatAxisKey = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical ? 'y' : 'x',
            tCatAttributeID = this.getPath('model.' + tCatAxisKey + 'VarID'),
            tCatAxisClass = tCatAttributeID === DG.Analysis.kNullAttribute ? DG.AxisView : DG.CellAxisView;
        tDescriptions.push( {
          axisKey: tCatAxisKey,
          axisClass: tCatAxisClass
        });
        return tDescriptions;
      },     /**
       @property{ DG.CellLinearAxisView | DG.BinnedAxisView}
       */
      primaryAxisView: function () {
        switch (this.getPath('model.primaryAxisPlace')) {
          case DG.GraphTypes.EPlace.eX:
            return this.get('xAxisView');
          case DG.GraphTypes.EPlace.eY:
            return this.get('yAxisView');
          default:
            return null;
        }
      }.property()/*.cacheable()*/,
      primaryAxisViewDidChange: function () {
        this.notifyPropertyChange('primaryAxisView');
      }.observes('*model.primaryAxisPlace', 'xAxisView', 'yAxisView'),

      /**
       @property{DG.AxisView | DG.CellAxisView}
       */
      secondaryAxisView: function () {
        switch (this.getPath('model.primaryAxisPlace')) {
          case DG.GraphTypes.EPlace.eX:
            return this.get('yAxisView');
          case DG.GraphTypes.EPlace.eY:
            return this.get('xAxisView');
          default:
            return null;
        }
      }.property()/*.cacheable()*/,
      secondaryAxisViewDidChange: function () {
        this.notifyPropertyChange('secondaryAxisView');
      }.observes('*model.secondaryAxisPlace', 'xAxisView', 'yAxisView'),

      /**
       * Prepare axes for univariate plot, including resetting plot-specific values.
       */
      setupAxes: function () {
        var tPrimaryAxisModel = this.getPath('primaryAxisView.model');
        if (tPrimaryAxisModel) {
          if (tPrimaryAxisModel.get('preferZeroLowerBound'))
            tPrimaryAxisModel.set('preferZeroLowerBound', false);
          if (tPrimaryAxisModel.get('drawZeroLine'))
            tPrimaryAxisModel.set('drawZeroLine', false);
        }

        // The secondaryAxisView needs to be told that its tick marks and labels are not to be centered in each cell.
        // Though this is the default, if the prior plot was a dot chart, the axis will be stuck in centering mode.
        var tCellAxis = this.get('secondaryAxisView');
        if (tCellAxis) {
          tCellAxis.set('centering', false);
        }
      },

      /**
       When there is room for each stack, the overlap is 0. As soon as one of the stacks reaches
       the plot boundary, the overlap must increase. The amount that must be subtracted from
       each stack coordinate is the overlap times the index of the point in the stack.
       @property {Number}
       */
      overlap: 0,

      /**
       * Update the plot when case values have changed.
       */
      dataRangeDidChange: function (iSource, iQuestion, iKey, iChanges) {
        this.notifyPropertyChange('plotDisplayDidChange');
        sc_super();
      },

      /**
       * Construct and return a new render context
       * used for setCircleCoordinate()
       * @return {*}
       */
      createRenderContext: function () {
        var tRC = sc_super(),
            tModel = this.get('model');

        // cache some more render parameters common to all cases, but unique to UnivariatePlotView.
        tRC.categoryAxisView = this.get('secondaryAxisView');
        tRC.categoryAxisModel = tRC.categoryAxisView && tRC.categoryAxisView.get('model');
        tRC.categoryVarID = tModel && tModel.get('secondaryVarID');
        tRC.primaryVarID = tModel && tModel.get('primaryVarID');
        tRC.primaryAxisPlace = tModel && tModel.get('primaryAxisPlace');
        tRC.primaryAxisView = this.get('primaryAxisView');

        if (!tRC.primaryAxisView)
          return null;

        return tRC;
      },

      createElement: function (iCase, iIndex, iAnimate) {
        var tCircle = this.get('paper').circle(-100, -100, this._pointRadius);

        tCircle.node.setAttribute('shape-rendering', 'geometric-precision');

        return this.assignElementAttributes(tCircle, iIndex, iAnimate);
      },

      /**
       We may clear and draw everything from scratch if required.
       */
      drawData: function drawData() {

        if (this.getPath('model.isAnimating'))
          return; // Points are animating to new position

        if (!SC.none(this.get('transferredElementCoordinates'))) {
          this.animateFromTransferredElements();
          return;
        }

        sc_super();
      },

      /**
       * This function gets called by a scheduled timer. We force a recomputation of overlap and a redisplay.
       */
      cleanupFunc: function () {
        this.prepareToResetCoordinates();
        this.displayDidChange();
      }

    });
