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
            tCases = tPlot && tPlot.get('cases'),
            tCase = tCases ? tCases.unorderedAt(this.get('caseIndex')) : null;

        function getNameValuePair(iKey) {
          var digitsForLegend = function() {
            return DG.PlotUtilities.findFractionDigitsForRange(tAttrDesc.getPath('attributeStats.minMax'));
            },
          digitsForAxis = function() {
            return DG.PlotUtilities.findFractionDigitsForAxis(this_.getPath('plotLayer.' + iKey + 'AxisView'));
            };

          var tAttrDesc = tPlot.getPath('dataConfiguration.' + iKey + 'AttributeDescription'),
              tAttributes = tAttrDesc && tAttrDesc.get('attributes'),
              tPlotIndex = this_.getPath('plotLayer.plotIndex');
          if(!tAttrDesc)
            return null;
          // If there are more than 1 attribute, we'll end up using the plot index to pull out the right one
          // This only works because we only allow multiple attributes on the y-place.
          tPlotIndex = (tPlotIndex < tAttributes.length) ? tPlotIndex : 0;
          var tAttr = tAttributes[tPlotIndex],
              tType = (typeof(tAttr) === 'object') ? tAttr.get('type') : null,
              tAttrID = (typeof(tAttr) === 'object') ? tAttr.get('id') : null,
              tDigitsFunc = (iKey === 'legend') ? digitsForLegend : digitsForAxis,
                  tName, tValue;
          if (!SC.none(tAttrID) && tType !== 'qualitative') {
            tName = tAttr.get('name');
            tValue = DG.PlotUtilities.getFormattedCaseValue( tCase, tAttrDesc, tDigitsFunc, tPlotIndex);
            return tName + ': ' + tValue;
          }
          return null;
        }

        function appendPair( iPair) {
          // Only append if not already present
          if (!SC.none(iPair) && tTipText.indexOf(iPair) < 0) {
            if (tTipText.length > 0)
              tTipText += '\n';
            tTipText += iPair;
          }
        }

        if (SC.none(tCase))
          return '';

        var tLegendPair = getNameValuePair('legend'),
            tCaptionPair = getNameValuePair('caption'),
            tTipText = '';

        if( !this.get('showOnlyLegendData')) {
          var tXPair = getNameValuePair('x'),
              tYKey = this.getPath('plotLayer.isUsingY2') ? 'y2' : 'y',
              tYPair = getNameValuePair(tYKey);
          appendPair( tXPair);
          appendPair( tYPair);
        }
        appendPair( tCaptionPair);
        appendPair( tLegendPair);
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

