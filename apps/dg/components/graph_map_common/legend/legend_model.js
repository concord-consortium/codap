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
   * isNumeric
   * @property {Boolean}
   */
  isNumeric: function() {
    return this.getPath('attributeDescription.isNumeric');
  }.property(),

  isNumericDidChange: function() {
    this.notifyPropertyChange('isNumeric');
  }.observes('*attributeDescription.isNumeric'),

  /**
    The string that will be used to label the legend.
    @property { String }
  */
  label: function() {
    var tDesc = this.get('attributeDescription'),
        tAttr = SC.none( tDesc) ? DG.Analysis.kNullAttribute : tDesc.get('attribute');
    return ( tAttr === DG.Analysis.kNullAttribute) ? '' : tAttr.get('name');
  }.property(),
  labelDidChange: function() {
    this.notifyPropertyChange('label');
  }.observes('*attributeDescription.attribute'),

  /**
   * Some property of the attribute with the given ID has changed, typically its name or unit
   * @param iAttrID {Number}
   */
  handleUpdateAttribute: function( iAttrID) {
    this.labelDidChange();
  },

  /**
   Determined by asking attributeStats
   @property{Number}  >= 0
   */
  numberOfCells: function () {
    var tNumCells = this.getPath('attributeDescription.attributeStats.numberOfCells');
    return DG.MathUtilities.isFinite( tNumCells) ? Math.max(1, tNumCells) : 0;
  }.property(),

  numberOfCellsDidChange: function() {
    this.notifyPropertyChange('numberOfCells');
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
      this.notifyPropertyChange('numericRange');
    }.observes('*attributeDescription.attributeStats.numericRange'),

  /**
    Determined by asking attributeStats
    @property{Array of {String}}
  */
  cellNames: function() {
    var tCellMap = this.getPath('attributeDescription.attributeStats.cellMap');
    return DG.ObjectMap.keys( tCellMap);
  }.property(),
  cellNamesDidChange: function() {
    this.notifyPropertyChange('cellNames');
  }.observes('*attributeDescription.attributeStats.cellMap'),

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
   * If the newly assigned attribute is categorical, make sure it has a categoryMap so that
   * colors won't change willy nilly.
   */
  attributeDidChange: function() {
    var tAttrDesc = this.get('attributeDescription'),
        tAttribute = tAttrDesc.get('attribute'),
        tColormap = tAttribute && (tAttribute !== DG.Analysis.kNullAttribute) && tAttribute.get('categoryMap');
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
    tAttribute.set('categoryMap', tColormap);
  }.observes('attributeDescription.attribute'),

  handleOneDataContextChange: function( iNotifier, iChange) {
    var tOperation = iChange && iChange.operation;

    switch (tOperation) {
      case 'createCases':
      case 'deleteCases':
      case 'updateCases':
      case 'dependentCases':
        // Changes to categorical legends are handled via numberOfCellsDidChange()
        // and cellMapDidChange() notifications which bubble up from the AttributeStats.
        // In code review with Bill we decided to leave the handling of numerical
        // legend changes here for now. At some point, either both numeric and
        // categorical should be handled here (and the observers of AttributeStats
        // could potentially be removed) or the AttributeStats notification should
        // be fixed so that the numeric case works that way as well and this code
        // could potentially be removed.
        if (this.get('isNumeric'))
          this.numericRangeDidChange();
        break;
      case 'selectCases':
        this.updateSelection();
        break;
    }
  },

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
  },

  /**Called when the user drags legend category keys
   * @param iIndex1 {Number}
   * @param iIndex2 {Number}
   */
  swapCategoriesByIndex: function( iIndex1, iIndex2) {
    var tCategoryMap = this.getPath('attributeDescription.attribute.categoryMap'),
        tOrder = tCategoryMap.__order || [],
        tAttribute = this.getPath('attributeDescription.attribute');
    if( DG.ObjectMap.length( tCategoryMap) === 0) {
      var tAttrStats = this.getPath('attributeDescription.attributeStats'),
          tAttrColor = DG.ColorUtilities.calcAttributeColor( this.get('attributeDescription'));
      tOrder = [];
      this.forEachCellDo( function( iIndex, iName) {
        var tColor = DG.ColorUtilities.calcCategoryColor( tAttrStats, tAttrColor, iName);
        tCategoryMap[iName] = tColor.colorString || tColor;
        tOrder.push( iName);
      });
      tCategoryMap.__order = tOrder;
    }
    var tSaved = tOrder[ iIndex1];
    tOrder[iIndex1] = tOrder[iIndex2];
    tOrder[iIndex2] = tSaved;
    this.setPath('attributeDescription.attribute.categoryMap', tCategoryMap);
    tAttribute.notifyPropertyChange('categoryMap');
    this.get('attributeDescription').invalidateCaches();
  }

});

