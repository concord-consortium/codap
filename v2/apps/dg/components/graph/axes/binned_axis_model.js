// ==========================================================================
//                          DG.BinnedAxisModel
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

sc_require('components/graph/axes/axis_model');

/** @class  DG.BinnedAxisModel - The model for a graph axis that has numeric bins.

 @extends SC.Object
 */
DG.BinnedAxisModel = DG.AxisModel.extend(
    /** @scope DG.BinnedAxisModel.prototype */
    {
      /**
       * Needed?
       @property {Boolean}
       */
      isNumeric: true,

      /**
       * It's somewhat unusual for an axis to refer to a PlotModel but since the binning depends on the cases and
       * their values, and these depend also on the secondary axis attribute, it seems best to rely on the PlotModel
       * that has easy access to the plottable cases.
       * @property {DG.BinnedPlotModel}
       */
      binnedPlotModel: null,

      setLinkToPlotIfDesired: function( iPlotModel) {
        this.set('binnedPlotModel', iPlotModel);
      },

      init: function() {
        sc_super();
      },

      destroy: function() {
        this.binnedPlotModel = null;  // break cycle
        sc_super();
      },

      lowerBound: function() {
        return this.getPath('binnedPlotModel.leastBinEdge');
      }.property(),

      upperBound: function() {
        return this.getPath('binnedPlotModel.maxBinEdge');
      }.property(),

      /**
       Determined by asking my plot model
       Note: Unlike a CellLinearAxis we always accommodate _all_ the valid numeric values.
       @property{Number} >= 1
       */
      numberOfBins: function () {
        return this.getPath('binnedPlotModel.totalNumberOfBins');
      }.property(),

      valueToCellNumber: function( iValue) {
        var tBinnedPlotModel = this.get('binnedPlotModel');
        if( tBinnedPlotModel)
          return tBinnedPlotModel.valueToBinNumber( iValue);
        else return 0;
      },

      /**
       * Provide this so PlottedCountModel will be happy
       */
      numberOfCells: function() {
        return this.get('numberOfBins');
      }.property(),

      /**
       * @return {[{ label: {String}, title: {String} }]}
       */
      binLabels: function () {
        var tLabels = [],
            tLabelTemplate = '[%@, %@)',
            tTitleTemplate = "DG.BinnedPlotModel.binLabelTip";
        this.forEachBinDo(function (iBinNum, iLeft, iRight) {
          tLabels.push({
            label: tLabelTemplate.fmt(iLeft, iRight),
            title: tTitleTemplate.loc(iLeft, iRight)
          });
        });
        return tLabels;
      }.property(),
      binLabelsDidChange: function() {
        this.notifyPropertyChange('binLabels');
      }.observes('binnedPlotModel.totalNumberOfBins', 'binnedPlotModel.alignment', 'binnedPlotModel.width'),

      /**
       * Pass responsibility to binnedPlotModel.
       * @param iFunc {Function}
       */
      forEachBinDo: function( iFunc) {
        this.get('binnedPlotModel').forEachBinDo( iFunc);
      }

    });

