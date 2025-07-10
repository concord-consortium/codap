// ==========================================================================
//                            DG.DataTip
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

sc_require('utilities/tool_tip');

/** @class DG.DataTip A simple adornment-like class that displays and updates a data tip that shows when the
 *    user hovers over a point.

  @extends DG.ToolTip
*/
DG.DataTip = DG.ToolTip.extend(
/** @scope DG.DataTip.prototype */ 
{
  /**
    Our gateway to attributes, values, and axes
    @property { DG.PlotView }
  */
  plotLayer: null,

  plotBinding: '.plotLayer.model',

  /**
   * The index of the case whose values are being displayed
   * @property { Integer }
   */
  caseIndex: null,

  /**
   * Override to call getDataTipText
   * @property {String}
   */
  text: function() {
    return this.getDataTipText();
  }.property(),

  init: function() {
    sc_super();
    if(!this.get('paperSource'))
      this.set('paperSource', this.get('plotLayer'));
  },

  show: function( iX, iY, iR, iIndex) {
    this.set('caseIndex', iIndex);
    sc_super();
  },

  getDataTipText: function() {
      return '';
  },

  handleChanges: function( iChanges) {
    // iChanges can be a single index or an array of indices
    var tChanges = (SC.typeOf( iChanges) === SC.T_NUMBER ? SC.IndexSet.create( iChanges) : iChanges);
    tChanges = tChanges || [];
    if( SC.none( this._myElements) || (this._myElements.length === 0) || !(tChanges.contains( this.get('caseIndex'))))
      return;

    this.updateTip();
  }

});
