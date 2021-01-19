// ==========================================================================
//                        DG.FormulaAxisModel
//
//  Author:   William Finzer
//
//  Copyright (c) 2021 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/axes/cell_axis_model');

/** @class  DG.FormulaAxisModel - This override allows us to display a formula expression as the axis label.

  @extends DG.CellLinearAxisModel
*/
DG.FormulaAxisModel = DG.CellLinearAxisModel.extend(
/** @scope DG.FormulaAxisModel.prototype */ 
{
  /**
   * Will be set by PlotView to provide access to formula expression to display as label
   * @property {DG.ComputedBarChartModel}
   */
  expressionSource: null,

  init: function() {
    sc_super();
    this.set('attributeDescription',
        DG.AttributePlacementDescription.create());  // because we observe it even though we don't use it
  },
  
  destroy: function() {
    this.expressionSource = null;
    sc_super();
  },

  /**
   Override
   */
  labels: function() {
    var tLabel = this.expressionSource ? this.expressionSource.get('expression') : '';
    if( SC.empty( tLabel))
      tLabel = "DG.BarChartFunction.emptyExpressionAxisPrompt".loc();
    return [tLabel];
  }.property('scaleType'),

  /**
   *
   * @return {String}
   */
  getLabelDescription: function( /*iIndex*/) {
    return "DG.FormulaAxisView.labelDescription".loc();
  },

  /**
   * Override until we can handle cells on numeric axis
   * @param iName
   * @return {number}
   */
  cellNameToCellNumber: function( iName) {
    return 0;
  }

 });

