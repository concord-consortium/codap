// ==========================================================================
//                          DG.CountAxisView
// 
//  A view of a linear axis possibly broken into cells.
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

sc_require('components/graph/axes/cell_linear_axis_view');

/** @class

  An axis with a numeric scale, possible broken into cells.

  @extends DG.CellLinearAxisView
*/
DG.CountAxisView = DG.CellLinearAxisView.extend(
/** @scope DG.CountAxisView.prototype */ (function() {

  return {

    /**
     * @property { DG.NumericAxisViewHelper or DG.DateTimeAxisViewHelper}
     */
    _axisViewHelper: null,
    axisViewHelper: function() {
      if( !this._axisViewHelper) {
        var tHelperClass = DG.NumericAxisViewHelper;
        this._axisViewHelper = tHelperClass.create( {
          axisView: this
        });
      }
      return this._axisViewHelper;
    }.property()

  };

}())
);

