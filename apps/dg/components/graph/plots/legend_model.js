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
   * @property { DG.PlotDataConfiguration }
   */
  dataConfiguration: null,

  /**
   *
    @property { DG.AttributePlacementDescription }
  */
  attributeDescription: null,

  /**
   * Has properties corresponding to categories for which each of the corresponding
   * cases are selected. Value of property is true.
   * @property {Object}
   */
  selectionMap: null,

  /**
    The string that will be used to label the legend.
    @property { String }
  */
  label: function() {
    var tDesc = this.get('attributeDescription'),
        tAttr = SC.none( tDesc) ? DG.Analysis.kNullAttribute : tDesc.get('attribute');
    return ( tAttr === DG.Analysis.kNullAttribute) ? '' : tAttr.get('name');
  }.property('attributeDescription.attribute'),

  /**
   Determined by asking attributeStats
   @property{Number}  >= 0
   */
  numberOfCells: function () {
    var tNumCells = this.getPath('attributeDescription.attributeStats.numberOfCells');
    return DG.MathUtilities.isFinite( tNumCells) ? Math.max(1, tNumCells) : 0;
  }.property(),

  numberOfCellsDidChange: function() {
    this.notifyPropertyChange('numberOfCells', this.get('numberOfCells'));
  }.observes('*attributeDescription.attributeStats.numberOfCells'),

  cellMapDidChange: function() {
    this.updateSelection();
  }.observes('attributeDescription.attributeStats.categoricalStats.cellMap'),

  /**
    Determined by asking attributeStats
    @property{min: {Number}, max: {Number}}
  */
    numericRange: function() {
      return this.getPath('attributeDescription.attributeStats.numericRange');
    }.property(),

    numericRangeDidChange: function() {
      this.notifyPropertyChange('numericRange', this.get('numericRange'));
    }.observes('*attributeDescription.attributeStats.numericRange'),

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
  },

  /**
   * If the newly assigned attribute is categorical, make sure it has a colormap so that
   * colors won't change willy nilly.
   */
  attributeDidChange: function() {
    var tAttrDesc = this.get('attributeDescription'),
        tAttribute = tAttrDesc.get('attribute'),
        tColormap = tAttribute && (tAttribute !== DG.Analysis.kNullAttribute) && tAttribute.get('colormap');
    if( !tAttribute || (tAttribute === DG.Analysis.kNullAttribute) || tAttrDesc.get('isNumeric'))
      return; // Nothing assigned or the attribute is numeric
    tColormap = tColormap || {};
    this.get('cellNames').forEach( function( iName) {
      var tColorProp = tColormap[ iName];
      if( !tColorProp) {
        tColormap[ iName] = DG.ColorUtilities.calcCaseColor( iName, tAttrDesc,
            DG.ColorUtilities.kMissingValueCaseColor);
      }
    });
    tAttribute.set('colormap', tColormap);
  }.observes('attributeDescription.attribute'),

  /**
   * Our selectionMap needs to be updated such that it has properties with value true for each
   * category for which all cases are selected.
   */
  updateSelection: function() {
    var tSelectionMap = {},
        tSelection = this.getPath('dataConfiguration.collectionClient.casesController.selection'),
        tCellMap = this.getPath('attributeDescription.attributeStats.cellMap');
    DG.ObjectMap.forEach( tCellMap, function( iKey, iCases) {
      if( (iCases.length > 0) &&
          iCases.every(function( iCase) {
            return tSelection.containsObject( iCase);
          })) {
        tSelectionMap[ iKey] = true;
      }
    });
    this.set( 'selectionMap', tSelectionMap);
  }

});

