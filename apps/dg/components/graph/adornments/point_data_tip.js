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

      /**
       * If true, we only show the value of the legend attribute, if any
       * @property{Boolean}
       */
      showOnlyLegendData: false,

      getDataTipText: function () {

        var this_ = this,
            tPlot = this.getPath('plotLayer.model'),  // Use of plotBinding doesn't work the first time
            tCases = tPlot.get('cases'),
            tCase = tCases ? tCases[this.get('caseIndex')] : null;

        function getNameValuePair(iKey) {
          var tAttrDesc = tPlot.getPath('dataConfiguration.' + iKey + 'AttributeDescription'),
              tAttributes = tAttrDesc.get('attributes'),
              tPlotIndex = this_.getPath('plotLayer.plotIndex');
          // If there are more than 1 attribute, we'll end up using the plot index to pull out the right one
          // This only works because we only allow multiple attributes on the y-place.
          tPlotIndex = (tPlotIndex < tAttributes.length) ? tPlotIndex : 0;
          var tAttr = tAttributes[tPlotIndex],
              tAttrID = (typeof(tAttr) === 'object') ? tAttr.get('id') : null,
              tName, tValue, tDigits, tNumFormat;
          if (!SC.none(tAttrID)) {
            tName = tAttr.get('name');
            tValue = tCase && tCase.getValue(tAttrID);
            if (SC.none(tValue)) return null;

            if (tAttrDesc.get('attributeType') === DG.Analysis.EAttributeType.eNumeric) {
              tDigits = (iKey === 'legend') ?
                  DG.PlotUtilities.findFractionDigitsForRange(tAttrDesc.getPath('attributeStats.minMax')) :
                  DG.PlotUtilities.findFractionDigitsForAxis(this_.getPath('plotLayer.' + iKey + 'AxisView'));
              if (SC.none(tDigits))  // Can happen for maps when there is no axis view
                tDigits = 2;
              tNumFormat = DG.Format.number().fractionDigits(0, tDigits);
              tNumFormat.group(''); // Don't separate with commas
              tValue = tNumFormat(tCase.getNumValue(tAttrID));
            }
            else {
              tValue = tCase.getStrValue(tAttrID);
            }
            return tName + ': ' + tValue;
          }
          return null;
        }

        if (SC.none(tCase))
          return '';

        var tLegendPair = getNameValuePair('legend'),
            tTipText = '';

        if( !this.get('showOnlyLegendData')) {
          var tXPair = getNameValuePair('x'),
              tYKey = this.getPath('plotLayer.isUsingY2') ? 'y2' : 'y',
              tYPair = getNameValuePair(tYKey);
          tTipText = SC.none(tXPair) ? '' : tXPair;
          if (!SC.none(tYPair)) {
            if (tTipText.length > 0)
              tTipText += '\n';
            tTipText += tYPair;
          }
        }
        if (!SC.none(tLegendPair)) {
          if (tTipText.length > 0)
            tTipText += '\n';
          tTipText += tLegendPair;
        }
        return tTipText;
      },

      /**
       *  We set the tip origin and the case index before calling sc_super()
       */
      show: function (iX, iY, iR, iIndex) {
        this.set('tipOrigin', {x: iX, y: iY});
        this.set('tipSourceRadius', iR );
        this.set('caseIndex', iIndex);

        sc_super();
      },

//  hide: function() {
//    var tLayer = this.get('layer');
//    if( tLayer)
//      tLayer.clear();
//  },
//
      handleChanges: function (iChanges) {
        // iChanges can be a single index or an array of indices
        var tChanges = (SC.typeOf(iChanges) === SC.T_NUMBER ? SC.IndexSet.create(iChanges) : iChanges);
        tChanges = tChanges || [];
        if (!tChanges.contains(this.get('caseIndex')))
          return;

        this.updateTip();
      }

    });

