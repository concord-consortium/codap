// ==========================================================================
//                        DG.CountAxisModel
//
//  Author:   William Finzer
//
//  Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.
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

/** @class  DG.CountAxisModel - The model for a graph axis.

  @extends DG.CellLinearAxisModel
*/
DG.CountAxisModel = DG.CellLinearAxisModel.extend(
/** @scope DG.CountAxisModel.prototype */ 
{
  /**
    Should decimal tick values be suppressed (as for a frequency axis)?
    @property { boolean }
  */
  displayOnlyIntegers: true,

  /**
   * Determines whether we display count or percent
   * @property {DG.Analysis.EBreakdownType}
   */
  scaleType: DG.Analysis.EBreakdownType.eCount,

   /**
      @private
    @property { boolean }
  */
  _lockZero: true,

  /**
   Override
   */
  labels: function() {
    switch( this.get('scaleType')) {
      case DG.Analysis.EBreakdownType.eCount:
        return ["DG.CountAxisView.countLabel".loc()];
      case DG.Analysis.EBreakdownType.ePercent:
        return ["DG.CountAxisView.percentLabel".loc()];
      default:
        return [];
    }
  }.property('scaleType'),

  /**
   *
   * @return {String}
   */
  getLabelDescription: function( /*iIndex*/) {
    switch( this.get('scaleType')) {
      case DG.Analysis.EBreakdownType.eCount:
        return "DG.CountAxisView.countLabelDescription".loc();
      case DG.Analysis.EBreakdownType.ePercent:
        return "DG.CountAxisView.percentLabelDescription".loc();
      default:
        return '';
    }
  },

  /**
  Recompute lowerBound, upperBound and tickGap for each subaxis

    @param {Number} iDataMin - the data provide this value
    @param {Number} iDataMax - the data provide this value
    @return { {lower: {Number}, upper: {Number}, gap: {Number}} }
    @protected
  */
  _computeBoundsAndTickGap: function( /*iDataMin, iDataMax*/) {
    var tTickGap;

    tTickGap = this._computeTickGap( 0, 100);
    return { lower: this._findLow( 0, tTickGap),
              upper: this._findHigh( 100, tTickGap),
              gap: tTickGap };
  }

 });

