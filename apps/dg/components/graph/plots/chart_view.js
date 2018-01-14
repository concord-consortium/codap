// ==========================================================================
//                          DG.ChartView
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

sc_require('components/graph/plots/plot_view');

/** @class  DG.ChartView, a plot of dots each placed according to categorical values

 @extends DG.PlotView
 */
DG.ChartView = DG.PlotView.extend(
    /** @scope DG.ChartView.prototype */
    {
      displayProperties: ['xAxisView.model.numberOfCells', 'yAxisView.model.numberOfCells'],

      /**
       * If defined, this function gets called after cases have been added or values changed, but only once,
       * and only after a sufficient time has elapsed.
       * @property { Function }
       */
      cleanupFunc: function () {
        this.computeCellParams();
        this.displayDidChange();
      },

      /**
       * The primaryAxisView needs to be told that its tick marks and labels are to be centered in each cell.
       */
      setupAxes: function () {
        var tPrimary = this.get('primaryAxisView');
        if (tPrimary) {
          tPrimary.set('centering', true);
        }
        return null;
      },

      /**
       @property { DG.CellAxisView }
       */
      primaryAxisView: function () {
        return (this.getPath('model.orientation') === 'vertical') ? this.get('xAxisView') : this.get('yAxisView');
      }.property('orientation', 'yAxisView', 'xAxisView'),

      /**
       @property { DG.CellAxisView }
       */
      secondaryAxisView: function () {
        return (this.getPath('model.orientation') === 'vertical') ? this.get('yAxisView') : this.get('xAxisView');
      }.property('orientation', 'yAxisView', 'xAxisView'),

      dataDidChange: function (iNotifier, iChangeKey, iOperation) {
        if (!this.getPath('model.dataConfiguration'))
          return; // Can happen during destroy
        // Override because we're going to do the work in updateElements
        if (iOperation !== 'createCase' && iOperation !== 'createCases')
          this.get('model').invalidateCaches();
        this.updateElements();
        this._elementOrderIsValid = false;
        // this.selectionDidChange();
        this.installCleanup();  // Call explicitly since we're not calling sc_super
      },

      /**
       * Construct and return a new render context
       * used for setCircleCoordinate()
       * @return {*}
       */
      createRenderContext: function () {
        var tRC = sc_super();

        // cache some more render parameters common to all cases, but unique to ChartView.
        tRC.primaryAxisView = this.get('primaryAxisView');
        tRC.secondaryAxisView = this.get('secondaryAxisView');
        tRC.isVerticalOrientation = this.getPath('model.orientation') === 'vertical';
        tRC.cellHalfWidth = tRC.secondaryAxisView.get('fullCellWidth') / 2;

        return tRC;
      },

      /**
       Generate the svg needed to display the plot
       */
      doDraw: function doDraw() {
        sc_super();

        if (!this.getPath('model._cacheIsValid'))
          this.updateElements();

        this.drawData();
      },

      /**
       Note: There's a lot of redundancy here with plotLayer::dataDidChange. But it's difficult to
       refactor further because of the need to deal with positioning points via
       privSetCircleCoords.
       */
      updateElements: function () {
        // update adornments when cases added or removed
        // note: don't rely on tDataLength != tPlotElementLength test for this
        this.updateAdornments();
      }
    });

