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
        this.setPath('xAxisView.centering', true);
        this.setPath('yAxisView.centering', true);
      },

      /**
       @property { DG.CellAxisView }
       */
      primaryAxisView: function () {
        return (this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical) ? this.get('xAxisView') : this.get('yAxisView');
      }.property('orientation', 'yAxisView', 'xAxisView'),

      /**
       @property { DG.CellAxisView }
       */
      secondaryAxisView: function () {
        return (this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical) ? this.get('yAxisView') : this.get('xAxisView');
      }.property('orientation', 'yAxisView', 'xAxisView'),

      dataDidChange: function (iNotifier, iChangeKey, iOperation) {
        if (!this.getPath('model.dataConfiguration'))
          return; // Can happen during destroy
        // Override because we're going to do the work in updateElements
        if (iOperation !== 'createCase' && iOperation !== 'createCases')
          this.get('model').invalidateCaches();
        this._elementOrderIsValid = false;
        // Call the following explicitly since we're not calling sc_super
        if (iChangeKey === 'hiddenCases') {
          this.updateSelection();
        }
        this.installCleanup();
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
        tRC.isVerticalOrientation = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical;
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

      updateElements: function () {
        // update adornments when cases added or removed
        // note: don't rely on tDataLength != tPlotElementLength test for this
        this.updateAdornments();
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
            tPlottedElements = this.get('plottedElements'),
            tPlotElementLength = tPlottedElements.length,
            tRC;

        if (!tCases)
          return; // We can get here before things are linked up during restore


        tRC = this.createRenderContext();
        this.computeCellParams();

        tCases.forEach(function (iCase, iIndex) {
          var tCellIndices = tModel.lookupCellForCaseIndex(iIndex);
          if (iIndex >= tPlotElementLength)
            this_.callCreateElement(iCase, iIndex);
          this_.privSetElementCoords(tRC, iCase, iIndex, tCellIndices);
        });
      },

      /**
       * Must be overridden
       * @param iRC
       * @param iCase
       * @param iIndex
       * @param iCellIndices
       * @param iAnimate
       * @param iCallback
       */
      privSetElementCoords: function (iRC, iCase, iIndex, iCellIndices, iAnimate, iCallback) {

      }

      });

