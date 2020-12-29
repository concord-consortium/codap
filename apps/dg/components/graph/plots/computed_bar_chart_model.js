// ==========================================================================
//                          DG.ComputedBarChartModel
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

sc_require('components/graph/plots/bar_chart_base_model');

/** @class  DG.ComputedBarChartModel - The model for a bar chart with computed height of bars

 @extends DG.BarChartBaseModel
 */
DG.ComputedBarChartModel = DG.BarChartBaseModel.extend(
  /** @scope DG.ComputedBarChartView.prototype */
  {
    isBarHeightComputed: true,

    expression: 'mean(num)',

    formula: null,

    formulaContext: null,

    init: function() {
      sc_super();
    },

    destroy: function() {
      this.destroyFormula();
      sc_super();
    },

    createFormula: function() {
      var id = DG.Debug.scObjectID(this),
          type = 'computedBarChart',
          owner = { type: type, id: id, name: type + id },
          attrID = this.get('primaryVarID'),
          attr = attrID && DG.Attribute.getAttributeByID(attrID),
          collection = attr && attr.get('collection');
      this.formulaContext = DG.BarChartFormulaContext.create({
        ownerSpec: owner,
        plotModel: this,
        collection: collection
      });

      this.set('formula', DG.Formula.create({ context: this.formulaContext, source: this.get('expression') }));
    },

    destroyFormula: function() {
      this.formula.destroy();
    },

    /**
     *
     * @param iPlace {DG.GraphTypes.EPlace}
     * @return { class }
     */
    getDesiredAxisClassFor: function( iPlace) {
      if(iPlace === this.get('secondaryAxisPlace'))
        return DG.CellLinearAxisModel;
      return sc_super();
    },

    /**
     Subclasses may override
      @param { DG.GraphTypes.EPlace }
      @return{ {min:{Number}, max:{Number} isDataInteger:{Boolean}} }
      */
    getDataMinAndMaxForDimension: function (iPlace) {
      // TODO: compute min/max from data
      var tResult = {
        min: -5,
        max: 5,
        isDataInteger: false
      };
      return tResult;
    },

    getBarHeight: function(iPrimaryName) {
      // TODO: create/update formula when attribute configuration or expression changes
      if (!this.get('formula')) this.createFormula();
      var formula = this.get('formula'),
          evalContext = iPrimaryName ? { _groupID_: iPrimaryName } : {},
          result = NaN;

      try {
        if (formula)
          result = formula.evaluate(evalContext);
      }
      catch(e) {
        // Propagate errors to return value
        result = e;
      }

      return result;
    }
  }
);
