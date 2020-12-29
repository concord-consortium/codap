// ==========================================================================
//                          DG.ComputedBarChartView
//
//  Author:   Kirk Swenson
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

sc_require('components/graph/plots/bar_chart_base_view');

/** @class  DG.BarChartView, a plot of rectangles, one for each category. Each rectangle is made of
 * thinner rectangles, one for each case.

 @extends DG.ComputedBarChartView
 */
DG.ComputedBarChartView = DG.BarChartBaseView.extend(
  /** @scope DG.ComputedBarChartView.prototype */
  {
    /**
     * Return the class of the count axis with the x or y to put it on.
     * @return {[{}]}
     */
    getAxisViewDescriptions: function () {
      var tDescriptions = sc_super(),
          tNumericKey = this.getPath('model.orientation') === DG.GraphTypes.EOrientation.kVertical ? 'y' : 'x';
      tDescriptions.push( {
        axisKey: tNumericKey,
        axisClass: DG.CellLinearAxisView
      });
      return tDescriptions;
    },

    getBarHeight: function(iPrimaryName, iCount, iTotal) {
      var model = this.get('model'),
          barHeight = model && model.getBarHeight(iPrimaryName);
      return model && barHeight * iCount / iTotal;
    },

    drawData: function drawData() {
      var model = this.get('model');
      model._buildCache();
      sc_super();
    }
  }
);
