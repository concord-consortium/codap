// ==========================================================================
//                          DG.LegendModel
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

/** @class DG.LegendModel - The model for a graph legend.

  @extends SC.Object
*/
DG.LegendModel = SC.Object.extend(
/** @scope DG.LegendModel.prototype */ 
{
  /**
   *
    @property { DG.AttributePlacementDescription }
  */
  attributeDescription: null,

  /**
    The string that will be used to label the legend.
    @property { String }
  */
  label: function() {
    var tDesc = this.get('attributeDescription'),
        tAttr = SC.none( tDesc) ? null : tDesc.get('attribute');
    return ( tAttr === DG.Analysis.kNullAttribute) ? '' : tAttr.get('name');
  }.property('attributeDescription.attribute'),

  /**
    Determined by asking attributeStats
    @property{Number}	>= 1
  */
    numberOfCells: function() {
        return Math.max( 1,
                this.getPath('attributeDescription.attributeStats.numberOfCells'));
    }.property('attributeDescription.attributeStats.numberOfCells'),

  /**
    Determined by asking attributeStats
    @property{min: {Number}, max: {Number}}
  */
    numericRange: function() {
      return this.getPath('attributeDescription.attributeStats.numericRange');
    }.property('attributeDescription.attributeStats.numericRange'),

  /**
    Determined by asking attributeStats
    @property{Array of {String}}
  */
    cellNames: function() {
      var tCellMap = this.getPath('attributeDescription.attributeStats.cellMap');
      return DG.ObjectMap.keys( tCellMap);
    }.property('attributeDescription.attributeStats.cellMap'),

  /**
   * Select the cases whose value for the legend attribute places them in the given cell.
   * @param iCellIndex{Number}
   */
  selectCasesInCell: function( iCellName, iExtend) {
    var tCollection = this.getPath('attributeDescription.collectionClient'),
        tContext = tCollection && DG.DataContext.getContextFromCollection( tCollection),
        tCases = this.get('attributeDescription').casesForCategory( iCellName),
        tChange = {
                    operation: 'selectCases',
                    collection: tCollection,
                    cases: tCases,
                    select: true,
                    extend: iExtend
                  };
    if( tContext && tCases)
      tContext.applyChange( tChange);
  }

});

