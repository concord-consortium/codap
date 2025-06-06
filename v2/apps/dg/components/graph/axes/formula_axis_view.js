// ==========================================================================
//                          DG.FormulaAxisView
// 
//  A view of a linear axis that can display a formula expression as its label
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

sc_require('components/graph/axes/cell_linear_axis_view');

/** @class

  We override so we can do the right thing with the axis label

  @extends DG.CellLinearAxisView
*/
DG.FormulaAxisView = DG.CellLinearAxisView.extend(
/** @scope DG.FormulaAxisView.prototype */ (function() {

  return {

    displayProperties: 'model.expressionSource.formula'.w(),

    /**
     * We return a single menu item with which the user can edit the formula for computing bar lengths
     * @returns {[{title,action]}
     */
    getMenuItems: function () {
      var tMenuItems = [
        { title: 'Edit formula', action: null }
      ];

      return tMenuItems;
    },

    /**
     * This function is installed as the handler for the menu that appears when my label (a formula expression)
     * is clicked.
     * We always want to edit the formula.
     */
    menuChangeHandler: function() {
      var tFormulaOwner = this.getPath('model.expressionSource');
      tFormulaOwner.editFormula();
    }

  };

}())
);

