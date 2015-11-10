// ==========================================================================
//                          DG.CellAxisModel
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

sc_require('components/graph/axes/axis_model');

/** @class  DG.CellAxisModel - The model for a graph axis.

  @extends SC.Object
*/
DG.CellAxisModel = DG.AxisModel.extend(
/** @scope DG.CellAxisModel.prototype */ 
{
  /**
    Determined by asking attributeStats
    @property{Number} >= 1
  */
  numberOfCells: function() {
    return Math.max( 1, this.getPath('attributeDescription.attributeStats.numberOfCells'));
  }.property('attributeDescription.attributeStats.numberOfCells'),
  
  /**
    Iterates through cells to find name with maximum length
    @property{Number}
  */
  maxCellNameLength: function() {
    var tMaxLength = 0;
    this.forEachCellDo( function( iIndex, iName) {
      tMaxLength = Math.max( tMaxLength, iName.length);
    });
    return tMaxLength;
  }.property('attributeDescription.attributeStats.cellMap')/*.cacheable()*/,

  /**
    @property {Boolean}
  */
  isNumeric: false,

  /**
    @return{Number} corresponding to given name
  */
  cellNameToCellNumber: function( iCellName) {
    var stats = this.getPath('attributeDescription.attributeStats');
    return stats ? stats.cellNameToCellNumber( iCellName) : 0;
  },
  
  /**
    Go through each of the cells passing the given function, whose signature
      is ( iCellIndex, iName, iNumUses, iNumSelected )
  */
  forEachCellDo: function( iCellFunc) {
    var tCellMap = this.getPath('attributeDescription.attributeStats.cellMap'),
        tCellNames = DG.ObjectMap.keys( tCellMap),
        tIndex = 0;
    if( tCellNames.length === 0)
      iCellFunc( 0, '', 0, 0);  // There is always at least one cell
    else
      tCellNames.forEach( function( iName) {
        var tValues = tCellMap[ iName],
            tNumUses = tValues.length,
            tNumSelected = 0;
        iCellFunc( tIndex++, iName, tNumUses, tNumSelected);
      });
  },

  /**
   * The attribute's colormap is a hash such that we are taking advantage of the order of the properties.
   * In order to swap two categories we convert to array, swap, and then convert back to hash.
   * @param iIndex1 {Number}
   * @param iIndex2 {Number}
   */
  swapCategoriesByIndex: function( iIndex1, iIndex2) {
    var tColorMap = this.getPath('attributeDescription.attribute.colormap');
    if( DG.ObjectMap.length( tColorMap) === 0) {
      var tAttrStats = this.getPath('attributeDescription.attributeStats'),
          tAttrColor = DG.ColorUtilities.calcAttributeColor( this.get('attributeDescription'));
      this.forEachCellDo( function( iIndex, iName) {
        var tColor = DG.ColorUtilities.calcCategoryColor( tAttrStats, tAttrColor, iName);
        tColorMap[iName] = tColor.colorString || tColor;
      });
    }
    var tCategoryArray = DG.ColorUtilities.colorMapToArray( tColorMap),
        tSaved = tCategoryArray[ iIndex1];
    tCategoryArray[iIndex1] = tCategoryArray[iIndex2];
    tCategoryArray[iIndex2] = tSaved;
    tColorMap = DG.ColorUtilities.colorArrayToColorMap( tCategoryArray);
    this.setPath('attributeDescription.attribute.colormap', tColorMap);
    this.get('attributeDescription').invalidateCaches();
  }
  
});

