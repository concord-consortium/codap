// ==========================================================================
//                        DG.CategoricalStats
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

/** @class

    Encapsulates a cache of cell counts for a categorical attribute.

 @extends SC.Object
 */
DG.CategoricalStats = SC.Object.extend(
    /** @scope DG.CategoricalStats.prototype */ {

      /**
       * How many cases
       * @property {Number}
       */
      count: null,

      /**
       * One property for each of the possible categorical values
       * @property {SC.Object}
       */
      cellMap: null,

      /** @private
       The previously computed number of cells, used for change detection.
       @property {Number}
       */
      _prevNumberOfCells: 0,

      init: function () {
        sc_super();
        this.cellMap = {};
      },

      /**
       * The number of distinct values
       * @property {Number}
       */
      numberOfCells: function () {
        return DG.ObjectMap.length(this.cellMap);
      }.property(),

      countOrNumberOfCellsDidChange: function () {
        var currNumberOfCells = this.get('numberOfCells');
        if (currNumberOfCells !== this._prevNumberOfCells)
          this.notifyPropertyChange('numberOfCells');
        this._prevNumberOfCells = currNumberOfCells;
      }.observes('count', 'cellMap'),

      /**
       @return{Number} corresponding to given name
       */
      cellNameToCellNumber: function (iCellName) {
        var tCell = SC.empty(iCellName) ? null : this.cellMap[iCellName.toString()];
        tCell = tCell || this.cellMap[DG.PlotUtilities.kOther];
        return tCell && tCell.cellNumber;
      },

      /**
       * @property {[{String}]}
       */
      cellNames: function () {
        var tNames = [];
        DG.ObjectMap.forEach(this.get('cellMap'), function (iName, iCell) {
          tNames.push({ name: iName, cellNumber: iCell.cellNumber});
        });
        tNames = tNames.sort( function( iObj1, iObj2) {
          return iObj1.cellNumber - iObj2.cellNumber;
        });
        return tNames.map( function( iObj) {
          return iObj.name;
        });
      }.property('cellMap'),

      /**
       * Return all values to original state
       */
      reset: function () {
        // Don't use 'set' since it can lead to infinite loops
        this.count = 0;
        this.cellMap = {};
      }

    });

