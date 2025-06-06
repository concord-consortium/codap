// ==========================================================================
//                          DG.BarChartModel
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

sc_require('components/graph/plots/bar_chart_base_model');

/** @class  DG.BarChartModel - The model for a plot with categorical axes

 @extends DG.BarChartBaseModel
 */
DG.BarChartModel = DG.BarChartBaseModel.extend(
    /** @scope DG.BarChartModel.prototype */
    {
      /**
       *
       * @param iPlace {DG.GraphTypes.EPlace}
       * @return { class }
       */
      getDesiredAxisClassFor: function( iPlace) {
        if(iPlace === this.get('secondaryAxisPlace'))
          return DG.CountAxisModel;
        return sc_super();
      },

      naturalUpperBound: function () {
        var tNaturalUpperBound,
            tMaxInCell = this.get('maxInCell'),
            tHasLegend = !SC.none(this.get('legendVarID'));
        switch (this.get('breakdownType')) {
          case DG.Analysis.EBreakdownType.eCount:
            tNaturalUpperBound = Math.max( 4, tMaxInCell);
            break;
          case DG.Analysis.EBreakdownType.ePercent:
            tNaturalUpperBound = tHasLegend ? 100 : 100 * tMaxInCell / this.get('cases').length();
            break;
        }
        return 1.05 * tNaturalUpperBound;
      }.property('breakdownType'),

      breakdownTypeDidChange: function () {
        this.setPath('secondaryAxisModel.scaleType', this.get('breakdownType'));
      }.observes('breakdownType'),

      /**
       Subclasses may override
       @param { DG.GraphTypes.EPlace }
       @return{ {min:{Number}, max:{Number} isDataInteger:{Boolean}} }
       */
      getDataMinAndMaxForDimension: function (iPlace) {
        var tResult = {
          min: 0,
          max: this.get('naturalUpperBound'),
          isDataInteger: this.get('breakdownType') === DG.Analysis.EBreakdownType.eCount
        };
        return tResult;
      }


    });
