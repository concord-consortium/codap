// ==========================================================================
//                            DG.PointDataTip
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

sc_require('components/graph/adornments/data_tip');

/** @class DG.PointDataTip A simple adornment-like class that displays and updates a data tip that shows when the
 *    user hovers over a point.

  @extends DG.DataTip
*/
DG.PointDataTip = DG.DataTip.extend(
/** @scope DG.PointDataTip.prototype */ 
{
  /**
   * The index of the case whose values are being displayed
   * @property { Integer }
   */
  caseIndex: null,

  getDataTipText: function() {

    var this_ = this,
        tCases = this.getPath('plot.cases' ), // Doesn't always succeed even when it should!
        tCase = tCases ? tCases[ this.get('caseIndex')] : null;

    function getNameValuePair( iKey) {
      var tAttrDesc = this_.get('plot' ).getPath('dataConfiguration.' + iKey + 'AttributeDescription'),
          tAttributes = tAttrDesc.get('attributes' ),
          tPlotIndex = this_.getPath('plotView.plotIndex' );
      // If there are more than 1 attribute, we'll end up using the plot index to pull out the right one
      // This only works because we only allow multiple attributes on the y-place.
      tPlotIndex = (tPlotIndex < tAttributes.length) ? tPlotIndex : 0;
      var tAttr = tAttributes[ tPlotIndex],
          tAttrID = (typeof(tAttr) === 'object') ? tAttr.get('id') : null,
          tName, tValue, tDigits, tNumFormat;
      if( !SC.none( tAttrID)) {
        tName = tAttr.get('name');
        tValue  = tCase && tCase.getValue( tAttrID);
        if( SC.none( tValue)) return null;

        if( tAttrDesc.get('isNumeric')) {
          tDigits = (iKey === 'legend') ?
                    DG.PlotUtilities.findFractionDigitsForRange( tAttrDesc.getPath('attributeStats.minMax')) :
                    DG.PlotUtilities.findFractionDigitsForAxis( this_.getPath('plotView.' + iKey + 'AxisView'));
          tNumFormat = pv.Format.number().fractionDigits( 0, tDigits);
          tValue = tNumFormat( tCase.getNumValue( tAttrID));
        }
        else {
          tValue = tCase.getStrValue( tAttrID);
        }
        return tName + ': ' + tValue;
      }
      return null;
    }

    if( SC.none( tCase))
      return '';

    var tXPair = getNameValuePair('x'),
        tYPair = getNameValuePair('y'),
        tLegendPair = getNameValuePair('legend'),
        tCoords;
    tCoords = SC.none(tXPair) ? '' : tXPair;
    if( !SC.none(tYPair)) {
      if( tCoords.length > 0)
        tCoords += '\n';
      tCoords += tYPair;
    }
    if( !SC.none(tLegendPair)) {
      if( tCoords.length > 0)
        tCoords += '\n';
      tCoords += tLegendPair;
    }
    return tCoords;
  },

  /**
   *  We set the tip origin and the case index before calling sc_super()
   */
  show: function( iX, iY, iIndex) {
    this.set('tipOrigin', { x: iX, y: iY});
    this.set('caseIndex', iIndex);

    sc_super();
  },

//  hide: function() {
//    var tLayer = this.get('layer');
//    if( tLayer)
//      tLayer.clear();
//  },
//
  handleChanges: function( iChanges) {
    // iChanges can be a single index or an array of indices
    var tChanges = (SC.typeOf( iChanges) === SC.T_NUMBER ? SC.IndexSet.create( iChanges) : iChanges);
    if( !tChanges.contains( this.get('caseIndex')))
      return;

    this.updateTip();
  }

});

